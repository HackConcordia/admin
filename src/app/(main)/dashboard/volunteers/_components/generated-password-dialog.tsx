"use client";

import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IVolunteerCredentials } from "@/interfaces/IVolunteer";

type GeneratedPasswordDialogProps = {
  title: string;
  credentials: IVolunteerCredentials | null;
  onClose: () => void;
};

/**
 * Shows a server-generated volunteer password exactly once. An AlertDialog doesn't close on an
 * outside click, so the organizer has to press "Done". Closing clears the password from state.
 */
export function GeneratedPasswordDialog({ title, credentials, onClose }: GeneratedPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!credentials) return;

    try {
      await navigator.clipboard.writeText(credentials.generatedPassword);
      setCopied(true);
      toast.success("Password copied to clipboard");
    } catch {
      toast.error("Could not copy. Select the password and copy it manually.");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCopied(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={credentials !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Share this password privately with{" "}
            <span className="font-semibold">
              {credentials?.firstName} {credentials?.lastName}
            </span>{" "}
            ({credentials?.email}). They sign in to the check-in app with this email and password.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="generated-password">Password</Label>
          <div className="flex gap-2">
            <Input
              id="generated-password"
              readOnly
              value={credentials?.generatedPassword ?? ""}
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy password"
              aria-label="Copy password"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Alert>
          <TriangleAlert />
          <AlertTitle>You won&apos;t see this password again</AlertTitle>
          <AlertDescription>
            Copy it now. It is stored only as a hash, so if it gets lost, reset the password to generate a new one.
          </AlertDescription>
        </Alert>

        <AlertDialogFooter>
          <AlertDialogAction>Done</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
