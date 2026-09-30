"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import type { MealDay } from "@/lib/conuhacks/meals";

import { getMealDayColumns, type MealTableRow } from "./columns";

type MealTableProps = {
  initialData: MealTableRow[];
  initialPagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  eventName: string;
  mealDays: MealDay[];
  configError: string | null;
};

export function MealTable({ initialData, initialPagination, eventName, mealDays, configError }: MealTableProps) {
  const [data, setData] = useState<MealTableRow[]>(initialData);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState(mealDays[0]?.date ?? "");

  // Track the previous search value to detect actual user changes
  const prevSearchRef = React.useRef(search);

  // Handle meal update callback
  const handleMealUpdate = (mealId: string, updatedMeals: MealTableRow["meals"]) => {
    setData((prevData) => prevData.map((meal) => (meal._id === mealId ? { ...meal, meals: updatedMeals } : meal)));
  };

  // Get appropriate columns based on active tab
  const columns = useMemo(
    () => getMealDayColumns(mealDays.find((day) => day.date === activeTab) ?? mealDays[0], handleMealUpdate),
    [activeTab, mealDays],
  );

  const table = useDataTableInstance({
    data,
    columns,
    getRowId: (row) => row._id,
    enableRowSelection: false,
    defaultPageSize: pagination.pageSize,
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  // Fetch data from API
  const fetchData = async (page: number, searchTerm: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/meals?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch meals");
      }

      const result = await response.json();
      setData(result.data || []);
      setPagination(result.pagination || pagination);
    } catch (error) {
      console.error("Error fetching meals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search - only fetch when search value actually changes from user input
  useEffect(() => {
    // Skip if search value hasn't actually changed (handles initial mount and strict mode)
    if (prevSearchRef.current === search) {
      return;
    }

    const timer = setTimeout(() => {
      prevSearchRef.current = search;
      setCurrentPage(1);
      fetchData(1, search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle page change
  useEffect(() => {
    const pageIndex = table.getState().pagination.pageIndex;
    const newPage = pageIndex + 1;
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchData(newPage, search);
    }
  }, [table.getState().pagination.pageIndex]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2>Meals Management</h2>
        <p className="text-xs text-muted-foreground">Track meal consumption for {eventName}</p>
      </div>
      {configError && <p className="text-sm text-red-600">Meal schedule unavailable: {configError}</p>}
      {!configError && mealDays.length === 0 && (
        <p className="text-sm text-muted-foreground">No meals are scheduled for this event (EVENT_MEALS is empty).</p>
      )}
      {mealDays.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {mealDays.map((day) => (
              <TabsTrigger key={day.date} value={day.date}>
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="my-4 w-full"
          />
          {mealDays.map((day) => (
            <TabsContent key={day.date} value={day.date}>
              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-md border">
                  {loading ? (
                    <div className="flex h-24 items-center justify-center">
                      <p className="text-muted-foreground">Loading...</p>
                    </div>
                  ) : (
                    <DataTable table={table} columns={columns} />
                  )}
                </div>
                <DataTablePagination table={table} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
