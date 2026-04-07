<template>
  <div class="fixed inset-0 bg-gray-900 bg-opacity-95 z-[9999] flex flex-col items-center justify-center px-6">
    <!-- Icon -->
    <div class="mb-6">
      <svg class="w-24 h-24 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 9v2m0 4v2m0 -8a9 9 0 110 18 9 9 0 010 -18z"
        />
      </svg>
    </div>

    <!-- Title -->
    <h1 class="text-4xl font-bold text-white mb-4 text-center">
      App in Manutenzione
    </h1>

    <!-- Message -->
    <p class="text-lg text-gray-300 text-center mb-8 max-w-md leading-relaxed">
      Stiamo eseguendo alcuni aggiornamenti importanti. Torneremo presto con miglioramenti.
    </p>

    <!-- Loading indicator -->
    <div class="flex items-center gap-2 text-gray-400">
      <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>In manutenzione...</span>
    </div>

    <!-- Footer message -->
    <p class="text-sm text-gray-500 mt-12">
      Grazie per la pazienza
    </p>
  </div>
</template>

<script setup lang="ts">
// No logic needed - this is a static overlay
</script>

<style scoped>
/* Prevent any scroll on the body when overlay is visible */
:global(body) {
  overflow: hidden !important;
}
</style>
