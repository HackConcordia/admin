/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { ReactNode } from "react";
import { KIT_TEXT } from "./brand";
import { colors, fonts, msoExact, text } from "./theme";
import type { CopyLanguage } from "../types";

/**
 * One language block: its own `lang` attribute, the black label tag (e.g. "COMPTE"),
 * and in bilingual emails a muted "FRANÇAIS" / "ENGLISH" label next to the tag.
 */
export function LanguageSection({
  lang,
  label,
  showLanguageLabel,
  children,
}: {
  lang: CopyLanguage;
  label: string;
  showLanguageLabel: boolean;
  children: ReactNode;
}) {
  return (
    <div lang={lang} data-email-lang={lang}>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ margin: "0 0 24px" }}>
        <tbody>
          <tr>
            <td
              style={{
                backgroundColor: colors.black,
                color: colors.accent,
                fontFamily: fonts.body,
                fontSize: text.smallFontSize,
                fontWeight: 700,
                lineHeight: "14px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "8px 12px",
                ...msoExact,
              }}
            >
              {label}
            </td>
            {showLanguageLabel ? (
              <td
                style={{
                  paddingLeft: "12px",
                  color: colors.muted,
                  fontFamily: fonts.body,
                  fontSize: text.tinyFontSize,
                  fontWeight: 600,
                  lineHeight: "14px",
                  letterSpacing: "0.14em",
                  ...msoExact,
                }}
              >
                {KIT_TEXT[lang].languageLabel}
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
      {children}
    </div>
  );
}
