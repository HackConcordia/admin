"use client";

import { useEffect, useState } from "react";
import { Settings, CircleHelp, Search, Database, ClipboardList, File, Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { sidebarItems, type NavGroup } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [filteredItems, setFilteredItems] = useState<NavGroup[]>(sidebarItems);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Fetch current admin info to check if SuperAdmin
    const fetchAdminInfo = async () => {
      try {
        const res = await fetch("/api/auth-token/me");
        if (res.ok) {
          const data = await res.json();
          const superAdmin = data.data?.isSuperAdmin ?? false;
          setIsSuperAdmin(superAdmin);

          // Filter sidebar items based on SuperAdmin status
          const filtered = sidebarItems.map((group) => ({
            ...group,
            items: group.items.filter((item) => !item.superAdminOnly || superAdmin),
          }));
          setFilteredItems(filtered);
        }
      } catch (error) {
        console.error("Failed to fetch admin info:", error);
      }
    };

    fetchAdminInfo();
  }, []);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <Command />
                <span className="text-base font-semibold">{APP_CONFIG.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: "Current User", email: "", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  );
}
