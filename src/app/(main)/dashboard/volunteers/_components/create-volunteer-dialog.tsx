"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { IVolunteerCredentials } from "@/interfaces/IVolunteer";

import { CreateVolunteerForm } from "./create-volunteer-form";
import { GeneratedPasswordDialog } from "./generated-password-dialog";

export function CreateVolunteerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Held in memory only until the one-time dialog closes.
  const [credentials, setCredentials] = useState<IVolunteerCredentials | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />New Volunteer
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Volunteer</DialogTitle>
            <DialogDescription className="mb-3">
              Volunteers sign in to the event check-in app only. They never get access to this admin site.
            </DialogDescription>
          </DialogHeader>
          <CreateVolunteerForm
            onCreated={(created) => {
              setOpen(false);
              setCredentials(created);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <GeneratedPasswordDialog
        title="Volunteer created"
        credentials={credentials}
        onClose={() => setCredentials(null)}
      />
    </>
  );
}
