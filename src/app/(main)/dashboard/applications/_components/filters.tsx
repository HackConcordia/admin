"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ApplicationsFiltersProps = {
  initialSearch: string;
  initialStatus: string;
  initialTravelReimbursement: string;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onTravelReimbursementChange: (value: string) => void;
};

const STATUS_OPTIONS = [
  "Unverified",
  "Incomplete",
  "Submitted",
  "Admitted",
  "Waitlisted",
  "Refused",
  "Confirmed",
  "Declined",
  "CheckedIn",
];

const TRAVEL_REIMBURSEMENT_OPTIONS = [
  { value: "true", label: "Requires Travel Reimbursement" },
  { value: "false", label: "No Travel Reimbursement Required" },
];

export default function ApplicationsFilters({
  initialSearch,
  initialStatus,
  initialTravelReimbursement,
  onSearchChange,
  onStatusChange,
  onTravelReimbursementChange,
}: ApplicationsFiltersProps) {
  const ALL_VALUE = "__all__";
  const [search, setSearch] = React.useState<string>(initialSearch);
  const [status, setStatus] = React.useState<string>(
    initialStatus || ALL_VALUE
  );
  const [travelReimbursement, setTravelReimbursement] = React.useState<string>(
    initialTravelReimbursement || ALL_VALUE
  );
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounced search handler
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearch(value);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 400);
    },
    [onSearchChange]
  );

  // Status change handler (immediate, no debounce)
  const handleStatusChange = React.useCallback(
    (value: string) => {
      setStatus(value);
      onStatusChange(value === ALL_VALUE ? "" : value);
    },
    [onStatusChange]
  );

  // Travel reimbursement change handler (immediate, no debounce)
  const handleTravelReimbursementChange = React.useCallback(
    (value: string) => {
      setTravelReimbursement(value);
      onTravelReimbursementChange(value === ALL_VALUE ? "" : value);
    },
    [onTravelReimbursementChange]
  );

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Sync with URL on initial load or when props change
  React.useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  React.useEffect(() => {
    setStatus(initialStatus || ALL_VALUE);
  }, [initialStatus]);

  React.useEffect(() => {
    setTravelReimbursement(initialTravelReimbursement || ALL_VALUE);
  }, [initialTravelReimbursement]);

  return (
    <div className="flex w-full gap-3">
      <div className="flex-1">
        <Input
          placeholder="Search by email, first name, or last name…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger aria-label="Filter by status" className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={travelReimbursement}
          onValueChange={handleTravelReimbursementChange}
        >
          <SelectTrigger
            aria-label="Filter by travel reimbursement"
            className="w-[160px]"
          >
            <SelectValue placeholder="All travel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All travel</SelectItem>
            {TRAVEL_REIMBURSEMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
