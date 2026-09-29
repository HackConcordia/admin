import { Language } from "@/lib/LanguageContext";

export const LanguagesSpoken = (lang: Language = "en") => [
  { value: "english", label: lang === "en" ? "English" : "Anglais" },
  { value: "french", label: lang === "en" ? "French" : "Français" },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
];
