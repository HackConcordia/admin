# Deploying this version

This version makes admin login bcrypt-only (no more plaintext password fallback). Follow
these steps in order — merging before step 3 has run against production will lock out
every admin whose password hasn't been migrated yet.

Note: `/api/check-in-discord` (and its `DISCORD_BOT_API_KEY`) has been removed. The
current `discord-bot` talks to MongoDB directly, so this route and key are no longer
needed.

## Deploying this version

1. **Set secrets in Vercel.** In the Vercel dashboard, set `JWT_SECRET` (a long random
   value) for both the Production and Preview environments. Generate it with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

2. **Back up the `admins` collection** in the production database before running
   anything against it.

3. **Run the password migration against the PRODUCTION `MONGODB_URI`** (contract C6):
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

4. **Only then merge the PR** and let it deploy. Bcrypt-only login means any admin
   password not yet hashed by step 3 can no longer log in.

5. **Add a Vercel Firewall rate-limit rule** for `POST /api/auth-token/login`, e.g. 10
   requests/min per IP, then block for 10 minutes. Vercel dashboard → Firewall → Rate
   limiting → add rule scoped to that path.

## Emails

Admit / waitlist / refuse (the decision buttons) and Edit → `Confirmed` (Discord invite) send the
`admitted`, `waitlisted`, `refused` and `discordInvite` emails through `src/utils/sendEmail.ts`, in
the applicant's `communicationLanguage` (English or French; both, French first, when unset). The
templates in `src/emails/` are a **generated copy** of the registration app's kit
(`registration-website-conuhacks-10/my-app/emails`): never edit them here. Edit the registration
repo, then run `npm run emails:sync` there; `src/emails/kit-sync.test.ts` fails on any hand edit.
Sync after **any** registration change under `emails/` other than `previews/`, tests, snapshots and
`sampleData.ts`: this copy holds the shared kit files (`kit/brand.ts`, `Layout`, `Footer`, `theme`).
The registration repo's `npm test` (`test/emailsAdminCopy.test.ts`) and `npm run emails:check` fail
while this copy is stale; commit the synced copy here. `react-email` and `@react-email/render` are
pinned to the registration app's exact versions so both apps render identical HTML.

Env: unchanged names, but `EVENT_DATES_LABEL`, `EVENT_DATES_LABEL_FR`, `EVENT_VENUE` and
`EVENT_VENUE_FR` are no longer read (the kit carries the event date and venue): delete them from
both Vercel environments. `CONTACT_EMAIL` is only the reply-to address, and it must equal the email kit's `CONTACT_EMAIL` (`team.hackconcordia@ecaconcordia.ca`, shown in every email footer): set it to that value in both environments.

**Deploy the registration app first.** Every email loads its logo and social icons from the
registration app's `/email/*.png`, and the admitted email's button opens `REGISTRATION_URL`. Deploy
the registration change to production and check the assets answer 200 before merging this one.

## Rollback

If something goes wrong after deploying: restore the `admins` collection from the
backup taken in step 2, and redeploy the previous build (Vercel dashboard → Deployments
→ select the prior production deployment → Promote to Production).
