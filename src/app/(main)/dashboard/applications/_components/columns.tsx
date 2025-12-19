import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Trash2, Eye, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export type ApplicationTableRow = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  processedBy?: string;
};

function AssignRowDialog({
  applicationId,
  open,
  onOpenChange,
  onAssigned,
}: {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: (email: string) => void;
}) {
  const [adminEmails, setAdminEmails] = React.useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/get-emails");
        if (!res.ok) throw new Error("Failed to load admin emails");
        const data = await res.json();
        const emails: string[] = Array.isArray(data?.data) ? data.data : [];
        if (!cancelled) setAdminEmails(emails);
      } catch (_e) {
        toast.error("Failed to load admins");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleAssign() {
    if (!selectedEmail) {
      toast.error("Please select an admin");
      return;
    }
    setLoading(true);
    try {
      const promise = fetch("/api/admin/assign-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAdminEmail: selectedEmail, selectedApplicants: [applicationId] }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err?.message || "Failed to assign");
        }
      });

      await toast.promise(promise, {
        loading: "Assigning...",
        success: "Application assigned",
        error: (e) => e.message || "Failed to assign",
      });
      onAssigned?.(selectedEmail);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign application</DialogTitle>
          <DialogDescription>Select an admin to assign this application.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="assign-admin-email">Admin</Label>
          <Select value={selectedEmail} onValueChange={setSelectedEmail}>
            <SelectTrigger id="assign-admin-email">
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
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function getApplicationsColumns(isSuperAdmin: boolean): ColumnDef<ApplicationTableRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "firstName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <span>
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.email}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
    },
    {
      accessorKey: "processedBy",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Processed By" />,
      cell: ({ row }) => <span>{row.original.processedBy ?? "Not processed"}</span>,
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const [assignOpen, setAssignOpen] = React.useState(false);
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground flex size-8" size="icon">
                  <EllipsisVertical />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isSuperAdmin && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setAssignOpen(true);
                    }}
                  >
                    <UserPlus /> Assign to admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    window.open(`/dashboard/applications/${row.original._id}`, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Eye /> Review
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    console.log("Delete", row.original._id);
                  }}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isSuperAdmin && (
              <AssignRowDialog
                applicationId={row.original._id}
                open={assignOpen}
                onOpenChange={setAssignOpen}
                onAssigned={(email) => {
                  row.original.processedBy = email;
                }}
              />
            )}
          </>
        );
      },
      enableSorting: false,
    },
  ];
}
