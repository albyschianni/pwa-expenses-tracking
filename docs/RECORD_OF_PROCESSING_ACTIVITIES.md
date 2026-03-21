# Record of Processing Activities (ROPA)
## Expense Tracker — SpaceWeb Labs

**Document version**: 1.0
**Last updated**: 2026-03-21
**Data Controller**: SpaceWeb Labs (support@expensetracker.app)

---

## 1. Processing Activity: User Authentication

| Field | Details |
|-------|---------|
| **Data categories** | Email address, hashed password, OAuth tokens (Google) |
| **Data subjects** | Registered app users |
| **Purpose** | User identification and secure access to the service |
| **Legal basis** | GDPR Art. 6(1)(b) — contract execution |
| **Retention period** | Until account deletion + 30 days for complete purge |
| **Processors** | Supabase Inc. (authentication service) |
| **Transfers outside EU** | None — EU region (eu-central-1) |
| **Security measures** | bcrypt password hashing, TLS 1.2+ in transit, AES-256 at rest |

---

## 2. Processing Activity: Transaction Management

| Field | Details |
|-------|---------|
| **Data categories** | Transaction amount, description, date, category, transaction type (expense/income) |
| **Data subjects** | Registered app users |
| **Purpose** | Personal expense tracking and financial overview |
| **Legal basis** | GDPR Art. 6(1)(b) — contract execution |
| **Retention period** | Until account deletion + 30 days for complete purge |
| **Processors** | Supabase Inc. (database hosting) |
| **Transfers outside EU** | None |
| **Security measures** | Row Level Security (user can only access own data), TLS, AES-256 |

---

## 3. Processing Activity: Recurring Transactions

| Field | Details |
|-------|---------|
| **Data categories** | Description, amount, category, day of month, enabled status |
| **Data subjects** | Registered app users |
| **Purpose** | Automated generation of recurring transactions |
| **Legal basis** | GDPR Art. 6(1)(b) — contract execution |
| **Retention period** | Until account deletion + 30 days |
| **Processors** | Supabase Inc. |
| **Transfers outside EU** | None |
| **Security measures** | RLS, TLS, AES-256 |

---

## 4. Processing Activity: Shared Wallets

| Field | Details |
|-------|---------|
| **Data categories** | Wallet name, member user IDs, member roles, shared transactions |
| **Data subjects** | Registered app users who create or join shared wallets |
| **Purpose** | Collaborative expense tracking between multiple users |
| **Legal basis** | GDPR Art. 6(1)(b) — contract execution |
| **Retention period** | Until wallet deletion or member removal + 30 days |
| **Processors** | Supabase Inc. |
| **Transfers outside EU** | None |
| **Security measures** | RLS (only active members can access wallet data), TLS, AES-256 |

---

## 5. Processing Activity: Custom Categories

| Field | Details |
|-------|---------|
| **Data categories** | Category name, icon, color |
| **Data subjects** | Registered app users |
| **Purpose** | Personalization of expense categorization |
| **Legal basis** | GDPR Art. 6(1)(b) — contract execution |
| **Retention period** | Until account deletion + 30 days |
| **Processors** | Supabase Inc. |
| **Transfers outside EU** | None |
| **Security measures** | RLS, TLS, AES-256 |

---

## 6. Processing Activity: Profile & Avatar

| Field | Details |
|-------|---------|
| **Data categories** | Display name, profile picture (JPEG, max 400x400) |
| **Data subjects** | Registered app users |
| **Purpose** | User personalization and identification in shared wallets |
| **Legal basis** | GDPR Art. 6(1)(a) — consent (optional data) |
| **Retention period** | Until account deletion + 30 days |
| **Processors** | Supabase Inc. (object storage) |
| **Transfers outside EU** | None |
| **Security measures** | Bucket-level access policies, TLS, AES-256 |

---

## 7. Processing Activity: Client-side Preferences

| Field | Details |
|-------|---------|
| **Data categories** | Selected currency, last seen app version, UI preferences |
| **Data subjects** | All app users |
| **Purpose** | UI personalization and update notifications |
| **Legal basis** | GDPR Art. 6(1)(f) — legitimate interest |
| **Retention period** | Stored in browser localStorage, cleared on browser data deletion |
| **Processors** | None (client-side only) |
| **Transfers outside EU** | None |
| **Security measures** | Data never leaves the user's device |

---

## Processors Summary

| Processor | Service | DPA Status | Data Location |
|-----------|---------|------------|---------------|
| Supabase Inc. | Database, Auth, Storage | DPA available at supabase.com/legal/dpa | EU (eu-central-1) |
| Vercel Inc. | Frontend hosting | DPA available at vercel.com/legal/dpa | Edge (static files only, no user data) |

---

## Data Subject Rights Implementation

| Right | Implementation |
|-------|---------------|
| **Access** | All user data is directly visible in the app |
| **Portability** | JSON export of all data available in Settings |
| **Rectification** | Users can edit transactions, profile, and categories in-app |
| **Erasure** | Account deletion available in Settings (cascading delete) |
| **Restriction** | Contact support@expensetracker.app |
| **Objection** | Contact support@expensetracker.app |

---

## nLPD (Switzerland) Compliance Notes

- Privacy policy is accessible before registration (linked on auth page)
- Privacy by Design: only necessary data collected; no tracking by default
- Privacy by Default: all settings privacy-friendly; no opt-out required
- Data minimization: app collects only what's needed for core functionality
