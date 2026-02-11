"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Building, Save, CheckCircle, Lock, Eye, EyeOff, AlertCircle, Shield, Calendar, Clock, Upload, X, Users, BookOpen } from "lucide-react"
import { AvatarImage } from "@/components/ui/avatar"

export default function ProfileSettings() {
  const { professor, updateProfessorInfo, updatePassword, uploadProfilePicture, deleteProfilePicture, loading } = useAuth()
  const { getThemeColors } = useTheme()
  const [themeColors, setThemeColors] = useState<ReturnType<typeof getThemeColors>>(null)
  const [name, setName] = useState(professor?.name || "")
  const [email, setEmail] = useState(professor?.email || "")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Set preview URL from professor profile picture
  useEffect(() => {
    const imageUrl = professor?.imageUrl || professor?.profilePictureUrl
    if (imageUrl) {
      // Reset image loading state when URL changes
      setImageLoaded(false)
      setImageError(false)

      // Handle different URL types
      let absoluteUrl = imageUrl

      // If it's a data URL, use it directly
      if (imageUrl.startsWith('data:')) {
        absoluteUrl = imageUrl
      }
      // If it's a relative URL, make it absolute
      else if (imageUrl.startsWith('/')) {
        absoluteUrl = typeof window !== 'undefined' ? `${window.location.origin}${imageUrl}` : imageUrl

        // Add cache-busting parameter to force refresh if it's a proxy URL
        if (absoluteUrl.includes('/api/mega-image-proxy')) {
          const separator = absoluteUrl.includes('?') ? '&' : '?'
          absoluteUrl = `${absoluteUrl}${separator}_t=${Date.now()}`
        }
      }
      // If it's already an absolute URL (http/https), use it as-is
      else {
        absoluteUrl = imageUrl
      }

      // Set preview URL immediately so Avatar can start loading
      setPreviewUrl(absoluteUrl)

      // Preload image to verify it's ready
      const img = new Image()
      img.onload = () => {
        setImageLoaded(true)
        setImageError(false)
      }
      img.onerror = () => {
        console.warn('Failed to load profile image:', absoluteUrl)
        setImageError(true)
        setImageLoaded(false)
      }
      img.src = absoluteUrl
    } else {
      setPreviewUrl(null)
      setImageLoaded(false)
      setImageError(false)
    }
  }, [professor?.imageUrl, professor?.profilePictureUrl])

  // Helper function to compress image
  const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Convert blob to File
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            file.type,
            quality
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError("Please select an image file")
      return
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB")
      return
    }

    setUploadError("")

    try {
      // Compress image before upload to reduce size and ensure it fits in Firestore
      // This helps prevent the "image disappears after refresh" issue
      const compressedFile = await compressImage(file, 800, 800, 0.75)

      console.log(`[Profile] Image compressed: ${file.size} bytes -> ${compressedFile.size} bytes`)

      // Create preview from compressed file
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)

      // Upload the compressed file (handleUpload will manage uploading state)
      await handleUpload(compressedFile)
    } catch (error) {
      console.error('Error compressing image:', error)
      // If compression fails, try uploading original file
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
      await handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    setUploadError("")
    setUploadSuccess(false)
    setUploading(true)

    try {
      // Validate file before upload
      if (!file || !file.name) {
        throw new Error("Invalid file. Please select a valid image file.")
      }

      console.log("[Profile] Starting upload:", file.name, file.size, "bytes")
      const newImageUrl = await uploadProfilePicture(file)
      console.log("[Profile] Upload successful, imageUrl received")

      // Update preview URL immediately with the new URL
      if (newImageUrl) {
        let absoluteUrl = newImageUrl

        // If it's a data URL, use it directly
        if (newImageUrl.startsWith('data:')) {
          absoluteUrl = newImageUrl
        }
        // If it's a relative URL, make it absolute
        else if (newImageUrl.startsWith('/')) {
          absoluteUrl = typeof window !== 'undefined' ? `${window.location.origin}${newImageUrl}` : newImageUrl

          // Add cache-busting parameter to force refresh if it's a proxy URL
          if (absoluteUrl.includes('/api/mega-image-proxy')) {
            const separator = absoluteUrl.includes('?') ? '&' : '?'
            absoluteUrl = `${absoluteUrl}${separator}_t=${Date.now()}`
          }
        }
        // If it's already an absolute URL, use it as-is
        else {
          absoluteUrl = newImageUrl
        }

        setPreviewUrl(absoluteUrl)
      }

      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload profile picture")
      // Reset preview on error
      const imageUrl = professor?.imageUrl || professor?.profilePictureUrl
      if (imageUrl) {
        let absoluteUrl = imageUrl
        // Handle data URLs
        if (imageUrl.startsWith('data:')) {
          absoluteUrl = imageUrl
        }
        // Handle relative URLs
        else if (imageUrl.startsWith('/')) {
          absoluteUrl = typeof window !== 'undefined' ? `${window.location.origin}${imageUrl}` : imageUrl
        }
        // Absolute URLs are already fine
        setPreviewUrl(absoluteUrl)
      } else {
        setPreviewUrl(null)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePicture = async () => {
    const imageUrl = professor?.imageUrl || professor?.profilePictureUrl
    if (!imageUrl) return

    setUploading(true)
    setUploadError("")
    setUploadSuccess(false)
    try {
      await deleteProfilePicture()
      setPreviewUrl(null)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to remove profile picture")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    try {
      await updateProfessorInfo(name, email)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update profile")
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess(false)

    // Validate passwords
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password")
      return
    }

    try {
      await updatePassword(currentPassword, newPassword)
      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to update password")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (!professor) return null

  // Get theme colors for dynamic styling
  const cardBg = themeColors?.card || "#ffffff"
  const cardBorder = themeColors?.border || "#e5e7eb"
  const textColor = themeColors?.foreground || "#111827"
  const mutedText = themeColors?.mutedForeground || "#6b7280"
  const accentColor = themeColors?.accentForeground || "#3b82f6"

  // Extract color from gradient or use as-is
  const getColorFromTheme = (colorValue: string): string => {
    if (!colorValue) return accentColor
    if (colorValue.includes('gradient')) {
      const match = colorValue.match(/#[0-9A-Fa-f]{6}/)
      return match ? match[0] : accentColor
    }
    if (colorValue.includes('rgba') || colorValue.includes('rgb')) {
      return accentColor
    }
    return colorValue
  }

  const primaryColor = getColorFromTheme(themeColors?.primary || accentColor)

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: textColor }}>
            Profile Settings
          </h2>
        </div>
        <p className="text-sm ml-[60px]" style={{ color: mutedText }}>
          Manage your account information and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Profile Overview */}
        <div
          className="border shadow-sm rounded-xl overflow-hidden w-full max-w-4xl"
          style={{
            background: cardBg,
            borderColor: cardBorder,
          }}
        >
          <div className="h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="pb-4 px-6 pt-6">
            <h3 className="text-base font-bold" style={{ color: textColor }}>
              Profile Overview
            </h3>
            <p className="text-xs mt-1" style={{ color: mutedText }}>
              Your current profile information
            </p>
          </div>
          <div className="px-6 pb-6 space-y-5">
            <div className="flex items-start gap-9">
              <div className="flex flex-col items-center gap-4 shrink-0">
                <div className="relative group">
                  <Avatar
                    className="h-28 w-28 ring-2 ring-offset-2 ring-gray-100 shadow-lg cursor-pointer hover:ring-blue-300 transition-all hover:shadow-xl"
                    onClick={() => {
                      if (!uploading && !loading) {
                        fileInputRef.current?.click()
                      }
                    }}
                    style={{
                      cursor: uploading || loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {previewUrl ? (
                      <AvatarImage
                        key={previewUrl}
                        src={previewUrl}
                        alt={professor.name}
                        className="object-cover"
                        onLoad={() => {
                          setImageLoaded(true)
                          setImageError(false)
                        }}
                        onError={() => {
                          setImageError(true)
                          setImageLoaded(false)
                        }}
                      />
                    ) : null}
                    <AvatarFallback
                      className="text-2xl font-bold shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}25)`,
                        color: primaryColor,
                      }}
                    >
                      {getInitials(professor.name)}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-10 backdrop-blur-sm">
                      <div className="animate-spin rounded-full h-7 w-7 border-2.5 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Upload profile picture"
                    title="Upload profile picture"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || loading}
                    className="text-xs font-bold px-3 py-1.5 h-auto shadow-sm hover:shadow-md transition-all disabled:opacity-50 w-full"
                    style={{
                      background: primaryColor,
                      color: "#ffffff",
                    }}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {previewUrl ? "Change" : "Upload"}
                  </Button>
                  {previewUrl && (
                    <Button
                      type="button"
                      onClick={handleRemovePicture}
                      disabled={uploading || loading}
                      variant="outline"
                      className="text-xs font-bold px-3 py-1.5 h-auto border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 w-full"
                      style={{
                        borderColor: cardBorder,
                        color: textColor,
                      }}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                  {uploadSuccess && (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-green-800 leading-tight">
                        Photo updated
                      </p>
                    </div>
                  )}
                  {uploadError && (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200">
                      <AlertCircle className="h-3 w-3 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-red-800 leading-tight">
                        {uploadError}
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-medium text-center" style={{ color: mutedText }}>
                    Max 5MB
                  </p>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="space-y-2">
                  <p className="font-medium text-base break-words overflow-wrap-anywhere" style={{ color: textColor }}>
                    {professor.name}
                  </p>
                  <p className="text-sm font-medium break-words overflow-wrap-anywhere" style={{ color: mutedText }}>
                    {professor.email}
                  </p>
                  <Badge
                    className="text-xs px-3 py-1 font-semibold border-0"
                    style={{
                      background: `${primaryColor}15`,
                      color: primaryColor,
                    }}
                  >
                    {professor.departmentName}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator style={{ backgroundColor: cardBorder }} />

            <div className="space-y-3.5">
              {/* Status */}
              <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-gray-50/50">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: `${primaryColor}15` }}
                >
                  <Shield className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-0.5" style={{ color: mutedText }}>
                    Status
                  </p>
                  <Badge
                    className="text-xs px-2 py-0.5 font-semibold border-0"
                    style={{
                      background: professor.status?.toLowerCase() === 'active' ? '#dcfce7' :
                        professor.status?.toLowerCase() === 'inactive' ? '#fef3c7' :
                          professor.status?.toLowerCase() === 'resigned' ? '#fecaca' :
                            professor.status?.toLowerCase() === 'retired' ? '#e5e7eb' : '#dcfce7',
                      color: professor.status?.toLowerCase() === 'active' ? '#166534' :
                        professor.status?.toLowerCase() === 'inactive' ? '#92400e' :
                          professor.status?.toLowerCase() === 'resigned' ? '#991b1b' :
                            professor.status?.toLowerCase() === 'retired' ? '#6b7280' : '#166534',
                    }}
                  >
                    {professor.status || "Active"}
                  </Badge>
                </div>
              </div>

              {/* Subject Sections */}
              {professor.subjectSections && professor.subjectSections.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 px-1">
                    <BookOpen className="h-4 w-4" style={{ color: primaryColor }} />
                    <p className="text-xs font-bold" style={{ color: textColor }}>
                      Handled Subjects & Sections
                    </p>
                  </div>
                  <div className="space-y-2">
                    {professor.subjectSections.map((item, index) => (
                      <div key={index} className="p-2.5 rounded-lg bg-gray-50/50 border border-gray-100">
                        <div className="flex items-start gap-2">
                          <div
                            className="p-1.5 rounded-lg shrink-0 mt-0.5"
                            style={{ background: `${primaryColor}15` }}
                          >
                            <BookOpen className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold break-words" style={{ color: textColor }}>
                              {item.subject}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {item.sections.map((section, sIdx) => (
                                <Badge
                                  key={sIdx}
                                  className="text-xs px-2 py-0.5 font-semibold border-0"
                                  style={{
                                    background: `${primaryColor}15`,
                                    color: primaryColor,
                                  }}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3.5 md:grid-cols-2">
                  <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-gray-50/50">
                    <div
                      className="p-2 rounded-lg"
                      style={{ background: `${primaryColor}15` }}
                    >
                      <Users className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-0.5" style={{ color: mutedText }}>
                        Handle Section
                      </p>
                      <p className="text-sm font-bold break-words overflow-wrap-anywhere" style={{ color: textColor }}>
                        {professor.handledSection || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-gray-50/50">
                    <div
                      className="p-2 rounded-lg"
                      style={{ background: `${primaryColor}15` }}
                    >
                      <BookOpen className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-0.5" style={{ color: mutedText }}>
                        Handle Subject
                      </p>
                      <p className="text-sm font-bold break-words overflow-wrap-anywhere" style={{ color: textColor }}>
                        {professor.subject || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-gray-50/50">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: `${primaryColor}15` }}
                >
                  <Building className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-0.5" style={{ color: mutedText }}>
                    Department
                  </p>
                  <p className="text-sm font-bold break-words overflow-wrap-anywhere" style={{ color: textColor }}>
                    {professor.departmentName}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-gray-50/50">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: `${primaryColor}15` }}
                >
                  <Mail className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-0.5" style={{ color: mutedText }}>
                    Email
                  </p>
                  <p className="text-sm font-bold break-words overflow-wrap-anywhere" style={{ color: textColor }}>
                    {professor.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="space-y-6">
          <div
            className="border shadow-sm rounded-xl overflow-hidden break-words"
            style={{
              background: cardBg,
              borderColor: cardBorder,
            }}
          >
            <div className="h-2.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <div className="pb-4 px-6 pt-6">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: textColor }}>
                <User className="h-5 w-5" style={{ color: primaryColor }} />
                Edit Profile Information
              </h3>
              <p className="text-xs mt-1" style={{ color: mutedText }}>
                Update your personal information and contact details.
              </p>
            </div>
            <div className="px-6 pb-6">
              <form onSubmit={handleSave} className="space-y-5">
                {success && (
                  <Alert
                    className="border-0 shadow-sm"
                    style={{
                      background: "#f0fdf4",
                      borderLeft: `4px solid #22c55e`,
                    }}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm font-semibold text-green-800">
                      Profile updated successfully!
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert
                    className="border-0 shadow-sm"
                    style={{
                      background: "#fef2f2",
                      borderLeft: `4px solid #ef4444`,
                    }}
                  >
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm font-semibold text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-bold"
                      style={{ color: textColor }}
                    >
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      disabled
                      className="font-medium border-2 cursor-not-allowed focus:bg-gray-50 focus:outline-none focus:ring-0"
                      style={{
                        borderColor: cardBorder,
                        color: mutedText,
                        backgroundColor: '#f9fafb',
                      }}
                      onFocus={(e) => {
                        e.target.style.backgroundColor = '#f9fafb'
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-bold"
                      style={{ color: textColor }}
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="font-medium border-2 cursor-not-allowed focus:bg-gray-50 focus:outline-none focus:ring-0"
                      style={{
                        borderColor: cardBorder,
                        color: mutedText,
                        backgroundColor: '#f9fafb',
                      }}
                      onFocus={(e) => {
                        e.target.style.backgroundColor = '#f9fafb'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="department"
                    className="text-sm font-bold"
                    style={{ color: textColor }}
                  >
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={professor.departmentName}
                    disabled
                    className="font-medium bg-gray-50 border-2 cursor-not-allowed"
                    style={{
                      borderColor: cardBorder,
                      color: mutedText,
                    }}
                  />
                </div>
              </form>
            </div>
          </div>

          <div
            className="border shadow-sm rounded-xl overflow-hidden break-words"
            style={{
              background: cardBg,
              borderColor: cardBorder,
            }}
          >
            <div className="h-2.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            <div className="pb-4 px-6 pt-6">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: textColor }}>
                <Lock className="h-5 w-5" style={{ color: primaryColor }} />
                Change Password
              </h3>
              <p className="text-xs mt-1" style={{ color: mutedText }}>
                Update your account password for better security.
              </p>
            </div>
            <div className="px-6 pb-6">
              <form onSubmit={handlePasswordChange} className="space-y-5">
                {passwordSuccess && (
                  <Alert
                    className="border-0 shadow-sm"
                    style={{
                      background: "#f0fdf4",
                      borderLeft: `4px solid #22c55e`,
                    }}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm font-semibold text-green-800">
                      Password updated successfully!
                    </AlertDescription>
                  </Alert>
                )}

                {passwordError && (
                  <Alert
                    className="border-0 shadow-sm"
                    style={{
                      background: "#fef2f2",
                      borderLeft: `4px solid #ef4444`,
                    }}
                  >
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm font-semibold text-red-800">
                      {passwordError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="currentPassword"
                    className="text-sm font-bold"
                    style={{ color: textColor }}
                  >
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                      className="font-medium border-2 focus:border-blue-500 pr-10"
                      style={{
                        borderColor: cardBorder,
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{ color: mutedText }}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="text-sm font-bold"
                      style={{ color: textColor }}
                    >
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        className="font-medium border-2 focus:border-blue-500 pr-10"
                        style={{
                          borderColor: cardBorder,
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ color: mutedText }}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-bold"
                      style={{ color: textColor }}
                    >
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        className="font-medium border-2 focus:border-blue-500 pr-10"
                        style={{
                          borderColor: cardBorder,
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ color: mutedText }}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: `${primaryColor}08`,
                    borderColor: `${primaryColor}20`,
                  }}
                >
                  <p className="text-sm font-bold mb-2" style={{ color: textColor }}>
                    Password requirements:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm font-medium" style={{ color: mutedText }}>
                    <li>At least 6 characters long</li>
                    <li>Must be different from your current password</li>
                  </ul>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="font-bold px-6 shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      background: primaryColor,
                      color: "#ffffff",
                    }}
                  >
                    {loading ? (
                      <>
                        <Lock className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Account Information */}
          <div
            className="border shadow-sm rounded-xl overflow-hidden break-words"
            style={{
              background: cardBg,
              borderColor: cardBorder,
            }}
          >
            <div className="h-2.5 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <div className="pb-4 px-6 pt-6">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: textColor }}>
                <Shield className="h-5 w-5" style={{ color: primaryColor }} />
                Account Information
              </h3>
              <p className="text-xs mt-1" style={{ color: mutedText }}>
                View your account details and status.
              </p>
            </div>
            <div className="px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: `${primaryColor}08`,
                    borderColor: `${primaryColor}20`,
                  }}
                >
                  <Label className="text-xs font-bold mb-2 block" style={{ color: mutedText }}>
                    Account Status
                  </Label>
                  <div className="flex items-center space-x-2.5">
                    <div className="h-2.5 w-2.5 bg-green-500 rounded-full shadow-sm"></div>
                    <span className="text-sm font-bold" style={{ color: textColor }}>
                      Active
                    </span>
                  </div>
                </div>

                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: `${primaryColor}08`,
                    borderColor: `${primaryColor}20`,
                  }}
                >
                  <Label className="text-xs font-bold mb-2 block" style={{ color: mutedText }}>
                    Account Type
                  </Label>
                  <div className="flex items-center space-x-2.5">
                    <User className="h-4 w-4" style={{ color: primaryColor }} />
                    <span className="text-sm font-bold" style={{ color: textColor }}>
                      Professor
                    </span>
                  </div>
                </div>

                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: `${primaryColor}08`,
                    borderColor: `${primaryColor}20`,
                  }}
                >
                  <Label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: mutedText }}>
                    <Calendar className="h-3.5 w-3.5" />
                    Member Since
                  </Label>
                  <span className="text-sm font-bold" style={{ color: textColor }}>
                    September 2025
                  </span>
                </div>

                <div
                  className="p-4 rounded-lg border"
                  style={{
                    background: `${primaryColor}08`,
                    borderColor: `${primaryColor}20`,
                  }}
                >
                  <Label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: mutedText }}>
                    <Clock className="h-3.5 w-3.5" />
                    Last Login
                  </Label>
                  <span className="text-sm font-bold" style={{ color: textColor }}>
                    Today, 2:30 PM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
