"use client";

import { Download, UserPlus, Sparkles } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportFilter, setExportFilter] = React.useState<string>("all");
  const [exporting, setExporting] = React.useState(false);

  const [autoAssignOpen, setAutoAssignOpen] = React.useState(false);
  const [autoAssigning, setAutoAssigning] = React.useState(false);
  const [autoAssignStats, setAutoAssignStats] = React.useState<{
    unassignedCount: number;
    reviewerCount: number;
  } | null>(null);

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

  React.useEffect(() => {
    if (!autoAssignOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [unassignedRes, reviewersRes] = await Promise.all([
          fetch("/api/admin/get-emails"),
          table.getCoreRowModel().rows.length,
        ]);

        const reviewersJson = await unassignedRes.json();
        const reviewerCount = Array.isArray(reviewersJson?.data) ? reviewersJson.data.length : 0;

        const unassignedCount = table
          .getCoreRowModel()
          .rows.filter(
            (row) => row.original.status === "Submitted" && row.original.processedBy === "Not processed",
          ).length;

        if (!cancelled) {
          setAutoAssignStats({ unassignedCount, reviewerCount });
        }
      } catch (_e) {
        toast.error("Failed to load assignment statistics");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoAssignOpen, table]);

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

  async function handleExport() {
    if (!exportFilter) {
      toast.error("Please select an export filter");
      return;
    }

    setExporting(true);
    try {
      const promise = fetch(`/api/resumes/export?statusFilter=${exportFilter}`).then(async (response) => {
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.message || "Failed to export resumes");
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Extract filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `resumes_${exportFilter}_${new Date().toISOString().slice(0, 10)}.zip`;
        if (contentDisposition) {
          // Improved regex to properly extract filename without quotes
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=\s*(['"]?)([^'"\n]*)\1/i);
          if (filenameMatch && filenameMatch[2]) {
            filename = filenameMatch[2];
          }
        }

        // Ensure the filename always has .zip extension
        if (!filename.toLowerCase().endsWith(".zip")) {
          filename += ".zip";
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });

      await toast.promise(promise, {
        loading: "Exporting resumes...",
        success: "Resumes exported successfully",
        error: (e) => e.message || "Failed to export resumes",
      });

      setExportOpen(false);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(false);
    }
  }

  async function handleAutoAssign() {
    setAutoAssigning(true);
    try {
      const result = await fetch("/api/admin/auto-assign-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err?.message || "Failed to auto-assign");
        }
        return r.json();
      });

      const stats = result?.data;

      if (stats?.totalAssigned === 0) {
        toast.success("No unassigned applications found");
      } else {
        toast.success(
          `Successfully assigned ${stats?.totalAssigned} applications to ${stats?.reviewerStats?.length} reviewers`,
        );
      }

      forceRerender((n) => n + 1);
      setAutoAssignOpen(false);

      if (stats?.reviewerStats && stats.reviewerStats.length > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      console.error("Auto-assign error:", error);
      toast.error(error?.message || "Failed to auto-assign");
    } finally {
      setAutoAssigning(false);
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
                {isSuperAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setAutoAssignOpen(true)}>
                    <Sparkles />
                    <span className="hidden lg:inline">Auto Assign</span>
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                    <Download />
                    <span className="hidden lg:inline">Export</span>
                  </Button>
                )}
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
      {isSuperAdmin && (
        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Resumes</DialogTitle>
              <DialogDescription>Select which applicant resumes to export as a ZIP file.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Label>Filter by Status</Label>
              <RadioGroup value={exportFilter} onValueChange={setExportFilter}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="export-all" />
                  <Label htmlFor="export-all" className="cursor-pointer font-normal">
                    All Submitted Applicants
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admitted" id="export-admitted" />
                  <Label htmlFor="export-admitted" className="cursor-pointer font-normal">
                    Admitted Applicants Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="confirmed" id="export-confirmed" />
                  <Label htmlFor="export-confirmed" className="cursor-pointer font-normal">
                    Confirmed Applicants Only
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setExportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={exporting || !exportFilter}>
                {exporting ? "Exporting..." : "Export"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {isSuperAdmin && (
        <Dialog open={autoAssignOpen} onOpenChange={setAutoAssignOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Auto Assign Applications</DialogTitle>
              <DialogDescription>
                Automatically distribute unassigned applications to reviewers while keeping teams together.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {autoAssignStats ? (
                <div className="bg-muted rounded-md p-4 text-sm">
                  <div className="mb-2 font-medium">Assignment Preview:</div>
                  <ul className="text-muted-foreground space-y-1">
                    <li>Unassigned applications: {autoAssignStats.unassignedCount}</li>
                    <li>Available reviewers: {autoAssignStats.reviewerCount}</li>
                    <li>
                      Estimated per reviewer: ~
                      {autoAssignStats.reviewerCount > 0
                        ? Math.ceil(autoAssignStats.unassignedCount / autoAssignStats.reviewerCount)
                        : 0}
                    </li>
                  </ul>
                  <div className="text-muted-foreground mt-3 text-xs">
                    Note: Team members will be assigned together to the same reviewer.
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">Loading statistics...</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setAutoAssignOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAutoAssign}
                disabled={autoAssigning || !autoAssignStats || autoAssignStats.unassignedCount === 0}
              >
                {autoAssigning ? "Assigning..." : "Auto Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
