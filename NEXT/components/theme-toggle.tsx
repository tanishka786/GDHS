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

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-full border border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 mt-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border/40"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
        >
          <Sun className="mr-3 h-4 w-4" />
          <span className="font-medium">Light</span>
          {theme === "light" && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
        >
          <Moon className="mr-3 h-4 w-4" />
          <span className="font-medium">Dark</span>
          {theme === "dark" && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
        >
          <Monitor className="mr-3 h-4 w-4" />
          <span className="font-medium">System</span>
          {theme === "system" && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Alternative sleek toggle switch without dropdown
export function SleekThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-full border border-border/40 bg-background/95 animate-pulse" />
    )
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-full border border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hover:bg-accent hover:text-accent-foreground transition-all duration-300 overflow-hidden group"
    >
      <div className="relative flex items-center justify-center">
        <Sun className="h-4 w-4 absolute transition-all duration-500 ease-in-out rotate-0 scale-100 dark:-rotate-180 dark:scale-0" />
        <Moon className="h-4 w-4 absolute transition-all duration-500 ease-in-out rotate-180 scale-0 dark:rotate-0 dark:scale-100" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

// Modern switch-style toggle
export function ModernThemeSwitch() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-6 w-11 rounded-full border border-border/40 bg-background/95 animate-pulse" />
    )
  }

  const isDark = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full border border-border/40 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
        ${isDark ? 'bg-primary' : 'bg-muted'}
      `}
      role="switch"
      aria-checked={isDark}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`
          ${isDark ? 'translate-x-6' : 'translate-x-1'}
          flex h-4 w-4 transform rounded-full bg-background transition-transform duration-300 ease-in-out items-center justify-center shadow-sm
        `}
      >
        {isDark ? (
          <Moon className="h-2.5 w-2.5 text-primary" />
        ) : (
          <Sun className="h-2.5 w-2.5 text-muted-foreground" />
        )}
      </span>
    </button>
  )
}