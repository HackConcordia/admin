/** Display helpers for ConUHacks XI applications: English labels for stored option values. Client-safe. */
import { AgeOptions } from "@/constants/AgeOptions";
import { Cities } from "@/constants/Cities";
import { CommunicationLanguages } from "@/constants/CommunicationLanguages";
import { Countries } from "@/constants/Countries";
import { DietaryRestrictions } from "@/constants/DietaryRestrictions";
import { Disciplines } from "@/constants/Disciplines";
import { LanguagesSpoken } from "@/constants/LanguagesSpoken";
import { SchoolingLevels } from "@/constants/SchoolingLevels";
import { Schools } from "@/constants/Schools";
import { MAX_HACKATHON_COUNT } from "@/lib/conuhacks/field-options";
import { parseListField } from "@/lib/conuhacks/list-field";

export interface Option {
  value: string;
  label: string;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** The English label of a stored option value; the value itself when it isn't listed (stored data is never hidden). */
export function optionLabel(options: readonly Option[], value: unknown): string {
  const stored = text(value);
  if (!stored) return "";
  return options.find((option) => option.value === stored)?.label ?? stored;
}

/** Labels of a stored multi-select (any shape parseListField reads), "none" left out, joined with " | ". */
export function formatList(value: unknown, options: readonly Option[]): string {
  return parseListField(value)
    .filter((item) => item.trim() !== "" && item.toLowerCase() !== "none")
    .map((item) => optionLabel(options, item))
    .join(" | ");
}

function withOther(listedValue: unknown, label: string, other: unknown): string {
  const typed = text(other);
  return text(listedValue).toLowerCase() === "other" && typed ? `Other (${typed})` : label;
}

export const formatAge = (age: unknown): string => optionLabel(AgeOptions("en"), age);
export const formatCountry = (country: unknown): string => optionLabel(Countries("en"), country);
export const formatCity = (city: unknown): string => optionLabel(Cities("en"), city);
export const formatCommunicationLanguage = (value: unknown): string => optionLabel(CommunicationLanguages("en"), value);

/** The typed name when the applicant picked "other" (event-checkin lib/school.ts rule), else the listed school. */
export function formatSchool(school: unknown, schoolOther: unknown): string {
  const typed = text(schoolOther);
  if (typed && (!text(school) || text(school).toLowerCase() === "other")) return typed;
  return optionLabel(Schools("en"), school);
}

export const formatLevel = (level: unknown, otherLevel: unknown): string =>
  withOther(level, optionLabel(SchoolingLevels("en"), level), otherLevel);

export const formatDiscipline = (discipline: unknown, disciplineOther: unknown): string =>
  withOther(discipline, optionLabel(Disciplines("en"), discipline), disciplineOther);

export function formatLanguagesSpoken(value: unknown, other: unknown): string {
  const typed = text(other);
  return parseListField(value)
    .map((item) => (item === "other" && typed ? `Other (${typed})` : optionLabel(LanguagesSpoken("en"), item)))
    .join(" | ");
}

/** The registration form requires an answer ("none" allowed), so an empty list reads as "None". */
export function formatDietaryRestrictions(value: unknown): string {
  return formatList(value, DietaryRestrictions("en")) || "None";
}

export function formatHackathons(value: unknown): string {
  if (typeof value !== "number" || !Number.isInteger(value)) return "";
  return value >= MAX_HACKATHON_COUNT ? `${MAX_HACKATHON_COUNT}+` : String(value);
}

export type TravelAnswer = "Yes" | "No" | "Not answered";

/** null or missing means the applicant hasn't answered: never "No". */
export function formatTravelAnswer(value: unknown): TravelAnswer {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not answered";
}

export const formatYesNo = (value: unknown): "Yes" | "No" => (value === true ? "Yes" : "No");
