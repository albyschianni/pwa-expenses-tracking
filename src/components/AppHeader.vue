<template>
  <header class="fixed top-0 left-0 w-full h-16 px-5 pt-1 flex items-center justify-between bg-gray-900 z-50">

    <!-- Left: avatar -->
    <img
      src="https://i.pravatar.cc/100"
      alt="profile"
      class="w-11 h-11 rounded-full border-2 ml-1 mt-1"
    />

    <!-- Center: month selector -->
    <button
      @click="$emit('open-month-picker')"
      class="flex items-center gap-2 text-white text-lg font-semibold active:opacity-70 transition-opacity"
    >
      <span>{{ displayMonthYear }}</span>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

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

<script setup>
import { useSelectedMonth } from '../composables/useSelectedMonth'

defineEmits(['open-month-picker', 'open-menu'])

const { displayMonthYear } = useSelectedMonth()
</script>
