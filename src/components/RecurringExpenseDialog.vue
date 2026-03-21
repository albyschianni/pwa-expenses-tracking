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
            {{ dialogTitle }}
          </h2>
          <button
            @click="handleSave"
            :disabled="!isValid"
            class="font-semibold disabled:opacity-40"
            :class="form.type === 'income' ? 'text-emerald-400' : 'text-teal-400'"
          >
            Salva
          </button>
        </div>

        <!-- Form -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6" style="overscroll-behavior: contain; -webkit-overflow-scrolling: touch;">

          <!-- Type Toggle -->
          <div class="flex bg-gray-700 rounded-xl p-1">
            <button
              @click="setType('expense')"
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              :class="form.type === 'expense'
                ? 'bg-gray-900 text-red-400 shadow'
                : 'text-gray-400'"
            >
              Spesa
            </button>
            <button
              @click="setType('income')"
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              :class="form.type === 'income'
                ? 'bg-gray-900 text-emerald-400 shadow'
                : 'text-gray-400'"
            >
              Entrata
            </button>
          </div>

          <!-- Amount -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Importo</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">{{ symbol }}</span>
              <input
                ref="amountInput"
                v-model="form.amount"
                type="number"
                inputmode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full bg-gray-700 text-3xl font-bold rounded-xl py-4 pl-10 pr-4 placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors"
                :class="form.type === 'income'
                  ? 'text-emerald-400 focus:ring-emerald-400'
                  : 'text-white focus:ring-teal-400'"
              />
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Descrizione</label>
            <input
              v-model="form.description"
              type="text"
              :placeholder="form.type === 'income' ? 'Es: Stipendio' : 'Es: Abbonamento Netflix'"
              class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <!-- Day of Month -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Giorno del mese</label>
            <input
              v-model="form.dayOfMonth"
              type="number"
              inputmode="numeric"
              min="1"
              max="28"
              placeholder="1"
              class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <p class="text-gray-500 text-xs mt-1">
              Da 1 a 28. La transazione verrà aggiunta automaticamente questo giorno ogni mese.
            </p>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-gray-400 text-sm mb-2">Categoria</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="cat in activeCategories"
                :key="cat.id"
                @click="form.category = cat.id"
                class="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                :class="[
                  form.category === cat.id
                    ? (form.type === 'income' ? 'bg-emerald-400/20 ring-2 ring-emerald-400' : 'bg-teal-400/20 ring-2 ring-teal-400')
                    : 'bg-gray-700'
                ]"
              >
                <span class="text-2xl">{{ cat.icon }}</span>
                <span class="text-xs text-gray-300 text-center leading-tight">{{ cat.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Delete Button (only when editing) -->
        <div v-if="isEditing" class="p-4 border-t border-gray-700">
          <button
            @click="handleDelete"
            class="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-700 text-red-400 font-semibold active:bg-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Elimina ricorrenza
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useCategories } from '../composables/useCategories'
import type { RecurringExpense } from '../composables/useRecurringExpenses'
import { useCurrency } from '../composables/useCurrency'

const { expenseCategories, incomeCategories } = useCategories()
const { symbol } = useCurrency()

const props = defineProps<{
  open: boolean
  recurringExpense: RecurringExpense | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: { description: string; amount: number; category: string; dayOfMonth: number; type: 'expense' | 'income' }): void
  (e: 'delete', id: string): void
}>()

const amountInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  description: '',
  amount:      '',
  category:    '',
  dayOfMonth:  '',
  type:        'expense' as 'expense' | 'income',
})

const activeCategories = computed(() =>
  form.type === 'income' ? incomeCategories.value : expenseCategories.value
)

const isEditing = computed(() => props.recurringExpense !== null)

const dialogTitle = computed(() => {
  if (isEditing.value) {
    return form.type === 'income' ? 'Modifica Entrata Ricorrente' : 'Modifica Spesa Ricorrente'
  }
  return form.type === 'income' ? 'Nuova Entrata Ricorrente' : 'Nuova Spesa Ricorrente'
})

const isValid = computed(() => {
  const day = parseInt(form.dayOfMonth)
  return (
    form.description.trim() !== '' &&
    form.amount !== '' &&
    parseFloat(form.amount) > 0 &&
    form.category !== '' &&
    !isNaN(day) && day >= 1 && day <= 28
  )
})

function setType(type: 'expense' | 'income') {
  if (form.type === type) return
  form.type = type
  const cats = type === 'income' ? incomeCategories.value : expenseCategories.value
  form.category = cats[0]?.id || ''
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.recurringExpense) {
      form.description = props.recurringExpense.description
      form.amount      = props.recurringExpense.amount.toString()
      form.category    = props.recurringExpense.category
      form.dayOfMonth  = props.recurringExpense.dayOfMonth.toString()
      form.type        = props.recurringExpense.type ?? 'expense'
    } else {
      form.description = ''
      form.amount      = ''
      form.type        = 'expense'
      form.category    = expenseCategories.value[0]?.id || 'Altro'
      form.dayOfMonth  = '1'
    }
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
    amount:      parseFloat(form.amount),
    category:    form.category,
    dayOfMonth:  parseInt(form.dayOfMonth),
    type:        form.type,
  })
}

function handleDelete() {
  if (props.recurringExpense) {
    emit('delete', props.recurringExpense.id)
  }
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
</style>
