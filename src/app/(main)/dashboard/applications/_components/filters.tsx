"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  { value: "true", label: "Required Travel Reimbursement (All)" },
  { value: "quebec", label: "Required Travel Reimbursement in Quebec" },
  {
    value: "outside-quebec",
    label: "Required Travel Reimbursement outside Quebec",
  },
  { value: "false", label: "Not Required Travel Reimbursement" },
  { value: "approved", label: "Approved Travel Reimbursement" },
  { value: "starred", label: "Starred Candidates" },
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
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(
    initialStatus ? initialStatus.split(",") : []
  );
  const [travelReimbursement, setTravelReimbursement] = React.useState<string>(
    initialTravelReimbursement || ALL_VALUE
  );
  const [statusOpen, setStatusOpen] = React.useState(false);
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
  const handleStatusToggle = React.useCallback(
    (statusValue: string) => {
      const newStatuses = selectedStatuses.includes(statusValue)
        ? selectedStatuses.filter((s) => s !== statusValue)
        : [...selectedStatuses, statusValue];

      setSelectedStatuses(newStatuses);
      // Notify parent with comma-separated string
      onStatusChange(newStatuses.length > 0 ? newStatuses.join(",") : "");
    },
    [selectedStatuses, onStatusChange]
  );

  const handleClearStatuses = React.useCallback(() => {
    setSelectedStatuses([]);
    onStatusChange("");
  }, [onStatusChange]);

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
    setSelectedStatuses(initialStatus ? initialStatus.split(",") : []);
  }, [initialStatus]);

  React.useEffect(() => {
    setTravelReimbursement(initialTravelReimbursement || ALL_VALUE);
  }, [initialTravelReimbursement]);

  return (
    <div className="flex flex-col gap-3 w-full">
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by email and full name…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-dashed"
                aria-label="Filter by status"
              >
                <ChevronDown className="mr-2 h-4 w-4" />
                Status
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <div className="max-h-[300px] overflow-auto p-2">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = selectedStatuses.includes(option);
                  return (
                    <div
                      key={option}
                      className={cn(
                        "flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => handleStatusToggle(option)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{option}</span>
                    </div>
                  );
                })}
              </div>
              {selectedStatuses.length > 0 && (
                <>
                  <div className="border-t" />
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={handleClearStatuses}
                    >
                      Clear filters
                    </Button>
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>
          <Select
            value={travelReimbursement}
            onValueChange={handleTravelReimbursementChange}
          >
            <SelectTrigger
              aria-label="Filter by travel reimbursement"
              className="w-[160px]"
            >
              <SelectValue placeholder="Travel reimbursement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All applicants</SelectItem>
              {TRAVEL_REIMBURSEMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap gap-1">
      {selectedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.filter((option) =>
            selectedStatuses.includes(option)
          ).map((option) => (
            <Badge
              key={option}
              variant="secondary"
              className="rounded-sm px-1 font-normal"
            >
              {option}
            </Badge>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
