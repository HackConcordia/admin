import { Language } from "@/lib/LanguageContext";
import { currentYearValues } from "@/lib/conuhacks/field-options";

const FR: Record<string, string> = {
  "Grade 7": "7e année (secondaire 1)",
  "Grade 8": "8e année (secondaire 2)",
  "Grade 9": "9e année (secondaire 3)",
  "Grade 10": "10e année (secondaire 4)",
  "Grade 11": "11e année (secondaire 5)",
  "Grade 12": "12e année",
  "Year 1": "1re année",
  "Year 2": "2e année",
  "Year 3": "3e année",
  "Year 4": "4e année",
  "Year 4+": "4e année ou plus",
  "Year 5+": "5e année et plus",
  "Master's – year 1": "Maîtrise – 1re année",
  "Master's – year 2+": "Maîtrise – 2e année et plus",
  "PhD – year 1-2": "Doctorat – 1re ou 2e année",
  "PhD – year 3+": "Doctorat – 3e année et plus",
  "Winter 2026": "Hiver 2026",
  "Summer 2026": "Été 2026",
  "Fall 2026": "Automne 2026",
};

/** Choices for the level picked; empty when the year is typed freely (level "Other"). */
export const CurrentYears = (level: string, lang: Language = "en") =>
  (currentYearValues(level) ?? []).map((value) => ({ value, label: lang === "fr" ? FR[value] ?? value : value }));
