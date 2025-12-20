"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BadgeCheck, Bell, CreditCard, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";

export function AccountSwitcher() {
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth-token/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const a = json?.data;
        if (a && active) {
          setUser({
            name: `${a.firstName} ${a.lastName}`.trim(),
            email: a.email,
            avatar: "",
            role: a.isSuperAdmin ? "super admin" : "admin",
          });
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth-token/logout", { method: "POST" });
    } catch (_) {
      // ignore
    } finally {
      try {
        router.replace("/auth/v1/login");
      } catch (_) {
        window.location.href = "/auth/v1/login";
      }
    }
  }

  const display = user ?? { name: "", email: "", avatar: "", role: "" };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg">
          <AvatarImage src={display.avatar || undefined} alt={display.name} />
          <AvatarFallback className="rounded-lg">{getInitials(display.name || " ")}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <div className={cn("p-0", "bg-accent/30 border-l-primary border-l-2")}>
          <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={display.avatar || undefined} alt={display.name} />
              <AvatarFallback className="rounded-lg">{getInitials(display.name || " ")}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{display.name || " "}</span>
              <span className="truncate text-xs capitalize">{display.role}</span>
              <span className="truncate text-xs">{display.email}</span>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              router.push("/dashboard/account");
            }}
            onClick={(e) => {
              e.preventDefault();
              router.push("/dashboard/account");
            }}>
            <BadgeCheck />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            handleLogout();
          }}
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
