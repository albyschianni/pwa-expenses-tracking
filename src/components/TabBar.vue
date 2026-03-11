<template>
  <nav class="fixed bottom-0 left-0 w-full z-50" style="height: 80px;">
    <!-- SVG background with notch cutout -->
    <svg
      class="absolute inset-0 w-full h-full drop-shadow-[0_-4px_12px_rgba(0,0,0,0.4)]"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        :d="notchPath"
        fill="#1f2937"
      />
    </svg>

    <!-- FAB button (centered in the notch) -->
    <button
      @click="$emit('fab-click')"
      class="absolute left-1/2 -translate-x-1/2 -top-4 w-14 h-14 bg-teal-400 rounded-full flex items-center justify-center shadow-lg shadow-teal-400/30 active:scale-95 transition-transform z-20"
    >
      <svg class="w-7 h-7 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <!-- Tab buttons -->
    <div class="relative grid grid-cols-5 h-full items-start pt-3 z-10">
      <!-- Home tab -->
      <button
        @click="$emit('navigate', 'home')"
        class="flex items-center justify-center py-2 transition-colors"
        :class="activeTab === 'home' ? 'text-teal-400' : 'text-gray-400'"
      >
        <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>

      <!-- Graphic tab -->
      <button
        @click="$emit('navigate', 'graphic')"
        class="flex items-center justify-center py-2 transition-colors"
        :class="activeTab === 'graphic' ? 'text-teal-400' : 'text-gray-400'"
      >
        <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
        </svg>
      </button>

      <!-- Center spacer (FAB is absolutely positioned above) -->
      <div />

      <!-- Recurring tab -->
      <button
        @click="$emit('navigate', 'recurring')"
        class="flex items-center justify-center py-2 transition-colors"
        :class="activeTab === 'recurring' ? 'text-teal-400' : 'text-gray-400'"
      >
        <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </button>

      <!-- Settings tab -->
      <button
        @click="$emit('navigate', 'settings')"
        class="flex items-center justify-center py-2 transition-colors"
        :class="activeTab === 'settings' ? 'text-teal-400' : 'text-gray-400'"
      >
        <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

defineProps({
  activeTab: {
    type: String,
    default: 'home'
  }
})

defineEmits(['fab-click', 'navigate'])

// SVG path for the tab bar with a circular notch cutout in the center
// viewBox is 400x80. Width (r) and depth (d) are independent for fine-tuning.
const notchPath = computed(() => {
  const w = 400
  const h = 80
  const cx = w / 2        // center x
  const r = 40            // horizontal radius
  const d = 50            // depth of the notch (deeper)
  const curveW = 12       // width of the smooth curve transition

  return `
    M 0,0
    L ${cx - r - curveW},0
    C ${cx - r},0 ${cx - r},${d} ${cx},${d}
    C ${cx + r},${d} ${cx + r},0 ${cx + r + curveW},0
    L ${w},0
    L ${w},${h}
    L 0,${h}
    Z
  `
})
</script>
