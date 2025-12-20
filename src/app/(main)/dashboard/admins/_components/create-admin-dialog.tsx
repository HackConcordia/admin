"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";

import { CreateAdminForm } from "./create-admin-form";
import { useRouter } from "next/navigation";

export function CreateAdminDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Admin
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Admin</DialogTitle>
                    <DialogDescription className="mb-3">
                        Enter the details below to add a new admin.
                    </DialogDescription>
                </DialogHeader>
                <CreateAdminForm onSuccess={() => {
                    setOpen(false);
                    router.refresh();
                }} />
            </DialogContent>
        </Dialog>
    );
}
