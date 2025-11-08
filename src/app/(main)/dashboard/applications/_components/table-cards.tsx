"use client";

import { Download } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getApplicationsColumns, type ApplicationTableRow } from "./columns";
import ApplicationsFilters from "./filters";

type TableCardsProps = {
  initialData: ApplicationTableRow[];
  isSuperAdmin: boolean;
};

export function TableCards({ initialData, isSuperAdmin }: TableCardsProps) {
  const table = useDataTableInstance({
    data: initialData ?? [],
    columns: getApplicationsColumns(isSuperAdmin),
    getRowId: (row) => row._id,
  });

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <div className="mt-5">
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Track and manage your applications and their status.</CardDescription>
          <CardAction>
            <div className="flex w-full flex-col gap-3">
              <ApplicationsFilters table={table} />
              <div className="flex items-center gap-2">
                <DataTableViewOptions table={table} />
                <Button variant="outline" size="sm">
                  <Download />
                  <span className="hidden lg:inline">Export</span>
                </Button>
              </div>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="mt-4 flex size-full flex-col gap-4">
          <div className="overflow-hidden rounded-md border">
            <DataTable table={table} columns={getApplicationsColumns(isSuperAdmin)} />
          </div>
          <DataTablePagination table={table} />
        </CardContent>
      </div>
    </div>
  );
}
