"use client";

import * as React from "react";

import { Sparkles, Download, UserPlus } from "lucide-react";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";

import ApplicationsFilters from "./filters";

type ActionsProps = {
  // `any` here avoids fighting with generics from useDataTableInstance
  table: any;
  isSuperAdmin: boolean;
  selectedCount: number;
  onOpenBulkAssign: () => void;
  onOpenAutoAssign: () => void;
  onOpenExport: () => void;
  initialSearch: string;
  initialStatus: string;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
};

export function Actions({
  table,
  isSuperAdmin,
  selectedCount,
  onOpenBulkAssign,
  onOpenAutoAssign,
  onOpenExport,
  initialSearch,
  initialStatus,
  onSearchChange,
  onStatusChange,
}: ActionsProps) {
  return (
    <div className="my-3 flex w-full gap-3">
      <ApplicationsFilters
        initialSearch={initialSearch}
        initialStatus={initialStatus}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
      />
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        {isSuperAdmin && (
          <>
            <Button variant="outline" size="sm" onClick={onOpenBulkAssign} disabled={selectedCount === 0}>
              <UserPlus />
              <span className="hidden lg:inline">Assign {selectedCount ? `(${selectedCount})` : ""}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenAutoAssign}>
              <Sparkles />
              <span className="hidden lg:inline">Auto Assign</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenExport}>
              <Download />
              <span className="hidden lg:inline">Export</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
