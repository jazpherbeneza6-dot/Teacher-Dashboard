"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

interface SubjectSection {
  subject: string
  sections: string[]
}

interface Professor {
  id: string
  name: string
  email: string
  departmentId: string
  departmentName: string
  password: string
  imageUrl?: string
  profilePictureUrl?: string // Keep for backward compatibility
  handledSection?: string
  subject?: string
  status?: string
  subjectSections?: SubjectSection[]
  subjects?: string[]
}

interface AuthContextType {
  professor: Professor | null
  loading: boolean
  initializing: boolean
  signIn: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfessorInfo: (name: string, email: string) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  uploadProfilePicture: (file: File) => Promise<string>
  deleteProfilePicture: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [professor, setProfessor] = useState<Professor | null>(null)
  const [loading, setLoading] = useState(true) // Start with true to check auth on mount
  const [initializing, setInitializing] = useState(true) // Track if we're checking auth on mount

  // Restore authentication state on mount/refresh
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        // Check if there's a saved professor ID in localStorage
        const savedProfessorId = localStorage.getItem('professorId')

        if (savedProfessorId) {
          // Try to restore the professor from Firestore
          try {
            const professorRef = doc(db, "professors", savedProfessorId)
            const professorDoc = await getDoc(professorRef)

            if (professorDoc.exists()) {
              const professorData = professorDoc.data()

              // Validate required fields
              if (professorData.name && professorData.email && professorData.departmentId && professorData.departmentName) {
                // Check if professor status is Inactive, Resigned, or Retired (case-insensitive)
                const professorStatus = professorData.status || "Active"
                const statusLower = professorStatus.toLowerCase()
                if (statusLower === "inactive" || statusLower === "resigned" || statusLower === "retired") {
                  console.warn("[v0] Professor account is", professorStatus, "- clearing session")
                  localStorage.removeItem('professorId')
                } else {
                  let imageUrl = professorData.imageUrl || professorData.profilePictureUrl || undefined

                  // Log for debugging
                  if (imageUrl) {
                    console.log("[v0] Found imageUrl in Firestore:", imageUrl.substring(0, 50) + '...')
                  } else {
                    console.log("[v0] No imageUrl found in Firestore for professor:", professorData.name)
                  }

                  // Set professor with imageUrl from Firestore (base64 data URL)
                  setProfessor({
                    id: professorDoc.id,
                    name: professorData.name,
                    email: professorData.email,
                    departmentId: professorData.departmentId,
                    departmentName: professorData.departmentName,
                    password: professorData.password || "",
                    imageUrl: imageUrl,
                    profilePictureUrl: imageUrl,
                    handledSection: professorData.handledSection || undefined,
                    subject: professorData.subject || undefined,
                    status: professorData.status || "Active",
                    subjectSections: professorData.subjectSections || [],
                    subjects: professorData.subjects || [],
                  })

                  console.log("[v0] Professor session restored:", professorData.name)
                }
              } else {
                // Invalid data, clear localStorage
                console.warn("[v0] Invalid professor data, clearing localStorage")
                localStorage.removeItem('professorId')
              }
            } else {
              // Professor not found, clear localStorage
              console.warn("[v0] Professor not found in Firestore, clearing localStorage")
              localStorage.removeItem('professorId')
            }
          } catch (error) {
            console.error("[v0] Error restoring professor session:", error)
            localStorage.removeItem('professorId')
          }
        } else {
          console.log("[v0] No saved professor ID in localStorage")
        }
      } catch (error) {
        console.error("[v0] Error in restoreAuth:", error)
      } finally {
        // Always set initializing to false after checking, even if no professor was found
        // This ensures the UI doesn't stay in loading state forever
        setInitializing(false)
        setLoading(false)
      }
    }

    restoreAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    // Don't set global loading state - let LoginPage handle its own loading
    // This prevents unmounting LoginPage and losing error state
    // Ensure professor state is cleared before attempting login
    setProfessor(null)

    try {
      const professorsRef = collection(db, "professors")
      const q = query(professorsRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        const error = new Error("No professor found with this email")
        console.error("[v0] Authentication error:", error.message)
        throw error
      }

      const professorDoc = querySnapshot.docs[0]
      const professorData = professorDoc.data()

      if (!professorData) {
        const error = new Error("No professor found with this email")
        console.error("[v0] Authentication error: No data found")
        throw error
      }

      if (!professorData.password || professorData.password !== password) {
        const error = new Error("Invalid password")
        console.error("[v0] Authentication error:", error.message)
        throw error
      }

      // Check if professor status is Inactive or Resigned (case-insensitive)
      const professorStatus = professorData.status || "Active"
      const statusLower = professorStatus.toLowerCase()
      if (statusLower === "inactive" || statusLower === "resigned" || statusLower === "retired") {
        const error = new Error(`Account is ${statusLower}. Please contact the administrator.`)
        console.error("[v0] Authentication error: Professor account is", professorStatus)
        throw error
      }

      // Validate required fields
      if (!professorData.name || !professorData.email || !professorData.departmentId || !professorData.departmentName) {
        const error = new Error("Professor data is incomplete")
        console.error("[v0] Authentication error: Missing required fields")
        throw error
      }

      // Only set professor if authentication is successful
      // Get imageUrl from Firestore (base64 data URL)
      let imageUrl = professorData.imageUrl || professorData.profilePictureUrl || undefined

      const professorObj = {
        id: professorDoc.id,
        name: professorData.name,
        email: professorData.email,
        departmentId: professorData.departmentId,
        departmentName: professorData.departmentName,
        password: professorData.password,
        imageUrl: imageUrl,
        profilePictureUrl: imageUrl, // Keep for backward compatibility
        handledSection: professorData.handledSection || undefined,
        subject: professorData.subject || undefined,
        status: professorData.status || "Active",
        subjectSections: professorData.subjectSections || [],
        subjects: professorData.subjects || [],
      }

      setProfessor(professorObj)

      // Save professor ID to localStorage for persistence across refreshes
      localStorage.setItem('professorId', professorDoc.id)

      console.log("[v0] Professor authenticated successfully:", professorData.name)
      // Don't throw error on success - just return
      return
    } catch (error: any) {
      console.error("[v0] Authentication error:", error)
      // Ensure professor state is null on error
      setProfessor(null)
      // Re-throw the error so login page can catch it
      if (error instanceof Error) {
        throw error
      } else {
        // Handle Firebase errors or other unexpected errors
        const errorMessage = error?.message || error?.code || "An error occurred during authentication"
        throw new Error(errorMessage)
      }
    }
  }

  const logout = () => {
    setProfessor(null)
    // Clear localStorage on logout
    localStorage.removeItem('professorId')
    console.log("[v0] Professor logged out")
  }

  const updateProfessorInfo = async (name: string, email: string) => {
    if (!professor) throw new Error("No professor logged in")

    setLoading(true)
    try {
      const professorRef = doc(db, "professors", professor.id)
      await updateDoc(professorRef, {
        name,
        email,
      })

      setProfessor({
        ...professor,
        name,
        email,
      })

      console.log("[v0] Professor info updated successfully")
    } catch (error) {
      console.error("[v0] Error updating professor info:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!professor) throw new Error("No professor logged in")

    if (professor.password !== currentPassword) {
      throw new Error("Current password is incorrect")
    }

    setLoading(true)
    try {
      const professorRef = doc(db, "professors", professor.id)
      await updateDoc(professorRef, {
        password: newPassword,
      })

      setProfessor({
        ...professor,
        password: newPassword,
      })

      console.log("[v0] Password updated successfully")
    } catch (error) {
      console.error("[v0] Error updating password:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }


  const uploadProfilePicture = async (file: File): Promise<string> => {
    if (!professor) throw new Error("No professor logged in")

    setLoading(true)
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image")
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size must be less than 5MB")
      }

      // Upload image and convert to base64 data URL
      const formData = new FormData()
      formData.append('file', file, file.name) // Include filename for better compatibility

      console.log("[v0] Uploading image:", {
        name: file.name,
        size: file.size,
        type: file.type
      })

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Upload failed:", errorData)
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const data = await response.json()
      const imageUrl = data.url || data.imageUrl

      if (!imageUrl) {
        throw new Error('No image URL returned from upload')
      }

      // Update Firestore with the new imageUrl
      const professorRef = doc(db, "professors", professor.id)
      try {
        await updateDoc(professorRef, {
          imageUrl: imageUrl,
          profilePictureUrl: imageUrl, // Also update for backward compatibility
        })
        console.log("[v0] Image URL saved to Firestore successfully")
      } catch (firestoreError: any) {
        console.error("[v0] Error saving imageUrl to Firestore:", firestoreError)
        // Check if it's a size limit error
        if (firestoreError?.code === 'invalid-argument' || firestoreError?.message?.includes('size')) {
          throw new Error('Image is too large to save. Please use a smaller image (max 500KB).')
        }
        throw new Error('Failed to save image to database. Please try again.')
      }

      // Update local state
      setProfessor({
        ...professor,
        imageUrl: imageUrl,
        profilePictureUrl: imageUrl, // Keep for backward compatibility
      })

      console.log("[v0] Profile picture uploaded successfully")
      return imageUrl
    } catch (error) {
      console.error("[v0] Error uploading profile picture:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteProfilePicture = async (): Promise<void> => {
    const currentImageUrl = professor?.imageUrl || professor?.profilePictureUrl
    if (!professor || !currentImageUrl) throw new Error("No profile picture to delete")

    setLoading(true)
    try {
      // Update Firestore to remove imageUrl (base64 data URL is stored in Firestore)
      const professorRef = doc(db, "professors", professor.id)
      await updateDoc(professorRef, {
        imageUrl: "",
        profilePictureUrl: "", // Also clear for backward compatibility
      })

      // Update local state
      setProfessor({
        ...professor,
        imageUrl: undefined,
        profilePictureUrl: undefined,
      })

      console.log("[v0] Profile picture deleted successfully")
    } catch (error) {
      console.error("[v0] Error deleting profile picture:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        professor,
        loading: loading || initializing,
        initializing,
        signIn,
        logout,
        updateProfessorInfo,
        updatePassword,
        uploadProfilePicture,
        deleteProfilePicture,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
