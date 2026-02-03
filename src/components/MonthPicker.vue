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
        <div class="flex justify-center pt-3 pb-2">
          <div class="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        <!-- Year selector -->
        <div class="flex items-center justify-center gap-6 py-4">
          <button
            @click="changeYear(-1)"
            class="w-10 h-10 flex items-center justify-center text-gray-400 active:text-white"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="text-xl font-semibold text-white min-w-[80px] text-center">
            {{ tempYear }}
          </span>
          <button
            @click="changeYear(1)"
            class="w-10 h-10 flex items-center justify-center text-gray-400 active:text-white"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Month grid -->
        <div class="grid grid-cols-3 gap-2 px-4 py-2">
          <button
            v-for="(month, index) in monthNames"
            :key="month"
            @click="selectMonth(index)"
            class="py-3 px-2 rounded-xl text-center font-medium transition-colors"
            :class="[
              isSelected(index)
                ? 'bg-teal-400 text-gray-900'
                : 'text-gray-300 active:bg-gray-700'
            ]"
          >
            {{ month.slice(0, 3) }}
          </button>
        </div>

        <!-- Confirm button -->
        <div class="px-4 mt-4">
          <button
            @click="confirm"
            class="w-full py-4 rounded-xl bg-teal-400 text-gray-900 font-semibold active:bg-teal-500 transition-colors"
          >
            Conferma
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSelectedMonth } from '../composables/useSelectedMonth'

const props = defineProps({
  open: Boolean
})

const emit = defineEmits(['close'])

const { selectedYear, selectedMonth, monthNames, setMonth } = useSelectedMonth()

// Temporary state while picker is open
const tempYear = ref(selectedYear.value)
const tempMonth = ref(selectedMonth.value)

// Reset temp values when picker opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    tempYear.value = selectedYear.value
    tempMonth.value = selectedMonth.value
  }
})

function changeYear(delta) {
  tempYear.value += delta
}

function selectMonth(index) {
  tempMonth.value = index
}

function isSelected(index) {
  return tempMonth.value === index
}

function confirm() {
  setMonth(tempYear.value, tempMonth.value)
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
