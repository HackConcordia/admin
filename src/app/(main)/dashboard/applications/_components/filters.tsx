"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { ApplicationTableRow } from "./columns";

type ApplicationsFiltersProps = {
  table: Table<ApplicationTableRow>;
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

export default function ApplicationsFilters({ table }: ApplicationsFiltersProps) {
  const ALL_VALUE = "__all__";
  const [email, setEmail] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>(ALL_VALUE);

  React.useEffect(() => {
    table.getColumn("email")?.setFilterValue(email || undefined);
  }, [email, table]);

  React.useEffect(() => {
    table.getColumn("status")?.setFilterValue(status === ALL_VALUE ? undefined : status);
  }, [status, table]);

  function reset() {
    setEmail("");
    setStatus(ALL_VALUE);
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row">
      <div className="flex-1">
        <Input placeholder="Filter by email…" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="w-full sm:w-56">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status">
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
      </div>
      <button type="button" className="text-muted-foreground self-start text-sm underline sm:self-auto" onClick={reset}>
        Reset
      </button>
    </div>
  );
}
