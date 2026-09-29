"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

// Uncontrolled Input component - only syncs to parent on blur
// This completely avoids re-renders during typing
function DebouncedInput({
  value: initialValue,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "defaultValue"
>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValueRef = useRef(initialValue);

  // Update the input value when initialValue changes (e.g., entering edit mode)
  useEffect(() => {
    if (inputRef.current && initialValue !== initialValueRef.current) {
      inputRef.current.value = initialValue;
      initialValueRef.current = initialValue;
    }
  }, [initialValue]);

  const handleBlur = useCallback(() => {
    if (inputRef.current) {
      onChange(inputRef.current.value);
    }
  }, [onChange]);

  return (
    <Input
      {...props}
      ref={inputRef}
      defaultValue={initialValue}
      onBlur={handleBlur}
    />
  );
}

// Uncontrolled Textarea component - only syncs to parent on blur
function DebouncedTextarea({
  value: initialValue,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "defaultValue"
>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    if (textareaRef.current && initialValue !== initialValueRef.current) {
      textareaRef.current.value = initialValue;
      initialValueRef.current = initialValue;
    }
  }, [initialValue]);

  const handleBlur = useCallback(() => {
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
    }
  }, [onChange]);

  return (
    <Textarea
      {...props}
      ref={textareaRef}
      defaultValue={initialValue}
      onBlur={handleBlur}
    />
  );
}

import {
  CheckCircle2,
  Hourglass,
  XCircle,
  Check,
  ChevronsUpDown,
  X,
  SaveAllIcon,
  Pencil,
  Save,
  XIcon,
  Upload,
  Trash2,
  AlertTriangle,
  Star,
} from "lucide-react";
import { isCheckedInStatus } from "@/lib/status";

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
import { QrCodeCheckinDialog } from "@/components/ui/qr-code-checkin-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { getAllSkillTags, getSkillTagsByCategory } from "@/lib/skill-tags";
import { ApplicationStatusBadge } from "../_components/application-status-badge";
import { TeamInfoCard } from "./team-info-card";

// Import form options from constants
import { statuses } from "@/constants/statuses";
import {
  TRAVEL_FIELD,
  UNANSWERED_CHOICE,
  displayFieldValue,
  parseChoice,
  resolveSections,
  type ResolvedField,
} from "@/lib/conuhacks/application-fields";
import type { ApplicationDetails, TeamData } from "@/lib/conuhacks/application-details";
import { formatTravelAnswer } from "@/lib/conuhacks/display";
import { isQuebecResident } from "@/lib/conuhacks/quebec";
import { describeTravelDecision, needsTravelDecision } from "@/lib/conuhacks/travel-block";
import { safeExternalUrl } from "@/lib/safe-external-url";

// Convert statuses to select options format
const APPLICATION_STATUSES = statuses.map((s) => ({
  value: s.name,
  label: s.title,
}));

// Critical fields that require confirmation before saving
const CRITICAL_FIELDS = ["status", "firstName", "lastName"];

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

export type { ApplicationDetails, TeamData, TeamMemberInfo } from "@/lib/conuhacks/application-details";

/** An applicant's link, clickable only when it is a real http(s) URL (never javascript:/data:). */
function ExternalLinkField({ label, value }: { label: string; value: string }) {
  const href = safeExternalUrl(value);
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="truncate">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            {value}
          </a>
        ) : (
          value || "—"
        )}
      </div>
    </div>
  );
}

