import { Language } from "@/lib/LanguageContext";
import { DISCIPLINES } from "@/lib/conuhacks/field-options";

const LABELS: Record<(typeof DISCIPLINES)[number], Record<Language, string>> = {
  "computer-science": { en: "Computer Science", fr: "Informatique" },
  "software-engineering": { en: "Software Engineering", fr: "Génie logiciel" },
  "computer-engineering": { en: "Computer Engineering", fr: "Génie informatique" },
  "electrical-engineering": { en: "Electrical Engineering", fr: "Génie électrique" },
  "mechanical-engineering": { en: "Mechanical Engineering", fr: "Génie mécanique" },
  "other-engineering": { en: "Other Engineering", fr: "Autre génie" },
  "mathematics-statistics": { en: "Mathematics / Statistics", fr: "Mathématiques / statistique" },
  "data-science": { en: "Data Science", fr: "Science des données" },
  business: { en: "Business / Commerce", fr: "Administration / commerce" },
  "design-fine-arts": { en: "Design / Fine Arts", fr: "Design / beaux-arts" },
  "natural-sciences": { en: "Natural Sciences", fr: "Sciences naturelles" },
  "social-sciences-humanities": { en: "Social Sciences / Humanities", fr: "Sciences sociales / sciences humaines" },
  other: { en: "Other", fr: "Autre" },
};

export const Disciplines = (lang: Language = "en") => DISCIPLINES.map((value) => ({ value, label: LABELS[value][lang] }));
