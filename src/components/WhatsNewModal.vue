<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="showWhatsNew"
        class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
      />
    </Transition>

    <!-- Bottom Sheet -->
    <Transition name="slide-up">
      <div
        v-if="showWhatsNew"
        class="fixed inset-x-0 bottom-0 z-[70] bg-gray-800 rounded-t-3xl max-h-[75vh] flex flex-col"
      >
        <div class="p-6 pb-0">
          <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
          <div class="text-center mb-4">
            <p class="text-teal-400 text-sm font-semibold mb-1">Aggiornamento</p>
            <h3 class="text-white text-xl font-bold">Novità</h3>
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-6 pb-6" style="-webkit-overflow-scrolling: touch; overscroll-behavior: contain;">
          <div
            v-for="entry in changelogEntries"
            :key="entry.version"
            class="mb-6 last:mb-0"
          >
            <div class="flex items-center gap-2 mb-3">
              <span class="text-teal-400 text-sm font-bold">v{{ entry.version }}</span>
              <span class="text-gray-500 text-xs">{{ formatDate(entry.date) }}</span>
            </div>
            <p class="text-white font-semibold text-base mb-3">{{ entry.title }}</p>
            <div class="space-y-2">
              <div
                v-for="(h, i) in entry.highlights"
                :key="i"
                class="flex items-start gap-3 bg-gray-700/50 rounded-xl p-3"
              >
                <span class="text-xl shrink-0">{{ h.icon }}</span>
                <p class="text-gray-200 text-sm">{{ h.text }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="px-6 pb-8 pt-2">
          <button
            @click="dismiss"
            class="w-full py-3.5 bg-teal-400 text-gray-900 rounded-xl font-bold text-base active:bg-teal-500 transition-colors"
          >
            Ho capito
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useWhatsNew } from '../composables/useWhatsNew'

const { showWhatsNew, changelogEntries, dismiss } = useWhatsNew()

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}
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

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
