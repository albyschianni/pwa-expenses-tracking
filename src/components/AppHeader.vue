<template>
  <header class="fixed top-0 left-0 w-full h-16 px-5 pt-1 flex items-center justify-between bg-gray-900 z-50">

    <!-- Left: avatar (clickable) -->
    <button
      @click="$emit('open-avatar')"
      class="w-11 h-11 rounded-full border-2 border-gray-600 ml-1 mt-1 overflow-hidden active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
      <img
        :src="displayAvatarUrl"
        alt="profile"
        class="w-full h-full object-cover"
      />
    </button>

    <!-- Center: month selector (hidden when a sub-page overrides date control) -->
    <button
      v-if="!hideMonthPicker"
      @click="$emit('open-month-picker')"
      class="flex items-center gap-2 text-white text-lg font-semibold active:opacity-70 transition-opacity"
    >
      <span>{{ displayMonthYear }}</span>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div v-else />

    <!-- Right: hamburger menu -->
    <button
      @click="$emit('open-menu')"
      class="w-10 h-10 flex items-center justify-center text-gray-400 active:text-white transition-colors"
    >
      <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

  </header>
</template>

<script setup lang="ts">
import { useSelectedMonth } from '../composables/useSelectedMonth'
import { useAvatar } from '../composables/useAvatar'

defineProps<{ hideMonthPicker?: boolean }>()
defineEmits(['open-month-picker', 'open-menu', 'open-avatar'])

const { displayMonthYear } = useSelectedMonth()
const { displayAvatarUrl } = useAvatar()
</script>
