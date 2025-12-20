"use client";

import * as React from "react";
import { Plus, Loader2, X, Check, AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface UserSuggestion {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  isInTeam: boolean;
  teamName?: string;
  isEligible: boolean;
}

interface CreateTeamDialogProps {
  onTeamCreated?: () => void;
}

function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "?";
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export function CreateTeamDialog({ onTeamCreated }: CreateTeamDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [teamName, setTeamName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Leader state
  const [leaderSearch, setLeaderSearch] = React.useState("");
  const [leaderSuggestions, setLeaderSuggestions] = React.useState<UserSuggestion[]>([]);
  const [selectedLeader, setSelectedLeader] = React.useState<UserSuggestion | null>(null);
  const [showLeaderSuggestions, setShowLeaderSuggestions] = React.useState(false);
  const [isSearchingLeader, setIsSearchingLeader] = React.useState(false);

  // Additional members state
  const [memberSearch, setMemberSearch] = React.useState("");
  const [memberSuggestions, setMemberSuggestions] = React.useState<UserSuggestion[]>([]);
  const [selectedMembers, setSelectedMembers] = React.useState<UserSuggestion[]>([]);
  const [showMemberSuggestions, setShowMemberSuggestions] = React.useState(false);
  const [isSearchingMembers, setIsSearchingMembers] = React.useState(false);

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const searchUsers = React.useCallback(
    async (query: string, type: "leader" | "member") => {
      if (query.length < 2) {
        if (type === "leader") setLeaderSuggestions([]);
        else setMemberSuggestions([]);
        return;
      }

      if (type === "leader") setIsSearchingLeader(true);
      else setIsSearchingMembers(true);

      try {
        const res = await fetch(`/api/teams/search-users?q=${encodeURIComponent(query)}&eligibleOnly=true`);
        const data = await res.json();
        if (res.ok && data.data) {
          // Filter out already selected users
          const selectedIds = new Set([selectedLeader?._id, ...selectedMembers.map((m) => m._id)].filter(Boolean));
          const filtered = data.data.filter((u: UserSuggestion) => !selectedIds.has(u._id));

          if (type === "leader") setLeaderSuggestions(filtered);
          else setMemberSuggestions(filtered);
        }
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        if (type === "leader") setIsSearchingLeader(false);
        else setIsSearchingMembers(false);
      }
    },
    [selectedLeader, selectedMembers]
  );

  const handleSearchChange = (value: string, type: "leader" | "member") => {
    if (type === "leader") {
      setLeaderSearch(value);
      setShowLeaderSuggestions(true);
    } else {
      setMemberSearch(value);
      setShowMemberSuggestions(true);
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchUsers(value, type), 300);
  };

  const handleSelectLeader = (user: UserSuggestion) => {
    setSelectedLeader(user);
    setLeaderSearch("");
    setLeaderSuggestions([]);
    setShowLeaderSuggestions(false);
  };

  const handleSelectMember = (user: UserSuggestion) => {
    if (selectedMembers.length >= 3) {
      toast.error("Maximum 3 additional members allowed");
      return;
    }
    setSelectedMembers([...selectedMembers, user]);
    setMemberSearch("");
    setMemberSuggestions([]);
    setShowMemberSuggestions(false);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m._id !== userId));
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    if (!selectedLeader) {
      toast.error("Please select a team leader");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          teamLeaderEmail: selectedLeader.email,
          additionalMemberEmails: selectedMembers.map((m) => m.email),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create team");
      }

      toast.success(`Team "${teamName}" created successfully!`);
      resetForm();
      setIsOpen(false);
      onTeamCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create team");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTeamName("");
    setLeaderSearch("");
    setSelectedLeader(null);
    setLeaderSuggestions([]);
    setMemberSearch("");
    setSelectedMembers([]);
    setMemberSuggestions([]);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const UserSuggestionItem = ({
    user,
    onClick,
  }: {
    user: UserSuggestion;
    onClick: () => void;
  }) => (
    <button
      type="button"
      className={cn(
        "hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
        !user.isEligible && "opacity-60"
      )}
      onClick={onClick}
      disabled={!user.isEligible}
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{getInitials(user.firstName, user.lastName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {user.firstName} {user.lastName}
          </span>
          {user.isEligible ? (
            <Badge variant="outline" className="border-green-500 text-xs text-green-500">
              Available
            </Badge>
          ) : user.isInTeam ? (
            <Badge variant="outline" className="border-orange-500 text-xs text-orange-500">
              In team
            </Badge>
          ) : (
            <Badge variant="outline" className="border-red-500 text-xs text-red-500">
              Ineligible
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        {user.isInTeam && user.teamName && (
          <p className="truncate text-xs text-orange-500">Member of: {user.teamName}</p>
        )}
        {!user.isEligible && !user.isInTeam && (
          <p className="truncate text-xs text-red-500">Status: {user.status}</p>
        )}
      </div>
    </button>
  );

  const SelectedUserBadge = ({
    user,
    onRemove,
    isLeader,
  }: {
    user: UserSuggestion;
    onRemove?: () => void;
    isLeader?: boolean;
  }) => (
    <div className="bg-muted flex items-center gap-2 rounded-md border px-2 py-1.5">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-xs">{getInitials(user.firstName, user.lastName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
      </div>
      {isLeader && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          Leader
        </Badge>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create New Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team with a leader and optional additional members (up to 4 total).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Team Name */}
          <div className="grid gap-2">
            <Label htmlFor="team-name">
              Team Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="team-name"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          {/* Team Leader */}
          <div className="grid gap-2">
            <Label>
              Team Leader <span className="text-red-500">*</span>
            </Label>
            {selectedLeader ? (
              <div className="space-y-2">
                <SelectedUserBadge user={selectedLeader} isLeader />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLeader(null)}
                  disabled={isCreating}
                >
                  Change leader
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by name or email..."
                  value={leaderSearch}
                  onChange={(e) => handleSearchChange(e.target.value, "leader")}
                  onFocus={() => setShowLeaderSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLeaderSuggestions(false), 200)}
                  disabled={isCreating}
                  autoComplete="off"
                />
                {isSearchingLeader && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  </div>
                )}
                {showLeaderSuggestions && leaderSuggestions.length > 0 && (
                  <div className="bg-popover absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg">
                    {leaderSuggestions.map((user) => (
                      <UserSuggestionItem key={user._id} user={user} onClick={() => handleSelectLeader(user)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional Members */}
          <div className="grid gap-2">
            <Label>Additional Members (Optional, up to 3)</Label>
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                {selectedMembers.map((member) => (
                  <SelectedUserBadge key={member._id} user={member} onRemove={() => handleRemoveMember(member._id)} />
                ))}
              </div>
            )}
            {selectedMembers.length < 3 && (
              <div className="relative">
                <Input
                  placeholder="Search to add more members..."
                  value={memberSearch}
                  onChange={(e) => handleSearchChange(e.target.value, "member")}
                  onFocus={() => setShowMemberSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowMemberSuggestions(false), 200)}
                  disabled={isCreating}
                  autoComplete="off"
                />
                {isSearchingMembers && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  </div>
                )}
                {showMemberSuggestions && memberSuggestions.length > 0 && (
                  <div className="bg-popover absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg">
                    {memberSuggestions.map((user) => (
                      <UserSuggestionItem key={user._id} user={user} onClick={() => handleSelectMember(user)} />
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              {selectedMembers.length}/3 additional members selected ({selectedMembers.length + (selectedLeader ? 1 : 0)}
              /4 total)
            </p>
          </div>

          {/* Summary */}
          {(selectedLeader || selectedMembers.length > 0) && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">Team Summary</p>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>
                  <strong>Team Name:</strong> {teamName || "(not set)"}
                </li>
                <li>
                  <strong>Leader:</strong>{" "}
                  {selectedLeader ? `${selectedLeader.firstName} ${selectedLeader.lastName}` : "(not selected)"}
                </li>
                <li>
                  <strong>Total Members:</strong> {(selectedLeader ? 1 : 0) + selectedMembers.length}
                </li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateTeam} disabled={isCreating || !teamName.trim() || !selectedLeader}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Team
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

