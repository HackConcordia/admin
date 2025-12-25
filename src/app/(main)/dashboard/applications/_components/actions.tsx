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
  initialTravelReimbursement: string;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onTravelReimbursementChange: (value: string) => void;
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
  initialTravelReimbursement,
  initialAssignedStatus,
  onSearchChange,
  onStatusChange,
  onTravelReimbursementChange,
  onAssignedStatusChange,
}: ActionsProps & {
  initialAssignedStatus?: string;
  onAssignedStatusChange?: (status: string) => void;
}) {
  return (
    <div className="mt-3 mb-1 flex w-full gap-3">
      <ApplicationsFilters
        initialSearch={initialSearch}
        initialStatus={initialStatus}
        initialTravelReimbursement={initialTravelReimbursement}
        initialAssignedStatus={initialAssignedStatus}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        onTravelReimbursementChange={onTravelReimbursementChange}
        onAssignedStatusChange={onAssignedStatusChange}
      />
      <div className="flex gap-2">
        <DataTableViewOptions table={table} />
        {isSuperAdmin && (
          <>
            <Button variant="outline" onClick={onOpenBulkAssign} disabled={selectedCount === 0}>
              <UserPlus />
              <span className="hidden lg:inline">Assign {selectedCount ? `(${selectedCount})` : ""}</span>
            </Button>
            <Button variant="outline" onClick={onOpenAutoAssign}>
              <Sparkles />
              <span className="hidden lg:inline">Auto Assign</span>
            </Button>
            <Button variant="outline" onClick={onOpenExport}>
              <Download />
              <span className="hidden lg:inline">Export</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
