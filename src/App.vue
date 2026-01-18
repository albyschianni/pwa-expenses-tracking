<script setup lang="ts">

</script>

<template>
  <div class="bg-gray-100 dark:bg-gray-900 text-black dark:text-white min-h-screen flex items-center justify-center">
    <h1 class="text-3xl font-bold">Tailwind + Dark Mode Funziona! 🎉</h1>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
