// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Visual tokens for every email (design spec section 5: "printed event pass").
// Inline styles carry the design; the one <style> block (Layout.tsx) only adds phone tweaks.

import type { CSSProperties } from "react";

export const colors = {
  paper: "#F1F0EE", // page background (the marketing site's "paper")
  white: "#FFFFFF",
  black: "#0A0A0A", // header/footer bands, borders, label tag
  ink: "#161616", // body text
  muted: "#5C5C5C", // secondary text on white (contrast >= 4.5:1)
  bandText: "#BDBDBD", // secondary text on the black bands
  accent: "#AE9162", // the one accent: ConUHacks gold
} as const;

export const fonts = {
  body: "Poppins, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  /** Used by Outlook for Windows, which would otherwise fall back to Times New Roman. */
  outlookFallback: "Arial, Helvetica, sans-serif",
  googleFontsHref: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap",
} as const;

export const sizes = {
  containerWidth: 600,
  frameWidth: 2,
  bodyPaddingX: 40,
  bodyPaddingY: 40,
  bandPaddingX: 32,
  mobilePaddingX: 24,
  accentBarHeight: 6,
  logoWidth: 48,
  socialIconSize: 32,
  dividerSpace: 32,
  stubSpace: 24,
} as const;

// Pixel line-heights everywhere: Outlook's Word engine misreads unitless ones.
export const text = {
  fontSize: "16px",
  lineHeight: "26px", // 16px × 1.6
  smallFontSize: "13px",
  smallLineHeight: "20px", // 13px × 1.5
  tinyFontSize: "12px",
} as const;

/**
 * `mso-line-height-rule: exactly`, so Outlook keeps a line-height as written
 * (React's CSSProperties has no type for mso-* properties).
 */
export const msoExact = { msoLineHeightRule: "exactly" } as CSSProperties;

/** Phone-width breakpoint for the Layout's <style> block. */
export const MOBILE_MAX_WIDTH = 480;
