# Audit Tecnico — PWA Expenses Tracking v2.2.0

> Generato: 2026-04-08  
> Scopo: analisi pre-migrazione Flutter + raccolta debito tecnico  
> Stato: [ ] = da fare, [x] = risolto

---

## Legenda priorità
- 🔴 **CRITICO** — bug in produzione o rischio sicurezza
- 🟠 **SERIO** — comportamento sbagliato o fragile
- ⚡ **PERFORMANCE** — bottleneck misurabile
- 🏗️ **ARCHITETTURA** — scala male o accoppiamento sbagliato
- 🔧 **QUALITÀ** — leggibilità, duplicazione, type safety

---

## Issues critici

### [x] CRIT-1: Anon key Supabase hardcodata nel sorgente
**File:** `src/lib/supabase.ts:4`  
**Problema:** La JWT anon key è hardcodata come fallback string. Finisce nel bundle produzione, non può essere ruotata senza deploy, viola il principio "no secrets in code".  
**Fix:**
```typescript
// Rimuovere il fallback hardcodato
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase env vars')
```

---

### [x] CRIT-2: `user_id` passato dal client al server in banking sync
**File:** `src/composables/useBanking.ts:311`  
**Problema:** `syncManual()` invia `user_id` nel request body. L'Edge Function dovrebbe derivarlo dal JWT in Authorization header, non fidarsi del body del client. Potenziale privilege escalation se la funzione non valida.  
**Fix:** Nell'Edge Function `banking-sync`, leggere `user_id` via `supabaseClient.auth.getUser()`, ignorare il valore nel body.

---

### [x] CRIT-3: Race condition in `deleteConnection` — primo delete senza error check
**File:** `src/composables/useBanking.ts:348-365`  
**Problema:** Se il delete su `bank_transactions` fallisce silenziosamente (nessun `if (err) throw`), si procede a cancellare `bank_connections` lasciando transazioni orfane nel DB.  
**Fix:**
```typescript
const { error: txErr } = await supabase.from('bank_transactions').delete().eq('connection_id', connectionId)
if (txErr) throw txErr  // aggiungere questa riga
```

---

### [x] CRIT-4: Singleton state `useBudgets` non si resetta al logout
**File:** `src/composables/useBudgets.ts`  
**Problema:** `loadedMonth` e `watcherInitialized` non vengono resettati al logout. Se due utenti diversi usano l'app nella stessa sessione browser (logout + login), `loadedMonth` rimane stale e i budget del nuovo utente non si caricano se è lo stesso mese.  
**Fix:** Aggiungere watcher su `isAuthenticated` che resetta `loadedMonth = null`.

---

### [x] CRIT-5: `deleteExpense` non gestisce bank transactions
**File:** `src/composables/useExpenses.ts:368-390`  
**Problema:** La funzione esegue sempre DELETE su `expenses`, mai su `bank_transactions`. Se si elimina una transazione bancaria, la query non trova righe (nessun errore), ma la transazione riappare al prossimo fetch.  
**Fix:**
```typescript
async function deleteExpense(id: string) {
  const existing = expenses.value.find(e => e.id === id)
  const table = existing?.source === 'bank' ? 'bank_transactions' : 'expenses'
  const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
  // ...
}
```

---

## Issues seri

### [x] SERIOUS-1: `scheduleMarkAllReviewed` è inaffidabile
**File:** `src/composables/useExpenses.ts:353-366`  
**Problema:** Usa `setTimeout` con 5 secondi. Se l'utente chiude l'app prima, la query non parte. I badge "NEW" riappaiono al refresh successivo.  
**Fix:** Usare `Page Visibility API` (`visibilitychange`) o `navigator.sendBeacon` per garantire l'invio prima che la pagina venga scaricata.

---

### [x] SERIOUS-2: Race condition nel `loading` globale condiviso
**File:** `src/composables/useExpenses.ts:44-46`, `src/composables/useBanking.ts:65`  
**Problema:** Ogni composable ha un singolo `loading = ref(false)` condiviso tra tutte le operazioni. Se `addExpense` e `updateExpense` partono quasi in contemporanea, il secondo `loading = false` resetta lo spinner prima che la prima operazione finisca.  
**Fix:** Usare un contatore invece di un boolean, o un `Set` di operazioni in corso:
```typescript
const pendingOps = ref(0)
const loading = computed(() => pendingOps.value > 0)
// Prima di ogni op: pendingOps.value++
// Nel finally: pendingOps.value--
```

---

### [ ] SERIOUS-3: `autoGenerationChecked` non si resetta in alcune condizioni
**File:** `src/composables/useRecurringExpenses.ts:28`  
**Problema:** Il flag `autoGenerationChecked` è a livello modulo. In HMR durante sviluppo, il modulo non si ricarica e il flag rimane `true`, impedendo la verifica delle ricorrenti al prossimo hot reload.  
**Nota:** In produzione non è un problema perché non c'è HMR, ma è fragile.

