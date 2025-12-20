"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { AdminTableRow } from "./columns";

type DeleteAdminDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminTableRow;
  onConfirm: () => void;
};

export function DeleteAdminDialog({ open, onOpenChange, admin, onConfirm }: DeleteAdminDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the admin account for{" "}
            <span className="font-semibold">
              {admin.firstName} {admin.lastName}
            </span>{" "}
            ({admin.email}). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

