<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm"
        @click="$emit('close')"
      />
    </Transition>

    <!-- Modal Content -->
    <Transition name="zoom">
      <div
        v-if="open"
        class="fixed inset-0 z-[101] flex flex-col items-center justify-center pointer-events-none"
      >
        <!-- Close Button -->
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition pointer-events-auto"
        >
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Avatar Image -->
        <div class="relative pointer-events-auto">
          <img
            :src="displayAvatarUrl"
            alt="Profile"
            class="w-72 h-72 rounded-full object-cover border-4 border-white/20 shadow-2xl"
          />

          <!-- Loading overlay -->
          <div
            v-if="loading"
            class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
          >
            <svg class="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </div>

        <!-- Error message -->
        <p v-if="error" class="mt-4 text-red-400 text-sm pointer-events-auto">
          {{ error }}
        </p>

        <!-- Bottom Actions -->
        <div class="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 pointer-events-auto px-6">
          <!-- Change Photo Button -->
          <button
            @click="triggerFileInput"
            :disabled="loading"
            class="w-full max-w-xs py-3 px-6 bg-teal-500 text-white font-semibold rounded-xl active:scale-[0.98] transition disabled:opacity-50"
          >
            {{ hasAvatar ? 'Cambia foto' : 'Aggiungi foto' }}
          </button>

          <!-- Delete Button (only if has avatar) -->
          <button
            v-if="hasAvatar"
            @click="handleDelete"
            :disabled="loading"
            class="w-full max-w-xs py-3 px-6 bg-transparent text-red-400 font-medium rounded-xl active:opacity-70 transition disabled:opacity-50"
          >
            Rimuovi foto
          </button>
        </div>

        <!-- Hidden file input -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="handleFileChange"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAvatar } from '../composables/useAvatar'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { displayAvatarUrl, hasAvatar, loading, error, uploadAvatar, deleteAvatar, clearError } = useAvatar()

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerFileInput() {
  clearError()
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  const success = await uploadAvatar(file)

  // Reset input so same file can be selected again
  input.value = ''

  if (success) {
    // Optionally close after successful upload
    // emit('close')
  }
}

async function handleDelete() {
  if (!confirm('Rimuovere la foto profilo?')) return

  await deleteAvatar()
}
</script>

<style scoped>
/* Fade transition for backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Zoom transition for content */
.zoom-enter-active,
.zoom-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
