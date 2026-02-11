"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Palette, CheckCircle, RotateCcw, Sparkles } from "lucide-react"
import { useTheme, ColorPalette } from "@/lib/theme-context"

export const colorPalettes: ColorPalette[] = [
  {
    name: "Soft Sky",
    value: "ocean-deep",
    preview: "#e0f2fe",
    description: "Gentle sky blue tones",
    colors: {
      background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)",
      foreground: "#0c4a6e",
      card: "rgba(255, 255, 255, 0.9)",
      cardForeground: "#075985",
      primary: "linear-gradient(135deg, #7dd3fc 0%, #38bdf8 50%, #0ea5e9 100%)",
      primaryForeground: "#ffffff",
      secondary: "rgba(186, 230, 253, 0.5)",
      secondaryForeground: "#0369a1",
      muted: "rgba(224, 242, 254, 0.6)",
      mutedForeground: "#0284c7",
      accent: "rgba(125, 211, 252, 0.3)",
      accentForeground: "#0369a1",
      border: "rgba(186, 230, 253, 0.4)",
      input: "rgba(255, 255, 255, 0.8)",
      ring: "#38bdf8",
    },
  },
  {
    name: "Mint Fresh",
    value: "emerald-forest",
    preview: "#d1fae5",
    description: "Soft mint green",
    colors: {
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
      foreground: "#14532d",
      card: "rgba(255, 255, 255, 0.9)",
      cardForeground: "#166534",
      primary: "linear-gradient(135deg, #86efac 0%, #4ade80 50%, #22c55e 100%)",
      primaryForeground: "#ffffff",
      secondary: "rgba(187, 247, 208, 0.5)",
      secondaryForeground: "#15803d",
      muted: "rgba(220, 252, 231, 0.6)",
      mutedForeground: "#16a34a",
      accent: "rgba(134, 239, 172, 0.3)",
      accentForeground: "#15803d",
      border: "rgba(187, 247, 208, 0.4)",
      input: "rgba(255, 255, 255, 0.8)",
      ring: "#4ade80",
    },
  },
  {
    name: "Lavender Dream",
    value: "royal-purple",
    preview: "#e9d5ff",
    description: "Soft lavender purple",
    colors: {
      background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)",
      foreground: "#581c87",
      card: "rgba(255, 255, 255, 0.9)",
      cardForeground: "#6b21a8",
      primary: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #8b5cf6 100%)",
      primaryForeground: "#ffffff",
      secondary: "rgba(233, 213, 255, 0.5)",
      secondaryForeground: "#7c3aed",
      muted: "rgba(243, 232, 255, 0.6)",
      mutedForeground: "#8b5cf6",
      accent: "rgba(196, 181, 253, 0.3)",
      accentForeground: "#7c3aed",
      border: "rgba(233, 213, 255, 0.4)",
      input: "rgba(255, 255, 255, 0.8)",
      ring: "#a78bfa",
    },
  },
  {
    name: "Peach Blush",
    value: "sunset-orange",
    preview: "#fed7aa",
    description: "Warm peach tones",
    colors: {
      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
      foreground: "#7c2d12",
      card: "rgba(255, 255, 255, 0.9)",
      cardForeground: "#9a3412",
      primary: "linear-gradient(135deg, #fdba74 0%, #fb923c 50%, #f97316 100%)",
      primaryForeground: "#ffffff",
      secondary: "rgba(254, 215, 170, 0.5)",
      secondaryForeground: "#c2410c",
      muted: "rgba(255, 237, 213, 0.6)",
      mutedForeground: "#ea580c",
      accent: "rgba(253, 186, 116, 0.3)",
      accentForeground: "#c2410c",
      border: "rgba(254, 215, 170, 0.4)",
      input: "rgba(255, 255, 255, 0.8)",
      ring: "#fb923c",
    },
  },
  {
    name: "Rose Petal",
    value: "rose-gold",
    preview: "#fecdd3",
    description: "Soft rose pink",
    colors: {
      background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)",
      foreground: "#881337",
      card: "rgba(255, 255, 255, 0.9)",
      cardForeground: "#9f1239",
      primary: "linear-gradient(135deg, #fda4af 0%, #fb7185 50%, #f43f5e 100%)",
      primaryForeground: "#ffffff",
      secondary: "rgba(254, 205, 211, 0.5)",
      secondaryForeground: "#be123c",
      muted: "rgba(255, 228, 230, 0.6)",
      mutedForeground: "#e11d48",
      accent: "rgba(253, 164, 175, 0.3)",
      accentForeground: "#be123c",
      border: "rgba(254, 205, 211, 0.4)",
      input: "rgba(255, 255, 255, 0.8)",
      ring: "#fb7185",
    },
  },
  {
    name: "Warm Gray",
    value: "midnight-steel",
    preview: "#f3f4f6",
    description: "Soft warm grays",
    colors: {
      background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 50%, #e5e7eb 100%)",
      foreground: "#374151",
      card: "rgba(255, 255, 255, 0.95)",
      cardForeground: "#4b5563",
      primary: "linear-gradient(135deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%)",
      primaryForeground: "#ffffff",
      secondary: "rgba(229, 231, 235, 0.6)",
      secondaryForeground: "#4b5563",
      muted: "rgba(243, 244, 246, 0.7)",
      mutedForeground: "#6b7280",
      accent: "rgba(209, 213, 219, 0.4)",
      accentForeground: "#4b5563",
      border: "rgba(229, 231, 235, 0.5)",
      input: "rgba(255, 255, 255, 0.9)",
      ring: "#9ca3af",
    },
  },
]

