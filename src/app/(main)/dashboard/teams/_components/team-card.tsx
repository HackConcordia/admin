"use client";

import * as React from "react";
import { Copy, Star, Users, UserPlus, Loader2, Check, AlertCircle, Trash2, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TeamMember {
  userId: string;
  isAdmitted: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  profileImgUrl: string;
}

interface UserSuggestion {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isInTeam: boolean;
  teamName?: string;
}

export interface TeamCardProps {
  _id: string;
  teamName: string;
  teamCode: string;
  members: TeamMember[];
  teamOwner: string;
  memberCount?: number;
  isSuperAdmin?: boolean;
  onMemberAdded?: () => void;
  onTeamDeleted?: () => void;
  onMemberRemoved?: () => void;
}

function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "?";
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export function TeamCard({ _id, teamName, teamCode, members, teamOwner, isSuperAdmin, onMemberAdded, onTeamDeleted, onMemberRemoved }: TeamCardProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<TeamMember | null>(null);
  const [email, setEmail] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isRemovingMember, setIsRemovingMember] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<UserSuggestion[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserSuggestion | null>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const canAddMember = members.length < 4;

  const handleDeleteTeam = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/teams/${_id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete team");
      }

      toast.success("Team deleted successfully");
      setIsDeleteDialogOpen(false);
      onTeamDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete team");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemovingMember(true);
    try {
      const res = await fetch("/api/teams/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: _id, userId: memberToRemove.userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to remove member");
      }

      // Check if the team was deleted (last member removed)
      if (data.data?.action === "team_deleted") {
        toast.success("Team deleted as the last member was removed");
        onTeamDeleted?.();
      } else {
        toast.success(
          data.data?.newOwner
            ? "Member removed and new team owner assigned"
            : "Member removed successfully"
        );
        onMemberRemoved?.();
      }

      setIsRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setIsRemovingMember(false);
    }
  };

  const openRemoveMemberDialog = (member: TeamMember) => {
    setMemberToRemove(member);
    setIsRemoveMemberDialogOpen(true);
  };

  const copyTeamCode = async () => {
    await navigator.clipboard.writeText(teamCode);
    toast.success("Team code copied to clipboard");
  };

  const searchUsers = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/teams/search-users?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setSuggestions(data.data);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setSelectedUser(null);
    setShowSuggestions(true);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  const handleSelectUser = (user: UserSuggestion) => {
    setEmail(user.email);
    setSelectedUser(user);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (selectedUser?.isInTeam) {
      toast.error(`This user is already in team "${selectedUser.teamName}"`);
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/teams/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: _id, userEmail: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add member");
      }

      toast.success("Member added successfully");
      setEmail("");
      setSelectedUser(null);
      setSuggestions([]);
      setIsDialogOpen(false);
      onMemberAdded?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEmail("");
      setSelectedUser(null);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <Card className="group transition-all hover:shadow-md">
        <CardHeader className="">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-lg font-semibold">{teamName}</CardTitle>
            <div className="flex items-center gap-1">
              {canAddMember && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="sr-only">Add member</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={copyTeamCode}
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy team code</span>
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete team</span>
                </Button>
              )}
            </div>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>Code:</span>
            <Badge variant="secondary" className="font-mono">
              {teamCode}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                <span>Members ({members.length}/4):</span>
              </div>
            </div>
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No members</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.userId}
                    className="bg-muted/30 hover:bg-muted/50 group/member flex items-start gap-3 rounded-lg border p-2.5 transition-colors relative"
                  >
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : "No name provided"}
                        </span>
                        {member.userId === teamOwner && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">{member.email || "No email provided"}</p>
                      {member.status && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-muted-foreground text-[10px]">Status:</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 font-medium",
                              member.status === "Confirmed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                              member.status === "Admitted" && "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
                              member.status === "Submitted" && "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400",
                              member.status === "Checked-In" && "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400",
                              member.status === "Waitlisted" && "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
                              member.status === "Declined" && "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
                              member.status === "Refused" && "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
                              member.status === "Not confirmed" && "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
                              member.status === "Incomplete" && "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
                              member.status === "Unverified" && "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                            )}
                          >
                            {member.status}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4",
                          member.isAdmitted
                            ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
                            : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
                        )}
                      >
                        {member.isAdmitted ? "Member" : "Pending"}
                      </Badge>
                      <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 transition-opacity group-hover/member:opacity-100 hover:bg-accent"
                        asChild
                      >
                        <Link href={`/dashboard/applications/${member.userId}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="sr-only">View application</span>
                        </Link>
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 transition-opacity group-hover/member:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openRemoveMemberDialog(member)}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove member</span>
                        </Button>
                      )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member to {teamName}</DialogTitle>
            <DialogDescription>Search for a user by name or email to add them to this team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="member-email">Search User</Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="member-email"
                    type="text"
                    placeholder="Search by name or email..."
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // Delay hiding to allow click on suggestion
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    disabled={isAdding}
                    autoComplete="off"
                  />
                  {isSearching && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="bg-popover absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg">
                    {suggestions.map((user) => (
                      <button
                        key={user._id}
                        type="button"
                        className={cn(
                          "hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                          user.isInTeam && "opacity-60",
                        )}
                        onClick={() => handleSelectUser(user)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                            {user.isInTeam ? (
                              <Badge variant="outline" className="border-orange-500 text-xs text-orange-500">
                                In team
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500 text-xs text-green-500">
                                Available
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                          {user.isInTeam && user.teamName && (
                            <p className="truncate text-xs text-orange-500">Member of: {user.teamName}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected User Info */}
                {selectedUser && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2 text-sm",
                      selectedUser.isInTeam
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                        : "border-green-500 bg-green-50 dark:bg-green-950/20",
                    )}
                  >
                    {selectedUser.isInTeam ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-orange-700 dark:text-orange-400">
                          Already in team &quot;{selectedUser.teamName}&quot;
                        </span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-green-700 dark:text-green-400">
                          {selectedUser.firstName} {selectedUser.lastName} can be added
                        </span>
                      </>
                    )}
                  </div>
                )}

                {email.length > 0 && email.length < 2 && (
                  <p className="text-muted-foreground text-xs">Type at least 2 characters to search</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isAdding}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAdding || !email.trim() || selectedUser?.isInTeam}>
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{teamName}</span>? This action cannot be undone.
              All {members.length} member{members.length !== 1 ? "s" : ""} will be removed from the team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Team
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={isRemoveMemberDialogOpen}
        onOpenChange={(open) => {
          setIsRemoveMemberDialogOpen(open);
          if (!open) setMemberToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  Are you sure you want to remove{" "}
                  <span className="font-semibold">
                    {memberToRemove.firstName && memberToRemove.lastName
                      ? `${memberToRemove.firstName} ${memberToRemove.lastName}`
                      : memberToRemove.email || "this member"}
                  </span>{" "}
                  from <span className="font-semibold">{teamName}</span>?
                  {memberToRemove.userId === teamOwner && members.length > 1 && (
                    <span className="mt-2 block text-amber-600 dark:text-amber-400">
                      This member is the team owner. A new owner will be randomly assigned.
                    </span>
                  )}
                  {memberToRemove.userId === teamOwner && members.length === 1 && (
                    <span className="mt-2 block text-destructive">
                      This is the only member. The entire team will be deleted.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemovingMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingMember ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Remove Member
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
