"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import type { IVolunteer, IVolunteerCredentials } from "@/interfaces/IVolunteer";

import { getVolunteerColumns } from "./columns";
import { GeneratedPasswordDialog } from "./generated-password-dialog";

type VolunteerTableProps = {
  initialData: IVolunteer[];
};

function matchesSearch(volunteer: IVolunteer, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [volunteer.firstName, volunteer.lastName, volunteer.email].some((value) =>
    value.toLowerCase().includes(term),
  );
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  const result = await response.json().catch(() => null);
  return typeof result?.message === "string" ? result.message : fallback;
}

export function VolunteerTable({ initialData }: VolunteerTableProps) {
  const [data, setData] = useState<IVolunteer[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [credentials, setCredentials] = useState<IVolunteerCredentials | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData ?? []);
  }, [initialData]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/volunteers", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch volunteers");
      }

      const result = await response.json();
      if (result.status === "success") {
        setData((result.data as IVolunteer[]) || []);
      }
    } catch (error) {
      console.error("Error fetching volunteers:", error);
      toast.error("Failed to load volunteers");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResetPassword = useCallback(
    async (volunteerId: string) => {
      setPendingId(volunteerId);
      try {
        const response = await fetch(`/api/volunteers/${volunteerId}/reset-password`, { method: "POST" });
        if (!response.ok) {
          throw new Error(await readMessage(response, "Failed to reset password"));
        }

        const result = await response.json().catch(() => null);
        if (typeof result?.data?.generatedPassword !== "string") {
          throw new Error("Failed to reset password");
        }

        // Held in memory only until the one-time dialog closes.
        setCredentials(result.data as IVolunteerCredentials);
        fetchData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to reset password");
      } finally {
        setPendingId(null);
      }
    },
    [fetchData],
  );

  const handleDelete = useCallback(
    async (volunteerId: string) => {
      setPendingId(volunteerId);
      try {
        const response = await fetch(`/api/volunteers/${volunteerId}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await readMessage(response, "Failed to delete volunteer"));
        }

        toast.success("Volunteer deleted successfully");
        fetchData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete volunteer");
      } finally {
        setPendingId(null);
      }
    },
    [fetchData],
  );

  const columns = useMemo(
    () => getVolunteerColumns({ onResetPassword: handleResetPassword, onDelete: handleDelete, pendingId }),
    [handleResetPassword, handleDelete, pendingId],
  );

  const filteredData = useMemo(() => data.filter((volunteer) => matchesSearch(volunteer, search)), [data, search]);

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => row._id,
    enableRowSelection: false,
    defaultPageSize: 10,
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="rounded-md border">
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <DataTable table={table} columns={columns} />
        )}
      </div>
      <DataTablePagination table={table} />

      <GeneratedPasswordDialog title="Password reset" credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
