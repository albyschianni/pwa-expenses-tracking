<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="open"
        @click="$emit('close')"
        class="fixed inset-0 bg-black/60 z-50"
      />
    </Transition>

    <!-- Drawer -->
    <Transition name="slide-right">
      <div
        v-if="open"
        class="fixed top-0 right-0 bottom-0 w-72 bg-gray-800 z-50 flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <h2 class="text-white font-semibold text-lg">Menu</h2>
          <button
            @click="$emit('close')"
            class="w-10 h-10 flex items-center justify-center text-gray-400 active:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 p-4 space-y-2">
          <button
            @click="$emit('navigate', 'wallets'); $emit('close')"
            class="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-700/50 active:bg-gray-700 transition-colors text-left"
          >
            <svg class="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p class="text-white font-medium">Conti Condivisi</p>
              <p class="text-gray-400 text-xs">Gestisci wallet condivisi</p>
            </div>
          </button>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-700">
          <p class="text-gray-500 text-xs text-center">Expense Tracker v{{ appVersion }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { APP_VERSION } from '../constants/version'

defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close', 'navigate'])

const appVersion = APP_VERSION
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
