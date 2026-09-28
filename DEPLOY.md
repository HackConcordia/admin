# Deploying this version

This version makes admin login bcrypt-only (no more plaintext password fallback) and
introduces `DISCORD_BOT_API_KEY` for the `/api/check-in-discord/{email}` route. Follow
these steps in order — merging before step 4 has run against production will lock out
every admin whose password hasn't been migrated yet.

## Deploying this version

1. **Set secrets in Vercel.** In the Vercel dashboard, set `JWT_SECRET` (a long random
   value) and `DISCORD_BOT_API_KEY` (a long random value) for both the Production and
   Preview environments. Generate each with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

2. **Configure the Verification-bot with the same Discord key.** The external
   `HackConcordia/Verification-bot` calls `POST /api/check-in-discord/{email}` with an
   `x-api-key` header. Put the exact same `DISCORD_BOT_API_KEY` value into that bot's
   config (its `internal_api_key`), wherever it is deployed. If the values don't match,
   Discord verification will return 401.

3. **Back up the `admins` collection** in the production database before running
   anything against it.

4. **Run the password migration against the PRODUCTION `MONGODB_URI`** (contract C6):
   ```bash
   MONGODB_URI="<production URI, including the database name>" npm run migrate:hash-admin-passwords
   ```
   This is a dry run — it prints the database name it connected to and how many admin
   passwords still need hashing but writes nothing. Check the printed database name is
   the production database, then apply it:
   ```bash
   MONGODB_URI="<production URI, including the database name>" npm run migrate:hash-admin-passwords -- --apply
   ```
   Re-run the dry run afterward and confirm it now reports 0 remaining to hash.

5. **Only then merge the PR** and let it deploy. Bcrypt-only login means any admin
   password not yet hashed by step 4 can no longer log in.

6. **Add a Vercel Firewall rate-limit rule** for `POST /api/auth-token/login`, e.g. 10
   requests/min per IP, then block for 10 minutes. Vercel dashboard → Firewall → Rate
   limiting → add rule scoped to that path.

## Rollback

If something goes wrong after deploying: restore the `admins` collection from the
backup taken in step 3, and redeploy the previous build (Vercel dashboard → Deployments
→ select the prior production deployment → Promote to Production).
