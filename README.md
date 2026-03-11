# 💸 Expense Tracker PWA

A mobile-first Progressive Web App for personal finance management. Track expenses and income, set up recurring transactions, visualize spending, and export your data — all from a fast, installable app that works on any device.

![Version](https://img.shields.io/badge/version-1.5.0-teal)
![Vue](https://img.shields.io/badge/Vue-3-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

---

## Features

- **Expenses & Income** — Add transactions of both types with contextual category sets, color-coded amounts (red for expenses, green for income)
- **Net Balance** — Live signed balance (income − expenses) with a SPESE / ENTRATE breakdown panel
- **Transaction Filters** — Filter the list by All / Expenses / Income; sort by date or amount
- **Recurring Transactions** — Configure monthly recurring expenses or income entries; the app auto-generates them when you open it on the configured day
- **Charts** — Doughnut chart per category with an Expenses/Income toggle; 3-card summary (Entrate · Saldo · Uscite)
- **Category Management** — Reorder, hide, or reset expense categories from Settings
- **CSV Export** — Download all transactions for the selected month as a UTF-8 CSV (Excel-compatible)
- **Multi-currency** — Switch display currency (symbol only; amounts stored as-is)
- **Month Navigation** — Browse any past or future month via the month picker in the header
- **PWA** — Installable on iOS/Android/Desktop; offline-capable via Workbox service worker
- **Auth** — Email/password sign-up with confirmation flow powered by Supabase Auth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Vue 3 (Composition API) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (dark, mobile-first) |
| Charts | Chart.js + vue-chartjs |
| Backend / Auth / DB | Supabase (PostgreSQL) |
| PWA | vite-plugin-pwa + Workbox |
| Build tool | Vite 7 |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── composables/
│   ├── useAuth.ts              # Singleton auth state (user, session, sign-in/up/out)
│   ├── useExpenses.ts          # Core data model: ALL_CATEGORIES, CRUD, balance computed
│   ├── useRecurringExpenses.ts # Recurring transactions + auto-generation on app open
│   ├── useCategories.ts        # User category ordering/visibility prefs (expense only)
│   ├── useSelectedMonth.ts     # Global month navigation state
│   ├── useCurrency.ts          # Currency symbol + formatAmount helper
│   └── useAvatar.ts            # Profile avatar upload/fetch
│
├── pages/
│   ├── AuthPage.vue            # Login / sign-up / email confirmation flow
│   ├── HomePage.vue            # Transaction list with filter, sort, and balance hero
│   ├── GraphicsPage.vue        # Charts + summary cards
│   ├── RecurringPage.vue       # Recurring transactions list + toggle
│   ├── ExpensePage.vue         # (reserved / alternate expense view)
│   └── SettingsPage.vue        # Category management, currency, CSV export, sign-out
│
├── components/
│   ├── TabBar.vue              # Bottom nav with SVG notch + FAB
│   ├── AppHeader.vue           # Month picker + avatar
│   ├── ExpenseDialog.vue       # Add/edit transaction sheet (expense or income)
│   ├── ExpenseDetailDialog.vue # Transaction detail bottom sheet (view/edit/delete)
│   ├── RecurringExpenseDialog.vue # Add/edit recurring transaction sheet
│   ├── MonthPicker.vue         # Month navigation popover
│   ├── SideDrawer.vue          # Side menu / profile drawer
│   ├── ActionSheet.vue         # Generic action sheet
│   ├── AvatarViewer.vue        # Profile picture display
│   └── FloatingActionButton.vue
│
└── lib/
    └── supabase.ts             # Supabase client + DB type interfaces
```

---

## Database Schema

### `expenses`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| description | text | |
| date | date | ISO `YYYY-MM-DD` |
| amount | numeric | Always positive; sign derived from `transaction_type` |
| category_id | text FK → categories | |
| transaction_type | text | `'expense'` \| `'income'`, default `'expense'` |
| created_at / updated_at | timestamptz | |

### `recurring_expenses`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| description | text | |
| amount | numeric | Always positive |
| category_id | text FK → categories | |
| day_of_month | int | 1–28 |
| enabled | boolean | default `true` |
| last_generated_date | date | Prevents double-generation in same month |
| transaction_type | text | `'expense'` \| `'income'`, default `'expense'` |
| created_at / updated_at | timestamptz | |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | text PK | e.g. `'Ristoranti'`, `'Stipendio'` |
| user_id | uuid FK | Per-user ordering/visibility stored separately |

> **Migration snippets** (run in Supabase SQL Editor):
> ```sql
> ALTER TABLE expenses
>   ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'expense'
>   CHECK (transaction_type IN ('expense', 'income'));
>
> ALTER TABLE recurring_expenses
>   ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'expense'
>   CHECK (transaction_type IN ('expense', 'income'));
> ```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project with the schema above

### Local setup

```bash
# 1. Clone
git clone <repo-url>
cd PWA_EXPENSES_TRACKING

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Start dev server
npm run dev
```

The app runs at `http://localhost:5173`.

### Environment variables

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Build & Deploy

```bash
npm run build       # type-check + Vite production build → dist/
vercel --prod       # deploy to Vercel
```

The build outputs a fully self-contained PWA in `dist/` with a Workbox service worker for offline support and `NetworkFirst` caching for Supabase API calls.

---

## Key Design Decisions

**Singleton composables** — reactive state (`expenses`, `recurringExpenses`, `user`) lives outside the composable function so all component instances share the same reference without a Pinia/Vuex store.

**Amounts always positive in DB** — the sign is derived at display time from `transaction_type`. This keeps aggregation queries simple (`SUM(amount)` with a `WHERE` clause) and avoids sign-convention bugs.

**`ALL_CATEGORIES` as single source of truth** — a single array with a `type` field on each entry, split into `CATEGORIES` (expense) and `INCOME_CATEGORIES` (income) via `.filter()`. A `Map` provides O(1) lookup in `getCategoryConfig()`.

**Auto-generation guard** — `last_generated_date` on each recurring item prevents re-generation if the user opens the app multiple times on the same day. The `autoGenerationChecked` singleton flag prevents re-running within the same session.

---

## Changelog

### v1.5.0
- Type filter pills (Tutti / Spese / Entrate) on the transaction list
- Improved home page header: SPESE / ENTRATE labeled stat blocks with vertical divider
- FAB z-index fix: bottom half of the + button was intercepted by the tab grid overlay

### v1.4.0
- Recurring income support with Spesa/Entrata toggle in the recurring dialog
- Unified `ALL_CATEGORIES` architecture with O(1) category lookup
- CSV export includes `Tipo` column; amounts signed correctly

### v1.3.0
- Income/Expense transaction type toggle in add/edit dialog
- Net balance hero replacing total-expenses counter
- GraphicsPage: 3-card summary + Spese/Entrate chart toggle
- Supabase `transaction_type` column migration

---

## License

MIT
