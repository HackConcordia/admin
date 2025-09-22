"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { applicationsColumns, type ApplicationTableRow } from "./columns";

export function TableCards() {
  const [data, setData] = React.useState<ApplicationTableRow[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function fetchApplications() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/users`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed with ${res.status}`);
        }

        const json = await res.json();
        const applications = (json?.data ?? []) as any[];
        const rows: ApplicationTableRow[] = applications.map((a) => ({
          _id: a._id,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          status: a.status,
          processedBy: a.processedBy,
        }));
        setData(rows);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    }

    fetchApplications();
    return () => controller.abort();
  }, []);

  const table = useDataTableInstance({
    data,
    columns: applicationsColumns,
    getRowId: (row) => row._id,
  });

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <div className="mt-5">
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Track and manage your applications and their status.</CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              <DataTableViewOptions table={table} />
              <Button variant="outline" size="sm">
                <Download />
                <span className="hidden lg:inline">Export</span>
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="mt-4 flex size-full flex-col gap-4">
          <div className="overflow-hidden rounded-md border">
            {isLoading ? (
              <div className="text-muted-foreground p-6 text-sm">Loading applications…</div>
            ) : error ? (
              <div className="p-6 text-sm text-red-600">{error}</div>
            ) : (
              <DataTable table={table} columns={applicationsColumns} />
            )}
          </div>
          <DataTablePagination table={table} />
        </CardContent>
      </div>
    </div>
  );
}
