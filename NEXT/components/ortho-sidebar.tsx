"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import {
    FileText,
    History,
    LayoutDashboard,
    MessageSquare,
    Shield,
    Upload,
    Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/animated-sidebar";

export function OrthoAssistSidebar() {
  const { user, isSignedIn } = useUser();
  const links = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: (
        <LayoutDashboard className="h-5 w-5 shrink-0 text-medical-blue-600 dark:text-medical-blue-400" />
      ),
    },
    {
      label: "Analysis",
      href: "/dashboard/upload",
      icon: (
        <Upload className="h-5 w-5 shrink-0 text-medical-blue-600 dark:text-medical-blue-400" />
      ),
    },
    {
      label: "Chat Assistant",
      href: "/dashboard/chat", 
      icon: (
        <MessageSquare className="h-5 w-5 shrink-0 text-medical-blue-600 dark:text-medical-blue-400" />
      ),
    },
    {
      label: "Reports",
      href: "/dashboard/reports",
      icon: (
        <FileText className="h-5 w-5 shrink-0 text-medical-blue-600 dark:text-medical-blue-400" />
      ),
    },
    {
      label: "Discover",
      href: "/dashboard/discover",
      icon: (
        <Search className="h-5 w-5 shrink-0 text-medical-blue-600 dark:text-medical-blue-400" />
      ),
    },
    {
      label: "History",
      href: "/dashboard/history",
      icon: (
        <History className="h-5 w-5 shrink-0 text-medical-blue-600 dark:text-medical-blue-400" />
      ),
    },
  ];
  const [open, setOpen] = useState(false);
  
  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {open ? <OrthoLogo /> : <OrthoLogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>
        
        {/* User Profile Section */}
        {isSignedIn && user && (
          <div className="border-t border-medical-blue-200 dark:border-medical-blue-800 pt-4">
            <SidebarLink
              link={{
                label: open ? user.fullName || user.username || "User" : "",
                href: "#",
                icon: (
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8",
                        userButtonTrigger: "focus:shadow-none"
                      }
                    }}
                  />
                ),
              }}
            />
          </div>
        )}
      </SidebarBody>
    </Sidebar>
  );
}

export const OrthoLogo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-medical-blue-900 dark:text-medical-blue-100"
    >
      <div className="h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-medical-blue-500 to-medical-teal-500 flex items-center justify-center">
        <Shield className="h-4 w-4 text-white" />
      </div>
    </Link>
  );
};

export const OrthoLogoIcon = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-medical-blue-900"
    >
      <div className="h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-medical-blue-500 to-medical-teal-500 flex items-center justify-center">
        <Shield className="h-4 w-4 text-white" />
      </div>
    </Link>
  );
};