export default function ThemeCustomizer() {
  const { currentTheme, applyTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = useState(currentTheme)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setSelectedTheme(currentTheme)
  }, [currentTheme])

  const handleApplyTheme = (themeValue: string) => {
    setSelectedTheme(themeValue)

    const selectedPalette = colorPalettes.find((palette) => palette.value === themeValue)
    if (selectedPalette) {
      applyTheme(themeValue, selectedPalette as ColorPalette)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const handleReset = () => {
    // Reset to default ocean deep theme
    const defaultPalette = colorPalettes.find((palette) => palette.value === "ocean-deep")
    if (defaultPalette) {
      applyTheme("ocean-deep", defaultPalette as ColorPalette)
      setSelectedTheme("ocean-deep")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Theme Customization
        </h2>
        <p className="text-muted-foreground mt-2">
          Transform your dashboard with beautiful color palettes designed for optimal readability and visual appeal.
        </p>
      </div>

      {success && (
        <Alert className="border-green-500/20 bg-green-500/10 text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Theme applied successfully! Your dashboard has been transformed.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Enhanced Theme Preview */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gray-600" />
              Current Theme
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">Live preview of your selected palette</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-6 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="h-4 bg-primary/30 rounded-lg animate-pulse"></div>
                  <div className="h-3 bg-secondary/50 rounded-lg w-3/4"></div>
                  <div className="h-3 bg-muted/60 rounded-lg w-1/2"></div>
                  <div className="flex gap-2 mt-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20"></div>
                    <div className="w-8 h-8 rounded-full bg-accent/30"></div>
                    <div className="w-8 h-8 rounded-full bg-secondary/40"></div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {colorPalettes.find((palette) => palette.value === selectedTheme)?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {colorPalettes.find((palette) => palette.value === selectedTheme)?.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Color Palette Grid */}
        <div className="lg:col-span-2">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Palette className="h-4 w-4 text-gray-600" />
                Color Palettes
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Choose from professionally crafted color combinations that automatically adjust text contrast.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {colorPalettes.map((palette) => (
                  <div
                    key={palette.value}
                    className={`group p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedTheme === palette.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                    onClick={() => handleApplyTheme(palette.value)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-xl border-2 border-border/50 shadow-lg"
                          style={{ background: palette.colors.background }}
                        ></div>
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
                          style={{ backgroundColor: palette.preview }}
                        ></div>
                      </div>
                      <div className="flex-1">
                        <Label className="font-semibold text-foreground cursor-pointer text-base">{palette.name}</Label>
                        <p className="text-sm text-muted-foreground mt-1">{palette.description}</p>
                        <div className="flex gap-1 mt-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: palette.colors.primary.includes("gradient")
                                ? palette.preview
                                : palette.colors.primary,
                            }}
                          ></div>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: palette.colors.accent.includes("rgba")
                                ? palette.colors.accentForeground
                                : palette.colors.accent,
                            }}
                          ></div>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: palette.colors.secondary.includes("rgba")
                                ? palette.colors.secondaryForeground
                                : palette.colors.secondary,
                            }}
                          ></div>
                        </div>
                      </div>
                      {selectedTheme === palette.value && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-8 pt-6 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  <Sparkles className="inline h-4 w-4 mr-1" />
                  Click any palette to apply instantly with optimized contrast
                </p>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="hover:bg-destructive/10 hover:text-destructive bg-transparent"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
