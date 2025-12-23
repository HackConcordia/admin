import { Language } from "@/lib/LanguageContext";

export const CoopTerms = (lang: Language = "en") => [
  { value: "summer-2026", label: lang === "en" ? "Summer 2026" : "Été 2026" },
  { value: "fall-2026", label: lang === "en" ? "Fall 2026" : "Automne 2026" },
  { value: "winter-2027", label: lang === "en" ? "Winter 2027" : "Hiver 2027" },
  { value: "summer-2027", label: lang === "en" ? "Summer 2027" : "Été 2027" },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
];
