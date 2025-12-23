import { Language } from "@/lib/LanguageContext";

export const WorkRegions = (lang: Language = "en") => [
  { value: "quebec", label: lang === "en" ? "Quebec" : "Québec" },
  { value: "ontario", label: lang === "en" ? "Ontario" : "Ontario" },
  {
    value: "british-columbia",
    label: lang === "en" ? "British Columbia" : "Colombie-Britannique",
  },
  {
    value: "rest-of-canada",
    label: lang === "en" ? "Rest of Canada" : "Reste du Canada",
  },
  { value: "new-york", label: lang === "en" ? "New York" : "New York" },
  { value: "california", label: lang === "en" ? "California" : "Californie" },
  {
    value: "washington-state",
    label: lang === "en" ? "Washington State" : "État de Washington",
  },
  {
    value: "rest-of-usa",
    label: lang === "en" ? "Rest of USA" : "Reste des États-Unis",
  },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
];
