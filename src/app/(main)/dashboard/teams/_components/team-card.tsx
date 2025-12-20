"use client";

import { Copy, Star, Users } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  userId: string;
  isAdmitted: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImgUrl: string;
}

export interface TeamCardProps {
  _id: string;
  teamName: string;
  teamCode: string;
  members: TeamMember[];
  teamOwner: string;
  memberCount?: number;
}

function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return "?";
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export function TeamCard({ teamName, teamCode, members, teamOwner }: TeamCardProps) {
  const copyTeamCode = async () => {
    await navigator.clipboard.writeText(teamCode);
    toast.success("Team code copied to clipboard");
  };

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-lg font-semibold">
            {teamName}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={copyTeamCode}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copy team code</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Team Code:</span>
          <Badge variant="secondary" className="font-mono">
            {teamCode}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Members:</span>
          </div>
          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No members</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-8 w-8">
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
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email || "No email provided"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

