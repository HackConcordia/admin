"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";

interface QrCodeCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (qrCodeNumber: number) => void;
  candidateName: string;
  externalError?: string;
  isSubmitting?: boolean;
}

export function QrCodeCheckinDialog({
  open,
  onOpenChange,
  onSubmit,
  candidateName,
  externalError,
  isSubmitting = false,
}: QrCodeCheckinDialogProps) {
  const [qrCodeNumber, setQrCodeNumber] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");
  const [dismissedError, setDismissedError] = React.useState<string | null>(null);
  const previousExternalErrorRef = React.useRef<string | undefined>(undefined);

  // Clear local error when dialog opens (but keep external error)
  React.useEffect(() => {
    if (open && !externalError) {
      setError("");
      setDismissedError(null);
      previousExternalErrorRef.current = undefined;
    }
  }, [open, externalError]);

  // Reset dismissed error when a new external error occurs (detect change in externalError)
  React.useEffect(() => {
    // If externalError changed (even if same message), it's a new error instance
    if (externalError !== previousExternalErrorRef.current) {
      if (externalError) {
        // New error came in - reset dismissed state so it shows
        setDismissedError(null);
      } else {
        // Error was cleared - reset dismissed state
        setDismissedError(null);
      }
      previousExternalErrorRef.current = externalError;
    }
  }, [externalError]);

  const handleSubmit = () => {
    setError("");

    if (!qrCodeNumber || qrCodeNumber.trim() === "") {
      setError("Please enter a QR code number");
      return;
    }

    const qrCodeNum = parseInt(qrCodeNumber, 10);

    if (isNaN(qrCodeNum) || qrCodeNum <= 0 || !Number.isInteger(qrCodeNum)) {
      setError("QR code number must be a positive whole number");
      return;
    }

    onSubmit(qrCodeNum);
    // Don't reset on submit - let parent handle success/error
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setQrCodeNumber("");
    setError("");
    setDismissedError(null);
  };

  const handleDismissError = () => {
    const currentError = externalError || error;
    if (currentError) {
      setDismissedError(currentError);
    }
  };

  // Reset when dialog closes (only if no error)
  React.useEffect(() => {
    if (!open && !externalError) {
      handleReset();
    }
  }, [open, externalError]);

  // Handle dialog close attempt - prevent closing if submission is in progress
  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing if submitting (but allow closing even with errors via Cancel button)
    if (!newOpen && isSubmitting) {
      return; // Don't allow closing during submission
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Check In Applicant</DialogTitle>
          <DialogDescription className="text-xs">
            Enter the QR code number for {candidateName} to complete check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="qrCodeNumber" className="text-sm font-semibold">
              QR Code Number
            </Label>
            <Input
              id="qrCodeNumber"
              type="number"
              placeholder="Enter QR code number"
              value={qrCodeNumber}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow empty string or positive integers
                if (value === "" || /^\d+$/.test(value)) {
                  setQrCodeNumber(value);
                  setError("");
                }
              }}
              onKeyDown={(e) => {
                // Prevent decimal point, comma, and e/E (scientific notation)
                if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
                // Allow Enter key to submit
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              min="1"
              step="1"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
          </div>
          {/* Error banner above QR Code Number */}
          {(error || externalError) &&
            (externalError || error) !== dismissedError && (
              <Alert variant="destructive" className="relative">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="text-xs">{externalError || error}</AlertDescription>
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            )}
        </div>
        

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Checking In..." : "Check In"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
