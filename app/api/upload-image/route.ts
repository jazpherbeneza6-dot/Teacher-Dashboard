import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    // Better error handling
    if (!file) {
      console.error('[Upload] No file received in formData')
      return NextResponse.json(
        { error: 'No file provided. Please select an image file.' },
        { status: 400 }
      )
    }

    // Check if file is actually a File object
    if (!(file instanceof File)) {
      console.error('[Upload] Invalid file type received:', typeof file)
      return NextResponse.json(
        { error: 'Invalid file format. Please select a valid image file.' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 500KB to ensure it fits in Firestore after base64 encoding)
    // Base64 encoding increases size by ~33%, so 500KB becomes ~667KB base64
    // Firestore has a 1MB limit per field, so we stay well under that
    const maxSize = 500 * 1024 // 500KB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Image is too large. Maximum size is ${Math.round(maxSize / 1024)}KB. Please compress or resize your image.` },
        { status: 400 }
      )
    }

    // Convert file to base64 data URL
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Log the size for debugging
    console.log(`[Upload] Image uploaded: ${file.name}, Original size: ${file.size} bytes, Base64 size: ${base64.length} bytes`)

    // Return the data URL directly (will be stored in Firestore)
    return NextResponse.json({
      url: dataUrl,
      imageUrl: dataUrl,
      success: true,
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
