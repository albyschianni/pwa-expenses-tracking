<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="open"
        @click="$emit('close')"
        class="fixed inset-0 bg-black/50 z-50"
      />
    </Transition>

    <!-- Sheet -->
    <Transition name="slide-up">
      <div
        v-if="open"
        class="fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl z-50 pb-8"
      >
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-4">
          <div class="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        <!-- Actions -->
        <div class="px-4 space-y-2">
          <!-- Expense -->
          <button
            @click="handleAction('expense')"
            class="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-700 active:bg-gray-600 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <span class="text-white font-medium">Nuova spesa</span>
          </button>

          <!-- Income -->
          <button
            @click="handleAction('income')"
            class="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-700 active:bg-gray-600 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <span class="text-white font-medium">Nuova entrata</span>
          </button>

          <!-- Transfer -->
          <button
            @click="handleAction('transfer')"
            class="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-700 active:bg-gray-600 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <span class="text-white font-medium">Trasferimento</span>
          </button>
        </div>

        <!-- Cancel -->
        <div class="px-4 mt-4">
          <button
            @click="$emit('close')"
            class="w-full p-4 rounded-xl bg-gray-700 text-gray-400 font-medium active:bg-gray-600 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  open: Boolean
})

const emit = defineEmits(['close', 'select'])

function handleAction(actionId) {
  emit('select', actionId)
  emit('close')
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
