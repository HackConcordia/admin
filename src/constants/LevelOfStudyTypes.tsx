import { Language } from "@/lib/LanguageContext";

export const LevelOfStudyTypes = (
  lang: Language = "en"
): { value: string; label: string }[] => [
  {
    value: "Less than Secondary / High School",
    label:
      lang === "en"
        ? "Less than Secondary / High School"
        : "Moins que le secondaire",
  },
  {
    value: "Secondary / High School",
    label: lang === "en" ? "Secondary / High School" : "Secondaire",
  },
  {
    value: "Undergraduate University (2 year - community college or similar)",
    label:
      lang === "en"
        ? "Undergraduate University (2 year - community college or similar)"
        : "Université de premier cycle (2 ans - collège communautaire ou similaire)",
  },
  {
    value: "Undergraduate University (3+ year)",
    label:
      lang === "en"
        ? "Undergraduate University (3+ year)"
        : "Université de premier cycle (3+ ans)",
  },
  {
    value: "Graduate University (Masters, Professional, Doctoral, etc)",
    label:
      lang === "en"
        ? "Graduate University (Masters, Professional, Doctoral, etc)"
        : "Études supérieures (Maîtrise, Professionnel, Doctorat, etc.)",
  },
  {
    value: "Code School / Bootcamp",
    label:
      lang === "en" ? "Code School / Bootcamp" : "École de code / Bootcamp",
  },
  {
    value: "Other Vocational / Trade Program or Apprenticeship",
    label:
      lang === "en"
        ? "Other Vocational / Trade Program or Apprenticeship"
        : "Autre programme professionnel ou apprentissage",
  },
  {
    value: "Post Doctorate",
    label: lang === "en" ? "Post Doctorate" : "Post-doctorat",
  },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
  {
    value: "I'm not currently a student",
    label:
      lang === "en"
        ? "I'm not currently a student"
        : "Je ne suis pas actuellement étudiant",
  },
  {
    value: "Prefer not to answer",
    label: lang === "en" ? "Prefer not to answer" : "Préfère ne pas répondre",
  },
];
