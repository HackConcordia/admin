"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { CardHeader, CardTitle, CardContent, CardDescription, Card } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { Actions } from "./actions";
import { AutoAssignDialog } from "./auto-assign-dialog";
import { BulkAssignDialog } from "./bulk-assign-dialog";
import { ApplicationTableRow, getApplicationsColumns } from "./columns";
import { ExportDialog } from "./export-dialog";

type TableCardsProps = {
  initialData: ApplicationTableRow[];
  isSuperAdmin: boolean;
};

type AutoAssignStats = {
  unassignedCount: number;
  reviewerCount: number;
} | null;

export function ApplicationTable({ initialData, isSuperAdmin }: TableCardsProps) {
  const columns = useMemo(() => getApplicationsColumns(isSuperAdmin), [isSuperAdmin]);

  const table = useDataTableInstance({
    data: initialData,
    columns,
    getRowId: (row) => row._id,
  });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFilter, setExportFilter] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignStats, setAutoAssignStats] = useState<AutoAssignStats>(null);

  const [, forceRerender] = useState(0);

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = useMemo(() => selectedRows.map((r) => r.original._id), [selectedRows]);
  const selectedCount = selectedIds.length;

  // Shared admin email loading (used for bulk assign and auto-assign)
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!bulkOpen && !autoAssignOpen) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/get-emails");
        if (!res.ok) throw new Error("Failed to load admin emails");
        const json = await res.json();
        const emails: string[] = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setAdminEmails(emails);
        }
      } catch {
        toast.error("Failed to load admins");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bulkOpen, autoAssignOpen, isSuperAdmin]);

  // Auto-assign statistics (uses already-loaded admin emails)
  useEffect(() => {
    if (!autoAssignOpen) return;

    const unassignedCount = table
      .getCoreRowModel()
      .rows.filter((row) => row.original.status === "Submitted" && row.original.processedBy === "Not processed").length;

    const reviewerCount = adminEmails.length;

    setAutoAssignStats({ unassignedCount, reviewerCount });
  }, [autoAssignOpen, adminEmails, table]);

  async function handleBulkAssign() {
    if (!selectedCount) {
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
          throw new Error(err?.message && "Failed to assign");
        }
      });

      await toast.promise(promise, {
        loading: "Assigning selected applications...",
        success: "Applications assigned",
        error: (e) => e.message && "Failed to assign",
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
          throw new Error(err?.message && "Failed to export resumes");
        }

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `resumes_${exportFilter}_${new Date().toISOString().slice(0, 10)}.zip`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=\s*(['"]?)([^'"\n]*)\1/i);
          if (filenameMatch && filenameMatch[2]) {
            filename = filenameMatch[2];
          }
        }

        if (!filename.toLowerCase().endsWith(".zip")) {
          filename += ".zip";
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });

      await toast.promise(promise, {
        loading: "Exporting resumes...",
        success: "Resumes exported successfully",
        error: (e) => e.message && "Failed to export resumes",
      });

      setExportOpen(false);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(false);
    }
  }

  async function performAutoAssign() {
    const result = await fetch("/api/admin/auto-assign-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.message && "Failed to auto-assign");
      }
      return r.json();
    });
    return result?.data;
  }

  function handleAutoAssignSuccess(stats: any) {
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
      window.setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  async function handleAutoAssign() {
    setAutoAssigning(true);
    try {
      const stats = await performAutoAssign();
      handleAutoAssignSuccess(stats);
    } catch (error: any) {
      console.error("Auto-assign error:", error);
      toast.error(error?.message && "Failed to auto-assign");
    } finally {
      setAutoAssigning(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <div className="mt-5">
        <div className="flex flex-col gap-3">
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Manage and review submitted applications</CardDescription>
          </CardHeader>
          <CardContent>
            <Actions
              table={table}
              isSuperAdmin={isSuperAdmin}
              selectedCount={selectedCount}
              onOpenBulkAssign={() => setBulkOpen(true)}
              onOpenAutoAssign={() => setAutoAssignOpen(true)}
              onOpenExport={() => setExportOpen(true)}
            />
          </CardContent>
        </div>

        <CardContent className="mt-4 flex size-full flex-col gap-4">
          <div className="overflow-hidden rounded-md border">
            <DataTable table={table} columns={columns} />
          </div>
          <DataTablePagination table={table} />
        </CardContent>
      </div>

      {isSuperAdmin && (
        <>
          <BulkAssignDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            adminEmails={adminEmails}
            selectedCount={selectedCount}
            selectedEmail={selectedEmail}
            onSelectedEmailChange={setSelectedEmail}
            onConfirm={handleBulkAssign}
            assigning={assigning}
          />

          <ExportDialog
            open={exportOpen}
            onOpenChange={setExportOpen}
            exportFilter={exportFilter}
            onExportFilterChange={setExportFilter}
            onExport={handleExport}
            exporting={exporting}
          />

          <AutoAssignDialog
            open={autoAssignOpen}
            onOpenChange={setAutoAssignOpen}
            stats={autoAssignStats}
            onConfirm={handleAutoAssign}
            autoAssigning={autoAssigning}
          />
        </>
      )}
    </div>
  );
}
