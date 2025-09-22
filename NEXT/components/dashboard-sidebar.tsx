"use client"

import { cn } from "@/lib/utils"
import { UserButton, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"

const sidebarItems = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
      </svg>
    ),
  },
  {
    name: "Analysis",
    href: "/dashboard/upload",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    ),
  },
  {
    name: "Chat",
    href: "/dashboard/chat",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4m-3 10l-3-3m0 0l-3 3m3-3v6"
        />
      </svg>
    ),
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    name: "History",
    href: "/dashboard/history",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    name: "Discover",
    href: "/dashboard/discover",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  }
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user, isSignedIn } = useUser()
  // safe avatar URL: Clerk's user object can expose image under different keys depending on SDK/version
  const avatarSrc = (user as any)?.profileImageUrl ?? (user as any)?.imageUrl ?? "/placeholder-user.jpg"

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-full flex flex-col">
      <div className="p-6">
        <Link href="/" className="text-2xl font-bold text-sidebar-primary">
          OrthoAssist
        </Link>
      </div>
      <nav className="mt-6 flex-1">
        <div className="px-3">
          {sidebarItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg mb-1 transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
              )}
            >
              {item.icon}
              <span className="ml-3">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
      {/* User footer - stick to bottom */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-sm text-sidebar-foreground">
          {isSignedIn && user ? (
            <div className="flex items-center space-x-3">
              <div className="">
                <UserButton />
              </div>
              <div className="text-left">
                <div className="font-medium text-sidebar-foreground">{user.fullName ?? user.username}</div>
                <div className="text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress}</div>
              </div>
              
            </div>
          ) : (
            <Link href="/login" className="text-sm text-sidebar-primary hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
