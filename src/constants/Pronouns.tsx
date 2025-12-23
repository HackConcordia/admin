import { Language } from "@/lib/LanguageContext";

export const Pronouns = (lang: Language = "en") => [
  {
    value: "",
    label: lang === "en" ? "Select your pronouns" : "Sélectionnez vos pronoms",
  },
  { value: "he/him", label: lang === "en" ? "He/Him" : "Il/Lui" },
  { value: "she/her", label: lang === "en" ? "She/Her" : "Elle" },
  { value: "they/them", label: lang === "en" ? "They/Them" : "Iel/Ellui" },
  {
    value: "would rather not say",
    label: lang === "en" ? "Would rather not say" : "Préfère ne pas répondre",
  },
];
