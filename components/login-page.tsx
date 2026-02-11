"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, AlertCircle, Mail, Lock } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, professor } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent submission if already loading
    if (loading) {
      return
    }

    setLoading(true)
    setError("")

    try {
      console.log("Attempting login with email:", email)
      await signIn(email, password)
      console.log("SignIn completed successfully, professor should be set")
      // If signIn completes without throwing, login was successful
      // Clear error state - we'll navigate to dashboard via page.tsx
      setError("")
      console.log("Error cleared, should navigate to dashboard")
    } catch (error: any) {
      console.error("Login error caught in handleSubmit:", error)
      console.error("Error type:", typeof error)
      console.error("Error details:", JSON.stringify(error, null, 2))

      // Only set error if we actually caught an error
      // Display specific error messages based on the error type
      let errorMessage = ""

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error?.message) {
        errorMessage = error.message
      } else {
        errorMessage = String(error) || "An error occurred"
      }

      console.log("Parsed error message:", errorMessage)

      // Set error message based on error type
      if (errorMessage.includes("inactive") || errorMessage.includes("resigned") || errorMessage.includes("retired")) {
        setError("Your account is no longer active. Please contact the administrator.")
      } else if (errorMessage.includes("No professor found") || errorMessage.includes("email") || errorMessage.includes("incomplete")) {
        setError("Invalid email address. Please check your email and try again.")
      } else if (errorMessage.includes("Invalid password") || errorMessage.includes("password")) {
        setError("Wrong password. Please check your password and try again.")
      } else {
        setError("Invalid email or password. Please check your credentials and try again.")
      }

      console.log("Error state set")

      // Ensure we stay on login page - don't clear form on error
      // Password is cleared for security, but email remains
      setPassword("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/Background.png')" }}
    >
      {/* Left Side - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        {/* Overlay para sa better text visibility */}
        <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[1px]"></div>

        {/* Branding Content */}
        <div className="relative z-10 text-center text-white max-w-md">
          <div className="flex justify-center mb-8">
            <div className="relative flex items-center justify-center">
              {/* White donut/ring background - same size as logo */}
              <div className="w-[280px] h-[280px] rounded-full border-8 border-white/40 shadow-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                {/* Logo ng institusyon - same size as white ring */}
                <img
                  src="/Logo.png"
                  alt="La Concepcion College Logo"
                  className="w-[272px] h-[272px] object-contain"
                />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg" style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
            La Concepcion College
          </h1>
          <p className="text-white/95 text-xl font-semibold mb-2 drop-shadow-md" style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
            Teacher Website
          </p>

          <div className="mt-8 pt-8 border-t border-white/30">

          </div>
        </div>
      </div>

      {/* Right Side - Login Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo - Only visible on small screens */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative flex items-center justify-center">
                {/* White donut/ring background - same size as logo */}
                <div className="w-28 h-28 rounded-full border-8 border-white shadow-lg flex items-center justify-center bg-transparent">
                  {/* Logo ng institusyon - same size as white ring */}
                  <img
                    src="/Logo.png"
                    alt="La Concepcion College Logo"
                    className="w-28 h-28 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Login form container with soft blue background */}
          <div className="rounded-3xl shadow-xl border-0 overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200">
            {/* Header section */}
            <div className="text-center pb-4 text-blue-900 pt-6 px-6">
              {/* Title at maliit na description */}
              <h2 className="text-3xl font-bold text-blue-900 mb-3 tracking-tight" style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', letterSpacing: '-0.02em' }}>
                Teacher Login
              </h2>
              <p className="text-sm text-blue-700/90 mb-4 font-medium" style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
                Sign in to access the Teacher Website System
              </p>
              {/* Separator below Evaluation System - more visible */}
              <div className="flex items-center justify-center mt-1">
                <div className="h-px w-24 bg-blue-400/60"></div>
              </div>
            </div>
            {/* Content section */}
            <div className="space-y-5 pt-5 pb-6 px-6">
              {/* Error message display - moved to top for better visibility */}
              {error && (
                <Alert variant="destructive" className="border-red-300 bg-red-50 rounded-lg animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="font-semibold text-sm text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Form element: onSubmit tumatawag sa handleSubmit */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-blue-900" style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
                    Email
                  </Label>
                  {/* Input para sa email/username with icon */}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-600 z-10" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        // Clear error when user starts typing
                        if (error) setError("")
                      }}
                      required
                      className="h-11 pl-10 border-2 border-blue-200 focus:border-blue-400 transition-colors bg-white text-gray-900 placeholder:text-gray-500 shadow-sm rounded-lg"
                      style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
                      placeholder="Enter your email or username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-blue-900" style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
                    Password
                  </Label>
                  {/* Input para sa password with icon and show/hide toggle */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-600 z-10" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        // Clear error when user starts typing
                        if (error) setError("")
                      }}
                      required
                      className="h-11 pl-10 pr-10 border-2 border-blue-200 focus:border-blue-400 transition-colors bg-white text-gray-900 placeholder:text-gray-500 shadow-sm rounded-lg"
                      style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 transition-all focus:outline-none z-10"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Eye className={`h-5 w-5 transition-opacity ${showPassword ? 'opacity-100' : 'opacity-60'}`} />
                    </button>
                  </div>
                </div>

                {/* Submit button: kapag pinindot, magt-trigger ng handleSubmit */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg rounded-lg"
                    style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', letterSpacing: '0.01em' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
