import { Language } from "@/lib/LanguageContext";
import { SCHOOLING_LEVELS, SchoolingLevel } from "@/lib/conuhacks/field-options";

const LABELS: Record<SchoolingLevel, Record<Language, string>> = {
  CEGEP: { en: "CEGEP", fr: "Cégep" },
  Undergraduate: { en: "University – undergraduate", fr: "Université – 1er cycle" },
  Graduate: { en: "University – graduate (master's or PhD)", fr: "Université – cycles supérieurs (maîtrise ou doctorat)" },
  "Recent graduate": { en: "Graduated within the last year", fr: "Diplômé(e) au cours de la dernière année" },
  Other: { en: "Other (bootcamp, vocational program, …)", fr: "Autre (bootcamp, formation professionnelle, …)" },
};

export const SchoolingLevels = (lang: Language = "en") =>
  SCHOOLING_LEVELS.map((value) => ({ value, label: LABELS[value][lang] }));
