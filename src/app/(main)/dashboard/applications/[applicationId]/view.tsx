"use client";

import * as React from "react";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

export type ApplicationDetails = {
  _id: string;
  firstName: string;
  lastName: string;
  age?: string;
  phoneNumber?: string;
  email: string;
  status: string;
  processedBy?: string;
  processedAt?: string;
  isFromMontreal?: boolean;
  country?: string;
  city?: string;
  school?: string;
  discipline?: string;
  shirtSize?: string;
  dietaryRestrictions?: string[];
  dietaryRestrictionsDescription?: string;
  hackathons?: number;
  github?: string;
  linkedin?: string;
  hasResume?: boolean;
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

  async function updateStatus(action: "admit" | "waitlist" | "reject") {
    try {
      setIsSaving(action);
      setError(null);
      const res = await fetch(`/api/status/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminEmail }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed with ${res.status}`);
      }
      const json = await res.json();
      const newStatus = json?.data as string;
      setApplication((prev) => ({ ...prev, status: newStatus }));
    } catch (e: any) {
      setError(e?.message ?? "Failed to update status");
    } finally {
      setIsSaving(null);
    }
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">School</div>
                    <div>{application.school || "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">Discipline</div>
                    <div>{application.discipline || "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">Country</div>
                    <div>{application.country || "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">City</div>
                    <div>{application.city || "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">Shirt size</div>
                    <div>{application.shirtSize || "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">Hackathons</div>
                    <div>{application.hackathons ?? "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">Dietary restrictions</div>
                    <div>
                      {application.dietaryRestrictions && application.dietaryRestrictions.length > 0
                        ? application.dietaryRestrictions.join(", ")
                        : "—"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">From Montreal</div>
                    <div>{application.isFromMontreal ? "Yes" : "No"}</div>
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
                          Download Resume
                        </a>
                      ) : (
                        "—"
                      )}
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
                        <Button onClick={() => updateStatus("admit")} disabled={isSaving !== null} variant="default">
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
    </div>
  );
}
