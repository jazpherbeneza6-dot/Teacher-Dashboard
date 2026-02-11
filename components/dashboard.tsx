"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Palette, LogOut, GraduationCap, BarChart3, PieChart, TrendingUp, Star } from "lucide-react"
import ProfileSettings from "./profile-settings"
import ThemeCustomizer from "./theme-customizer"
import EvaluationCharts from "./evaluation-charts"
import Image from "next/image"
import { collection, query, where, doc, onSnapshot, Timestamp, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface EvaluationResult {
  departmentName: string
  evaluationStatus: string
  isComplete: boolean
  professorEmail: string
  professorId: string
  professorName: string
  responses: Array<{
    answer: string
    questionText: string
    questionType: string
    section?: string
  }>
  evaluationPeriodId?: string // Track which evaluation period this belongs to
  createdAt?: Timestamp
  submittedAt?: Timestamp
}

interface EvaluationDeadline {
  startDate: Timestamp
  endDate: Timestamp
  isActive: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
  periodId?: string // Unique identifier for this evaluation period
}

export default function Dashboard() {
  const { professor, logout } = useAuth()
  const { getThemeColors } = useTheme()
  const [activeView, setActiveView] = useState<"dashboard" | "settings" | "theme">("dashboard")
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeadlinePassed, setIsDeadlinePassed] = useState<boolean>(false)
  const [deadlineLoading, setDeadlineLoading] = useState(true)
  const [themeColors, setThemeColors] = useState<ReturnType<typeof getThemeColors>>(null)
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null)
  const endDateRef = useRef<Date | null>(null)
  const startDateRef = useRef<Date | null>(null)
  const [totalStudents, setTotalStudents] = useState<number>(0)
  const [studentsLoading, setStudentsLoading] = useState(true)

  // Update theme colors when theme changes
  useEffect(() => {
    const updateThemeColors = () => {
      setThemeColors(getThemeColors())
    }

    // Initial load
    updateThemeColors()

    // Listen for theme changes
    window.addEventListener("theme-change", updateThemeColors)

    return () => {
      window.removeEventListener("theme-change", updateThemeColors)
    }
  }, [getThemeColors])

  // Fetch total students based on professor's handled sections and subjects
  useEffect(() => {
    const fetchTotalStudents = async () => {
      if (!professor) {
        setStudentsLoading(false)
        return
      }

      try {
        setStudentsLoading(true)

        // Get all sections the professor handles from subjectSections
        const handledSections: Set<string> = new Set()
        const handledSubjects: Set<string> = new Set()

        if (professor.subjectSections && professor.subjectSections.length > 0) {
          professor.subjectSections.forEach(item => {
            handledSubjects.add(item.subject)
            item.sections.forEach(section => {
              handledSections.add(section)
            })
          })
        } else if (professor.handledSection) {
          // Fallback to old format
          handledSections.add(professor.handledSection)
        }

        if (handledSections.size === 0) {
          console.log("[v0] No sections found for professor")
          setTotalStudents(0)
          setStudentsLoading(false)
          return
        }

        // Query users collection (students are stored here)
        const usersRef = collection(db, "users")
        const querySnapshot = await getDocs(usersRef)

        let count = 0
        querySnapshot.forEach((doc) => {
          const userData = doc.data()
          const userSection = userData.section
          const userSubjects = userData.subjects || []
          const accountStatus = userData.accountStatus || ""

          // Only count active student accounts
          if (accountStatus.toLowerCase() !== "active") {
            return
          }

          // Check if user's section matches any of the professor's handled sections
          if (handledSections.has(userSection)) {
            // If we have subject information, also check if subjects match
            if (handledSubjects.size > 0 && userSubjects.length > 0) {
              // Check if any of the user's subjects match the professor's handled subjects
              const hasMatchingSubject = userSubjects.some((subj: string) => handledSubjects.has(subj))
              if (hasMatchingSubject) {
                count++
              }
            } else {
              // If no subject filtering needed, count as match
              count++
            }
          }
        })

        console.log("[v0] Total students handled:", count)
        setTotalStudents(count)
      } catch (error) {
        console.error("[v0] Error fetching students:", error)
        setTotalStudents(0)
      } finally {
        setStudentsLoading(false)
      }
    }

    fetchTotalStudents()
  }, [professor])

  const checkDeadlineStatus = useCallback((deadlineData: EvaluationDeadline | null) => {
    if (!deadlineData) {
      // If no deadline document exists, assume deadline has passed and show results
      console.log("[v0] No deadline document found, showing results")
      setIsDeadlinePassed(true)
      setDeadlineLoading(false)
      endDateRef.current = null
      startDateRef.current = null
      setCurrentPeriodId(null)
      return true
    }

    const deadlineEndDate = deadlineData.endDate.toDate()
    const deadlineStartDate = deadlineData.startDate.toDate()
    endDateRef.current = deadlineEndDate
    startDateRef.current = deadlineStartDate
    const now = new Date()

    // Generate or get period ID based on start date
    // This ensures each evaluation period has a unique identifier
    const periodId = deadlineData.periodId || `period_${deadlineStartDate.getTime()}`

    // Check if this is a new evaluation period (different from current)
    if (currentPeriodId && currentPeriodId !== periodId) {
      console.log("[v0] New evaluation period detected, clearing old data")
      setEvaluations([]) // Clear old evaluations when new period starts
    }

    setCurrentPeriodId(periodId)

    // Check if deadline has passed
    const deadlinePassed = now >= deadlineEndDate
    setIsDeadlinePassed(deadlinePassed)
    setDeadlineLoading(false)

    console.log("[v0] Deadline check:", {
      periodId,
      startDate: deadlineStartDate.toISOString(),
      endDate: deadlineEndDate.toISOString(),
      now: now.toISOString(),
      deadlinePassed
    })

    return deadlinePassed
  }, [currentPeriodId])

  // Real-time listener for evaluation deadline
  useEffect(() => {
    if (!professor) return

    setDeadlineLoading(true)
    setLoading(true)

    const deadlineRef = doc(db, "evaluation_deadlines", "current")

    // Set up real-time listener for deadline document
    const unsubscribeDeadline = onSnapshot(
      deadlineRef,
      (deadlineDoc) => {
        if (deadlineDoc.exists()) {
          const deadlineData = deadlineDoc.data() as EvaluationDeadline
          const deadlinePassed = checkDeadlineStatus(deadlineData)

          // If deadline hasn't passed yet (new evaluation period), clear old data
          if (!deadlinePassed) {
            console.log("[v0] Evaluation period ongoing, clearing previous results")
            setEvaluations([])
            setLoading(false)
          }
        } else {
          checkDeadlineStatus(null)
        }
      },
      (error) => {
        console.error("[v0] Error listening to deadline:", error)
        // On error, assume deadline has passed to show results
        setIsDeadlinePassed(true)
        setDeadlineLoading(false)
      }
    )

    // Check time periodically (every 5 seconds) to detect when deadline naturally passes
    // Use ref to access the latest endDate without causing dependency issues
    const timeCheckInterval = setInterval(() => {
      if (endDateRef.current) {
        const now = new Date()
        const deadlinePassed = now >= endDateRef.current

        // Use functional update to get the latest state value
        setIsDeadlinePassed((currentStatus) => {
          if (deadlinePassed !== currentStatus) {
            console.log("[v0] Deadline status changed via time check:", {
              endDate: endDateRef.current?.toISOString(),
              now: now.toISOString(),
              deadlinePassed
            })

            if (!deadlinePassed) {
              console.log("[v0] Deadline status changed to ongoing, clearing results")
              setEvaluations([])
              setLoading(false)
            }
            return deadlinePassed
          }
          return currentStatus
        })
      }
    }, 5000) // Check every 5 seconds for more responsive updates

    return () => {
      unsubscribeDeadline()
      clearInterval(timeCheckInterval)
    }
  }, [professor, checkDeadlineStatus])

  // Real-time listener for evaluation results (only when deadline has passed)
  useEffect(() => {
    if (!professor || !isDeadlinePassed || deadlineLoading || !currentPeriodId) return

    setLoading(true)

    const evaluationsRef = collection(db, "evaluation_results")
    const q = query(evaluationsRef, where("professorEmail", "==", professor.email))

    // Set up real-time listener for evaluation results
    const unsubscribeEvaluations = onSnapshot(
      q,
      (querySnapshot) => {
        const results: EvaluationResult[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data() as EvaluationResult

          // Filter evaluations to only show current period
          // If evaluation has periodId, match it. Otherwise, check if it was created during current period
          if (currentPeriodId && startDateRef.current) {
            const evaluationPeriodId = data.evaluationPeriodId

            // If evaluation has periodId, only include if it matches current period
            if (evaluationPeriodId) {
              if (evaluationPeriodId !== currentPeriodId) {
                return // Skip evaluations from other periods
              }
            } else {
              // If no periodId, check if it was created during current period
              const createdAt = data.createdAt || data.submittedAt
              if (createdAt && startDateRef.current) {
                let createdDate: Date

                // Handle different data types
                if (createdAt.toDate && typeof createdAt.toDate === 'function') {
                  // Firestore Timestamp
                  createdDate = createdAt.toDate()
                } else if (createdAt instanceof Date) {
                  // Already a Date object
                  createdDate = createdAt
                } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
                  // String or timestamp number
                  createdDate = new Date(createdAt)
                } else {
                  // Unknown format, include it to be safe
                  return
                }

                // Check if evaluation was created before current period
                if (createdDate < startDateRef.current) {
                  return // Skip evaluations created before current period
                }
              }
            }
          }

          results.push(data)
        })

        console.log("[v0] Real-time evaluation update (filtered by period):", {
          total: querySnapshot.size,
          currentPeriod: results.length,
          periodId: currentPeriodId
        })
        setEvaluations(results)
        setLoading(false)
      },
      (error) => {
        console.error("[v0] Error listening to evaluations:", error)
        setLoading(false)
      }
    )

    return () => {
      unsubscribeEvaluations()
    }
  }, [professor, isDeadlinePassed, deadlineLoading, currentPeriodId])

  const handleLogout = async () => {
    await logout()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Helper function to format image URL with proper handling
  const getFormattedImageUrl = (imageUrl: string | undefined): string | null => {
    if (!imageUrl) return null

    // If it's a data URL, use it directly
    if (imageUrl.startsWith('data:')) {
      return imageUrl
    }

    // Ensure URL is absolute if it's relative
    let absoluteUrl = imageUrl
    if (imageUrl.startsWith('/')) {
      absoluteUrl = typeof window !== 'undefined' ? `${window.location.origin}${imageUrl}` : imageUrl

      // Add cache-busting parameter to force refresh if it's a proxy URL
      if (absoluteUrl.includes('/api/mega-image-proxy')) {
        const separator = absoluteUrl.includes('?') ? '&' : '?'
        absoluteUrl = `${absoluteUrl}${separator}_t=${Date.now()}`
      }
    }

    return absoluteUrl
  }


  // Calculate overall performance from evaluation results
  const overallPerformance = useMemo(() => {
    // Get all responses from completed evaluations, excluding text-type (verbal interpretation/comments)
    const allRatingResponses = evaluations
      .filter(e => e.isComplete)
      .flatMap(e => e.responses)
      .filter(r => r.questionType !== 'text' && r.section?.toLowerCase() !== 'verbal interpretation' && r.section?.toLowerCase() !== 'comments')

    const total = allRatingResponses.length
    const positive = allRatingResponses.filter(
      r => r.answer === 'Strongly Agree' || r.answer === 'Agree'
    ).length
    const percentage = total > 0 ? Math.round((positive / total) * 100) : 0

    let rating = 'Needs Improvement'
    let ratingColor = '#ef4444'
    if (percentage >= 90) {
      rating = 'Excellent'
      ratingColor = '#10b981'
    } else if (percentage >= 80) {
      rating = 'Very Good'
      ratingColor = '#3b82f6'
    } else if (percentage >= 70) {
      rating = 'Good'
      ratingColor = '#8b5cf6'
    } else if (percentage >= 60) {
      rating = 'Satisfactory'
      ratingColor = '#f59e0b'
    }

    return { total, positive, percentage, rating, ratingColor }
  }, [evaluations])

  if (!professor) return null

  // Get theme colors for dynamic styling
  const backgroundColor = themeColors?.background || "#f9fafb"
  const headerBg = themeColors?.card || "#ffffff"
  const headerText = themeColors?.foreground || "#111827"
  const headerBorder = themeColors?.border || "#e5e7eb"

  // Dropdown menu theme colors
  const dropdownBg = themeColors?.card || "#ffffff"
  const dropdownBorder = themeColors?.border || "#e5e7eb"
  const dropdownText = themeColors?.foreground || "#111827"
  const dropdownMutedText = themeColors?.mutedForeground || "#6b7280"
  const dropdownSeparator = themeColors?.border || "#e5e7eb"
  const dropdownHoverBg = themeColors?.accent || "rgba(59, 130, 246, 0.1)"
  const dropdownPrimaryColor = themeColors?.accentForeground || "#3b82f6"

  // Extract color from gradient or use as-is for icons
  const getColorFromTheme = (colorValue: string): string => {
    if (!colorValue) return themeColors?.accentForeground || "#3b82f6"
    if (colorValue.includes('gradient')) {
      // Extract first color from gradient
      const match = colorValue.match(/#[0-9A-Fa-f]{6}/)
      return match ? match[0] : (themeColors?.accentForeground || "#3b82f6")
    }
    if (colorValue.includes('rgba') || colorValue.includes('rgb')) {
      // For rgba/rgb, use accentForeground as fallback
      return themeColors?.accentForeground || "#3b82f6"
    }
    return colorValue
  }

  const primaryColor = getColorFromTheme(themeColors?.primary || themeColors?.accentForeground || "#3b82f6")
  const hoverBgColor = themeColors?.accent || "rgba(59, 130, 246, 0.1)"

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        background: backgroundColor,
        backgroundAttachment: "fixed"
      }}
    >
      <header
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm"
        style={{
          background: headerBg ? `${headerBg}dd` : "rgba(255, 255, 255, 0.95)",
          borderBottom: `1px solid ${headerBorder || "rgba(229, 231, 235, 0.8)"}`,
        }}
      >
        <div className="flex h-24 items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <div className="flex items-center gap-5 min-w-0">
              <div className="relative">
                <Image
                  src="/Logo.png"
                  alt="LA Concepcion College"
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-2xl font-bold tracking-tight truncate"
                  style={{ color: themeColors?.foreground || "#0f172a" }}
                >
                  Teacher Dashboard
                </h1>
                <p
                  className="text-sm text-center text-gray-500 mt-1 hidden sm:block font-medium"
                >
                  LA Concepcion College
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center">
              <div className="h-8 w-px bg-gray-200 mx-4"></div>
              <Badge
                variant="secondary"
                className="text-sm px-4 py-1.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200/60 font-semibold"
              >
                {professor.departmentName}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden md:block pr-2">
              <p
                className="text-base font-bold text-gray-900 truncate max-w-[220px] leading-tight"
                title={professor.name}
              >
                {professor.name}
              </p>
              <p
                className="text-sm text-gray-500 truncate max-w-[220px] mt-1"
                title={professor.email}
              >
                {professor.email}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full p-1 outline-none ring-2 ring-gray-100 hover:ring-gray-200 transition-all flex-shrink-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="User menu"
                  aria-haspopup="menu"
                >
                  <Avatar className="h-12 w-12 border-0 ring-2 ring-white">
                    {(() => {
                      const imageUrl = getFormattedImageUrl(professor.imageUrl || professor.profilePictureUrl)
                      return imageUrl ? (
                        <AvatarImage
                          src={imageUrl}
                          alt={professor.name}
                          className="object-cover"
                          key={imageUrl} // Force re-render when URL changes
                        />
                      ) : null
                    })()}
                    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-bold text-base border-0 shadow-sm">
                      {getInitials(professor.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-72 shadow-2xl rounded-xl p-1.5 mt-2 min-w-[200px]"
                align="end"
                side="bottom"
                sideOffset={8}
                onCloseAutoFocus={(e) => e.preventDefault()}
                style={{
                  background: dropdownBg,
                  borderColor: dropdownBorder,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                <DropdownMenuLabel className="px-4 py-3.5 mb-0.5">
                  <div className="flex flex-col gap-1.5">
                    <p
                      className="text-sm font-bold leading-tight"
                      style={{ color: dropdownText }}
                    >
                      {professor.name}
                    </p>
                    <p
                      className="text-xs font-bold"
                      style={{ color: dropdownMutedText }}
                    >
                      {professor.email}
                    </p>
                    <div
                      className="flex items-center gap-2 mt-2 pt-2.5"
                      style={{ borderTop: `1px solid ${dropdownSeparator}` }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shadow-sm"
                        style={{
                          backgroundColor: professor.status?.toLowerCase() === 'active' ? '#22c55e' :
                            professor.status?.toLowerCase() === 'inactive' ? '#f59e0b' :
                              professor.status?.toLowerCase() === 'resigned' ? '#ef4444' :
                                professor.status?.toLowerCase() === 'retired' ? '#6b7280' : '#22c55e'
                        }}
                      ></div>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: professor.status?.toLowerCase() === 'active' ? '#16a34a' :
                            professor.status?.toLowerCase() === 'inactive' ? '#d97706' :
                              professor.status?.toLowerCase() === 'resigned' ? '#dc2626' :
                                professor.status?.toLowerCase() === 'retired' ? '#6b7280' : '#16a34a'
                        }}
                      >
                        {professor.status || "Active"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator
                  className="my-2"
                  style={{ backgroundColor: dropdownSeparator }}
                />
                <DropdownMenuItem
                  onClick={() => setActiveView("theme")}
                  className="px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-0.5 my-0.5 transition-all duration-150 font-bold"
                  style={{
                    color: dropdownText,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBgColor
                    e.currentTarget.style.color = dropdownText
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = dropdownText
                  }}
                >
                  <Palette
                    className="mr-3 h-4 w-4"
                    style={{ color: primaryColor }}
                  />
                  <span>Customize Theme</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveView("settings")}
                  className="px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-0.5 my-0.5 transition-all duration-150 font-bold"
                  style={{
                    color: dropdownText,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBgColor
                    e.currentTarget.style.color = dropdownText
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = dropdownText
                  }}
                >
                  <Settings
                    className="mr-3 h-4 w-4"
                    style={{ color: dropdownMutedText }}
                  />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator
                  className="my-2"
                  style={{ backgroundColor: dropdownSeparator }}
                />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="px-4 py-2.5 text-sm cursor-pointer rounded-lg mx-0.5 my-0.5 transition-all duration-150 font-bold"
                  style={{
                    color: '#dc2626',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'
                    e.currentTarget.style.color = '#b91c1c'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#dc2626'
                  }}
                >
                  <LogOut className="mr-3 h-4 w-4" style={{ color: '#dc2626' }} />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-12 py-12 min-h-screen" style={{ background: backgroundColor }}>
        {activeView === "dashboard" && (
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="group bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-blue-200/60 transition-all duration-200 rounded-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="flex flex-row items-start justify-between pb-4 px-7 pt-7">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Total Students</CardTitle>
                    <div className="text-5xl font-bold text-gray-900 mb-3 leading-none">{studentsLoading ? "..." : totalStudents}</div>
                    <p className="text-sm text-gray-500 font-semibold">Students handled</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-xl ring-1 ring-blue-100/50 flex items-center justify-center w-16 h-16 flex-shrink-0">
                    <Image
                      src="/icon 1.png"
                      alt="Total Students"
                      width={56}
                      height={56}
                      className="object-contain w-full h-full"
                    />
                  </div>
                </CardHeader>
                <CardContent className="px-7 pb-7 pt-0">
                  <div className="flex items-center gap-2.5 text-sm text-gray-400 font-medium">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span>Based on sections</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="group bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-green-200/60 transition-all duration-200 rounded-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="flex flex-row items-start justify-between pb-4 px-7 pt-7">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Completed Total Evaluations</CardTitle>
                    <div className="text-5xl font-bold text-gray-900 mb-3 leading-none">
                      {evaluations.filter((e) => e.isComplete).length}
                    </div>
                    <p className="text-sm text-gray-500 font-semibold">Students who evaluated</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-xl ring-1 ring-green-100/50 flex items-center justify-center w-16 h-16 flex-shrink-0">
                    <Image
                      src="/icon 2.png"
                      alt="Completed Evaluations"
                      width={56}
                      height={56}
                      className="object-contain w-full h-full"
                    />
                  </div>
                </CardHeader>
                <CardContent className="px-7 pb-7 pt-0">
                  <div className="flex items-center gap-2.5 text-sm text-gray-400 font-medium">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span>Fully completed</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="group bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-amber-200/60 transition-all duration-200 rounded-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="flex flex-row items-start justify-between pb-4 px-7 pt-7">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Overall Performance</CardTitle>
                    {evaluations.filter(e => e.isComplete).length > 0 ? (
                      <>
                        <div className="text-5xl font-bold mb-3 leading-none" style={{ color: overallPerformance.ratingColor }}>
                          {overallPerformance.percentage}%
                        </div>
                        <div
                          className="inline-block px-3 py-1 text-sm font-bold rounded-full"
                          style={{
                            backgroundColor: `${overallPerformance.ratingColor}15`,
                            color: overallPerformance.ratingColor
                          }}
                        >
                          {overallPerformance.rating}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-5xl font-bold text-gray-300 mb-3 leading-none">—</div>
                        <p className="text-sm text-gray-400 font-semibold">No data yet</p>
                      </>
                    )}
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl ring-1 ring-amber-100/50 flex items-center justify-center w-16 h-16 flex-shrink-0">
                    <TrendingUp className="w-8 h-8 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent className="px-7 pb-7 pt-0">
                  {evaluations.filter(e => e.isComplete).length > 0 ? (
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${overallPerformance.percentage}%`,
                            backgroundColor: overallPerformance.ratingColor
                          }}
                        ></div>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-gray-400 font-medium">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: overallPerformance.ratingColor }}></div>
                        <span>Based on {overallPerformance.total} responses</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-400 font-medium">
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                      <span>Awaiting evaluations</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="group bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-purple-200/60 transition-all duration-200 rounded-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="flex flex-row items-start justify-between pb-4 px-7 pt-7">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Department</CardTitle>
                    <div className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{professor.departmentName}</div>
                    <p className="text-sm text-gray-500 font-semibold">Your department</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-xl ring-1 ring-purple-100/50 flex items-center justify-center w-16 h-16 flex-shrink-0">
                    <Image
                      src="/icon 4.png"
                      alt="Department"
                      width={56}
                      height={56}
                      className="object-contain w-full h-full"
                    />
                  </div>
                </CardHeader>
                <CardContent className="px-7 pb-7 pt-0">
                  <div className="flex items-center gap-2.5 text-sm text-gray-400 font-medium">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    <span>Active</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="mt-10">
              {deadlineLoading || loading ? (
                <Card className="bg-white border border-gray-200/60 shadow-sm rounded-xl">
                  <CardContent className="flex items-center justify-center py-32">
                    <div className="text-center space-y-6">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
                        <div className="absolute inset-0 animate-ping rounded-full h-14 w-14 border border-blue-200 opacity-20"></div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Loading Analytics</h3>
                        <p className="text-base text-gray-500 font-medium">Fetching your evaluation data...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : !isDeadlinePassed ? (
                <Card className="bg-white border border-amber-200/60 shadow-sm rounded-xl overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400"></div>
                  <CardContent className="flex items-center justify-center py-32 px-8">
                    <div className="text-center space-y-8 max-w-lg">
                      <div className="relative inline-block">
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm ring-1 ring-amber-100">
                          <BarChart3 className="h-12 w-12 text-amber-600" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
                          ON GOING EVALUATION
                        </h3>
                        <p className="text-base text-gray-600 leading-relaxed max-w-md mx-auto font-medium">
                          The evaluation period is still ongoing. Evaluation results will be available once the deadline has passed.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-sm font-semibold text-amber-700 bg-amber-50 px-5 py-2.5 rounded-full w-fit mx-auto border border-amber-100">
                        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                        <span>Evaluation in progress</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : evaluations.length > 0 ? (
                <EvaluationCharts evaluations={evaluations} />
              ) : (
                <Card className="bg-white border border-gray-200/60 shadow-sm rounded-xl">
                  <CardContent className="flex items-center justify-center py-32 px-8">
                    <div className="text-center space-y-6 max-w-md">
                      <div className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-gray-100">
                        <BarChart3 className="h-12 w-12 text-gray-400" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-gray-900">No Evaluation Data Yet</h3>
                        <p className="text-base text-gray-600 leading-relaxed font-medium">
                          You haven't received any student evaluations yet. Once students complete their evaluations,
                          you'll see detailed charts and analytics here.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeView === "settings" && (
          <div className="max-w-7xl mx-auto space-y-6 px-6">
            <Button
              variant="ghost"
              onClick={() => setActiveView("dashboard")}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 -ml-2"
            >
              ← Back to Dashboard
            </Button>
            <ProfileSettings />
          </div>
        )}

        {activeView === "theme" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Button
              variant="ghost"
              onClick={() => setActiveView("dashboard")}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 -ml-2"
            >
              ← Back to Dashboard
            </Button>
            <ThemeCustomizer />
          </div>
        )}
      </main>
    </div>
  )
}
