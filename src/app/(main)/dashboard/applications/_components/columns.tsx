import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, Eye, Loader, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  getStatusColor,
  getStatusFillColor,
  getStatusStrokeColor,
} from "@/utils/statusColors";
import Link from "next/link";
import { ApplicationStatusBadge } from "./application-status-badge";

export type ApplicationTableRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  status: string;
  createdAt?: string;
  processedBy?: string;
};

// Assign single
function AssignDialog({
  open,
  onOpenChange,
  onAssigned,
  applicationId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAssigned: (email: string) => void;
  applicationId: string;
}) {
  const [adminEmails, setAdminEmails] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/admin/get-emails")
      .then((r) => r.json())
      .then((d) => setAdminEmails(Array.isArray(d.data) ? d.data : []))
      .catch(() => toast.error("Failed to load admins"));
  }, [open]);

  async function assign() {
    if (!selected) return toast.error("Pick an admin");

    setLoading(true);
    try {
      await toast.promise(
        fetch("/api/admin/assign-applications", {
          method: "POST",
          body: JSON.stringify({
            selectedAdminEmail: selected,
            selectedApplicants: [applicationId],
          }),
          headers: { "Content-Type": "application/json" },
        }),
        {
          loading: "Assigning...",
          success: "Assigned",
          error: "Failed",
        }
      );

      onAssigned(selected);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign</DialogTitle>
          <DialogDescription>Select an admin</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Admin</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Pick admin" />
            </SelectTrigger>
            <SelectContent>
              {adminEmails.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={assign} disabled={loading}>
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline actions
function RowActions({ row, isSuperAdmin }: any) {
  const [open, setOpen] = React.useState(false);
  const id = row.original._id;

  return (
    <>
      <div className="flex gap-2">
        {isSuperAdmin && (
          <Button size="icon" variant="outline" onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" />
          </Button>
        )}

        <Button size="icon" variant="outline" asChild>
          <Link href={`/dashboard/applications/${id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>

        {isSuperAdmin && (
          <Button size="icon" variant="outline" className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isSuperAdmin && (
        <AssignDialog
          open={open}
          onOpenChange={setOpen}
          applicationId={id}
          onAssigned={(email) => (row.original.processedBy = email)}
        />
      )}
    </>
  );
}

export function getApplicationsColumns(
  isSuperAdmin: boolean
): ColumnDef<ApplicationTableRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(x) => table.toggleAllPageRowsSelected(!!x)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(x) => row.toggleSelected(!!x)}
        />
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      minSize: 600,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <ApplicationStatusBadge status={row.original.status} />,
    },

    {
      accessorKey: "assignedTo",
      header: "Assigned To",
      cell: ({ row }) => row.original.processedBy && "Not assigned",
    },
    {
      accessorKey: "processedBy",
      header: "Processed By",
      cell: ({ row }) => row.original.processedBy && "Not assigned",
    },
    {
      accessorKey: "processedAt",
      header: "Processed At",
      cell: ({ row }) => row.original.processedBy && "--",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => row.original.createdAt,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <RowActions row={row} isSuperAdmin={isSuperAdmin} />,
    },
  ];
}
