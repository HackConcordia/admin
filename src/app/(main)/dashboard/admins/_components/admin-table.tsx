"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { AdminTableRow, getAdminColumns } from "./columns";

type AdminTableProps = {
  initialData: AdminTableRow[];
  initialPagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
};

export function AdminTable({
  initialData,
  initialPagination,
}: AdminTableProps) {
  const [data, setData] = useState<AdminTableRow[]>(initialData);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data from API
  const fetchData = useCallback(
    async (page: number, searchTerm: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pagination.pageSize.toString(),
        });

        if (searchTerm) {
          params.append("search", searchTerm);
        }

        const response = await fetch(`/api/admin?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch admins");
        }

        const result = await response.json();
        if (result.status === "success") {
          setData(result.data.data || []);
          setPagination(result.data.pagination);
        }
      } catch (error) {
        console.error("Error fetching admins:", error);
        toast.error("Failed to load admins");
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize]
  );

  const handleDelete = async (adminId: string) => {
    try {
      const response = await fetch(`/api/admin/delete-admin/${adminId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete admin");
      }

      toast.success("Admin deleted successfully");
      // Refresh data
      fetchData(currentPage, search);
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error("Failed to delete admin");
    }
  };

  const columns = useMemo(() => getAdminColumns(handleDelete), []);

  const table = useDataTableInstance({
    data,
    columns,
    getRowId: (row) => row._id,
    enableRowSelection: false,
    defaultPageSize: pagination.pageSize,
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchData(1, search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, fetchData]);

  // Handle page change
  useEffect(() => {
    const pageIndex = table.getState().pagination.pageIndex;
    const newPage = pageIndex + 1;
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchData(newPage, search);
    }
  }, [table.getState().pagination.pageIndex, currentPage, search, fetchData]);

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
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
    </div>
  );
}
