import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const BUCKET_NAME = 'avatars'
const MAX_INPUT_SIZE = 50 * 1024 * 1024 // 50MB max input (will be compressed)
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

// Shared reactive state
const avatarUrl = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Initialize on auth change
let initialized = false

async function initAvatar() {
  if (initialized) return
  initialized = true

  const { user } = useAuth()

  // Watch for auth changes and fetch avatar
  watch(
    () => user.value,
    async (newUser) => {
      if (newUser) {
        await fetchAvatar(newUser.id)
      } else {
        avatarUrl.value = null
      }
    },
    { immediate: true }
  )
}

initAvatar()

async function fetchAvatar(userId: string) {
  try {
    // Get public URL for the user's avatar
    const fileName = `${userId}.jpg`

    // Check if file exists by listing
    const { data: files } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { search: userId })

    const hasAvatar = files?.some(f => f.name.startsWith(userId))

    if (hasAvatar) {
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName)

      // Add cache buster to force refresh
      avatarUrl.value = `${data.publicUrl}?t=${Date.now()}`
    } else {
      avatarUrl.value = null
    }
  } catch (e) {
    console.error('Failed to fetch avatar:', e)
    avatarUrl.value = null
  }
}

export function useAvatar() {
  const { user } = useAuth()

  const hasAvatar = computed(() => !!avatarUrl.value)

  // Default avatar with user initials or generic
  const defaultAvatarUrl = computed(() => {
    const email = user.value?.email || ''
    const initial = email.charAt(0).toUpperCase() || '?'
    // SVG data URL as fallback
    return `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect fill="#374151" width="100" height="100"/>
        <text x="50" y="55" text-anchor="middle" dy=".1em" fill="#9CA3AF" font-family="system-ui" font-size="40" font-weight="600">${initial}</text>
      </svg>`
    )}`
  })

  const displayAvatarUrl = computed(() => avatarUrl.value || defaultAvatarUrl.value)

  async function uploadAvatar(file: File): Promise<boolean> {
    if (!user.value) {
      error.value = 'Not authenticated'
      return false
    }

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      error.value = 'Please upload a JPEG, PNG, or WebP image'
      return false
    }

    // Validate file size (raw input - will be compressed later)
    if (file.size > MAX_INPUT_SIZE) {
      error.value = 'Image is too large'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const fileName = `${user.value.id}.jpg`

      // Resize image before upload
      const resizedBlob = await resizeImage(file, 400, 400)

      // Upload to Supabase Storage (upsert)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, resizedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        })

      if (uploadError) throw uploadError

      // Refresh the avatar URL
      await fetchAvatar(user.value.id)

      return true
    } catch (e: any) {
      console.error('Failed to upload avatar:', e)
      error.value = e.message || 'Upload failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteAvatar(): Promise<boolean> {
    if (!user.value) {
      error.value = 'Not authenticated'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const fileName = `${user.value.id}.jpg`

      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName])

      if (deleteError) throw deleteError

      avatarUrl.value = null
      return true
    } catch (e: any) {
      console.error('Failed to delete avatar:', e)
      error.value = e.message || 'Delete failed'
      return false
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    avatarUrl,
    displayAvatarUrl,
    hasAvatar,
    loading,
    error,
    uploadAvatar,
    deleteAvatar,
    clearError
  }
}

// Utility: resize image to max dimensions while maintaining aspect ratio
async function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      let { width, height } = img

      // Calculate new dimensions maintaining aspect ratio
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

      // For avatars, crop to square from center
      const srcSize = Math.min(img.width, img.height)

      canvas.width = maxWidth
      canvas.height = maxHeight

      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Draw cropped and resized image
      ctx.drawImage(
        img,
        (img.width - srcSize) / 2,
        (img.height - srcSize) / 2,
        srcSize,
        srcSize,
        0,
        0,
        maxWidth,
        maxHeight
      )

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Could not create blob'))
          }
        },
        'image/jpeg',
        0.85
      )
    }

    img.onerror = () => reject(new Error('Could not load image'))
    img.src = URL.createObjectURL(file)
  })
}
