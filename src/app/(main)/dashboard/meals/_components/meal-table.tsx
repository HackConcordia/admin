"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getJan24Columns, getJan25Columns, type MealTableRow } from "./columns";

type MealTableProps = {
  initialData: MealTableRow[];
  initialPagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
};

export function MealTable({ initialData, initialPagination }: MealTableProps) {
  const [data, setData] = useState<MealTableRow[]>(initialData);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("jan24");

  // Check if January 25, 2026 is accessible (after midnight EST)
  const isJan25Accessible = useMemo(() => {
    const now = new Date();
    const jan25Start = new Date('2026-01-25T00:00:00-05:00');
    return now >= jan25Start;
  }, []);

  // Handle meal update callback
  const handleMealUpdate = (mealId: string, updatedMeals: MealTableRow['meals']) => {
    setData((prevData) =>
      prevData.map((meal) =>
        meal._id === mealId ? { ...meal, meals: updatedMeals } : meal
      )
    );
  };

  // Get appropriate columns based on active tab
  const columns = useMemo(() => {
    if (activeTab === "jan24") {
      return getJan24Columns(handleMealUpdate);
    }
    return getJan25Columns(handleMealUpdate);
  }, [activeTab]);

  const table = useDataTableInstance({
    data,
    columns,
    getRowId: (row) => row._id,
    enableRowSelection: false,
    defaultPageSize: pagination.pageSize,
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
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/meals?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meals');
      }

      const result = await response.json();
      setData(result.data || []);
      setPagination(result.pagination || pagination);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
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
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <div className="mt-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-3">
            <CardHeader>
              <CardTitle>Meals Management</CardTitle>
              <CardDescription>Track meal consumption for ConuHacks 2026</CardDescription>
            </CardHeader>

            <CardContent>
              <TooltipProvider>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="jan24">
                    January 24, 2026
                  </TabsTrigger>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <TabsTrigger
                          value="jan25"
                          disabled={!isJan25Accessible}
                          className="w-full"
                        >
                          {!isJan25Accessible && (
                            <Lock className="mr-2 h-4 w-4" />
                          )}
                          January 25, 2026
                        </TabsTrigger>
                      </div>
                    </TooltipTrigger>
                    {!isJan25Accessible && (
                      <TooltipContent>
                        <p>Available on January 25, 2026</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TabsList>
              </TooltipProvider>
            </CardContent>
          </div>

          <TabsContent value="jan24" className="mt-4">
            <CardContent>
              <div className="mb-4">
                <h2 className="text-center text-lg font-semibold text-muted-foreground mb-4">
                  MEALS FOR JANUARY 24, 2026
                </h2>
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardContent>

            <CardContent className="flex size-full flex-col gap-4">
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
            </CardContent>
          </TabsContent>

          <TabsContent value="jan25" className="mt-4">
            <CardContent>
              <div className="mb-4">
                <h2 className="text-center text-lg font-semibold text-muted-foreground mb-4">
                  MEALS FOR JANUARY 25, 2026
                </h2>
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardContent>

            <CardContent className="flex size-full flex-col gap-4">
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
            </CardContent>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

