"use client";

import { Users, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TeamData } from "./view";

type TeamInfoCardProps = {
  teamData: TeamData;
  currentApplicationId: string;
};

/**
 * Displays team information for an applicant, including team name
 * and a list of all team members with quick review buttons
 */
export function TeamInfoCard({
  teamData,
  currentApplicationId,
}: TeamInfoCardProps) {
  if (!teamData) {
    return null;
  }

  const handleReviewClick = (userId: string) => {
    window.open(
      `/dashboard/applications/${userId}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" />
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            <span className="font-medium">{teamData.teamName}</span> ·{" "}
            {teamData.members.length} member
            {teamData.members.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-1.5">
            {teamData.members.map((member) => {
              const isCurrentApplicant = member.userId === currentApplicationId;

              return (
                <div
                  key={member.userId}
                  className={`flex items-center justify-between p-2 rounded-md text-sm ${
                    isCurrentApplicant ? "bg-muted/50" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs truncate ${
                            isCurrentApplicant ? "font-medium" : ""
                          }`}
                        >
                          {member.firstName} {member.lastName}
                        </p>
                        {isCurrentApplicant && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  {!isCurrentApplicant && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReviewClick(member.userId)}
                      className="ml-2 shrink-0 h-7 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
