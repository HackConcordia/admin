import { MEAL_TYPES, type MealSlot, type MealType } from "@/config/event";

export interface MealRecordEntry {
  date: Date;
  type: MealType;
  taken: boolean;
}

/** UTC midnight of each configured day, the same instant event-checkin writes (lib/checkin/mealRecords.ts). */
export function buildMealRecords(slots: readonly MealSlot[]): MealRecordEntry[] {
  return slots.map((slot) => ({ date: new Date(`${slot.date}T00:00:00.000Z`), type: slot.type, taken: false }));
}

export interface MealDay {
  date: string;
  label: string;
  types: MealType[];
}

const DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** One tab per event day, in date order, with that day's meals in schedule order. */
export function groupMealDays(slots: readonly MealSlot[]): MealDay[] {
  const dates = [...new Set(slots.map((slot) => slot.date))].sort();
  return dates.map((date) => ({
    date,
    label: DAY_LABEL.format(new Date(`${date}T00:00:00.000Z`)),
    types: MEAL_TYPES.filter((type) => slots.some((slot) => slot.date === date && slot.type === type)),
  }));
}
