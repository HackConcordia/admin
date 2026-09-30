import { Language } from "@/lib/LanguageContext";
import { MAX_HACKATHON_COUNT } from "@/lib/conuhacks/field-options";

/** Values are the count as a string ("0".."5"); the form parser turns them into numbers. */
export const HackathonCounts = (lang: Language = "en") =>
  Array.from({ length: MAX_HACKATHON_COUNT + 1 }, (_, count) => ({
    value: String(count),
    label:
      count === 0
        ? lang === "en" ? "0 – this is my first!" : "0 – c'est mon premier!"
        : count === MAX_HACKATHON_COUNT
          ? `${MAX_HACKATHON_COUNT}+`
          : String(count),
  }));
