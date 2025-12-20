"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Loader2,
  SlidersHorizontal,
  ArrowUpDown,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { TeamCard, type TeamCardProps } from "./team-card";
import { CreateTeamDialog } from "./create-team-dialog";

interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalTeams: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Filters {
  search: string;
  memberCount: string;
  sortField: string;
  sortOrder: string;
}

interface TeamsGridProps {
  initialTeams: TeamCardProps[];
  initialPagination: Pagination;
  initialFilters?: Partial<Filters>;
}

const defaultFilters: Filters = {
  search: "",
  memberCount: "",
  sortField: "memberCount",
  sortOrder: "desc",
};

const SORT_OPTIONS = [
  { value: "teamName", label: "Team Name" },
  { value: "teamCode", label: "Team Code" },
  { value: "memberCount", label: "Member Count" },
];

const MEMBER_COUNT_OPTIONS = [
  { value: "", label: "All" },
  { value: "1", label: "1 member" },
  { value: "2", label: "2 members" },
  { value: "3", label: "3 members" },
  { value: "4", label: "4 members" },
];

export function TeamsGrid({ initialTeams, initialPagination, initialFilters }: TeamsGridProps) {
  const router = useRouter();

  const [teams, setTeams] = React.useState<TeamCardProps[]>(initialTeams);
  const [pagination, setPagination] = React.useState<Pagination>(initialPagination);
  const [searchValue, setSearchValue] = React.useState(initialFilters?.search || "");
  const [isLoading, setIsLoading] = React.useState(false);
  const [filters, setFilters] = React.useState<Filters>({
    search: initialFilters?.search || "",
    memberCount: initialFilters?.memberCount || "",
    sortField: initialFilters?.sortField || "memberCount",
    sortOrder: initialFilters?.sortOrder || "desc",
  });

  // Track the previous search value to detect actual user changes
  const prevSearchValue = React.useRef(searchValue);

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.memberCount) count++;
    return count;
  }, [filters]);

  // Debounced search effect - only fetch when search value actually changes from user input
  React.useEffect(() => {
    // Skip if search value hasn't actually changed (handles initial mount and strict mode)
    if (prevSearchValue.current === searchValue) {
      return;
    }

    const timeoutId = setTimeout(() => {
      prevSearchValue.current = searchValue;
      fetchTeams(1, pagination.limit, searchValue, filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  const fetchTeams = React.useCallback(
    async (page: number, limit: number, search: string, currentFilters: Filters) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (currentFilters.memberCount) params.set("memberCount", currentFilters.memberCount);
        params.set("sortField", currentFilters.sortField);
        params.set("sortOrder", currentFilters.sortOrder);

        const res = await fetch(`/api/teams/paginated?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch teams");

        const json = await res.json();
        setTeams(json.data.teams);
        setPagination(json.data.pagination);

        // Update URL without full page reload
        router.push(`/dashboard/teams?${params.toString()}`, { scroll: false });
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handlePageChange = (newPage: number) => {
    fetchTeams(newPage, pagination.limit, searchValue, filters);
  };

  const handleLimitChange = (newLimit: string) => {
    fetchTeams(1, parseInt(newLimit, 10), searchValue, filters);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchTeams(1, pagination.limit, searchValue, newFilters);
  };

  const handleSortChange = (field: string) => {
    const newOrder = filters.sortField === field && filters.sortOrder === "asc" ? "desc" : "asc";
    const newFilters = { ...filters, sortField: field, sortOrder: newOrder };
    setFilters(newFilters);
    fetchTeams(1, pagination.limit, searchValue, newFilters);
  };

  const clearAllFilters = () => {
    const newFilters = { ...defaultFilters };
    setFilters(newFilters);
    setSearchValue("");
    fetchTeams(1, pagination.limit, "", newFilters);
  };

  const clearFilter = (key: keyof Filters) => {
    const newFilters = { ...filters, [key]: "" };
    setFilters(newFilters);
    fetchTeams(1, pagination.limit, searchValue, newFilters);
  };

  const handleRefresh = () => {
    fetchTeams(pagination.page, pagination.limit, searchValue, filters);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="text-muted-foreground text-sm">
            Manage and view all registered teams. Total: {pagination.totalTeams} teams
          </p>
        </div>
        <CreateTeamDialog onTeamCreated={handleRefresh} />
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search teams by name or code..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="leading-none font-medium">Filters</h4>
                  <p className="text-muted-foreground text-sm">Narrow down your team search</p>
                </div>
                <Separator />
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="member-count-filter">Member Count</Label>
                    <Select value={filters.memberCount} onValueChange={(v) => handleFilterChange("memberCount", v)}>
                      <SelectTrigger id="member-count-filter">
                        <SelectValue placeholder="Select member count" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBER_COUNT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value || "all"}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <>
                    <Separator />
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="grid gap-2">
                <h4 className="mb-2 leading-none font-medium">Sort by</h4>
                {SORT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={filters.sortField === opt.value ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-between"
                    onClick={() => handleSortChange(opt.value)}
                  >
                    {opt.label}
                    {filters.sortField === opt.value && (
                      <span className="text-muted-foreground text-xs">{filters.sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters Display */}
        {(activeFilterCount > 0 || searchValue) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Active filters:</span>
            {searchValue && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchValue}
                <button
                  onClick={() => setSearchValue("")}
                  className="hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.memberCount && (
              <Badge variant="secondary" className="gap-1">
                Members: {MEMBER_COUNT_OPTIONS.find((o) => o.value === filters.memberCount)?.label}
                <button onClick={() => clearFilter("memberCount")} className="hover:text-foreground ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-lg font-medium">No teams found</p>
          <p className="text-muted-foreground text-sm">
            {searchValue || activeFilterCount > 0
              ? "Try adjusting your filters or search term"
              : "No teams have been created yet"}
          </p>
          {(searchValue || activeFilterCount > 0) && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team) => (
            <TeamCard
              key={team._id}
              {...team}
              onMemberAdded={() => fetchTeams(pagination.page, pagination.limit, searchValue, filters)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
          <div className="text-muted-foreground text-sm">
            Showing {teams.length} of {pagination.totalTeams} teams
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="teams-per-page" className="text-sm font-medium whitespace-nowrap">
                Per page
              </Label>
              <Select value={String(pagination.limit)} onValueChange={handleLimitChange}>
                <SelectTrigger size="sm" className="w-20" id="teams-per-page">
                  <SelectValue placeholder={pagination.limit} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[8, 12, 16, 24, 32].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(1)}
                disabled={!pagination.hasPrevPage || isLoading}
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">First page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={!pagination.hasNextPage || isLoading}
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