---

## Performance bottlenecks

### [ ] PERF-1: Doppio sorting sulle stesse transazioni
**File:** `src/composables/useExpenses.ts:155-157` → `src/pages/HomePage.vue:463-485`  
**Problema:** `sortedExpenses` (computed) fa spread + sort su `expenses.value`. `localSorted` in HomePage usa `expenses.value` direttamente (non `sortedExpenses`) e ri-sortisce. Double work.  
**Fix:** In `HomePage.vue`, usare `sortedExpenses` come base di `localSorted` per evitare il sort ridondante quando `sortMode === 'date-desc'`.

---

### [x] PERF-2: `getCategoryConfig` istanzia composable + O(n) lookup per ogni riga
**File:** `src/composables/useExpenses.ts:36-41`, `src/composables/useCategories.ts:239-241`  
**Problema:** `getCategoryConfig` chiama `useCategories()` (overhead di closure) e poi `.find()` O(n) per ogni transazione trasformata. Con 200 transazioni e 16 categorie = 200 scansioni lineari.  
**Nota:** Il commento dice `// O(1) lookup` ma `.find()` è O(n).  
**Fix:** Usare una Map in `useCategories`:
```typescript
const categoryMap = computed(() => new Map(categories.value.map(c => [c.id, c])))
function getCategoryById(id: string) { return categoryMap.value.get(id) }
```

---

### [x] PERF-3: `allBudgetStatuses` è O(n × m)
**File:** `src/composables/useBudgets.ts:202-204`  
**Problema:** Per ogni categoria budgettata, `getBudgetStatus` fa un `.filter() + .reduce()` su tutto `expenses.value`. Con 10 budget e 200 spese = 2000 operazioni ad ogni cambio delle spese.  
**Fix:** Pre-aggregare le spese in un Map in un singolo pass O(n):
```typescript
const allBudgetStatuses = computed(() => {
  const spentByCategory = new Map<string, number>()
  expenses.value.forEach(e => {
    if (e.type === 'expense')
      spentByCategory.set(e.category, (spentByCategory.get(e.category) ?? 0) + e.amount)
  })
  return [...activeBudgets.value.entries()].map(([categoryId, budgeted]) => {
    const spent = spentByCategory.get(categoryId) ?? 0
    return { categoryId, budgeted, spent, remaining: budgeted - spent,
      percentage: Math.round((spent / budgeted) * 100) }
  })
})
```

---

### [x] PERF-4: `fetchWalletTransactions` senza filtro mese né limite
**File:** `src/composables/useSharedWallets.ts:258-265`  
**Problema:** Carica TUTTE le transazioni storiche di un wallet (nessun `.gte/.lte`, nessun `.limit()`). Un wallet usato per 1 anno porta centinaia di righe in memoria.  
**Fix:** Aggiungere filtro per mese selezionato (come `useExpenses`) o almeno `.limit(200)` come guard.

---

### [x] PERF-5: `syncTransactions` è sequenziale per account
**File:** `src/composables/useBanking.ts:276-285`  
**Problema:** Loop `for...await` synca i conti uno alla volta. Con 3 conti e 500ms per Edge Function = 1.5s bloccati.  
**Fix:**
```typescript
const results = await Promise.all(accounts.map(accountId =>
  callBankingAuth('get-transactions', { account_id: accountId, ... })
))
```

---

### [x] PERF-6: `fetchWallets` fa 2 query sequenziali (N+1 pattern)
**File:** `src/composables/useSharedWallets.ts:63-86`  
**Problema:** Prima query su `shared_wallet_members`, poi seconda su `shared_wallets` con gli IDs trovati.  
**Fix (Supabase foreign key join):**
```typescript
const { data } = await supabase
  .from('shared_wallet_members')
  .select('role, shared_wallets(*)')
  .eq('user_id', user.value.id)
  .eq('is_active', true)
```

---

### [x] PERF-7: `useBudgets.init()` fa 2 query sequenziali invece di parallele
**File:** `src/composables/useBudgets.ts:106-113`  
**Problema:** `fetchTemplates()` e `fetchMonthlyBudgets()` sono indipendenti ma eseguite in serie.  
**Fix:**
```typescript
await Promise.all([fetchTemplates(), fetchMonthlyBudgets(monthKey.value)])
await ensureMonthlyBudgets(monthKey.value)
```

---

### [ ] PERF-8: `select('*')` ovunque — over-fetching
Quasi ogni query usa `select('*')`. Esempio: `fetchBankTransactions` porta `counterpart_iban`, `merchant_category_code` che non vengono mostrati in lista.  
**Fix:** Specificare le colonne necessarie per ogni query, specialmente nelle liste.

---

## Architettura

