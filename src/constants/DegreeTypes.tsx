import { Language } from "@/lib/LanguageContext";
import { degreeTypeValues } from "@/lib/conuhacks/field-options";

/** English labels that differ from the stored value. */
const EN: Record<string, string> = {
  DEC: "DEC (Diploma of College Studies)",
  AEC: "AEC (Attestation of College Studies)",
};

const FR: Record<string, string> = {
  DEC: "DEC (diplôme d'études collégiales)",
  AEC: "AEC (attestation d'études collégiales)",
  Technical: "Technique",
  "Bachelor's": "Baccalauréat",
  Certificate: "Certificat",
  Diploma: "Diplôme",
  "Master's (thesis)": "Maîtrise (avec mémoire)",
  "Master's (course-based)": "Maîtrise (avec cours)",
  "Master's": "Maîtrise",
  PhD: "Doctorat",
  "Graduate certificate / diploma": "Certificat / DESS",
  "Certificate / diploma": "Certificat / diplôme",
  Other: "Autre",
};

export const DegreeTypes = (level: string, lang: Language = "en") =>
  degreeTypeValues(level).map((value) => ({ value, label: lang === "fr" ? FR[value] ?? value : EN[value] ?? value }));
