<template>
  <button
    @click="$emit('click')"
    class="fixed right-4 bottom-20 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-40"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-7 h-7 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  </button>
</template>

<script setup>
defineEmits(['click'])
</script>
