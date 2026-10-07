/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { CSSProperties, ReactNode } from "react";
import { colors, fonts, msoExact } from "./theme";
import { emailUrl } from "./url";

export type ButtonVariant = "primary" | "secondary";

const BORDER = `2px solid ${colors.black}`;
// The thicker bottom edge is the "pressed sticker" look; borders survive Outlook, box-shadow does not.
const BOTTOM_BORDER = `4px solid ${colors.black}`;

const FILL: Record<ButtonVariant, string> = {
  primary: colors.accent,
  secondary: colors.white,
};

/**
 * A "bulletproof" button: the border and fill sit on a table cell (Outlook draws those),
 * the padding sits on the link so the whole block is clickable everywhere else.
 * Clickable area: 14px + 20px + 14px = 48px tall (the touch-target minimum);
 * drawn with the 2px top and 4px bottom borders: 54px.
 * `href` must be absolute https (or http://localhost): anything else throws.
 * `ariaLabel` names the link for screen readers when the visible label alone is ambiguous
 * (several "Accept" buttons in one email); it should start with the visible label.
 */
export function Button({
  href,
  children,
  variant = "primary",
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  ariaLabel?: string;
}) {
  const cellStyle: CSSProperties = {
    backgroundColor: FILL[variant],
    border: BORDER,
    borderBottom: BOTTOM_BORDER,
    borderRadius: 0,
    msoPaddingAlt: "14px 28px",
    ...msoExact,
  } as CSSProperties;
  const linkStyle: CSSProperties = {
    display: "block",
    padding: "14px 28px",
    color: colors.black,
    backgroundColor: FILL[variant],
    fontFamily: fonts.body,
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "20px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    textDecoration: "none",
    textAlign: "center",
  };
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: "separate" }}>
      <tbody>
        <tr>
          <td align="center" style={cellStyle}>
            <a
              href={emailUrl(href)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ariaLabel}
              style={linkStyle}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
