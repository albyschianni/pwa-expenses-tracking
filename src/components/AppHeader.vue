<template>
  <header class="fixed top-0 left-0 w-full h-14 px-4 flex items-center justify-between bg-gray-900 z-50">
    <!-- Left: hamburger menu -->
    <button class="w-10 h-10 flex items-center justify-center text-gray-400">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Center: month selector -->
    <button
      @click="$emit('open-month-picker')"
      class="flex items-center gap-2 text-white font-semibold active:opacity-70 transition-opacity"
    >
      <span>{{ displayMonthYear }}</span>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Right: avatar -->
    <img
      src="https://i.pravatar.cc/100"
      alt="profile"
      class="w-9 h-9 rounded-full border-2 border-teal-400"
    />
  </header>
</template>

<script setup>
import { useSelectedMonth } from '../composables/useSelectedMonth'

defineEmits(['open-month-picker'])

const { displayMonthYear } = useSelectedMonth()
</script>
