"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { colorPalettes } from "@/components/theme-customizer"

export interface ColorPalette {
  name: string
  value: string
  preview: string
  description: string
  colors: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    border: string
    input: string
    ring: string
  }
}

interface ThemeContextType {
  currentTheme: string
  applyTheme: (themeValue: string, palette: ColorPalette) => void
  getThemeColors: () => ColorPalette["colors"] | null
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>("ocean-deep")

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return
    
    // Load saved theme from localStorage on mount
    const savedTheme = localStorage.getItem("dashboard-theme") || "ocean-deep"
    setCurrentTheme(savedTheme)
    
    // Apply the saved theme (default to first palette if not found)
    const palette = colorPalettes.find((p) => p.value === savedTheme) || colorPalettes[0]
    if (palette) {
      const { colors } = palette
      
      // Apply all color variables to the document
      Object.entries(colors).forEach(([key, value]) => {
        const cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase()
        document.documentElement.style.setProperty(`--${cssVar}`, value)
      })
      
      // Update body background
      document.body.style.background = colors.background
      document.body.style.backgroundAttachment = "fixed"
    }
  }, [])

  const applyTheme = (themeValue: string, palette: ColorPalette) => {
    if (typeof window === "undefined") return
    
    setCurrentTheme(themeValue)
    const { colors } = palette

    // Apply all color variables to the document
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase()
      document.documentElement.style.setProperty(`--${cssVar}`, value)
    })

    // Update body background
    document.body.style.background = colors.background
    document.body.style.backgroundAttachment = "fixed"

    // Store theme preference in localStorage
    localStorage.setItem("dashboard-theme", themeValue)

    // Dispatch custom event for other components to listen to
    const event = new CustomEvent("theme-change", { detail: themeValue })
    window.dispatchEvent(event)
  }

  const getThemeColors = (): ColorPalette["colors"] | null => {
    if (typeof window === "undefined") return null
    
    // Get colors from CSS variables
    const style = getComputedStyle(document.documentElement)
    return {
      background: style.getPropertyValue("--background").trim() || "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      foreground: style.getPropertyValue("--foreground").trim() || "#f8fafc",
      card: style.getPropertyValue("--card").trim() || "rgba(30, 41, 59, 0.8)",
      cardForeground: style.getPropertyValue("--card-foreground").trim() || "#f8fafc",
      primary: style.getPropertyValue("--primary").trim() || "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)",
      primaryForeground: style.getPropertyValue("--primary-foreground").trim() || "#ffffff",
      secondary: style.getPropertyValue("--secondary").trim() || "rgba(51, 65, 85, 0.6)",
      secondaryForeground: style.getPropertyValue("--secondary-foreground").trim() || "#e2e8f0",
      muted: style.getPropertyValue("--muted").trim() || "rgba(51, 65, 85, 0.4)",
      mutedForeground: style.getPropertyValue("--muted-foreground").trim() || "#94a3b8",
      accent: style.getPropertyValue("--accent").trim() || "rgba(59, 130, 246, 0.2)",
      accentForeground: style.getPropertyValue("--accent-foreground").trim() || "#3b82f6",
      border: style.getPropertyValue("--border").trim() || "rgba(148, 163, 184, 0.2)",
      input: style.getPropertyValue("--input").trim() || "rgba(30, 41, 59, 0.6)",
      ring: style.getPropertyValue("--ring").trim() || "#3b82f6",
    }
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, applyTheme, getThemeColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

