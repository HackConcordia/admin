import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";

import { DeleteAdminDialog } from "./delete-admin-dialog";

export type AdminTableRow = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

function PasswordCell({ password }: { password: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono">
        {showPassword ? password : "•".repeat(Math.min(password.length, 8))}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setShowPassword(!showPassword)}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function ActionsCell({
  admin,
  onDelete,
}: {
  admin: AdminTableRow;
  onDelete: (adminId: string) => Promise<void>;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    await onDelete(admin._id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive h-8 w-8"
        onClick={() => setDeleteDialogOpen(true)}
        title="Delete admin"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <DeleteAdminDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        admin={admin}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

export function getAdminColumns(
  onDelete: (adminId: string) => Promise<void>
): ColumnDef<AdminTableRow>[] {
  return [
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="First Name" />
      ),
      cell: ({ row }) => <span>{row.original.firstName}</span>,
      enableHiding: false,
    },
    {
      accessorKey: "lastName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Name" />
      ),
      cell: ({ row }) => <span>{row.original.lastName}</span>,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "password",
      header: "Password",
      cell: ({ row }) => <PasswordCell password={row.original.password} />,
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <ActionsCell admin={row.original} onDelete={onDelete} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
