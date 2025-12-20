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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportFilter: string;
  onExportFilterChange: (value: string) => void;
  onExport: () => void;
  exporting: boolean;
};

export function ExportDialog({
  open,
  onOpenChange,
  exportFilter,
  onExportFilterChange,
  onExport,
  exporting,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Resumes</DialogTitle>
          <DialogDescription>Select which applicant resumes to export as a ZIP file.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Label>Filter by Status</Label>
          <RadioGroup value={exportFilter} onValueChange={onExportFilterChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="export-all" />
              <Label htmlFor="export-all" className="cursor-pointer font-normal">
                All Submitted Applicants
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="admitted" id="export-admitted" />
              <Label htmlFor="export-admitted" className="cursor-pointer font-normal">
                Admitted Applicants Only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="confirmed" id="export-confirmed" />
              <Label htmlFor="export-confirmed" className="cursor-pointer font-normal">
                Confirmed Applicants Only
              </Label>
            </div>
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onExport} disabled={exporting || !exportFilter}>
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
