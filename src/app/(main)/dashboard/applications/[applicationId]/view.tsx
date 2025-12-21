"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Hourglass,
  XCircle,
  Check,
  ChevronsUpDown,
  X,
  SaveAllIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TravelReimbursementDialog,
  type TravelReimbursementData,
} from "@/components/ui/travel-reimbursement-dialog";
import { NoTravelConfirmationDialog } from "@/components/ui/no-travel-confirmation-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { getAllSkillTags, getSkillTagsByCategory } from "@/lib/skill-tags";
import { ApplicationStatusBadge } from "../_components/application-status-badge";

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
  const filtered = arrayValue.filter(
    (item) => item && item !== "none" && item !== "None"
  );
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
  comments?: string;
  skillTags?: string[];
};

export default function ApplicationView({
  application: initial,
  adminEmail: initialAdminEmail,
}: {
  application: ApplicationDetails;
  adminEmail: string | null;
}) {
  const router = useRouter();

  const [application, setApplication] =
    React.useState<ApplicationDetails>(initial);
  const [adminEmail, setAdminEmail] = React.useState<string | null>(
    initialAdminEmail
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState<
    null | "admit" | "waitlist" | "reject" | "checkin"
  >(null);
  const [travelReimbursementDialogOpen, setTravelReimbursementDialogOpen] =
    React.useState(false);
  const [noTravelConfirmationOpen, setNoTravelConfirmationOpen] =
    React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<
    "admit" | "waitlist" | "reject" | null
  >(null);

  // Comments and Skill Tags state
  const [comments, setComments] = React.useState<string>(
    application.comments || ""
  );
  const [skillTags, setSkillTags] = React.useState<string[]>(
    application.skillTags || []
  );
  const [isSavingMetadata, setIsSavingMetadata] = React.useState(false);
  const [skillTagsOpen, setSkillTagsOpen] = React.useState(false);

  // Update local state when application prop changes
  React.useEffect(() => {
    setComments(application.comments || "");
    setSkillTags(application.skillTags || []);
  }, [application.comments, application.skillTags]);

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
      } catch { }
    }
    loadAdmin();
    return () => {
      active = false;
    };
  }, [adminEmail]);

  async function updateStatus(
    action: "admit" | "waitlist" | "reject",
    travelReimbursementData?: TravelReimbursementData
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
      setPendingAction("admit");
      setNoTravelConfirmationOpen(true);
    }
  }

  function handleWaitlistClick() {
    if (!application.travelReimbursement) {
      setPendingAction("waitlist");
      setNoTravelConfirmationOpen(true);
    } else {
      updateStatus("waitlist");
    }
  }

  function handleRejectClick() {
    if (!application.travelReimbursement) {
      setPendingAction("reject");
      setNoTravelConfirmationOpen(true);
    } else {
      updateStatus("reject");
    }
  }

  function handleNoTravelConfirm() {
    setNoTravelConfirmationOpen(false);
    if (pendingAction) {
      updateStatus(pendingAction);
      setPendingAction(null);
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

  async function saveMetadata() {
    try {
      setIsSavingMetadata(true);
      setError(null);

      const res = await fetch(`/api/application/${application._id}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments: comments || null,
          skillTags: skillTags.length > 0 ? skillTags : null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to save metadata with ${res.status}`);
      }

      const json = await res.json();
      setApplication((prev) => ({
        ...prev,
        comments: json?.data?.comments,
        skillTags: json?.data?.skillTags,
      }));

      toast.success("Comments and skill tags saved successfully");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save metadata");
      toast.error(e?.message ?? "Failed to save metadata");
    } finally {
      setIsSavingMetadata(false);
    }
  }

  function toggleSkillTag(tag: string) {
    setSkillTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function removeSkillTag(tag: string) {
    setSkillTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6">
      <div className="flex flex-col gap-3">
          <div>
            <h2>Applicant Details</h2>
            <p className="text-xs text-muted-foreground">
              Review application and take action.
            </p>
          </div>
          <div className="space-y-4">
            {error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <>
                <div>
                    <h2>
                      {application.firstName} {application.lastName}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-2">
                      {application.email}
                    </p>
                    <ApplicationStatusBadge status={application.status} />
                  </div>

                <Separator />

                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          18 or Above
                        </div>
                        <div>{application.isEighteenOrAbove || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Phone Number
                        </div>
                        <div>{application.phoneNumber || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Gender
                        </div>
                        <div>{application.gender || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Pronouns
                        </div>
                        <div>{application.pronouns || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Underrepresented
                        </div>
                        <div>{application.underrepresented || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Education */}
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">Education</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          School
                        </div>
                        <div>{application.school || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          School (Other)
                        </div>
                        <div>{application.schoolOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Faculty
                        </div>
                        <div>{application.faculty || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Faculty (Other)
                        </div>
                        <div>{application.facultyOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Level of Study
                        </div>
                        <div>{application.levelOfStudy || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Level of Study (Other)
                        </div>
                        <div>{application.levelOfStudyOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Program
                        </div>
                        <div>{application.program || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Program (Other)
                        </div>
                        <div>{application.programOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Graduation Semester
                        </div>
                        <div>{application.graduationSemester || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Graduation Year
                        </div>
                        <div>{application.graduationYear || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Logistics */}
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">Logistics</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Country
                        </div>
                        <div>{application.country || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          City
                        </div>
                        <div>{application.city || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Shirt Size
                        </div>
                        <div>{application.shirtSize || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Dietary Restrictions
                        </div>
                        <div>
                          {formatArrayValue(application.dietaryRestrictions)}
                        </div>
                      </div>
                      {application.dietaryRestrictionsDescription && (
                        <div className="space-y-1 ">
                          <div className="text-muted-foreground text-xs">
                            Restrictions Description
                          </div>
                          <div>
                            {application.dietaryRestrictionsDescription}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Project Experience */}
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">
                      Project Experience
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Cool Project
                        </div>
                        <div className="whitespace-pre-wrap break-words text-justify">
                          {application.coolProject || "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          What are you excited about?
                        </div>
                        <div className="whitespace-pre-wrap break-words text-justify">
                          {application.excitedAbout || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Career Interests */}
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">
                      Career Interests
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Job Roles Looking For
                        </div>
                        <div>
                          {formatArrayValue(application.jobRolesLookingFor)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Work Regions
                        </div>
                        <div>{formatArrayValue(application.workRegions)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Work Regions (Other)
                        </div>
                        <div>{application.workRegionsOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Job Types Interested
                        </div>
                        <div>
                          {formatArrayValue(application.jobTypesInterested)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Job Types (Other)
                        </div>
                        <div>{application.jobTypesInterestedOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Registered for Co-op
                        </div>
                        <div>
                          {application.isRegisteredForCoop ? "Yes" : "No"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Next Co-op Term
                        </div>
                        <div>{application.nextCoopTerm || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Next Co-op Term (Other)
                        </div>
                        <div>{application.nextCoopTermOther || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Preferences */}
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">Preferences</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Preferred Language
                        </div>
                        <div>{application.preferredLanguage || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Working Languages
                        </div>
                        <div>
                          {formatArrayValue(application.workingLanguages)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Working Languages (Other)
                        </div>
                        <div>{application.workingLanguagesOther || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          Travel Reimbursement
                        </div>
                        <div>
                          {application.travelReimbursement ? "Yes" : "No"}
                        </div>
                      </div>
                      {application.isTravelReimbursementApproved !==
                        undefined && (
                          <div className="space-y-1 md:col-span-2">
                            <div className="text-muted-foreground text-xs">
                              Travel Reimbursement Status
                            </div>
                            <div>
                              {application.isTravelReimbursementApproved ? (
                                <span className="font-semibold text-green-600">
                                  Approved:{" "}
                                  {application.travelReimbursementAmount}{" "}
                                  {application.travelReimbursementCurrency}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Not Approved
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  <Separator />

                  {/* Links */}
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">
                      Links & Documents
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-">
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">
                          GitHub
                        </div>
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
                        <div className="text-muted-foreground text-xs">
                          LinkedIn
                        </div>
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
                        <div className="text-muted-foreground text-xs">
                          Resume
                        </div>
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

                {/* Comments Section */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">Comments</h3>
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Add comments about this application..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="min-h-60"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-6 text-sm font-semibold">Skills</h3>
                    <div className="space-y-3">
                      <Popover
                        open={skillTagsOpen}
                        onOpenChange={setSkillTagsOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={skillTagsOpen}
                            className="w-full justify-between font-normal"
                          >
                            <span className="text-sm">
                              {skillTags.length > 0
                                ? `${skillTags.length} tag${skillTags.length !== 1 ? "s" : ""
                                } selected`
                                : "Select skill tags..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search skill tags..."
                              className="h-9"
                            />
                            <CommandList className="max-h-[300px]">
                              <CommandEmpty>No skill tag found.</CommandEmpty>
                              {Object.entries(getSkillTagsByCategory()).map(
                                ([category, tags]) => (
                                  <CommandGroup key={category} heading={category}>
                                    {tags.map((tag) => (
                                      <CommandItem
                                        key={tag}
                                        value={tag}
                                        onSelect={() => {
                                          toggleSkillTag(tag);
                                        }}
                                        className="text-sm"
                                      >
                                        <Check
                                          className={
                                            skillTags.includes(tag)
                                              ? "mr-2 h-4 w-4 opacity-100"
                                              : "mr-2 h-4 w-4 opacity-0"
                                          }
                                        />
                                        {tag}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Selected Tags Display */}
                      {skillTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skillTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="gap-1 pr-1.5 text-xs"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => removeSkillTag(tag)}
                                className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 transition-colors"
                                aria-label={`Remove ${tag}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center w-full">
                  <Button variant="ghost" onClick={() => router.back()}>
                    Back
                  </Button>

                  {(() => {
                    const status = application.status;
                    const isSubmitted = status === "Submitted";
                    const isConfirmed = status === "Confirmed";
                    const isCheckedIn =
                      status === "CheckedIn" || status === "Checked-in";

                    if (isSubmitted) {
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            onClick={saveMetadata}
                            disabled={isSavingMetadata}
                            variant="outline"
                            className="btn-primary"
                          >
                            <SaveAllIcon /> {isSavingMetadata ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            onClick={handleAdmitClick}
                            disabled={isSaving !== null}
                            variant="default"
                          >
                            <CheckCircle2 /> Admit
                          </Button>
                          <Button
                            onClick={handleWaitlistClick}
                            disabled={isSaving !== null}
                            variant="secondary"
                          >
                            <Hourglass /> Waitlist
                          </Button>
                          <Button
                            onClick={handleRejectClick}
                            disabled={isSaving !== null}
                            variant="destructive"
                          >
                            <XCircle /> Reject
                          </Button>
                        </div>
                      );
                    }

                    if (isConfirmed) {
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            onClick={checkIn}
                            disabled={isSaving !== null}
                            variant="default"
                          >
                            <CheckCircle2 /> Check In
                          </Button>
                        </div>
                      );
                    }

                    if (isCheckedIn) {
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button onClick={checkIn} disabled variant="default">
                            <CheckCircle2 /> Checked In
                          </Button>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              </>
            )}
          </div>
        </div>

      <TravelReimbursementDialog
        open={travelReimbursementDialogOpen}
        onOpenChange={setTravelReimbursementDialogOpen}
        onSubmit={handleTravelReimbursementSubmit}
        candidateName={`${application.firstName} ${application.lastName}`}
      />

      <NoTravelConfirmationDialog
        open={noTravelConfirmationOpen}
        onOpenChange={setNoTravelConfirmationOpen}
        onConfirm={handleNoTravelConfirm}
        candidateName={`${application.firstName} ${application.lastName}`}
        action={pendingAction || "admit"}
      />
    </div>
  );
}
