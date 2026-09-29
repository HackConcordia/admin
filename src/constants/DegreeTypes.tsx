import { Language } from "@/lib/LanguageContext";
import { degreeTypeValues } from "@/lib/conuhacks/field-options";

const FR: Record<string, string> = {
  "DEC – pre-university": "DEC – préuniversitaire",
  "DEC – technical": "DEC – technique",
  DEC: "DEC",
  AEC: "AEC",
  "Bachelor's": "Baccalauréat",
  Certificate: "Certificat",
  Diploma: "Diplôme",
  "Master's (thesis)": "Maîtrise (avec mémoire)",
  "Master's (course-based)": "Maîtrise (cours)",
  "Master's": "Maîtrise",
  PhD: "Doctorat",
  "Graduate certificate / diploma": "Certificat / DESS",
  "Certificate / diploma": "Certificat / diplôme",
  Other: "Autre",
};

export const DegreeTypes = (level: string, lang: Language = "en") =>
  degreeTypeValues(level).map((value) => ({ value, label: lang === "fr" ? FR[value] ?? value : value }));
