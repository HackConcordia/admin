/** Letters that Unicode doesn't split into a base letter + accent, so stripping accents can't fold them. */
const SPELLED_OUT_LETTERS: Readonly<Record<string, string>> = {
  ß: "ss", ẞ: "SS", Æ: "AE", æ: "ae", Œ: "OE", œ: "oe", Ø: "O", ø: "o",
  Đ: "D", đ: "d", Ð: "D", ð: "d", Ł: "L", ł: "l", Þ: "Th", þ: "th", ı: "i",
};

/**
 * "Français" → "Francais", "Straße" → "Strasse"; anything else outside printable ASCII (emoji,
 * CJK, …) becomes one "_". NFKD also splits a precomposed "ç" into "c" + U+0327, so the precomposed
 * and decomposed (macOS) spellings end up identical. Same rule as the registration app's
 * lib/files/resumeUpload.ts: a header value can't hold U+0327, so such a name made the download throw.
 */
export function toAsciiFileName(name: string): string {
  return Array.from(name.normalize("NFKD").replace(/\p{M}/gu, ""))
    .map((ch) => SPELLED_OUT_LETTERS[ch] ?? ch)
    .join("")
    .replace(/[^\x20-\x7e]+/g, "_")
    .replace(/_{2,}/g, "_");
}
