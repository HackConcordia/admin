/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { CSSProperties } from "react";
import { Img, Link } from "react-email";
import { ASSETS, CONTACT_EMAIL, FOOTER_ORGANIZER_LINE, KIT_TEXT, SOCIAL_LINKS } from "./brand";
import { CLASS } from "./responsive";
import { colors, fonts, msoExact, sizes, text } from "./theme";
import type { CopyLanguage } from "../types";

const lineStyle: CSSProperties = {
  margin: "0 0 8px",
  color: colors.bandText,
  fontFamily: fonts.body,
  fontSize: text.smallFontSize,
  lineHeight: text.smallLineHeight,
  ...msoExact,
};

const SOCIALS = [
  { href: SOCIAL_LINKS.instagram, src: ASSETS.instagram, label: "Instagram" },
  { href: SOCIAL_LINKS.linkedin, src: ASSETS.linkedin, label: "LinkedIn" },
] as const;

const socialLabelStyle: CSSProperties = {
  color: colors.accent,
  fontFamily: fonts.body,
  fontSize: text.tinyFontSize,
  fontWeight: 600,
  lineHeight: `${sizes.socialIconSize}px`,
  letterSpacing: "0.08em",
  textDecoration: "none",
  textTransform: "uppercase",
  ...msoExact,
};

/**
 * Icon + live-text name per network. The name is real text, so the links read with
 * images off and appear in the text part; the icon is decorative (alt="") so screen
 * readers announce each network once.
 */
function SocialLinks() {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ margin: "0 0 20px" }}>
      <tbody>
        <tr>
          {SOCIALS.map((social) => (
            <td key={social.label} valign="middle" style={{ paddingRight: "20px", verticalAlign: "middle" }}>
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
                <tbody>
                  <tr>
                    <td valign="middle" data-skip-in-text="true" style={{ paddingRight: "8px" }}>
                      <Link href={social.href} target="_blank" style={{ display: "block", textDecoration: "none" }}>
                        <Img
                          src={social.src}
                          width={sizes.socialIconSize}
                          height={sizes.socialIconSize}
                          alt=""
                          style={{ display: "block", border: 0 }}
                        />
                      </Link>
                    </td>
                    <td valign="middle" style={{ verticalAlign: "middle" }}>
                      <Link href={social.href} target="_blank" style={socialLabelStyle}>
                        {social.label}
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function FooterLines({ lang }: { lang: CopyLanguage }) {
  const copy = KIT_TEXT[lang];
  return (
    <div lang={lang} style={{ marginBottom: "8px" }}>
      <p style={lineStyle}>
        {copy.footerQuestions}{" "}
        <Link href={`mailto:${CONTACT_EMAIL}`} style={{ color: colors.accent, textDecoration: "underline" }}>
          {CONTACT_EMAIL}
        </Link>
        .
      </p>
      <p style={lineStyle}>{copy.footerReason}</p>
    </div>
  );
}

/** Black band: social links, the footer lines in each language sent, then the organizer line. */
export function Footer({ languages }: { languages: readonly CopyLanguage[] }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ backgroundColor: colors.black }}
    >
      <tbody>
        <tr>
          <td className={CLASS.band} style={{ padding: `32px ${sizes.bandPaddingX}px` }}>
            <SocialLinks />
            {languages.map((lang) => (
              <FooterLines key={lang} lang={lang} />
            ))}
            <p style={{ ...lineStyle, margin: "16px 0 0", fontWeight: 600, letterSpacing: "0.04em" }}>
              {FOOTER_ORGANIZER_LINE}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
