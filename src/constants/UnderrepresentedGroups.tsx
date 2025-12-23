import { Language } from "@/lib/LanguageContext";

export const UnderrepresentedGroups = (lang: Language = "en") => [
  { value: "Yes", label: lang === "en" ? "Yes" : "Oui" },
  { value: "No", label: lang === "en" ? "No" : "Non" },
  { value: "Unsure", label: lang === "en" ? "Unsure" : "Incertain" },
];
