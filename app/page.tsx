"use client"

import { useAuth } from "@/lib/auth-context"
import LoginPage from "@/components/login-page"
import Dashboard from "@/components/dashboard"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { professor, loading, initializing } = useAuth()

  // Show loading spinner while checking authentication on mount/refresh
  // Wait until initialization is complete before showing anything
  if (initializing || (loading && !professor)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Only show login page if we're sure there's no professor
  // This ensures authenticated users stay on dashboard after refresh
  return professor ? <Dashboard /> : <LoginPage />
}
