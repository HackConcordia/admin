<!-- GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync -->

# ConUHacks XI email kit

Every applicant email, as React Email templates. Design: `docs/superpowers/specs/2026-10-07-conuhacks-email-kit-and-reminders-design.md`; wording: `docs/superpowers/specs/2026-10-07-conuhacks-email-copy.md`.

This folder is **self-contained**: it imports only `react`, `react-email` and files inside `emails/` (no `@/` aliases, no `process.env`, no Next.js APIs), because the ConUHacks admin app (the `admin` repo, `src/emails`) gets a verbatim copy. Edit it here, never in the admin repo, then run `npm run emails:sync` (copies into `../../admin/src/emails`).

Versions (exact, the same in both apps so they render identical HTML and text): `react-email@6.11.0`, `@react-email/render@2.1.0` (a direct dependency: `react-email` only asks for `>=2.1.0`), and `@react-email/ui@6.11.0` (dev, preview server).

Every `.tsx` file with JSX starts with `/** @jsxRuntime automatic */`, so it compiles the same in any host: the admin app's Vitest has no React plugin and its `tsconfig` says `"jsx": "preserve"`, which would otherwise compile the kit to `React.createElement` and fail with "React is not defined". `kit.test.tsx` fails if a file lacks it. The tests themselves (`*.test.tsx`, `__snapshots__/`) need a React-aware runner and are not synced.

## Using it

```ts
import { renderEmail } from "@/emails/render";
import { emailLanguage } from "@/emails/language";

const { subject, html, text } = await renderEmail(
  "admitted",
  { fullName: "Ada Lovelace", confirmUrl, declineUrl },
  emailLanguage(application.communicationLanguage), // "en" | "fr" | "bilingual"
);
```

- `verifyAccount`, `resendVerification` and `passwordReset` are always bilingual (`registry.ts`); `lang` is ignored for them.
- Bilingual = French block, divider, English block; subject `"<fr> // <en>"`.
- Every URL must be absolute `https://` (or `http://localhost…` in development). Anything else makes `renderEmail` throw, so the email is never sent. Templates link data URLs only through `Button` or `TextLink` (both check the URL); react-email's `Link` is for the kit's own fixed links.
- `renderEmail` post-processes the HTML for Outlook for Windows (`kit/mso.ts`): a fixed 600px ghost table around the container, the Poppins `<link>` hidden from Outlook, and an Arial fallback. Previews skip this step.
- Names are passed as data and rendered as React text, so React escapes them. Subjects contain fixed text only.

## Layout

| Path | What |
|---|---|
| `types.ts` | `EmailLanguage`, the data type of every key (`EmailData`), the template contract |
| `registry.ts` | key → `{ copy, alwaysBilingual }` |
| `render.ts` / `EmailDocument.tsx` | `renderEmail()`; the full email tree (layout + language blocks) |
| `language.ts` | `emailLanguage()`: `"english"` → `en`, `"french"` → `fr`, anything else → `bilingual` |
| `kit/` | theme, brand facts and links, `Layout`, `LanguageSection`, `Button`, `ButtonRow`, `TextLink`, `LanguageDivider`, `Signature`, `Footer`, `Greeting` / `Paragraph` / `Strong`; `responsive.ts` (the one `<style>` block: phone tweaks) and `mso.ts` / `MsoMarker` (Outlook conditional comments) |
| `templates/` | one file per key: `copy.fr` and `copy.en` (`label`, `subject`, `preheader`, `Body`) |
| `sampleData.ts` | realistic data per key (previews and tests) |
| `kit.test.tsx`, `__snapshots__/` | registry-driven tests; subject + text snapshots per key × language, reviewed against the copy doc (`npx vitest run emails -u` after a copy change) |
| `previews/` | one preview per key × `en` / `fr` / `bilingual` (not synced to the admin app) |

## Adding an email

1. Add its data type to `EmailData` in `types.ts`.
2. Add `templates/<key>.tsx`, shaped like `templates/verifyAccount.tsx` (pragma line included): label, subject, preheader (the first sentence after the greeting) and `Body` built from kit parts, for `fr` and `en`.
3. Add one line to `registry.ts` and sample data to `sampleData.ts`.
4. Add `previews/<key>-en.tsx`, `-fr.tsx`, `-bilingual.tsx` (one line each: the default export is `makePreview("<key>", "<lang>")`).
5. `npx vitest run emails -u` — the registry-driven tests cover the new key automatically; review the new snapshots against the copy doc.
6. `npm run emails:sync`, then commit the admin copy in an admin PR. This is needed after **any** change here outside `previews/`, tests, snapshots and `sampleData.ts`, even for an email only this app sends, because the admin copy holds the shared kit files (`brand.ts`, `Layout`, `Footer`, `theme`). `npm run emails:check` fails while the admin copy is stale; run it before opening a registration PR.

Tips: write sentences with an apostrophe as a JS string (`{"Si vous n'avez pas…"}`), since `react/no-unescaped-entities` rejects a bare `'` in JSX text. In French body copy, put a no-break space before `:` `!` `?` `;` (`&nbsp;` in JSX text, `\u00a0` in a JS string) so the mark never wraps onto its own line; subjects keep ordinary spaces. Inside `previews/`, any file whose source contains the words `export default` (even in a comment) is treated as an email by the React Email CLI; helpers there start with `_` and must not.

## Previews and assets

```bash
npm run email:dev      # preview server: http://localhost:3001
npm run email:export   # static HTML of every preview into .email-out/
npm run email:assets   # rebuild public/email/*.png (logo, Instagram, LinkedIn icons)
```

Images are always loaded from `https://register.conuhacks.io/email/` (`ASSET_BASE_URL`; `email:assets` builds the logo from `public/ConuHacksLogo.png`, the white-glyph one, since it sits on the black header band), so they only show once deployed; every email reads fully with images off (the logo and social icons are decorative, next to live text).

The Instagram and LinkedIn glyphs are Font Awesome Free icons (Fonticons, Inc., [CC BY 4.0](https://fontawesome.com/license/free)), via `react-icons`.
