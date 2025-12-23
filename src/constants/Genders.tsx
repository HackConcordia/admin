import { Language } from "@/lib/LanguageContext";

export const Genders = (lang: Language = "en") => [
  {
    value: "",
    label: lang === "en" ? "Select your gender" : "Sélectionnez votre genre",
  },
  { value: "male", label: lang === "en" ? "Male" : "Homme" },
  { value: "female", label: lang === "en" ? "Female" : "Femme" },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
  {
    value: "would rather not say",
    label: lang === "en" ? "Would rather not say" : "Préfère ne pas répondre",
  },
];
