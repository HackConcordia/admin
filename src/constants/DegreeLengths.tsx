import { Language } from "@/lib/LanguageContext";
import { degreeLengthValues } from "@/lib/conuhacks/field-options";

const FR: Record<string, string> = { "1 year": "1 an", "2 years": "2 ans", "3 years": "3 ans", "4 years": "4 ans", "5+ years": "5 ans et plus", Other: "Autre" };

/** Choices for the level picked (CEGEP has its own); empty when degree details are not asked. */
export const DegreeLengths = (level: string, lang: Language = "en") =>
  degreeLengthValues(level).map((value) => ({ value, label: lang === "fr" ? FR[value] ?? value : value }));
