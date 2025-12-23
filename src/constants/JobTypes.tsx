import { Language } from "@/lib/LanguageContext";

export const JobTypes = (lang: Language = "en") => [
  {
    value: "software-engineer",
    label:
      lang === "en"
        ? "Software Engineer / Software Developer"
        : "Ingénieur logiciel / Développeur logiciel",
  },
  {
    value: "data-analyst",
    label: lang === "en" ? "Data Analyst" : "Analyste de données",
  },
  {
    value: "data-scientist",
    label: lang === "en" ? "Data Scientist" : "Scientifique de données",
  },
  {
    value: "data-engineer",
    label: lang === "en" ? "Data Engineer" : "Ingénieur de données",
  },
  {
    value: "cybersecurity-analyst",
    label:
      lang === "en" ? "Cybersecurity Analyst" : "Analyste en cybersécurité",
  },
  {
    value: "product-owner",
    label: lang === "en" ? "Product Owner" : "Propriétaire de produit",
  },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
];
