"use client";

import * as React from "react";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { TravelReimbursementDialog, type TravelReimbursementData } from "@/components/ui/travel-reimbursement-dialog";

/**
 * Helper function to format array values for display
 * Handles arrays, stringified arrays, and arrays containing stringified arrays
 */
function formatArrayValue(value: string | string[] | undefined | null): string {
  if (!value) return "—";

  let arrayValue: string[];

  // If it's an array
  if (Array.isArray(value)) {
    // Check if it's an array with a single string element that looks like a stringified array
    if (value.length === 1 && typeof value[0] === "string") {
      const str = value[0].trim();
      if (str.startsWith("[") && str.endsWith("]")) {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            arrayValue = parsed;
          } else {
            arrayValue = value;
          }
        } catch {
          arrayValue = value;
        }
      } else {
        arrayValue = value;
      }
    } else {
      // It's a regular array, use it directly
      arrayValue = value;
    }
  }
  // If it's a string, try to parse it as JSON
  else if (typeof value === "string") {
    const trimmed = value.trim();

    // Check if it looks like a stringified array
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          arrayValue = parsed;
        } else {
          return value;
        }
      } catch {
        return value;
      }
    } else {
      // Not an array format, return as-is
      return value;
    }
  }
  // Otherwise, treat it as a single value
  else {
    return String(value);
  }

  // Filter out empty values and join with " | "
  const filtered = arrayValue.filter((item) => item && item !== "none" && item !== "None");
  return filtered.length > 0 ? filtered.join(" | ") : "—";
}

export type ApplicationDetails = {
  _id: string;
  firstName: string;
  lastName: string;
  isEighteenOrAbove: string;
  phoneNumber: string;
  email: string;
  country: string;
  city: string;
  school: string;
  schoolOther: string;
  faculty: string;
  facultyOther: string;
  levelOfStudy: string;
  levelOfStudyOther: string;
  program: string;
  programOther: string;
  graduationSemester: string;
  graduationYear: string;
  coolProject: string;
  excitedAbout: string;
  travelReimbursement: boolean;
  preferredLanguage: string;
  workingLanguages: string;
  workingLanguagesOther: string;
  shirtSize: string;
  dietaryRestrictions?: string[];
  dietaryRestrictionsDescription: string;
  github: string;
  linkedin: string;
  gender: string;
  pronouns: string;
  underrepresented: string;
  jobRolesLookingFor: string;
  workRegions: string;
  workRegionsOther: string;
  jobTypesInterested: string;
  jobTypesInterestedOther: string;
  isRegisteredForCoop: boolean;
  nextCoopTerm: string;
  nextCoopTermOther: string;
  status: string;
  processedBy?: string;
  processedAt?: string;
  hasResume?: boolean;
  isTravelReimbursementApproved?: boolean;
  travelReimbursementAmount?: number;
  travelReimbursementCurrency?: string;
};

