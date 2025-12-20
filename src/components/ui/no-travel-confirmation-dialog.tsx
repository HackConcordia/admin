"use client";

import * as React from "react";
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

interface NoTravelConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  candidateName: string;
  action: "admit" | "waitlist" | "reject";
}

export function NoTravelConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  candidateName,
  action,
}: NoTravelConfirmationDialogProps) {
  const getActionText = () => {
    switch (action) {
      case "admit":
        return "admit";
      case "waitlist":
        return "waitlist";
      case "reject":
        return "reject";
      default:
        return "process";
    }
  };

  const getActionColor = () => {
    switch (action) {
      case "reject":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Confirm{" "}
            {getActionText().charAt(0).toUpperCase() + getActionText().slice(1)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {getActionText()} this {candidateName}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              getActionColor() === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

