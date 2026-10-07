/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { CSSProperties } from "react";
import { colors, msoExact, sizes } from "./theme";

/** Only in the plain-text part: a rule between the two language blocks. */
const TEXT_RULE = "-".repeat(40);

/** Hidden in every client (msoHide for Outlook), but html-to-text still prints it. */
const textOnlyStyle = { display: "none", maxHeight: 0, overflow: "hidden", msoHide: "all" } as CSSProperties;

/**
 * The 2px black rule between the French and English blocks, drawn as a filled table
 * cell (Outlook draws an <hr> with its own grey bevel). The text part gets a "----" line
 * from a hidden element instead.
 */
export function LanguageDivider() {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        <tr>
          <td style={{ padding: `${sizes.dividerSpace}px 0` }}>
            <div style={textOnlyStyle}>{TEXT_RULE}</div>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              data-skip-in-text="true"
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      height: "2px",
                      lineHeight: "2px",
                      fontSize: 0,
                      backgroundColor: colors.black,
                      ...msoExact,
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
