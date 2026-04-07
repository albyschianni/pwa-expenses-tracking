<template>
  <div>
    <!-- Chip range attivo -->
    <button
      @click="open = !open"
      class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 active:bg-gray-700 transition-colors w-full"
    >
      <svg class="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span class="text-sm font-medium text-white flex-1 text-left">{{ rangeLabel }}</span>
      <svg class="w-4 h-4 text-gray-400 shrink-0 transition-transform" :class="open ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Picker a scomparsa -->
    <Transition name="expand">
      <div v-if="open" class="mt-2 bg-gray-800 rounded-xl p-4 space-y-3">
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <label class="text-gray-400 text-xs mb-1 block">Da</label>
            <input
              type="date"
              :value="start"
              @change="onStartChange"
              class="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div class="flex-1">
            <label class="text-gray-400 text-xs mb-1 block">A</label>
            <input
              type="date"
              :value="end"
              @change="onEndChange"
              class="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>

        <!-- Shortcut buttons -->
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="sc in shortcuts"
            :key="sc.label"
            @click="applyShortcut(sc)"
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            :class="isActiveShortcut(sc) ? 'bg-teal-400/20 text-teal-400' : 'bg-gray-700 text-gray-400 active:bg-gray-600'"
          >
            {{ sc.label }}
          </button>
        </div>

        <button @click="open = false" class="w-full py-2 text-teal-400 text-sm font-medium">
          Applica
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ start: string; end: string }>()
const emit  = defineEmits<{
  'update:start': [value: string]
  'update:end':   [value: string]
}>()

const open = ref(false)

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

interface Shortcut { label: string; start: string; end: string }

const shortcuts: Shortcut[] = [
  {
    label: `Anno ${currentYear}`,
    start: `${currentYear}-01-01`,
    end:   `${currentYear}-12-31`,
  },
  {
    label: `Anno ${currentYear - 1}`,
    start: `${currentYear - 1}-01-01`,
    end:   `${currentYear - 1}-12-31`,
  },
  {
    label: 'Ultimi 3 mesi',
    start: (() => {
      const d = new Date()
      d.setMonth(d.getMonth() - 3)
      return d.toISOString().split('T')[0]!
    })(),
    end: new Date().toISOString().split('T')[0]!,
  },
  {
    label: `${monthName(currentMonth)} ${currentYear}`,
    start: `${currentYear}-${pad(currentMonth)}-01`,
    end:   lastDayOf(currentYear, currentMonth),
  },
]

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleDateString('it-IT', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

function pad(n: number): string { return String(n).padStart(2, '0') }

function lastDayOf(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().split('T')[0]!
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

const rangeLabel = computed(() => `${formatDisplay(props.start)} – ${formatDisplay(props.end)}`)

function onStartChange(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (val) emit('update:start', val)
}

function onEndChange(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (val) emit('update:end', val)
}

function applyShortcut(sc: Shortcut) {
  emit('update:start', sc.start)
  emit('update:end',   sc.end)
}

function isActiveShortcut(sc: Shortcut): boolean {
  return props.start === sc.start && props.end === sc.end
}
</script>

<style scoped>
.expand-enter-active, .expand-leave-active { transition: all 0.2s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to, .expand-leave-from { max-height: 400px; }
</style>
