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

export type ExportKind = "csv" | "resumes";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportKind: ExportKind;
  onExportKindChange: (value: ExportKind) => void;
  exportFilter: string;
  onExportFilterChange: (value: string) => void;
  onExport: () => void;
  exporting: boolean;
};

const KINDS: { value: ExportKind; label: string; description: string }[] = [
  {
    value: "csv",
    label: "Applications (CSV)",
    description: "One row per applicant with every XI answer, the travel request and decision, and the reviewer.",
  },
  { value: "resumes", label: "Resumes (ZIP)", description: "Every uploaded resume of the selected applicants." },
];

const FILTERS: { value: string; label: string; csvOnly?: boolean }[] = [
  { value: "all", label: "All submitted applicants" },
  { value: "admitted", label: "Admitted applicants only" },
  { value: "confirmed", label: "Confirmed applicants only (the CSV also includes checked-in)" },
  { value: "checked-in", label: "Checked-in applicants only", csvOnly: true },
  { value: "travel-outside-quebec", label: "Travel reimbursement requests from outside Quebec", csvOnly: true },
];

export function ExportDialog({
  open,
  onOpenChange,
  exportKind,
  onExportKindChange,
  exportFilter,
  onExportFilterChange,
  onExport,
  exporting,
}: ExportDialogProps) {
  const filters = FILTERS.filter((filter) => exportKind === "csv" || !filter.csvOnly);

  function handleKindChange(value: string) {
    const kind: ExportKind = value === "resumes" ? "resumes" : "csv";
    onExportKindChange(kind);
    if (kind === "resumes" && FILTERS.some((filter) => filter.csvOnly && filter.value === exportFilter)) onExportFilterChange("all");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>Download applicant data for review and event logistics.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Label>What to export</Label>
          <RadioGroup value={exportKind} onValueChange={handleKindChange}>
            {KINDS.map((kind) => (
              <div key={kind.value} className="flex items-start space-x-2">
                <RadioGroupItem value={kind.value} id={`export-kind-${kind.value}`} className="mt-1" />
                <Label htmlFor={`export-kind-${kind.value}`} className="cursor-pointer font-normal">
                  <span className="block">{kind.label}</span>
                  <span className="text-muted-foreground block text-xs">{kind.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Label>Filter by status</Label>
          <RadioGroup value={exportFilter} onValueChange={onExportFilterChange}>
            {filters.map((filter) => (
              <div key={filter.value} className="flex items-center space-x-2">
                <RadioGroupItem value={filter.value} id={`export-${filter.value}`} />
                <Label htmlFor={`export-${filter.value}`} className="cursor-pointer font-normal">
                  {filter.label}
                </Label>
              </div>
            ))}
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
