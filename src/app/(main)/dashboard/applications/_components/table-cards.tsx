"use client";

import { Download, UserPlus } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [adminEmails, setAdminEmails] = React.useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = React.useState<string>("");
  const [assigning, setAssigning] = React.useState(false);
  const [, forceRerender] = React.useState(0);

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = React.useMemo(() => selectedRows.map((r) => r.original._id), [selectedRows]);

  React.useEffect(() => {
    if (!bulkOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/get-emails");
        if (!res.ok) throw new Error("Failed to load admin emails");
        const json = await res.json();
        const emails: string[] = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) setAdminEmails(emails);
      } catch (_e) {
        toast.error("Failed to load admins");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bulkOpen]);

  async function handleBulkAssign() {
    if (!selectedIds.length) {
      toast.error("No applications selected");
      return;
    }
    if (!selectedEmail) {
      toast.error("Please select an admin");
      return;
    }
    setAssigning(true);
    try {
      const promise = fetch("/api/admin/assign-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAdminEmail: selectedEmail, selectedApplicants: selectedIds }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err?.message || "Failed to assign");
        }
      });
      await toast.promise(promise, {
        loading: "Assigning selected applications...",
        success: "Applications assigned",
        error: (e) => e.message || "Failed to assign",
      });
      // Optimistic update for processedBy
      for (const row of selectedRows) {
        (row.original as any).processedBy = selectedEmail;
      }
      table.resetRowSelection();
      forceRerender((n) => n + 1);
      setBulkOpen(false);
    } finally {
      setAssigning(false);
    }
  }

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
                {isSuperAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} disabled={!selectedIds.length}>
                    <UserPlus />
                    <span className="hidden lg:inline">
                      Assign selected {selectedIds.length ? `(${selectedIds.length})` : ""}
                    </span>
                  </Button>
                )}
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
      {isSuperAdmin && (
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign {selectedIds.length} selected</DialogTitle>
              <DialogDescription>Select an admin to assign the selected applications.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="bulk-assign-admin-email">Admin</Label>
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger id="bulk-assign-admin-email">
                  <SelectValue placeholder="Select admin email" />
                </SelectTrigger>
                <SelectContent>
                  {adminEmails.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAssign} disabled={assigning || !selectedIds.length || !selectedEmail}>
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