export default function ApplicationView({
  application: initial,
  adminEmail: initialAdminEmail,
  teamData,
  isSuperAdmin,
}: {
  application: ApplicationDetails;
  adminEmail: string | null;
  teamData?: TeamData;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();

  const [application, setApplication] =
    React.useState<ApplicationDetails>(initial);
  const [adminEmail, setAdminEmail] = React.useState<string | null>(
    initialAdminEmail
  );
  const [error, setError] = React.useState<string | null>(null);
  const [checkInError, setCheckInError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState<
    null | "admit" | "waitlist" | "reject" | "checkin"
  >(null);
  const [travelReimbursementDialogOpen, setTravelReimbursementDialogOpen] =
    React.useState(false);
  const [qrCodeCheckinDialogOpen, setQrCodeCheckinDialogOpen] =
    React.useState(false);
  const [backConfirmationOpen, setBackConfirmationOpen] = React.useState(false);
  const [actionConfirmationOpen, setActionConfirmationOpen] =
    React.useState(false);
  const [confirmationAction, setConfirmationAction] = React.useState<
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

  // Edit mode state
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editedApplication, setEditedApplication] =
    React.useState<ApplicationDetails>(initial);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [criticalChanges, setCriticalChanges] = React.useState<string[]>([]);

  // Resume upload state
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Multi-select popover state
  const [openMultiselect, setOpenMultiselect] = React.useState<string | null>(
    null
  );

  // Star state
  const [isStarring, setIsStarring] = React.useState(false);

  // Update local state when application prop changes
  React.useEffect(() => {
    setComments(application.comments || "");
    setSkillTags(application.skillTags || []);
  }, [application.comments, application.skillTags]);

  // Reset edited application when entering edit mode
  React.useEffect(() => {
    if (isEditMode) {
      setEditedApplication(application);
      setResumeFile(null);
    }
  }, [isEditMode, application]);

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
    if (needsTravelDecision(application.travelReimbursement, isSuperAdmin)) {
      setTravelReimbursementDialogOpen(true);
    } else {
      setConfirmationAction("admit");
      setActionConfirmationOpen(true);
    }
  }

  function handleWaitlistClick() {
    setConfirmationAction("waitlist");
    setActionConfirmationOpen(true);
  }

  function handleRejectClick() {
    setConfirmationAction("reject");
    setActionConfirmationOpen(true);
  }

  function proceedWithAction() {
    setActionConfirmationOpen(false);
    if (!confirmationAction) return;

    if (confirmationAction === "admit" && application.travelReimbursement !== true) {
      updateStatus("admit");
    } else {
      updateStatus(confirmationAction);
    }
    setConfirmationAction(null);
  }

  function handleTravelReimbursementSubmit(data: TravelReimbursementData) {
    setTravelReimbursementDialogOpen(false);
    updateStatus("admit", data);
  }

  function handleCheckInClick() {
    setQrCodeCheckinDialogOpen(true);
  }

  async function checkIn(qrCodeNumber: number) {
    try {
      setIsSaving("checkin");
      setError(null);
      setCheckInError(null); // Clear previous check-in errors
      const res = await fetch(`/api/check-in/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Checked-in",
          qrCodeNumber,
        }),
      });

      // Read response body once
      const responseText = await res.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        // If not JSON, treat as error
        throw new Error(responseText || `Check-in failed with ${res.status}`);
      }

      if (!res.ok) {
        // The API uses sendErrorResponse which returns { status: "error", message, error }
        const errorMessage = responseData?.message || responseData?.error || `Check-in failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      // Success case
      const newStatus = responseData?.data?.status ?? "Checked-in";
      setApplication((prev) => ({ ...prev, status: newStatus }));
      setError(null); // Clear any previous errors
      setCheckInError(null); // Clear check-in errors
      setQrCodeCheckinDialogOpen(false);
      toast.success("Successfully checked in");
    } catch (e: any) {
      const errorMessage = e?.message ?? "Failed to check in";
      setCheckInError(errorMessage); // Store in check-in specific error state
      toast.error(errorMessage);
      // Keep dialog open on error - don't close it
      // The error will be displayed in the dialog via externalError prop
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

  // Check if there are unsaved changes to comments or skill tags
  function hasUnsavedChanges(): boolean {
    const commentsChanged = comments !== (application.comments || "");
    const skillTagsChanged =
      JSON.stringify(skillTags.sort()) !==
      JSON.stringify((application.skillTags || []).sort());
    return commentsChanged || skillTagsChanged;
  }

  // Handle back button click with unsaved changes check
  function handleBackClick() {
    if (hasUnsavedChanges()) {
      setBackConfirmationOpen(true);
    } else {
      router.back();
    }
  }

  // Handle save and go back
  async function handleSaveAndGoBack() {
    try {
      await saveMetadata();
      router.back();
    } catch (e) {
      // Error already handled by saveMetadata
      setBackConfirmationOpen(false);
    }
  }

  // Helper function to update edited application fields
  function updateField<K extends keyof ApplicationDetails>(
    field: K,
    value: ApplicationDetails[K]
  ) {
    setEditedApplication((prev) => ({ ...prev, [field]: value }));
  }

  // Check for critical changes
  function getCriticalChanges(): string[] {
    const changes: string[] = [];
    for (const field of CRITICAL_FIELDS) {
      const key = field as keyof ApplicationDetails;
      if (editedApplication[key] !== application[key]) {
        changes.push(field);
      }
    }
    return changes;
  }

  // Handle save with confirmation for critical changes
  async function handleSaveClick() {
    const changes = getCriticalChanges();
    if (changes.length > 0) {
      setCriticalChanges(changes);
      setShowConfirmDialog(true);
    } else {
      await saveChanges();
    }
  }

  // Save all changes
  async function saveChanges() {
    try {
      setIsSavingEdit(true);
      setError(null);

      // First, save the application fields
      const res = await fetch(`/api/application/${application._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editedApplication,
          comments,
          skillTags,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.message || `Update failed with ${res.status}`);
      }

      const json = await res.json();

      // If there's a new resume to upload
      if (resumeFile) {
        setIsUploadingResume(true);
        const formData = new FormData();
        formData.append("resume", resumeFile);

        const resumeRes = await fetch(
          `/api/application/${application._id}/resume`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!resumeRes.ok) {
          const resumeJson = await resumeRes.json();
          throw new Error(resumeJson?.error || "Failed to upload resume");
        }

        json.data.hasResume = true;
        setIsUploadingResume(false);
      }

      // Update local state
      setApplication({
        ...json.data,
        hasResume: json.data.resume?.id ? true : application.hasResume,
      });
      setIsEditMode(false);
      setResumeFile(null);
      toast.success("Application updated successfully");
    } catch (e: any) {
      setError(e?.message ?? "Failed to update application");
      toast.error(e?.message ?? "Failed to update application");
    } finally {
      setIsSavingEdit(false);
      setIsUploadingResume(false);
      setShowConfirmDialog(false);
    }
  }

  // Handle resume file selection
  function handleResumeSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Invalid file type. Only PDF and Word documents are allowed."
        );
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 5MB.");
        return;
      }
      setResumeFile(file);
    }
  }

  // Handle resume deletion
  async function handleDeleteResume() {
    try {
      const res = await fetch(`/api/application/${application._id}/resume`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || "Failed to delete resume");
      }

      setApplication((prev) => ({ ...prev, hasResume: false }));
      toast.success("Resume deleted successfully");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete resume");
    }
  }

  // Toggle star status
  async function toggleStar() {
    try {
      setIsStarring(true);
      const newStatus = !application.isStarred;
      // Optimistic update
      setApplication((prev) => ({ ...prev, isStarred: newStatus }));

      const res = await fetch(`/api/application/${application._id}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: newStatus }),
      });

      if (!res.ok) {
        // Revert on error
        setApplication((prev) => ({ ...prev, isStarred: !newStatus }));
        toast.error("Failed to update star status");
      }
    } catch (e) {
      // Revert on error
      setApplication((prev) => ({
        ...prev,
        isStarred: !application.isStarred,
      }));
      toast.error("Failed to update star status");
    } finally {
      setIsStarring(false);
    }
  }

  // Fields that use JSON string in array format: ['["value1","value2"]'] (registration storage)
  const JSON_STRING_ARRAY_FIELDS: string[] = ["languagesSpoken", "jobTypesInterested", "dietaryRestrictions"];
  // Fields that use JSON string format directly: '["value1","value2"]' (none in ConUHacks XI)
  const JSON_STRING_DIRECT_FIELDS: string[] = [];

  // Generic toggle function for any multiselect field
  function toggleMultiselectValue(
    field: keyof ApplicationDetails,
    value: string
  ) {
    setEditedApplication((prev) => {
      const currentValue = prev[field];
      let current: string[] = [];
      if (Array.isArray(currentValue)) {
        if (currentValue.length === 1 && typeof currentValue[0] === "string") {
          const str = currentValue[0].trim();
          if (str.startsWith("[")) {
            try {
              current = JSON.parse(str);
            } catch {
              current = currentValue as string[];
            }
          } else {
            current = currentValue as string[];
          }
        } else {
          current = currentValue as string[];
        }
      } else if (typeof currentValue === "string" && currentValue) {
        if (currentValue.startsWith("[")) {
          try {
            current = JSON.parse(currentValue);
          } catch {
            current = [currentValue];
          }
        } else {
          current = [currentValue];
        }
      }

      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      let storedValue: string | string[];
      if (JSON_STRING_ARRAY_FIELDS.includes(field)) {
        storedValue = [JSON.stringify(newValues)];
      } else if (JSON_STRING_DIRECT_FIELDS.includes(field)) {
        storedValue = JSON.stringify(newValues);
      } else {
        storedValue = newValues;
      }

      return {
        ...prev,
        [field]: storedValue,
      } as ApplicationDetails;
    });
  }

  // Render a field - either as display or as editable input
  function renderField(
    label: string,
    field: keyof ApplicationDetails,
    type: "text" | "textarea" | "select" | "boolean" | "multiselect" = "text",
    options?: readonly { value: string; label: string }[]
  ) {
    const value = isEditMode ? editedApplication[field] : application[field];

    if (!isEditMode) {
      if (type === "boolean") {
        return (
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div>{value ? "Yes" : "No"}</div>
          </div>
        );
      }
      if (type === "multiselect" || Array.isArray(value)) {
        return (
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div>{formatArrayValue(value as string | string[])}</div>
          </div>
        );
      }
      let displayValue = "—";
      if (value !== null && value !== undefined && value !== "") {
        displayValue = String(value);
      }
      return (
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs">{label}</div>
          <div className={type === "textarea" ? "whitespace-pre-wrap" : ""}>
            {displayValue}
          </div>
        </div>
      );
    }

    // Edit mode
    if (type === "boolean") {
      return (
        <div className="space-y-2">
          <Label className="text-xs">{label}</Label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={value as boolean}
              onCheckedChange={(checked) => updateField(field, checked as any)}
            />
            <span className="text-sm">{value ? "Yes" : "No"}</span>
          </div>
        </div>
      );
    }

    if (type === "select" && options) {
      let rawValue = "";
      if (Array.isArray(value)) {
        rawValue = value.length > 0 ? String(value[0]) : "";
      } else if (value !== null && value !== undefined) {
        rawValue = String(value);
      }

      const matchedOption = options.find(
        (opt) => opt.value.toLowerCase() === rawValue.toLowerCase()
      );
      const selectValue = matchedOption ? matchedOption.value : rawValue;
      const displayOptions = [...options];
      if (rawValue && !matchedOption) {
        displayOptions.unshift({
          value: rawValue,
          label: `${rawValue} (current)`,
        });
      }

      return (
        <div className="space-y-2">
          <Label className="text-xs">{label}</Label>
          <Select
            value={selectValue}
            onValueChange={(v) => updateField(field, v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {displayOptions.map((opt, idx) => (
                <SelectItem key={`${opt.value}-${idx}`} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === "textarea") {
      let textareaValue = "";
      if (Array.isArray(value)) {
        textareaValue = value.join(", ");
      } else if (value !== null && value !== undefined) {
        textareaValue = String(value);
      }

      return (
        <div className="space-y-2">
          <Label className="text-xs">{label}</Label>
          <DebouncedTextarea
            value={textareaValue}
            onChange={(v) => updateField(field, v as any)}
            className="min-h-24"
          />
        </div>
      );
    }

    if (type === "multiselect" && options) {
      let selectedValues: string[] = [];
      if (Array.isArray(value)) {
        if (value.length === 1 && typeof value[0] === "string") {
          const str = value[0].trim();
          if (str.startsWith("[")) {
            try {
              selectedValues = JSON.parse(str);
            } catch {
              selectedValues = value as string[];
            }
          } else {
            selectedValues = value as string[];
          }
        } else {
          selectedValues = value as string[];
        }
      } else if (typeof value === "string" && value) {
        if (value.startsWith("[")) {
          try {
            selectedValues = JSON.parse(value);
          } catch {
            selectedValues = [value];
          }
        } else {
          selectedValues = [value];
        }
      }

      const getLabel = (val: string) => {
        const opt = options.find(
          (o) => o.value.toLowerCase() === val.toLowerCase()
        );
        return opt?.label || val;
      };

      return (
        <div className="space-y-2">
          <Label className="text-xs">{label}</Label>
          <Popover
            open={openMultiselect === field}
            onOpenChange={(open) => setOpenMultiselect(open ? field : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between font-normal"
              >
                <span className="text-sm truncate">
                  {selectedValues.length > 0
                    ? `${selectedValues.length} selected`
                    : `Select ${label.toLowerCase()}`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder={`Search ${label.toLowerCase()}...`}
                />
                <CommandList>
                  <CommandEmpty>No option found.</CommandEmpty>
                  <CommandGroup>
                    {options.map((opt, idx) => (
                      <CommandItem
                        key={`${opt.value}-${idx}`}
                        value={opt.value}
                        onSelect={() =>
                          toggleMultiselectValue(field, opt.value)
                        }
                      >
                        <Check
                          className={
                            selectedValues.some(
                              (v) => v.toLowerCase() === opt.value.toLowerCase()
                            )
                              ? "mr-2 h-4 w-4 opacity-100"
                              : "mr-2 h-4 w-4 opacity-0"
                          }
                        />
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedValues.map((v, idx) => (
                <Badge
                  key={`${v}-${idx}`}
                  variant="secondary"
                  className="text-xs"
                >
                  {getLabel(v)}
                  <button
                    type="button"
                    onClick={() => toggleMultiselectValue(field, v)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default text input
    let textValue = "";
    if (Array.isArray(value)) {
      textValue = value.join(", ");
    } else if (value !== null && value !== undefined) {
      textValue = String(value);
    }

    return (
      <div className="space-y-2">
        <Label className="text-xs">{label}</Label>
        <DebouncedInput
          value={textValue}
          onChange={(v) => updateField(field, v as any)}
        />
      </div>
    );
  }

  // A registry field: view mode shows the option label (displayFieldValue). Edit mode reuses
  // renderField, except for the two inputs a plain select/switch can't hold (null answers).
  function renderResolvedField(spec: ResolvedField) {
    const key = spec.key as keyof ApplicationDetails;
    const value = isEditMode ? editedApplication[key] : application[key];

    if (!isEditMode) {
      return (
        <div className="min-w-0 space-y-1">
          <div className="text-muted-foreground text-xs">{spec.label}</div>
          <div className={spec.input === "textarea" ? "whitespace-pre-wrap" : "break-words"}>
            {displayFieldValue(spec, value) || "—"}
          </div>
        </div>
      );
    }

    if (spec.input === "nullableBoolean" || spec.input === "count") {
      const choices = [{ value: UNANSWERED_CHOICE, label: "Not answered" }, ...(spec.options ?? [])];
      const current = value === null || value === undefined ? UNANSWERED_CHOICE : String(value);
      return (
        <div className="space-y-2">
          <Label className="text-xs">{spec.label}</Label>
          <Select value={current} onValueChange={(choice) => updateField(key, parseChoice(spec.input, choice) as never)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem key={choice.value} value={choice.value}>
                  {choice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return renderField(spec.label, key, spec.input, spec.options);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2>Applicant Details</h2>
            <p className="text-xs text-muted-foreground">
              {isEditMode
                ? "Edit application fields and save changes."
                : "Review application and take action."}
            </p>
          </div>
          {isSuperAdmin &&
            (!isEditMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false);
                    setEditedApplication(application);
                    setResumeFile(null);
                  }}
                  disabled={isSavingEdit}
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveClick}
                  disabled={isSavingEdit || isUploadingResume}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            ))}
        </div>
        <div className="space-y-4">
          {error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : null}
          {/* Always show application details - check-in errors are shown in dialog only */}
          <div>
              {/* Header with name and status */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {isEditMode ? (
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="space-y-2">
                      <Label className="text-xs">First Name *</Label>
                      <DebouncedInput
                        value={editedApplication.firstName}
                        onChange={(v) => updateField("firstName", v)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Last Name *</Label>
                      <DebouncedInput
                        value={editedApplication.lastName}
                        onChange={(v) => updateField("lastName", v)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleStar}
                      disabled={isStarring}
                      className="mt-1 shrink-0"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          application.isStarred
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                    <div>
                      <h2>
                        {application.firstName} {application.lastName}
                      </h2>
                      <p className="text-muted-foreground text-sm mb-2">
                        {application.email}
                      </p>
                    </div>
                  </div>
                )}
                {isEditMode ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={
                        APPLICATION_STATUSES.find(
                          (s) =>
                            s.value.toLowerCase() ===
                            editedApplication.status?.toLowerCase()
                        )?.value ||
                        editedApplication.status ||
                        ""
                      }
                      onValueChange={(v) => updateField("status", v)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {editedApplication.status &&
                          !APPLICATION_STATUSES.find(
                            (s) =>
                              s.value.toLowerCase() ===
                              editedApplication.status?.toLowerCase()
                          ) && (
                            <SelectItem value={editedApplication.status}>
                              {editedApplication.status} (current)
                            </SelectItem>
                          )}
                        {APPLICATION_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <ApplicationStatusBadge status={application.status} />
                )}
              </div>

              {isEditMode && (
                <div className="space-y-2">
                  <Label className="text-xs">Email (read-only)</Label>
                  <Input
                    type="email"
                    value={editedApplication.email}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-6">
                {resolveSections(isEditMode ? editedApplication : application, { isSuperAdmin }).map((section) => (
                  <React.Fragment key={section.id}>
                    <div>
                      <h3 className="mb-6 text-sm font-semibold">{section.title}</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        {section.fields.map((spec) => (
                          <div key={spec.key} className={spec.input === "textarea" ? "md:col-span-4" : undefined}>
                            {renderResolvedField(spec)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />
                  </React.Fragment>
                ))}

                {/* Travel reimbursement: the applicant's answer for everyone; the decision is super-admin-only (A2) */}
                <div>
                  <h3 className="mb-6 text-sm font-semibold">Travel Reimbursement</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      {isEditMode ? (
                        renderResolvedField(TRAVEL_FIELD)
                      ) : (
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-xs">{TRAVEL_FIELD.label}</div>
                          <div>{formatTravelAnswer(application.travelReimbursement)}</div>
                        </div>
                      )}
                      {isQuebecResident(application.country, application.city) && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          Quebec resident
                        </Badge>
                      )}
                    </div>
                    {isSuperAdmin && !isEditMode && application.travelReimbursement === true && (
                      <div className="space-y-1 md:col-span-2">
                        <div className="text-muted-foreground text-xs">Travel Reimbursement Decision</div>
                        <div
                          className={application.isTravelReimbursementApproved ? "font-semibold text-green-600" : "text-muted-foreground"}
                        >
                          {describeTravelDecision(application)}
                        </div>
                        <div className="text-muted-foreground text-xs">Set when admitting the applicant.</div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Links & Documents */}
                <div>
                  <h3 className="mb-6 text-sm font-semibold">
                    Links & Documents
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {isEditMode ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">GitHub</Label>
                          <DebouncedInput
                            value={editedApplication.github || ""}
                            onChange={(v) => updateField("github", v)}
                            placeholder="https://github.com/username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">LinkedIn</Label>
                          <DebouncedInput
                            value={editedApplication.linkedin || ""}
                            onChange={(v) => updateField("linkedin", v)}
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <ExternalLinkField label="GitHub" value={application.github} />
                        <ExternalLinkField label="LinkedIn" value={application.linkedin} />
                      </>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs">Resume</Label>
                      {isEditMode ? (
                        <div className="space-y-3">
                          {application.hasResume && (
                            <div className="flex items-center gap-2">
                              <a
                                href={`/api/users/resume/${application._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline text-sm"
                              >
                                View Current Resume
                              </a>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteResume}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={handleResumeSelect}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {resumeFile ? "Change File" : "Upload New Resume"}
                            </Button>
                            {resumeFile && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {resumeFile.name}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setResumeFile(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Accepted formats: PDF, DOC, DOCX (max 5MB)
                          </p>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Comments Section */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-6">
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
                              ? `${skillTags.length} tag${
                                  skillTags.length !== 1 ? "s" : ""
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

              <Separator className="my-6" />

              {/* Team Information Section - Subtle placement at bottom */}
              {teamData && (
                <>
                  <TeamInfoCard
                    teamData={teamData}
                    currentApplicationId={application._id}
                  />
                  <Separator className="my-6" />
                </>
              )}

              <div className="flex justify-between items-center w-full">
                <Button variant="ghost" onClick={handleBackClick}>
                  Back
                </Button>

                {(() => {
                  const status = application.status;
                  const isSubmitted = status === "Submitted";
                  const isConfirmed = status === "Confirmed";
                  const isCheckedIn = isCheckedInStatus(status);

                  if (isSubmitted) {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={saveMetadata}
                          disabled={isSavingMetadata}
                          variant="outline"
                          className="btn-primary"
                        >
                          <SaveAllIcon />{" "}
                          {isSavingMetadata ? "Saving..." : "Save"}
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

                  if (status === "Waitlisted") {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={saveMetadata}
                          disabled={isSavingMetadata}
                          variant="outline"
                          className="btn-primary"
                        >
                          <SaveAllIcon />{" "}
                          {isSavingMetadata ? "Saving..." : "Save"}
                        </Button>

                        <Button
                          onClick={handleAdmitClick}
                          disabled={isSaving !== null}
                          variant="default"
                        >
                          <CheckCircle2 /> Admit
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
                          onClick={handleCheckInClick}
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
                        <Button onClick={handleCheckInClick} disabled variant="default">
                          <CheckCircle2 /> Checked In
                        </Button>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
          </div>
        </div>
      </div>

      <TravelReimbursementDialog
        open={travelReimbursementDialogOpen}
        onOpenChange={setTravelReimbursementDialogOpen}
        onSubmit={handleTravelReimbursementSubmit}
        candidateName={`${application.firstName} ${application.lastName}`}
      />

      <QrCodeCheckinDialog
        open={qrCodeCheckinDialogOpen}
        onOpenChange={setQrCodeCheckinDialogOpen}
        onSubmit={checkIn}
        candidateName={`${application.firstName} ${application.lastName}`}
        externalError={checkInError || undefined}
        isSubmitting={isSaving === "checkin"}
      />

      {/* Confirmation Dialog for Critical Changes */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Critical Changes
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  You are about to modify the following critical fields:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {criticalChanges.map((field) => (
                    <li key={field} className="text-sm">
                      <span className="font-medium capitalize">{field}</span>:{" "}
                      <span className="text-muted-foreground">
                        {String(application[field as keyof ApplicationDetails])}
                      </span>{" "}
                      →{" "}
                      <span className="font-medium">
                        {String(
                          editedApplication[field as keyof ApplicationDetails]
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm">
                  Are you sure you want to proceed with these changes?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveChanges}>
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back Confirmation Dialog for Unsaved Changes */}
      <AlertDialog
        open={backConfirmationOpen}
        onOpenChange={setBackConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to comments or skill tags. What would you
              like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setBackConfirmationOpen(false);
                router.back();
              }}
            >
              Go Back Without Saving
            </Button>
            <AlertDialogAction onClick={handleSaveAndGoBack}>
              Save & Go Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Action Confirmation Dialog for Waitlist/Reject */}
      <AlertDialog
        open={actionConfirmationOpen}
        onOpenChange={setActionConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmationAction}{" "}
              {application.firstName} {application.lastName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
