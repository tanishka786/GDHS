"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"

export function GlassmorphismThemeSelector() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-11 w-11 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 animate-pulse" />
    )
  }

  const getCurrentIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5 text-amber-500" />
      case "dark":
        return <Moon className="h-5 w-5 text-slate-400" />
      case "system":
        return <Monitor className="h-5 w-5 text-blue-500" />
      default:
        return <Sparkles className="h-5 w-5 text-primary" />
    }
  }

  const themes = [
    {
      id: "light",
      name: "Light",
      icon: <Sun className="h-5 w-5" />,
      gradient: "from-amber-400 to-orange-500",
      textColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      id: "dark", 
      name: "Dark",
      icon: <Moon className="h-5 w-5" />,
      gradient: "from-slate-400 to-slate-600",
      textColor: "text-slate-600 dark:text-slate-300",
      bgColor: "bg-slate-50 dark:bg-slate-800/50",
    },
    {
      id: "system",
      name: "System", 
      icon: <Monitor className="h-5 w-5" />,
      gradient: "from-blue-400 to-indigo-500",
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
  ]

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative h-11 w-11 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300 flex items-center justify-center overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Animated ripple */}
        <div className="absolute inset-0 rounded-2xl border border-primary/30 scale-0 group-hover:scale-100 group-hover:opacity-0 transition-all duration-500" />
        
        <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
          {getCurrentIcon()}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full mt-3 right-0 z-50 w-56 rounded-3xl bg-white/70 dark:bg-black/70 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl shadow-black/20 dark:shadow-white/10 overflow-hidden animate-in slide-in-from-top-2 duration-300">
            {/* Header */}
            <div className="p-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Theme</h3>
                  <p className="text-xs text-muted-foreground">Choose your appearance</p>
                </div>
              </div>
            </div>

            {/* Theme Options */}
            <div className="p-2">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => {
                    setTheme(themeOption.id)
                    setIsOpen(false)
                  }}
                  className={`group relative w-full p-3 rounded-2xl transition-all duration-200 flex items-center space-x-3 hover:bg-black/5 dark:hover:bg-white/5 ${
                    theme === themeOption.id ? 'bg-black/5 dark:bg-white/5' : ''
                  }`}
                >
                  {/* Icon container */}
                  <div className={`relative flex items-center justify-center h-10 w-10 rounded-xl ${themeOption.bgColor} transition-transform duration-200 group-hover:scale-110`}>
                    <div className={`${themeOption.textColor} transition-colors duration-200`}>
                      {themeOption.icon}
                    </div>
                    
                    {/* Gradient overlay for selected */}
                    {theme === themeOption.id && (
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${themeOption.gradient} opacity-20`} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm text-foreground">
                      {themeOption.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {themeOption.id === "system" ? "Follow system" : `${themeOption.name} mode`}
                    </div>
                  </div>

                  {/* Active indicator */}
                  {theme === themeOption.id && (
                    <div className="flex items-center">
                      <div className={`h-2 w-2 rounded-full bg-gradient-to-br ${themeOption.gradient} animate-pulse`} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}