export default function ApplicationView({
  application: initial,
  adminEmail: initialAdminEmail,
}: {
  application: ApplicationDetails;
  adminEmail: string | null;
}) {
  const router = useRouter();

  const [application, setApplication] = React.useState<ApplicationDetails>(initial);
  const [adminEmail, setAdminEmail] = React.useState<string | null>(initialAdminEmail);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState<null | "admit" | "waitlist" | "reject" | "checkin">(null);
  const [travelReimbursementDialogOpen, setTravelReimbursementDialogOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function loadAdmin() {
      try {
        if (adminEmail) return;
        const meRes = await fetch(`/api/auth-token/me`, { cache: "no-store" });
        if (!meRes.ok) return;
        const meJson = await meRes.json();
        if (!active) return;
        setAdminEmail(meJson?.data?.email ?? null);
      } catch {}
    }
    loadAdmin();
    return () => {
      active = false;
    };
  }, [adminEmail]);

  async function updateStatus(
    action: "admit" | "waitlist" | "reject",
    travelReimbursementData?: TravelReimbursementData,
  ) {
    try {
      setIsSaving(action);
      setError(null);
      const res = await fetch(`/api/status/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminEmail,
          travelReimbursement: travelReimbursementData,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed with ${res.status}`);
      }
      const json = await res.json();
      const newStatus = json?.data as string;
      setApplication((prev) => ({
        ...prev,
        status: newStatus,
        isTravelReimbursementApproved: travelReimbursementData?.approved,
        travelReimbursementAmount: travelReimbursementData?.amount,
        travelReimbursementCurrency: travelReimbursementData?.currency,
      }));
    } catch (e: any) {
      setError(e?.message ?? "Failed to update status");
    } finally {
      setIsSaving(null);
    }
  }

  function handleAdmitClick() {
    if (application.travelReimbursement) {
      setTravelReimbursementDialogOpen(true);
    } else {
      updateStatus("admit");
    }
  }

  function handleTravelReimbursementSubmit(data: TravelReimbursementData) {
    setTravelReimbursementDialogOpen(false);
    updateStatus("admit", data);
  }

  async function checkIn() {
    try {
      setIsSaving("checkin");
      setError(null);
      const res = await fetch(`/api/check-in/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Checked-in" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Check-in failed with ${res.status}`);
      }
      const json = await res.json();
      const newStatus = json?.data?.status ?? "Checked-in";
      setApplication((prev) => ({ ...prev, status: newStatus }));
    } catch (e: any) {
      setError(e?.message ?? "Failed to check in");
    } finally {
      setIsSaving(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6">
      <div className="mt-2">
        <Card>
          <CardHeader>
            <CardTitle>Applicant</CardTitle>
            <CardDescription>Review application and take action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">
                      {application.firstName} {application.lastName}
                    </div>
                    <div className="text-muted-foreground text-sm">{application.email}</div>
                  </div>
                  <Badge variant="secondary">{application.status}</Badge>
                </div>

                <Separator />

                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Personal Information</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">18 or Above</div>
                        <div>{application.isEighteenOrAbove || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Phone Number</div>
                        <div>{application.phoneNumber || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Gender</div>
                        <div>{application.gender || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Pronouns</div>
                        <div>{application.pronouns || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Underrepresented</div>
                        <div>{application.underrepresented || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Education */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Education</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">School</div>
                        <div>{application.school || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">School (Other)</div>
                        <div>{application.schoolOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Faculty</div>
                        <div>{application.faculty || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Faculty (Other)</div>
                        <div>{application.facultyOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Level of Study</div>
                        <div>{application.levelOfStudy || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Level of Study (Other)</div>
                        <div>{application.levelOfStudyOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Program</div>
                        <div>{application.program || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Program (Other)</div>
                        <div>{application.programOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Graduation Semester</div>
                        <div>{application.graduationSemester || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Graduation Year</div>
                        <div>{application.graduationYear || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Project Experience */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Project Experience</h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Cool Project</div>
                        <div className="whitespace-pre-wrap">{application.coolProject || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">What are you excited about?</div>
                        <div className="whitespace-pre-wrap">{application.excitedAbout || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Career Interests */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Career Interests</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Job Roles Looking For</div>
                        <div>{formatArrayValue(application.jobRolesLookingFor)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Work Regions</div>
                        <div>{formatArrayValue(application.workRegions)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Work Regions (Other)</div>
                        <div>{application.workRegionsOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Job Types Interested</div>
                        <div>{formatArrayValue(application.jobTypesInterested)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Job Types (Other)</div>
                        <div>{application.jobTypesInterestedOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Registered for Co-op</div>
                        <div>{application.isRegisteredForCoop ? "Yes" : "No"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Next Co-op Term</div>
                        <div>{application.nextCoopTerm || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Next Co-op Term (Other)</div>
                        <div>{application.nextCoopTermOther || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Preferences */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Preferences</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Preferred Language</div>
                        <div>{application.preferredLanguage || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Working Languages</div>
                        <div>{formatArrayValue(application.workingLanguages)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Working Languages (Other)</div>
                        <div>{application.workingLanguagesOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Travel Reimbursement</div>
                        <div>{application.travelReimbursement ? "Yes" : "No"}</div>
                      </div>
                      {application.isTravelReimbursementApproved !== undefined && (
                        <div className="space-y-1 md:col-span-2">
                          <div className="text-muted-foreground text-xs">Travel Reimbursement Status</div>
                          <div>
                            {application.isTravelReimbursementApproved ? (
                              <span className="font-semibold text-green-600">
                                Approved: {application.travelReimbursementAmount}{" "}
                                {application.travelReimbursementCurrency}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Not Approved</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Logistics */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Logistics</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Country</div>
                        <div>{application.country || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">City</div>
                        <div>{application.city || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Shirt Size</div>
                        <div>{application.shirtSize || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Dietary Restrictions</div>
                        <div>{formatArrayValue(application.dietaryRestrictions)}</div>
                      </div>
                      {application.dietaryRestrictionsDescription && (
                        <div className="space-y-1 md:col-span-2">
                          <div className="text-muted-foreground text-xs">Dietary Restrictions Description</div>
                          <div>{application.dietaryRestrictionsDescription}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Links */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Links & Documents</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">GitHub</div>
                        <div>
                          {application.github ? (
                            <a
                              href={application.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              {application.github}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">LinkedIn</div>
                        <div>
                          {application.linkedin ? (
                            <a
                              href={application.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              {application.linkedin}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Resume</div>
                        <div>
                          {application.hasResume ? (
                            <a
                              href={`/api/users/resume/${application._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              View Resume
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {(() => {
                  const status = application.status;
                  const isSubmitted = status === "Submitted";
                  const isConfirmed = status === "Confirmed";
                  const isCheckedIn = status === "CheckedIn" || status === "Checked-in";

                  if (isSubmitted) {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={handleAdmitClick} disabled={isSaving !== null} variant="default">
                          <CheckCircle2 className="mr-2" /> Admit
                        </Button>
                        <Button
                          onClick={() => updateStatus("waitlist")}
                          disabled={isSaving !== null}
                          variant="secondary"
                        >
                          <Hourglass className="mr-2" /> Waitlist
                        </Button>
                        <Button
                          onClick={() => updateStatus("reject")}
                          disabled={isSaving !== null}
                          variant="destructive"
                        >
                          <XCircle className="mr-2" /> Reject
                        </Button>
                      </div>
                    );
                  }

                  if (isConfirmed) {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={checkIn} disabled={isSaving !== null} variant="default">
                          <CheckCircle2 className="mr-2" /> Check In
                        </Button>
                      </div>
                    );
                  }

                  if (isCheckedIn) {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={checkIn} disabled variant="default">
                          <CheckCircle2 className="mr-2" /> Checked In
                        </Button>
                      </div>
                    );
                  }

                  return null;
                })()}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div>
        <Button variant="ghost" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <TravelReimbursementDialog
        open={travelReimbursementDialogOpen}
        onOpenChange={setTravelReimbursementDialogOpen}
        onSubmit={handleTravelReimbursementSubmit}
        candidateName={`${application.firstName} ${application.lastName}`}
      />
    </div>
  );
}
