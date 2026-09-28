"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IVolunteer } from "@/interfaces/IVolunteer";

import { DeleteVolunteerDialog } from "./delete-volunteer-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

export type VolunteerRowActions = {
  onResetPassword: (volunteerId: string) => Promise<void>;
  onDelete: (volunteerId: string) => Promise<void>;
  pendingId: string | null;
};

function ActionsCell({
  volunteer,
  onResetPassword,
  onDelete,
  pendingId,
}: { volunteer: IVolunteer } & VolunteerRowActions) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fullName = `${volunteer.firstName} ${volunteer.lastName}`;
  const isPending = pendingId === volunteer._id;

  const handleResetConfirm = async () => {
    await onResetPassword(volunteer._id);
    setResetDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    await onDelete(volunteer._id);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setResetDialogOpen(true)}
        disabled={isPending}
        title="Reset password"
        aria-label={`Reset password for ${fullName}`}
      >
        <KeyRound className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive h-8 w-8"
        onClick={() => setDeleteDialogOpen(true)}
        disabled={isPending}
        title="Delete volunteer"
        aria-label={`Delete ${fullName}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <ResetPasswordDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        volunteer={volunteer}
        onConfirm={handleResetConfirm}
      />
      <DeleteVolunteerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        volunteer={volunteer}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export function getVolunteerColumns(actions: VolunteerRowActions): ColumnDef<IVolunteer>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
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
      id: "password",
      accessorFn: (row) => row.needsPasswordReset,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Password" />,
      cell: ({ row }) =>
        row.original.needsPasswordReset ? (
          <Badge
            variant="destructive"
            title="The stored password isn't a bcrypt hash, so this volunteer can't sign in to the check-in app. Reset the password to fix it."
          >
            Needs password reset
          </Badge>
        ) : (
          <Badge variant="outline">Set</Badge>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <ActionsCell
          volunteer={row.original}
          onResetPassword={actions.onResetPassword}
          onDelete={actions.onDelete}
          pendingId={actions.pendingId}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
