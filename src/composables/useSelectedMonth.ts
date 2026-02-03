import { ref, computed } from 'vue'

// Shared reactive state (singleton pattern)
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth()) // 0-indexed (0 = January)

export function useSelectedMonth() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const displayMonth = computed(() => monthNames[selectedMonth.value])

  const displayMonthYear = computed(() => {
    const currentYear = new Date().getFullYear()
    if (selectedYear.value === currentYear) {
      return monthNames[selectedMonth.value]
    }
    return `${monthNames[selectedMonth.value]} ${selectedYear.value}`
  })

  // For backend queries: returns "YYYY-MM" format
  const monthKey = computed(() => {
    const month = String(selectedMonth.value + 1).padStart(2, '0')
    return `${selectedYear.value}-${month}`
  })

  function setMonth(year: number, month: number) {
    selectedYear.value = year
    selectedMonth.value = month
  }

  function goToPreviousMonth() {
    if (selectedMonth.value === 0) {
      selectedMonth.value = 11
      selectedYear.value--
    } else {
      selectedMonth.value--
    }
  }

  function goToNextMonth() {
    if (selectedMonth.value === 11) {
      selectedMonth.value = 0
      selectedYear.value++
    } else {
      selectedMonth.value++
    }
  }

  return {
    selectedYear,
    selectedMonth,
    displayMonth,
    displayMonthYear,
    monthKey,
    monthNames,
    setMonth,
    goToPreviousMonth,
    goToNextMonth,
  }
}
