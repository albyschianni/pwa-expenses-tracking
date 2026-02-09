import { ref, computed } from 'vue'

export type CurrencyCode = 'EUR' | 'USD' | 'GBP'

interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  name: string
  locale: string
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'it-IT' },
  USD: { code: 'USD', symbol: '$', name: 'Dollaro USA', locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£', name: 'Sterlina', locale: 'en-GB' },
}

// Fallback rates (EUR as base)
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
}

const STORAGE_KEY = 'expense-tracker-currency'
const RATES_STORAGE_KEY = 'expense-tracker-rates'
const RATES_CACHE_DURATION = 1000 * 60 * 60 * 6 // 6 hours

// Load initial value from localStorage
function loadCurrency(): CurrencyCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in CURRENCIES) {
      return stored as CurrencyCode
    }
  } catch (e) {
    console.warn('Failed to load currency preference:', e)
  }
  return 'EUR'
}

interface CachedRates {
  rates: Record<CurrencyCode, number>
  timestamp: number
}

function loadCachedRates(): Record<CurrencyCode, number> | null {
  try {
    const stored = localStorage.getItem(RATES_STORAGE_KEY)
    if (stored) {
      const cached: CachedRates = JSON.parse(stored)
      if (Date.now() - cached.timestamp < RATES_CACHE_DURATION) {
        return cached.rates
      }
    }
  } catch (e) {
    // ignore
  }
  return null
}

function saveCachedRates(rates: Record<CurrencyCode, number>) {
  try {
    const cached: CachedRates = { rates, timestamp: Date.now() }
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(cached))
  } catch (e) {
    // ignore
  }
}

// Shared reactive state
const currentCurrency = ref<CurrencyCode>(loadCurrency())
const exchangeRates = ref<Record<CurrencyCode, number>>(loadCachedRates() || { ...FALLBACK_RATES })
const ratesLoaded = ref(false)

// Fetch live rates from free API (EUR base)
async function fetchExchangeRates() {
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rates: Record<CurrencyCode, number> = {
      EUR: 1,
      USD: data.rates.USD,
      GBP: data.rates.GBP,
    }
    exchangeRates.value = rates
    saveCachedRates(rates)
    ratesLoaded.value = true
  } catch (e) {
    console.warn('Failed to fetch exchange rates, using fallback:', e)
    if (!loadCachedRates()) {
      exchangeRates.value = { ...FALLBACK_RATES }
    }
    ratesLoaded.value = true
  }
}

// Fetch rates on load
fetchExchangeRates()

export function useCurrency() {
  const currency = computed(() => CURRENCIES[currentCurrency.value])
  const symbol = computed(() => currency.value.symbol)
  const code = computed(() => currency.value.code)
  const rate = computed(() => exchangeRates.value[currentCurrency.value])

  function setCurrency(newCurrency: CurrencyCode) {
    currentCurrency.value = newCurrency
    try {
      localStorage.setItem(STORAGE_KEY, newCurrency)
    } catch (e) {
      console.warn('Failed to save currency preference:', e)
    }
  }

  // Convert amount from EUR (base) to selected currency
  function convert(amount: number): number {
    return amount * exchangeRates.value[currentCurrency.value]
  }

  function formatAmount(amount: number, showSymbol = true): string {
    const converted = convert(amount)
    const formatted = converted.toLocaleString(currency.value.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return showSymbol ? `${currency.value.symbol}${formatted}` : formatted
  }

  // Get all available currencies for picker
  const availableCurrencies = Object.values(CURRENCIES)

  return {
    currentCurrency,
    currency,
    symbol,
    code,
    rate,
    setCurrency,
    convert,
    formatAmount,
    availableCurrencies,
    ratesLoaded,
  }
}
