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
import type { IVolunteer } from "@/interfaces/IVolunteer";

type DeleteVolunteerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: IVolunteer;
  onConfirm: () => void;
};

export function DeleteVolunteerDialog({ open, onOpenChange, volunteer, onConfirm }: DeleteVolunteerDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the volunteer account for{" "}
            <span className="font-semibold">
              {volunteer.firstName} {volunteer.lastName}
            </span>{" "}
            ({volunteer.email}). They will no longer be able to sign in to the check-in app. A session that is
            already open stays valid until it expires (up to 1 hour). This action cannot be undone.
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
