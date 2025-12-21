import { Language } from "@/lib/LanguageContext";

export const Programs = (lang: Language = "en") => [
  {
    value: "computer-science",
    label: lang === "en" ? "Computer Science" : "Informatique",
  },
  {
    value: "software-engineering",
    label: lang === "en" ? "Software Engineering" : "Génie logiciel",
  },
  {
    value: "computer-engineering",
    label: lang === "en" ? "Computer Engineering" : "Génie informatique",
  },
  {
    value: "electrical-engineering",
    label: lang === "en" ? "Electrical Engineering" : "Génie électrique",
  },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
];
