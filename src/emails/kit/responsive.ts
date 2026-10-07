// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// The only <style> rules in the kit: phone-width tweaks (Layout.tsx puts them in <head>).
// Every element they target is already laid out by inline styles, so clients that strip
// <style> still get a working (if less tidy) email.

import { MOBILE_MAX_WIDTH, sizes } from "./theme";

/** Class names the <style> block targets. */
export const CLASS = {
  /** The white body cell: less side padding on phones. */
  body: "email-body",
  /** Header and footer band cells: less side padding on phones. */
  band: "email-band",
  /** The header date: flush-left under the wordmark on phones. */
  headerDate: "hdr-date",
  /** A ButtonRow table: full width on phones, so its cells can be. */
  buttonRow: "btn-row",
  /** A ButtonRow cell: stacked buttons become equal full-width blocks on phones. */
  buttonCell: "btn-cell",
} as const;

const PX = sizes.mobilePaddingX;

export const RESPONSIVE_CSS = [
  `@media only screen and (max-width:${MOBILE_MAX_WIDTH}px){`,
  `.${CLASS.body}{padding:32px ${PX}px!important}`,
  `.${CLASS.band}{padding-left:${PX}px!important;padding-right:${PX}px!important}`,
  `.${CLASS.headerDate}{float:none!important;display:block!important;text-align:left!important;padding:8px 0 0!important}`,
  `.${CLASS.buttonRow}{width:100%!important}`,
  `.${CLASS.buttonCell}{display:block!important;width:100%!important;padding-right:0!important}`,
  `.${CLASS.buttonCell} table{width:100%!important}`,
  `}`,
].join("");
