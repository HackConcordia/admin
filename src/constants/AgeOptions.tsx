import { Language } from "@/lib/LanguageContext";

export const AgeOptions = (lang: Language = "en") => [
  { value: "yes", label: lang === "en" ? "Yes" : "Oui" },
  { value: "no", label: lang === "en" ? "No" : "Non" },
];
