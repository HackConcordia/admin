import { Language } from "@/lib/LanguageContext";

export const JobRoles = (lang: Language = "en") => [
  { value: "new-grad", label: lang === "en" ? "New Grad" : "Nouveau diplômé" },
  { value: "intern", label: lang === "en" ? "Intern" : "Stagiaire" },
  { value: "both", label: lang === "en" ? "Both" : "Les deux" },
  { value: "none", label: lang === "en" ? "None" : "Aucun" },
];
