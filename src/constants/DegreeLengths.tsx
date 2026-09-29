import { Language } from "@/lib/LanguageContext";
import { DEGREE_LENGTHS } from "@/lib/conuhacks/field-options";

const FR: Record<string, string> = { "1 year": "1 an", "2 years": "2 ans", "3 years": "3 ans", "4 years": "4 ans", "5+ years": "5 ans et plus" };

export const DegreeLengths = (lang: Language = "en") =>
  DEGREE_LENGTHS.map((value) => ({ value, label: lang === "fr" ? FR[value] : value }));
