/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { CSSProperties, ReactNode } from "react";
import { Text } from "react-email";
import { KIT_TEXT } from "./brand";
import { colors, fonts, msoExact, text } from "./theme";
import type { CopyLanguage } from "../types";

/**
 * Lets a long unbroken string (a team name, a name or a URL with no spaces) wrap mid-word
 * instead of widening the card past a phone screen. Text only: never on a Button cell,
 * where it would split the label.
 */
export const wrapAnywhere: CSSProperties = {
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const paragraphStyle: CSSProperties = {
  margin: "0 0 16px",
  color: colors.ink,
  fontFamily: fonts.body,
  fontSize: text.fontSize,
  lineHeight: text.lineHeight,
  ...wrapAnywhere,
  ...msoExact,
};

/** A body paragraph. Pass user data as children (never as HTML). */
export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={paragraphStyle}>{children}</Text>;
}

/** Bold inline text, e.g. the requester's name. */
export function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ fontWeight: 700, color: colors.ink }}>{children}</strong>;
}

/** "Bonjour Ada," / "Hi Ada,", or "Bonjour," / "Hi," when the name is empty. */
export function Greeting({ lang, name }: { lang: CopyLanguage; name?: string }) {
  const trimmed = (name ?? "").trim();
  const greeting = KIT_TEXT[lang].greeting;
  return <Paragraph>{trimmed ? `${greeting} ${trimmed},` : `${greeting},`}</Paragraph>;
}
