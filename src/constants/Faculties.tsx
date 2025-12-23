import { Language } from "@/lib/LanguageContext";

export const Faculties = (lang: Language = "en") => [
  { value: "fine-arts", label: lang === "en" ? "Fine Arts" : "Beaux-arts" },
  {
    value: "liberal-arts",
    label: lang === "en" ? "Liberal Arts" : "Arts libéraux",
  },
  { value: "engineering", label: lang === "en" ? "Engineering" : "Génie" },
  { value: "business", label: lang === "en" ? "Business" : "Commerce" },
  { value: "science", label: lang === "en" ? "Science" : "Sciences" },
  {
    value: "mathematics",
    label: lang === "en" ? "Mathematics" : "Mathématiques",
  },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
];
