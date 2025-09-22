"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PremiumThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-10 w-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 animate-pulse" />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-10 w-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent/80 hover:border-border transition-all duration-300 group overflow-hidden"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Icon container */}
          <div className="relative z-10">
            <Sun className="h-4 w-4 transition-all duration-500 ease-in-out rotate-0 scale-100 dark:-rotate-180 dark:scale-0" />
            <Moon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-500 ease-in-out rotate-180 scale-0 dark:rotate-0 dark:scale-100" />
          </div>
          
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-48 mt-2 bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl"
        sideOffset={5}
      >
        <div className="p-1">
          <DropdownMenuItem 
            onClick={() => setTheme("light")}
            className="cursor-pointer rounded-lg focus:bg-accent/80 transition-all duration-200 group"
          >
            <div className="flex items-center w-full">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 mr-3 group-hover:scale-110 transition-transform duration-200">
                <Sun className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="font-medium">Light Mode</span>
              {theme === "light" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setTheme("dark")}
            className="cursor-pointer rounded-lg focus:bg-accent/80 transition-all duration-200 group"
          >
            <div className="flex items-center w-full">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 mr-3 group-hover:scale-110 transition-transform duration-200">
                <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
              <span className="font-medium">Dark Mode</span>
              {theme === "dark" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setTheme("system")}
            className="cursor-pointer rounded-lg focus:bg-accent/80 transition-all duration-200 group"
          >
            <div className="flex items-center w-full">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3 group-hover:scale-110 transition-transform duration-200">
                <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">System</span>
              {theme === "system" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Floating orb style toggle
export function FloatingThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
    )
  }

  const isDark = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative h-10 w-10 rounded-full bg-gradient-to-br from-primary/90 to-accent/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden hover:scale-105 active:scale-95"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-white/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center h-full">
        {isDark ? (
          <Moon className="h-4 w-4 text-white transition-all duration-500 ease-in-out rotate-0 scale-100" />
        ) : (
          <Sun className="h-4 w-4 text-white transition-all duration-500 ease-in-out rotate-0 scale-100" />
        )}
      </div>
      
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}