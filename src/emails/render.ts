// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import { createElement } from "react";
import { render } from "react-email";
import { EmailDocument, emailSubject } from "./EmailDocument";
import { msoPatch } from "./kit/mso";
import type { EmailData, EmailKey, EmailLanguage, RenderedEmail } from "./types";

// Text part: table cells become their own lines (so "COMPTE" and "FRANÇAIS" do not run together),
// and a link's URL is shown in brackets after its text ("Accept [https://…]"), so a URL inside a
// sentence (the venue's map link) reads as an aside. A link whose text is its URL shows it once.
const PLAIN_TEXT_OPTIONS = {
  selectors: [
    { selector: "td", format: "block" },
    { selector: "a", options: { linkBrackets: ["[", "]"] as [string, string], hideLinkHrefIfSameAsText: true } },
  ],
};

/**
 * Renders one email to its subject, HTML and plain-text parts.
 * `lang` is ignored (always bilingual) for the account emails; see registry.ts.
 * The HTML gets the Outlook-only wrappers from kit/mso.ts.
 * Throws when a link in `data` is not absolute https (or http://localhost).
 */
export async function renderEmail<K extends EmailKey>(
  key: K,
  data: EmailData[K],
  lang: EmailLanguage,
): Promise<RenderedEmail> {
  const element = createElement(EmailDocument<K>, { emailKey: key, data, lang });
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true, htmlToTextOptions: PLAIN_TEXT_OPTIONS }),
  ]);
  return { subject: emailSubject(key, data, lang), html: msoPatch(html), text };
}
