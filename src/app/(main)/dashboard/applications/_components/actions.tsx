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
};

export function Actions({
  table,
  isSuperAdmin,
  selectedCount,
  onOpenBulkAssign,
  onOpenAutoAssign,
  onOpenExport,
}: ActionsProps) {
  return (
    <div className="my-3 flex w-full gap-3">
      <ApplicationsFilters table={table} />
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
