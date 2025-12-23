import { Language } from "@/lib/LanguageContext";

export const CommunicationLanguages = (lang: Language = "en") => [
  { value: "english", label: lang === "en" ? "English" : "Anglais" },
  { value: "french", label: lang === "en" ? "French" : "Français" },
];
