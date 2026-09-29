import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import type { MealType } from "@/config/event";
import type { MealDay } from "@/lib/conuhacks/meals";

export type MealTableRow = {
  _id: string;
  name: string;
  email: string;
  meals: Array<{
    date: Date;
    type: "breakfast" | "lunch" | "snacks" | "dinner";
    taken: boolean;
  }>;
};

type MealCheckboxProps = {
  mealRow: MealTableRow;
  date: string;
  mealType: "breakfast" | "lunch" | "snacks" | "dinner";
  onUpdate: (mealId: string, updatedMeals: MealTableRow["meals"]) => void;
};

function MealCheckbox({ mealRow, date, mealType, onUpdate }: MealCheckboxProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  // Find the specific meal by date and type
  const meal = mealRow.meals.find(
    (m) => new Date(m.date).toDateString() === new Date(date).toDateString() && m.type === mealType,
  );

  const isChecked = meal?.taken ?? false;

  const handleToggle = async (checked: boolean | "indeterminate") => {
    // Handle indeterminate state
    if (checked === "indeterminate") return;

    setIsLoading(true);

    // Save original state for potential revert
    const originalMeals = [...mealRow.meals];

    // Update local meals data first (like the working example)
    const updatedMeals = mealRow.meals.map((m) => {
      if (new Date(m.date).toDateString() === new Date(date).toDateString() && m.type === mealType) {
        return { ...m, taken: checked };
      }
      return m;
    });

    // Update local state immediately
    onUpdate(mealRow._id, updatedMeals);

    try {
      // Send the ENTIRE meals array to the backend (like the working example)
      console.log("Meal Data to be sent:", updatedMeals);

      const response = await fetch(`/api/users/meals/${mealRow._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealData: updatedMeals,
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error("Failed to update meal");
      }

      const result = await response.json();
      console.log("Success response:", result);

      // Update with server response to ensure consistency
      if (result.data && result.data.meals) {
        onUpdate(mealRow._id, result.data.meals);
      }

      toast.success(
        `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} ${checked ? "marked as taken" : "unmarked"}`,
      );
    } catch (error) {
      console.error("Error updating meal:", error);
      toast.error("Failed to update meal");

      // Revert optimistic update on error
      onUpdate(mealRow._id, originalMeals);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        aria-label={`${mealType} for ${mealRow.name}`}
      />
    </div>
  );
}

const MEAL_TITLES: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

/** Name, email and one checkbox column per meal of the given event day (from EVENT_MEALS). */
export function getMealDayColumns(
  day: MealDay | undefined,
  onUpdate: (mealId: string, updatedMeals: MealTableRow["meals"]) => void,
): ColumnDef<MealTableRow>[] {
  const identity: ColumnDef<MealTableRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span>{row.original.name}</span>,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.email}</span>,
    },
  ];
  if (!day) return identity;

  return [
    ...identity,
    ...day.types.map(
      (mealType): ColumnDef<MealTableRow> => ({
        id: mealType,
        header: ({ column }) => <DataTableColumnHeader column={column} title={MEAL_TITLES[mealType]} />,
        cell: ({ row }) => <MealCheckbox mealRow={row.original} date={day.date} mealType={mealType} onUpdate={onUpdate} />,
        enableSorting: false,
      }),
    ),
  ];
}
