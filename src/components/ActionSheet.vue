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
        class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl z-50 pb-8"
      >
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-4">
          <div class="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <!-- Actions -->
        <div class="px-4 space-y-2">
          <button
            v-for="action in actions"
            :key="action.id"
            @click="handleAction(action)"
            class="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors"
          >
            <span class="text-2xl">{{ action.icon }}</span>
            <span class="text-gray-900 dark:text-gray-100 font-medium">{{ action.label }}</span>
          </button>
        </div>

        <!-- Cancel -->
        <div class="px-4 mt-4">
          <button
            @click="$emit('close')"
            class="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
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

const actions = [
  { id: 'expense', icon: '💸', label: 'Nuova spesa' },
  { id: 'income', icon: '💰', label: 'Nuova entrata' },
  { id: 'transfer', icon: '🔄', label: 'Trasferimento' },
]

function handleAction(action) {
  emit('select', action.id)
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
