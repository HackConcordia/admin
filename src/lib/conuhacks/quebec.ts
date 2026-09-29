import { Cities } from "@/constants/Cities";

/**
 * City values that count as Quebec: every entry of src/constants/Cities.tsx (a copy of the
 * registration app's public/data/Cities.tsx) whose label ends in ", Quebec", including the
 * catch-all "other-quebec". The registration app derives its own list the same way
 * (config/travelReimbursement.ts QUEBEC_CITIES), so both apps agree on who lives in Quebec.
 */
export const QUEBEC_CITIES: readonly string[] = Cities("en")
  .filter((city) => city.label.endsWith(", Quebec"))
  .map((city) => city.value);

/** Lives in Quebec: country CA and a Quebec city (the registration rule, without its policy switch). */
export function isQuebecResident(country: unknown, city: unknown): boolean {
  return country === "CA" && typeof city === "string" && QUEBEC_CITIES.includes(city);
}
