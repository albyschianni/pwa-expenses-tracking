<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="open && expense"
        @click="$emit('close')"
        class="fixed inset-0 bg-black/60 z-50"
      />
    </Transition>

    <!-- Dialog -->
    <Transition name="slide-up">
      <div
        v-if="open && expense"
        class="fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl z-50 pb-8"
      >
        <!-- Handle -->
        <div class="flex justify-center pt-3 pb-2">
          <div class="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        <!-- Expense Details -->
        <div class="px-4 pt-2 pb-4">
          <!-- Icon and Amount -->
          <div class="flex items-center gap-4 mb-6">
            <div
              class="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
              :style="{ backgroundColor: expense.color }"
            >
              {{ expense.icon }}
            </div>
            <div class="flex-1">
              <p class="text-3xl font-bold text-white">
                €{{ expense.amount.toFixed(2) }}
              </p>
              <p class="text-gray-400 text-sm">{{ categoryLabel }}</p>
            </div>
          </div>

          <!-- Details -->
          <div class="space-y-4 mb-6">
            <div class="flex justify-between items-center py-3 border-b border-gray-700">
              <span class="text-gray-400">Descrizione</span>
              <span class="text-white font-medium">{{ expense.description }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-700">
              <span class="text-gray-400">Data</span>
              <span class="text-white font-medium">{{ formattedDate }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-gray-700">
              <span class="text-gray-400">Categoria</span>
              <span class="text-white font-medium flex items-center gap-2">
                <span>{{ expense.icon }}</span>
                {{ categoryLabel }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <button
              @click="handleEdit"
              class="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-teal-400 text-gray-900 font-semibold active:bg-teal-500 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifica
            </button>
            <button
              @click="confirmDelete"
              class="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gray-700 text-red-400 font-semibold active:bg-gray-600 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Elimina
            </button>
          </div>
        </div>

        <!-- Delete Confirmation Overlay -->
        <Transition name="fade">
          <div
            v-if="showDeleteConfirm"
            class="absolute inset-0 bg-gray-800 rounded-t-2xl flex flex-col items-center justify-center p-6"
          >
            <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p class="text-white text-lg font-semibold mb-2">Eliminare questa spesa?</p>
            <p class="text-gray-400 text-center mb-6">{{ expense.description }}</p>
            <div class="flex gap-3 w-full">
              <button
                @click="showDeleteConfirm = false"
                class="flex-1 p-4 rounded-xl bg-gray-700 text-white font-semibold active:bg-gray-600 transition-colors"
              >
                Annulla
              </button>
              <button
                @click="handleDelete"
                class="flex-1 p-4 rounded-xl bg-red-500 text-white font-semibold active:bg-red-600 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { CATEGORIES } from '../composables/useExpenses'

const props = defineProps({
  open: Boolean,
  expense: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'edit', 'delete'])

const showDeleteConfirm = ref(false)

// Reset delete confirmation when dialog closes
watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    showDeleteConfirm.value = false
  }
})

const categoryLabel = computed(() => {
  if (!props.expense) return ''
  const cat = CATEGORIES.find(c => c.id === props.expense.category)
  return cat?.label || 'Other'
})

const formattedDate = computed(() => {
  if (!props.expense) return ''
  const date = new Date(props.expense.date)
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

function handleEdit() {
  emit('edit', props.expense)
  emit('close')
}

function confirmDelete() {
  showDeleteConfirm.value = true
}

function handleDelete() {
  emit('delete', props.expense.id)
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
