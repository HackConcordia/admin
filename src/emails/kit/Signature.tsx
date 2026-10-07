/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import { Text } from "react-email";
import { KIT_TEXT } from "./brand";
import { colors, fonts, msoExact, text } from "./theme";
import type { CopyLanguage } from "../types";

/** A short accent bar, then "L'équipe HackConcordia" / "The HackConcordia Team". */
export function Signature({ lang }: { lang: CopyLanguage }) {
  return (
    <>
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ margin: "24px 0 12px" }}
        data-skip-in-text="true"
      >
        <tbody>
          <tr>
            <td
              width={32}
              style={{
                width: "32px",
                height: "4px",
                lineHeight: "4px",
                fontSize: 0,
                backgroundColor: colors.accent,
                ...msoExact,
              }}
            >
              &nbsp;
            </td>
          </tr>
        </tbody>
      </table>
      <Text
        style={{
          margin: 0,
          color: colors.ink,
          fontFamily: fonts.body,
          fontSize: text.fontSize,
          lineHeight: text.lineHeight,
          fontWeight: 700,
          ...msoExact,
        }}
      >
        {KIT_TEXT[lang].signature}
      </Text>
    </>
  );
}
