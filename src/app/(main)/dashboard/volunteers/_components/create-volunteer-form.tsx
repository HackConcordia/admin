"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IVolunteerCredentials } from "@/interfaces/IVolunteer";

type CreateVolunteerFormProps = {
  onCreated: (credentials: IVolunteerCredentials) => void;
};

export function CreateVolunteerForm({ onCreated }: CreateVolunteerFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.status !== "success" || typeof result?.data?.generatedPassword !== "string") {
        throw new Error(result?.message || "Failed to create volunteer");
      }

      toast.success("Volunteer created successfully");

      // reset
      setFirstName("");
      setLastName("");
      setEmail("");
      setErrors({});

      onCreated(result.data as IVolunteerCredentials);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create volunteer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="volunteerFirstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="volunteerFirstName"
            placeholder="First Name"
            value={firstName}
            maxLength={100}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (errors.firstName)
                setErrors({ ...errors, firstName: undefined });
            }}
            className={errors.firstName ? "border-destructive" : ""}
          />
          {errors.firstName && (
            <p className="text-destructive text-sm">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="volunteerLastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="volunteerLastName"
            placeholder="Last Name"
            value={lastName}
            maxLength={100}
            onChange={(e) => {
              setLastName(e.target.value);
              if (errors.lastName)
                setErrors({ ...errors, lastName: undefined });
            }}
            className={errors.lastName ? "border-destructive" : ""}
          />
          {errors.lastName && (
            <p className="text-destructive text-sm">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="volunteerEmail">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="volunteerEmail"
          type="email"
          placeholder="volunteer@example.com"
          value={email}
          maxLength={254}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        A password is generated automatically and shown once after the volunteer is created.
      </p>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating..." : "Create Volunteer"}
      </Button>
    </form>
  );
}
