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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BulkAssignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminEmails: string[];
  selectedCount: number;
  selectedEmail: string;
  onSelectedEmailChange: (value: string) => void;
  onConfirm: () => void;
  assigning: boolean;
};

export function BulkAssignDialog({
  open,
  onOpenChange,
  adminEmails,
  selectedCount,
  selectedEmail,
  onSelectedEmailChange,
  onConfirm,
  assigning,
}: BulkAssignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {selectedCount} selected</DialogTitle>
          <DialogDescription>Select an admin to assign the selected applications.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="bulk-assign-admin-email">Admin</Label>
          <Select value={selectedEmail} onValueChange={onSelectedEmailChange}>
            <SelectTrigger id="bulk-assign-admin-email">
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
          <Button onClick={onConfirm} disabled={assigning || !selectedCount || !selectedEmail}>
            {assigning ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
