<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        @click="$emit('close')"
      />
    </Transition>

    <Transition name="slide-up">
      <div
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 bg-gray-800 rounded-t-3xl p-6 pb-8"
      >
        <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />

        <!-- Icon -->
        <div class="w-16 h-16 rounded-full bg-teal-400/20 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        <h3 class="text-white text-lg font-semibold text-center mb-2">
          Attiva le notifiche
        </h3>
        <p class="text-gray-400 text-sm text-center mb-6">
          Per ricevere inviti ai gruppi condivisi anche quando l'app è chiusa, attiva le notifiche push.
        </p>

        <div class="flex gap-3">
          <button
            @click="$emit('close')"
            class="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium active:bg-gray-600 transition-colors"
          >
            Non ora
          </button>
          <button
            @click="handleActivate"
            class="flex-1 py-3 bg-teal-400 text-gray-900 rounded-xl font-semibold active:bg-teal-500 transition-colors"
          >
            Attiva
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { usePushNotifications } from '../composables/usePushNotifications'

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'granted'): void
}>()

const { requestPermission } = usePushNotifications()

async function handleActivate() {
  const granted = await requestPermission()
  if (granted) {
    emit('granted')
  }
  emit('close')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