### [ ] ARCH-1: Singleton pattern fragile — considerare Pinia
**Problema:** Tutti i composables usano `module-level refs` + flag `watchersInitialized`. Non funziona in test (stato condiviso), rompe in HMR, nessun DevTools support.  
**Fix consigliato:** Migrare a **Pinia stores** (`defineStore`). Stessa API Vue 3, ma con reset automatico, devtools, e comportamento prevedibile. Per Flutter → mappatura diretta a Riverpod providers.

---

### [x] ARCH-2: Logica merchant duplicata in 2 composables
**File:** `src/composables/useExpenses.ts:249-254` e `src/composables/useBanking.ts:8-18`  
**Problema:** Stessa regex di pulizia descrizione Fineco in due posti con implementazioni leggermente diverse (useBanking aggiunge `.toUpperCase()`, useExpenses no) → match inconsistenti sulle regole.  
**Fix:** Creare `src/lib/banking-utils.ts` con `extractMerchantFromDescription()` esportata.

---

### [ ] ARCH-3: Nessun Supabase Realtime per shared wallets
**Problema:** Le transazioni di altri utenti nello stesso wallet non appaiono in tempo reale. Nessun `supabase.channel()` in tutto il codebase.  
**Fix (minimo):**
```typescript
// In setActiveWallet:
supabase.channel(`wallet-${wallet.id}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses',
    filter: `shared_wallet_id=eq.${wallet.id}` }, () => fetchWalletTransactions(wallet.id))
  .subscribe()
```

---

### [ ] ARCH-4: Nessun routing SPA
**Problema:** Navigation via `activeTab = ref('home')` in App.vue. Conseguenze:
- Nessun deep link funzionante
- Back button browser non funziona
- URL non riflette lo stato
- Banking callback intercettato con `window.location.pathname.includes('/banking/callback')` (fragile)  
**Fix:** Vue Router in hash mode. Ogni tab diventa una route, banking sub-pages route figlie.

---

### [ ] ARCH-5: App.vue è un God Component (490 righe)
**Problema:** Gestisce routing, tutti i dialog state, CRUD handlers, init di 10 composables, service worker, push notification prompting.  
**Fix:** Estrarre:
- `useAppDialogs.ts` → stati dialog + handlers
- `useAppInit.ts` → sequenza di inizializzazione post-login

---

### [ ] ARCH-6: Magic timeouts nell'inizializzazione
**File:** `src/App.vue:365-376`
```typescript
setTimeout(() => checkForUpdates(), 500)
setTimeout(() => checkSubscription(), 1500)
setTimeout(() => { showPushPrompt.value = true }, 2500)
```
**Problema:** Se il load iniziale impiega più del timeout (connessione lenta), i task secondari partono durante il caricamento principale.  
**Fix:** Eseguire dopo che il fetch iniziale è completato, usando `requestIdleCallback` o un flag `initialLoadComplete`.

---

## Code Quality

### [x] CQ-1: Commento fuorviante in `getCategoryById`
**File:** `src/composables/useCategories.ts:239`  
```typescript
// O(1) lookup  ← SBAGLIATO: .find() è O(n)
function getCategoryById(id: string) { return categories.value.find(c => c.id === id) }
```

---

### [x] CQ-2: `any` types in `transformConnection` e `transformTransaction`
**File:** `src/composables/useBanking.ts:71-106`  
**Fix:** Aggiungere `DbBankConnection` e `DbBankTransaction` interfaces in `src/lib/supabase.ts` (come già fatto per `DbExpense`).

---

### [ ] CQ-3: `updateProfile` usa `any`
**File:** `src/composables/useAuth.ts:163`
```typescript
const updateData: any = {}  // ← perdita type safety
```
**Fix:** Tipare con il tipo `UserAttributes` di Supabase.

---

### [x] CQ-4: `deleteConnection` non aspetta bank_transactions prima di continuare
Vedi CRIT-3.

---

### [x] CQ-5: Error handling inconsistente tra write e read operations
- Metodi write (`addExpense`, `updateExpense`, etc.): lanciano, il chiamante fa try/catch
- Metodi read (`fetchConnections`, `fetchBankTransactions`): swallano con `console.error`, nessun errore visibile al chiamante

Standardizzare: **write = throw, read = aggiorna `error.value`**.

---

## Quick Wins (risolti rapidamente)

| # | Issue | File | Impatto |
|---|-------|------|---------|
| [x] QW-1 | Rimuovere anon key hardcodata | `src/lib/supabase.ts:4` | Security |
| [x] QW-2 | Parallelizzare `fetchTemplates + fetchMonthlyBudgets` | `src/composables/useBudgets.ts:106` | -30% tempo init |
| [x] QW-3 | Parallelizzare `syncTransactions` con Promise.all | `src/composables/useBanking.ts:276` | -60% tempo sync |
| [x] QW-4 | Map per `getCategoryById` (O(1) reale) | `src/composables/useCategories.ts:240` | Risolve PERF-2 + CQ-1 |
| [x] QW-5 | Error check nel primo delete di `deleteConnection` | `src/composables/useBanking.ts:349` | Risolve CRIT-3 |
| [x] QW-6 | Estrarre `extractMerchantFromDescription` | `src/lib/banking-utils.ts` (nuovo) | Risolve ARCH-2 |
| [x] QW-7 | JOIN per `fetchWallets` | `src/composables/useSharedWallets.ts:63` | -1 DB roundtrip |
| [x] QW-8 | Filtro mese su `fetchWalletTransactions` | `src/composables/useSharedWallets.ts:258` | Risolve PERF-4 |
| [x] QW-9 | Pre-aggregazione O(n) per `allBudgetStatuses` | `src/composables/useBudgets.ts:202` | Risolve PERF-3 |
| [x] QW-10 | Watcher logout in `useBudgets` | `src/composables/useBudgets.ts` | Risolve CRIT-4 |

---

## Flutter Migration Notes

### Cosa riusare
- Schema Supabase — identico, zero modifiche DB
- Logica di business (auto-generation, categorization rules, merchant parsing)
- Tutti i tipi/interfacce → convertire in Dart models
- Edge Functions — già indipendenti dal client

### Cosa riscrivere
| Componente | Flutter equivalente |
|------------|---------------------|
| Composables singleton | Riverpod providers |
| `useAuth` | `supabase_flutter` GoTrueClient |
| Tailwind CSS UI | Flutter Material 3 + custom theme |
| `KeepAlive` tabs | `IndexedStack` |
| Swipe actions | `flutter_slidable` |
| Web Push / Service Worker | Firebase Cloud Messaging |
| Chart.js | `fl_chart` |
| Banking OAuth redirect | `flutter_web_auth_2` |
| `sessionStorage` per OAuth state | `flutter_secure_storage` |

### Architettura Flutter consigliata
```
lib/
  core/
    supabase/          ← client, types
    banking_utils.dart ← extractMerchant(), logica condivisa
  features/
    auth/
    expenses/
    banking/
    wallets/
    recurring/
    budgets/
    categories/
    settings/
  shared/
    currency_provider.dart
    feature_flags_provider.dart
    push_notifications_service.dart
