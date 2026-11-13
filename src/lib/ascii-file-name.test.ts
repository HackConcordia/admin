import { describe, expect, it } from "vitest";

import { toAsciiFileName } from "@/lib/ascii-file-name";

describe("toAsciiFileName", () => {
  it("replaces accented letters with plain English ones, precomposed or decomposed", () => {
    expect(toAsciiFileName("Sabrina CV - Français.pdf")).toBe("Sabrina CV - Francais.pdf");
    // macOS names are often decomposed: "c" + U+0327 COMBINING CEDILLA (this one broke the resume download).
    expect(toAsciiFileName("Sabrina CV - Français.pdf")).toBe("Sabrina CV - Francais.pdf");
    expect(toAsciiFileName("Éloïse Côté-Hébert.pdf")).toBe("Eloise Cote-Hebert.pdf");
  });

  it("spells out letters that have no accent to strip", () => {
    expect(toAsciiFileName("Straße Œuvre Æsir Øre Łódź.pdf")).toBe("Strasse OEuvre AEsir Ore Lodz.pdf");
  });

  it("turns any other run of non-ASCII characters into a single underscore", () => {
    expect(toAsciiFileName("CV 🚀 简历 final.pdf")).toBe("CV _ _ final.pdf");
  });

  it("only ever returns printable ASCII", () => {
    for (const name of ["Ğüşİöç.pdf", "Ñandú.pdf", "Ⅻ ﬁle.pdf", "a b.pdf", "x​y.pdf", "bad\ud800.pdf"]) {
      expect(toAsciiFileName(name)).toMatch(/^[\x20-\x7e]+$/);
    }
  });
});
