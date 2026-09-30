"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AutoAssignStats = {
  unassignedCount: number;
  reviewerCount: number;
  heldForManualAssignment?: number;
} | null;

type AutoAssignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AutoAssignStats;
  onConfirm: () => void;
  autoAssigning: boolean;
};

export function AutoAssignDialog({ open, onOpenChange, stats, onConfirm, autoAssigning }: AutoAssignDialogProps) {
  const held = stats?.heldForManualAssignment ?? 0;
  const unassigned = Math.max((stats?.unassignedCount ?? 0) - held, 0);
  const reviewers = stats?.reviewerCount ?? 0;
  const estimatedPerReviewer = reviewers > 0 ? Math.ceil(unassigned / reviewers) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto Assign Applications</DialogTitle>
          <DialogDescription>
            Automatically distribute unassigned applications to reviewers while keeping teams together.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {stats ? (
            <div className="bg-muted rounded-md p-4 text-sm">
              <div className="mb-2 font-medium">Assignment Preview:</div>
              <ul className="text-muted-foreground space-y-1">
                <li>Unassigned applications: {unassigned}</li>
                <li>Available reviewers: {reviewers}</li>
                <li>Estimated per reviewer: ~{estimatedPerReviewer}</li>
              </ul>
              <div className="text-muted-foreground mt-3 text-xs">
                Note: Team members will be assigned together to the same reviewer.
              </div>
              {held > 0 && (
                <div className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {held} application{held === 1 ? "" : "s"} (travel reimbursement requests and their teammates) will be
                  left for manual assignment to a super admin.
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">Loading statistics...</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={autoAssigning || !stats || unassigned === 0}>
            {autoAssigning ? "Assigning..." : "Auto Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
