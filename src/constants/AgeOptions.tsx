import { Language } from "@/lib/LanguageContext";
import { AGE_VALUES } from "@/lib/conuhacks/field-options";

/** Age on the first day of ConUHacks XI (Feb 6, 2027). "under-18" triggers the consent-form notice. */
export const AgeOptions = (lang: Language = "en") =>
  AGE_VALUES.map((value) => ({
    value,
    label: value === "under-18" ? (lang === "en" ? "Under 18" : "Moins de 18 ans") : value,
  }));
