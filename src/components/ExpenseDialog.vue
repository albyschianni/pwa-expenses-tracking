<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="open"
        @click="handleCancel"
        class="fixed inset-0 bg-black/60 z-50"
      />
    </Transition>

    <!-- Dialog -->
    <Transition name="slide-up">
      <div
        v-if="open"
        class="fixed inset-x-4 top-20 bottom-24 bg-gray-800 rounded-2xl z-50 flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <button
            @click="handleCancel"
            class="text-gray-400 font-medium"
          >
            Annulla
          </button>
          <h2 class="text-white font-semibold text-lg">
            {{ isEditing ? 'Modifica Spesa' : 'Nuova Spesa' }}
          </h2>
          <button
            @click="handleSave"
            :disabled="!isValid"
            class="text-teal-400 font-semibold disabled:opacity-40"
          >
            Salva
          </button>
        </div>

        <!-- Form -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <!-- Amount -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Importo</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">€</span>
              <input
                ref="amountInput"
                v-model="form.amount"
                type="number"
                inputmode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full bg-gray-700 text-white text-3xl font-bold rounded-xl py-4 pl-10 pr-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Descrizione</label>
            <input
              v-model="form.description"
              type="text"
              placeholder="Es: Cena al ristorante"
              class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <!-- Date -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Data</label>
            <input
              v-model="form.date"
              type="date"
              class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <!-- Category -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Categoria</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="cat in CATEGORIES"
                :key="cat.id"
                @click="form.category = cat.id"
                class="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                :class="[
                  form.category === cat.id
                    ? 'bg-teal-400/20 ring-2 ring-teal-400'
                    : 'bg-gray-700'
                ]"
              >
                <span class="text-2xl">{{ cat.icon }}</span>
                <span class="text-xs text-gray-300 text-center leading-tight">{{ cat.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { CATEGORIES } from '../composables/useExpenses'

const props = defineProps({
  open: Boolean,
  expense: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

const amountInput = ref(null)

// Form state
const form = reactive({
  description: '',
  date: '',
  amount: '',
  category: 'other'
})

// Check if we're editing an existing expense
const isEditing = computed(() => props.expense !== null)

// Form validation
const isValid = computed(() => {
  return (
    form.description.trim() !== '' &&
    form.date !== '' &&
    form.amount !== '' &&
    parseFloat(form.amount) > 0 &&
    form.category !== ''
  )
})

// Reset form when dialog opens/closes or expense changes
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.expense) {
      // Editing mode: populate form with expense data
      form.description = props.expense.description
      form.date = props.expense.date
      form.amount = props.expense.amount.toString()
      form.category = props.expense.category
    } else {
      // Create mode: reset form with defaults
      form.description = ''
      form.date = new Date().toISOString().split('T')[0] // Today's date
      form.amount = ''
      form.category = 'other'
    }
    // Focus amount input after animation
    nextTick(() => {
      setTimeout(() => amountInput.value?.focus(), 300)
    })
  }
})

function handleCancel() {
  emit('close')
}

function handleSave() {
  if (!isValid.value) return

  emit('save', {
    description: form.description.trim(),
    date: form.date,
    amount: parseFloat(form.amount),
    category: form.category
  })
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
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Fix date input styling for dark mode */
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
