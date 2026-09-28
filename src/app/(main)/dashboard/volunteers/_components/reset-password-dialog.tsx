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

type ResetPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: IVolunteer;
  onConfirm: () => void;
};

export function ResetPasswordDialog({ open, onOpenChange, volunteer, onConfirm }: ResetPasswordDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset password?</AlertDialogTitle>
          <AlertDialogDescription>
            This generates a new password for{" "}
            <span className="font-semibold">
              {volunteer.firstName} {volunteer.lastName}
            </span>{" "}
            ({volunteer.email}). Their current password stops working immediately. A check-in session that is
            already open stays signed in until it expires (up to 1 hour).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Reset password</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
