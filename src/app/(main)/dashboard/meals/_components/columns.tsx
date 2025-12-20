import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";

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

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);

    // Save original state for potential revert
    const originalMeals = mealRow.meals;

    // Optimistic update
    const updatedMeals = mealRow.meals.map((m) => {
      if (new Date(m.date).toDateString() === new Date(date).toDateString() && m.type === mealType) {
        return { ...m, taken: checked };
      }
      return m;
    });

    onUpdate(mealRow._id, updatedMeals);

    try {
      const mealData = [
        {
          date: new Date(date),
          type: mealType,
          taken: checked,
        },
      ];

      const response = await fetch(`/api/users/meals/${mealRow._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update meal");
      }

      const result = await response.json();

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

// January 24, 2026 columns
export function getJan24Columns(
  onUpdate: (mealId: string, updatedMeals: MealTableRow["meals"]) => void,
): ColumnDef<MealTableRow>[] {
  const jan24Date = "2026-01-24";

  return [
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
    {
      id: "breakfast",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Breakfast" />,
      cell: ({ row }) => (
        <MealCheckbox mealRow={row.original} date={jan24Date} mealType="breakfast" onUpdate={onUpdate} />
      ),
      enableSorting: false,
    },
    {
      id: "lunch",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lunch" />,
      cell: ({ row }) => <MealCheckbox mealRow={row.original} date={jan24Date} mealType="lunch" onUpdate={onUpdate} />,
      enableSorting: false,
    },
    {
      id: "snacks",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Snacks" />,
      cell: ({ row }) => <MealCheckbox mealRow={row.original} date={jan24Date} mealType="snacks" onUpdate={onUpdate} />,
      enableSorting: false,
    },
    {
      id: "dinner",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dinner" />,
      cell: ({ row }) => <MealCheckbox mealRow={row.original} date={jan24Date} mealType="dinner" onUpdate={onUpdate} />,
      enableSorting: false,
    },
  ];
}

// January 25, 2026 columns
export function getJan25Columns(
  onUpdate: (mealId: string, updatedMeals: MealTableRow["meals"]) => void,
): ColumnDef<MealTableRow>[] {
  const jan25Date = "2026-01-25";

  return [
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
    {
      id: "breakfast",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Breakfast" />,
      cell: ({ row }) => (
        <MealCheckbox mealRow={row.original} date={jan25Date} mealType="breakfast" onUpdate={onUpdate} />
      ),
      enableSorting: false,
    },
    {
      id: "lunch",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lunch" />,
      cell: ({ row }) => <MealCheckbox mealRow={row.original} date={jan25Date} mealType="lunch" onUpdate={onUpdate} />,
      enableSorting: false,
    },
  ];
}
