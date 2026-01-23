"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";

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
  "Checked-in",
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
  initialAssignedStatus,
  initialAssignedTo, // New prop
  reviewers = [], // New prop
  onSearchChange,
  onStatusChange,
  onTravelReimbursementChange,
  onAssignedStatusChange,
  onAssignedToChange, // New callback
}: ApplicationsFiltersProps & {
  initialAssignedStatus?: string;
  onAssignedStatusChange?: (status: string) => void;
  initialAssignedTo?: string; // New prop type
  reviewers?: {
    email: string;
    firstName: string;
    lastName: string;
    _id: string;
  }[]; // New prop type
  onAssignedToChange?: (assignedTo: string) => void; // New callback type
}) {
  const ALL_VALUE = "__all__";
  const [search, setSearch] = React.useState<string>(initialSearch);
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(
    initialStatus ? initialStatus.split(",") : []
  );
  const [travelReimbursement, setTravelReimbursement] = React.useState<string>(
    initialTravelReimbursement || ALL_VALUE
  );
  const [assignedStatus, setAssignedStatus] = React.useState<string>(
    initialAssignedStatus || ALL_VALUE
  );
  // New state for selected reviewers
  const [selectedReviewers, setSelectedReviewers] = React.useState<string[]>(
    initialAssignedTo ? initialAssignedTo.split(",") : []
  );

  const [statusOpen, setStatusOpen] = React.useState(false);
  const [reviewerOpen, setReviewerOpen] = React.useState(false); // New state
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = React.useRef(false);

  // Debounced search handler
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearch(value);
      isTypingRef.current = true;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        onSearchChange(value);
        // Allow sync after navigation completes
        setTimeout(() => {
          isTypingRef.current = false;
        }, 100);
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

  // Reviewer change handler (immediate, no debounce)
  const handleReviewerToggle = React.useCallback(
    (reviewerId: string) => {
      const newReviewers = selectedReviewers.includes(reviewerId)
        ? selectedReviewers.filter((r) => r !== reviewerId)
        : [...selectedReviewers, reviewerId];

      setSelectedReviewers(newReviewers);
      // Notify parent with comma-separated string
      onAssignedToChange?.(
        newReviewers.length > 0 ? newReviewers.join(",") : ""
      );
    },
    [selectedReviewers, onAssignedToChange]
  );

  const handleClearReviewers = React.useCallback(() => {
    setSelectedReviewers([]);
    onAssignedToChange?.("");
  }, [onAssignedToChange]);

  // Travel reimbursement change handler (immediate, no debounce)
  const handleTravelReimbursementChange = React.useCallback(
    (value: string) => {
      setTravelReimbursement(value);
      onTravelReimbursementChange(value === ALL_VALUE ? "" : value);
    },
    [onTravelReimbursementChange]
  );

  // Assigned status change handler
  const handleAssignedStatusChange = React.useCallback(
    (value: string) => {
      setAssignedStatus(value);
      onAssignedStatusChange?.(value === ALL_VALUE ? "" : value);
    },
    [onAssignedStatusChange]
  );

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      isTypingRef.current = false;
    };
  }, []);

  // Sync with URL on initial load or when props change (but not while user is typing)
  React.useEffect(() => {
    if (!isTypingRef.current) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  React.useEffect(() => {
    setSelectedStatuses(initialStatus ? initialStatus.split(",") : []);
  }, [initialStatus]);

  React.useEffect(() => {
    setTravelReimbursement(initialTravelReimbursement || ALL_VALUE);
  }, [initialTravelReimbursement]);

  React.useEffect(() => {
    setAssignedStatus(initialAssignedStatus || ALL_VALUE);
  }, [initialAssignedStatus]);

  React.useEffect(() => {
    setSelectedReviewers(initialAssignedTo ? initialAssignedTo.split(",") : []);
  }, [initialAssignedTo]);

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

            {/* Reviewer Filter (Only visible if reviewers are passed) */}
            {reviewers.length > 0 && (
              <Popover open={reviewerOpen} onOpenChange={setReviewerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-dashed"
                    aria-label="Filter by reviewer"
                  >
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Reviewer
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <div className="max-h-[300px] overflow-auto p-2">
                    {reviewers.map((reviewer) => {
                      const isSelected = selectedReviewers.includes(
                        reviewer.email
                      );
                      return (
                        <div
                          key={reviewer._id}
                          className={cn(
                            "flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                            isSelected && "bg-accent"
                          )}
                          onClick={() => handleReviewerToggle(reviewer.email)}
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
                          <span className="truncate">
                            {reviewer.firstName} {reviewer.lastName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {selectedReviewers.length > 0 && (
                    <>
                      <div className="border-t" />
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center"
                          onClick={handleClearReviewers}
                        >
                          Clear filters
                        </Button>
                      </div>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            )}

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
            <Select
              value={assignedStatus}
              onValueChange={handleAssignedStatusChange}
            >
              <SelectTrigger
                aria-label="Filter by assigned status"
                className="w-[160px]"
              >
                <SelectValue placeholder="Assigned Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All assignments</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="not-assigned">Not Assigned</SelectItem>
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
                className="inline-flex items-center gap-1 rounded-sm px-1 font-normal cursor-pointer pr-2"
                onClick={() => handleStatusToggle(option)}
              >
                <X className="h-3 w-3" />
                {option}
              </Badge>
            ))}
          </div>
        )}
        {selectedReviewers.length > 0 && reviewers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reviewers
              .filter((r) => selectedReviewers.includes(r.email))
              .map((r) => (
                <Badge
                  key={r._id}
                  variant="secondary"
                  className="inline-flex items-center gap-1 rounded-sm px-1 font-normal cursor-pointer pr-2"
                  onClick={() => handleReviewerToggle(r.email)}
                >
                  <X className="h-3 w-3" />
                  {r.firstName} {r.lastName}
                </Badge>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
