import { Language } from "@/lib/LanguageContext";

export const GraduationSemesters = (lang: Language = "en") => [
  { value: "fall", label: lang === "en" ? "Fall" : "Automne" },
  { value: "winter", label: lang === "en" ? "Winter" : "Hiver" },
  { value: "summer", label: lang === "en" ? "Summer" : "Été" },
];
