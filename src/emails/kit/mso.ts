// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Outlook for Windows (Word engine) fixes that need conditional comments, which React
// cannot emit. The Layout renders empty marker <span>s (and the Poppins <link>);
// `msoPatch` (called by render.ts on the final HTML) swaps them for the comments.
// Previews skip the patch: browsers would ignore the comments anyway.

import { fonts, sizes } from "./theme";

/** Rendered by <MsoMarker>; each must appear exactly once in a Layout. */
export const MSO_MARKERS = {
  containerOpen: '<span data-mso-marker="container-open"></span>',
  containerClose: '<span data-mso-marker="container-close"></span>',
} as const;

/** Outlook ignores max-width: a fixed 600px "ghost" table keeps the container from stretching. */
const GHOST_OPEN =
  `<!--[if mso]><table role="presentation" align="center" width="${sizes.containerWidth}" ` +
  `cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->`;
const GHOST_CLOSE = "<!--[if mso]></td></tr></table><![endif]-->";

/** Outlook shows Times New Roman when a web font leads the stack: force a system font there. */
const OUTLOOK_FONT_STYLE =
  `<!--[if mso]><style>body,table,td,p,a,span,strong{font-family:${fonts.outlookFallback} !important;}</style><![endif]-->`;

const FONT_LINK = /<link\b[^>]*href="https:\/\/fonts\.googleapis\.com\/[^"]*"[^>]*\/?>/;

function replaceOnce(html: string, search: string | RegExp, replace: (match: string) => string): string {
  const match = typeof search === "string" ? (html.includes(search) ? search : null) : html.match(search)?.[0];
  if (!match) {
    throw new Error(`msoPatch: ${String(search)} not found in the rendered email`);
  }
  const index = html.indexOf(match);
  return html.slice(0, index) + replace(match) + html.slice(index + match.length);
}

/** Adds the Outlook-only wrappers to a rendered Layout. Throws if the Layout changed shape. */
export function msoPatch(html: string): string {
  let out = replaceOnce(html, MSO_MARKERS.containerOpen, () => GHOST_OPEN);
  out = replaceOnce(out, MSO_MARKERS.containerClose, () => GHOST_CLOSE);
  // Hide the web font from Outlook (it ignores the fallbacks after an unloadable font).
  out = replaceOnce(out, FONT_LINK, (link) => `<!--[if !mso]><!-->${link}<!--<![endif]-->`);
  out = replaceOnce(out, "</head>", (head) => `${OUTLOOK_FONT_STYLE}${head}`);
  return out;
}