```

### Punto critico migrazione
Il banking OAuth su mobile non può usare `window.location` per il callback. Va gestito come **deep link** (`expenses://banking/callback`) intercettato da `flutter_web_auth_2` o `go_router`.

---

## Progressi

### Risolti (2026-04-15)
- [x] CRIT-1 — Rimossa anon key hardcodata, ora throw se manca env var
- [x] CRIT-2 — Edge Function banking-sync ora valida user_id dal JWT
- [x] CRIT-3 — Aggiunto error check al delete bank_transactions in deleteConnection
- [x] CRIT-4 — Aggiunto watcher logout in useBudgets (resetta loadedMonth + state)
- [x] CRIT-5 — deleteExpense ora usa la tabella corretta (expenses vs bank_transactions)
- [x] SERIOUS-1 — scheduleMarkAllReviewed usa visibilitychange + setTimeout fallback
- [x] SERIOUS-2 — loading in useExpenses/useBanking ora usa contatore _pendingOps
- [x] PERF-2/CQ-1 — getCategoryById ora O(1) via Map (commento corretto)
- [x] PERF-3 — allBudgetStatuses pre-aggrega spese in singolo pass O(n)
- [x] PERF-4 — fetchWalletTransactions filtra per mese + watcher monthKey
- [x] PERF-5 — syncTransactions parallelizzato con Promise.allSettled
- [x] PERF-6 — fetchWallets usa JOIN Supabase (1 query invece di 2)
- [x] PERF-7 — useBudgets.init() parallelizza fetchTemplates + fetchMonthlyBudgets
- [x] ARCH-2 — extractMerchantFromDescription estratta in src/lib/banking-utils.ts
- [x] CQ-2 — Aggiunti DbBankConnection e DbBankTransaction in supabase.ts
- [x] CQ-5 — fetchConnections e fetchBankTransactions ora aggiornano error.value

### Rimasti (Vue-specific — da fare prima di Flutter o durante)
- [ ] PERF-1 — Double sorting in HomePage
- [ ] ARCH-3 — Supabase Realtime per shared wallets
- [ ] ARCH-5 — Estrarre logica dialog da App.vue
- [ ] ARCH-6 — Magic timeouts in App.vue

### Esclusi deliberatamente (non necessari pre-Flutter)
- ARCH-1 (Pinia) — overhead enorme, la logica migra a Riverpod
- ARCH-4 (Vue Router) — sarà go_router in Flutter
- PERF-8 (select columns) — micro-ottimizzazione
