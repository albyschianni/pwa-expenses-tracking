# Piano Operativo v2 — Expense Tracker: Banking → Categorizzazione → Budgeting → Redesign → Flutter

> Documento di riferimento per le prossime 8-10 settimane di lavoro.
> Data: 26 Marzo 2026

---

## Overview del Piano

Il piano è stato riorganizzato con l'integrazione bancaria Enable Banking come priorità numero uno. La sequenza è progettata in modo che ogni fase costruisca sulle fondamenta della precedente: prima importi transazioni reali dalla banca, poi le categorizzi automaticamente, poi costruisci il budget mensile sopra dati reali, poi fai il redesign UX dell'intera app (che ora include anche le schermate banking), e infine prepari il porting Flutter.

Regola fondamentale: non iniziare la fase successiva finché la precedente non è chiusa al 100%.

| Fase | Cosa | Durata stimata | Output |
|------|-------|----------------|--------|
| 1 | Enable Banking Integration | 2 settimane | Connessione banca, import transazioni, sync automatico |
| 2 | Sistema di Categorizzazione | 1-2 settimane | Auto-categorizzazione a 3 livelli + review inbox |
| 3 | Envelope Budgeting | 1-2 settimane | Allocazione budget per categoria con dati reali |
| 4 | UX Audit con Google Stitch | 1 settimana | Mockup high-fidelity per tutte le schermate |
| 5 | Design Consolidation + PWA Polish | 1-2 settimane | PWA "product-ready", DESIGN.md |
| 6 | Preparazione Flutter | 1 settimana | Repo scaffold, docs, backlog pronto |

Durata totale stimata: 8-10 settimane part-time (2-3 ore/giorno o weekend concentrati).

---

## FASE 1 — Enable Banking Integration (Settimane 1-2)

Questa è la fase più tecnica. Coinvolge backend (Edge Functions), database, frontend OAuth flow, e sync schedulato. L'obiettivo è importare transazioni bancarie reali nell'app.

### 1.1 Prerequisiti — Prima di scrivere codice

Verifiche sullo stato della PWA attuale (tutte devono essere OK prima di procedere):

- Auth flow funzionante senza edge case (refresh token, sessione scaduta, login da dispositivo diverso)
- Categorie stabili con CRUD completo e nessun bug noto
- Inserimento spese manuale fluido e affidabile
- Dashboard che mostra i dati corretti con filtri per periodo
- Se ci sono bug aperti, risolvili PRIMA — aggiungere banking su base instabile moltiplica i problemi

Setup Enable Banking:

- Crea account su enablebanking.com/sign-in (solo email, gratis)
- Registra un'app Sandbox nel control panel
- Scarica il file .pem (chiave privata RSA generata nel browser)
- Imposta redirect URL locale: http://localhost:5173/banking/callback
- Il sandbox è attivo immediatamente, nessun contratto

### 1.2 Database — Tabelle per le connessioni bancarie

Esegui queste migrazioni su Supabase PRIMA di toccare il codice applicativo.

```sql
-- Connessioni bancarie dell'utente
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  institution_name text not null,
  institution_country text not null default 'IT',
  session_id text,                    -- ID sessione Enable Banking
  account_ids text[],                 -- array di account UID Enable Banking
  status text not null default 'pending', -- pending | active | expired | error
  consent_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transazioni importate dalla banca
create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  connection_id uuid references bank_connections(id) not null,
  external_id text,                   -- entry_reference da Enable Banking
  booking_date date,
  value_date date,
  amount numeric(12,2) not null,      -- negativo = uscita, positivo = entrata
  currency text not null default 'EUR',
  description text,                   -- remittance_information normalizzata
  counterpart_name text,              -- creditor/debtor name
  counterpart_iban text,
  merchant_category_code text,        -- MCC code quando disponibile (4 cifre)
  bank_transaction_code jsonb,        -- { code, description, sub_code }
  credit_debit_indicator text,        -- CRDT | DBIT
  status text not null default 'BOOK', -- BOOK | PDNG
  category_id uuid references categories(id), -- categoria assegnata (nullable)
  categorization_source text,         -- 'mcc' | 'user_rule' | 'system_rule' | 'ai' | 'manual'
  reviewed boolean default false,     -- se l'utente ha confermato/modificato
  raw_data jsonb,                     -- payload originale per reprocessing futuro
  created_at timestamptz default now(),
  unique(connection_id, external_id)  -- evita duplicati su re-sync
);

-- Indici per query frequenti
create index idx_bank_conn_user on bank_connections(user_id);
create index idx_bank_tx_user_date on bank_transactions(user_id, booking_date);
create index idx_bank_tx_connection on bank_transactions(connection_id);
create index idx_bank_tx_uncategorized on bank_transactions(user_id) 
  where category_id is null;

-- RLS
alter table bank_connections enable row level security;
alter table bank_transactions enable row level security;

create policy "users_own_connections" on bank_connections
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_bank_transactions" on bank_transactions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

NOTA IMPORTANTE: la colonna `category_id` su `bank_transactions` è la stessa tabella `categories` usata per le spese manuali. Questo è fondamentale per l'integrazione col budget — il budget vede TUTTE le spese (manuali + bancarie) per categoria.

Dopo aver creato le tabelle, testa manualmente inserendo un record e verificando che RLS funzioni.

### 1.3 Backend — Edge Function per Enable Banking API

La Edge Function gestisce tutta la comunicazione con Enable Banking. La chiave RSA privata NON deve mai arrivare al frontend.

```typescript
// supabase/functions/banking-auth/index.ts
// 
// AZIONI SUPPORTATE:
// - start-auth: inizia il flusso OAuth, restituisce URL di redirect alla banca
// - complete-auth: scambia il code per sessione + account list
// - get-transactions: recupera transazioni per un account
// - get-balances: recupera saldi per un account
//
// VARIABILI D'AMBIENTE NECESSARIE (Supabase Dashboard > Edge Functions > Secrets):
// - EB_APP_ID: ID applicazione da Enable Banking control panel
// - EB_PRIVATE_KEY: contenuto del file .pem (chiave RSA privata)
// - EB_REDIRECT_URL: URL di callback (localhost in dev, dominio in prod)
```

Struttura dell'Edge Function (pseudocodice — il codice completo è nel documento Enable Banking condiviso):

1. Genera JWT firmato con chiave RSA per autenticarsi verso Enable Banking API
2. Switch sull'azione richiesta (start-auth, complete-auth, get-transactions, get-balances)
3. Proxy delle chiamate verso api.enablebanking.com con il JWT nel header Authorization
4. Restituisci la risposta al frontend

Cose da NON dimenticare nell'implementazione:

- Validare che l'utente chiamante sia autenticato (check auth.uid() dal token Supabase)
- Il JWT Enable Banking ha TTL max 1 ora — generane uno nuovo per ogni richiesta, non cacharlo
- Gestire errori Enable Banking (401 = JWT scaduto, 404 = sessione non trovata, 429 = rate limit)
- Loggare gli errori per debug ma MAI loggare la chiave privata o il JWT completo

### 1.4 Frontend — Flusso di Connessione Banca

Componenti da creare:

COMPONENTE 1: BankConnectionPage — pagina per connettere un conto bancario

Specifiche:
- Lista di banche italiane principali con nome e logo (Intesa Sanpaolo, UniCredit, Banco BPM, FinecoBank, Mediolanum, BPER, Revolut, N26, e altre)
- Barra di ricerca per filtrare le banche
- Click su una banca avvia il flusso OAuth (chiama Edge Function con action start-auth)
- L'app salva una bank_connection in stato "pending" e redirige l'utente al sito della banca
- L'utente autorizza l'accesso e viene reindirizzato al callback URL dell'app

COMPONENTE 2: BankCallbackHandler — gestisce il redirect dopo l'autenticazione bancaria

Specifiche:
- Legge i parametri `code` e `state` dalla query string
- Chiama Edge Function con action complete-auth passando il code
- Aggiorna la bank_connection con session_id, account_ids, status "active"
- Avvia il primo sync delle transazioni (ultimi 3 mesi)
- Mostra un loading state durante il sync ("Importazione transazioni in corso...")
- Al completamento, naviga alla dashboard con un toast di conferma
- Gestire gli errori: se l'utente ha annullato l'autorizzazione (error=access_denied), mostra messaggio appropriato e torna alla pagina connessione

COMPONENTE 3: BankTransactionsList — lista transazioni importate

Specifiche:
- Lista cronologica delle transazioni bancarie importate
- Per ogni transazione: data, descrizione/counterpart, importo, categoria (se assegnata), badge reviewed/pending
- Filtri: per mese, per stato categorizzazione, per connessione bancaria
- Click su transazione apre dettaglio con possibilità di categorizzare/modificare
- Le transazioni non categorizzate hanno un badge visivo distinto (es. pallino arancione)
- Pull-to-refresh per sync manuale

COMPONENTE 4: BankConnectionsManager — gestione connessioni attive (in Settings)

Specifiche:
- Lista connessioni attive con: nome banca, data ultimo sync, stato, scadenza consenso
- Pulsante "Sincronizza ora" per sync manuale
- Pulsante "Disconnetti" per eliminare la connessione (con conferma)
- Alert quando il consenso sta per scadere (< 30 giorni) con CTA per rinnovare
- Pulsante "Aggiungi conto" per connettere un'altra banca

### 1.5 Sync Automatico — pg_cron

Dopo il primo sync manuale, imposta il sync giornaliero automatico:

```sql
-- Abilita pg_cron in Supabase: Dashboard > Database > Extensions > pg_cron
-- Poi:

select cron.schedule(
  'sync-bank-transactions',
  '0 6 * * *',  -- ogni giorno alle 6:00 AM
  $$
    select
      net.http_post(
        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/banking-sync',
        headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
      )
  $$
);
```

La Edge Function `banking-sync` (separata da `banking-auth`) deve:

1. Leggere tutte le bank_connections con status = 'active'
2. Per ciascuna, chiamare get-transactions con dateFrom = last_sync_at (o ieri se null)
3. Upsert delle nuove transazioni (on conflict connection_id + external_id → ignore duplicati)
4. Aggiornare last_sync_at sulla connessione
5. Se la chiamata fallisce (sessione scaduta), aggiornare status a 'expired'

### 1.6 Integrazione con Transazioni Manuali — Decisione Architetturale

Punto critico: le transazioni manuali (tabella `transactions` esistente) e quelle bancarie (tabella `bank_transactions`) sono in tabelle separate. Questo è corretto perché hanno campi diversi. Ma per il budget e per la dashboard, servono dati unificati.

OPZIONE RACCOMANDATA: crea una vista SQL che unifica entrambe le fonti.

```sql
create or replace view all_expenses as
-- Transazioni manuali (spese)
select 
  id,
  user_id,
  date as transaction_date,
  amount,
  category_id,
  description,
  'manual' as source,
  true as reviewed
from transactions
where type = 'expense'

union all

-- Transazioni bancarie (solo uscite categorizzate)
select
  id,
  user_id,
  booking_date as transaction_date,
  abs(amount) as amount,  -- normalizza a positivo
  category_id,
  coalesce(counterpart_name, description) as description,
  'bank' as source,
  reviewed
from bank_transactions
where credit_debit_indicator = 'DBIT'
  and amount < 0;
```

NOTA: adatta i nomi delle colonne della tabella `transactions` al tuo schema effettivo. Questa vista sarà usata dalla Fase 3 (budget) per calcolare il totale speso per categoria.

### 1.7 Testing — Sandbox Enable Banking

Enable Banking ha un "Mock ASPSP" nel sandbox che simula l'intero flusso senza credenziali bancarie reali. Testa:

- [ ] Flusso OAuth completo: selezione banca → redirect → callback → sessione attiva
- [ ] Import transazioni dal mock: verifica che i dati arrivano nel DB correttamente
- [ ] Duplicati: esegui sync due volte, verifica che non ci siano transazioni duplicate
- [ ] Gestione errori: simula cancel dell'utente durante l'autorizzazione
- [ ] Gestione scadenza: verifica comportamento con sessione scaduta
- [ ] Mobile: il flusso OAuth funziona su browser mobile (redirect fuori e ritorno)

Quando il sandbox funziona, puoi testare con la tua banca reale attivando Restricted Mode — gratis, senza contratto, solo per il tuo account personale.

### 1.8 Checklist di Chiusura Fase 1

- [ ] Edge Functions deployate e funzionanti (banking-auth + banking-sync)
- [ ] Tabelle DB create con RLS attivo
- [ ] Flusso connessione banca end-to-end funzionante in sandbox
- [ ] Primo sync importa transazioni degli ultimi 3 mesi
- [ ] Sync giornaliero automatico con pg_cron configurato
- [ ] Lista transazioni bancarie visibile nell'app
- [ ] Gestione connessioni in Settings (visualizza, sincronizza, disconnetti)
- [ ] Vista all_expenses creata e testata
- [ ] Testato con almeno il Mock ASPSP del sandbox
- [ ] Nessun bug bloccante

---

## FASE 2 — Sistema di Categorizzazione (Settimane 3-4)

Ora hai transazioni reali dalla banca. Serve categorizzarle automaticamente perché senza categoria non contribuiscono al tracking né al budget. Il sistema è a 3 livelli con cascade.

### 2.1 Database — Tabella Regole di Categorizzazione

```sql
-- Regole utente per auto-categorizzazione
create table categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  match_type text not null default 'contains', -- 'contains' | 'exact' | 'starts_with' | 'regex'
  match_value text not null,          -- es. 'ESSELUNGA', 'NETFLIX', etc.
  match_field text not null default 'counterpart_name', -- 'counterpart_name' | 'description'
  category_id uuid references categories(id) not null,
  priority int default 0,             -- regole con priorità più alta matchano prima
  auto_created boolean default false,  -- true se creata dal sistema come suggerimento
  created_at timestamptz default now(),
  unique(user_id, match_value, match_field)
);

alter table categorization_rules enable row level security;

create policy "users_own_rules" on categorization_rules
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabella MCC mapping (globale, non per-utente)
create table mcc_category_mapping (
  mcc_code text primary key,          -- es. '5411'
  default_category_name text not null, -- es. 'groceries', 'dining', 'transport'
  description text                     -- es. 'Grocery Stores, Supermarkets'
);

-- Popola con i mapping più comuni (seed data)
insert into mcc_category_mapping (mcc_code, default_category_name, description) values
  -- Alimentari
  ('5411', 'groceries', 'Grocery Stores, Supermarkets'),
  ('5422', 'groceries', 'Freezer and Locker Meat Provisioners'),
  ('5441', 'groceries', 'Candy, Nut, Confectionery Stores'),
  ('5451', 'groceries', 'Dairy Products Stores'),
  ('5462', 'groceries', 'Bakeries'),
  -- Ristorazione
  ('5812', 'dining', 'Eating Places, Restaurants'),
  ('5813', 'dining', 'Bars, Cocktail Lounges, Taverns'),
  ('5814', 'dining', 'Fast Food Restaurants'),
  -- Trasporti
  ('5541', 'transport', 'Service Stations (with or without Ancillary Services)'),
  ('5542', 'transport', 'Automated Fuel Dispensers'),
  ('4121', 'transport', 'Taxicabs and Rideshares'),
  ('4111', 'transport', 'Local and Suburban Commuter Transport'),
  ('4112', 'transport', 'Passenger Railways'),
  ('4131', 'transport', 'Bus Lines'),
  ('4011', 'transport', 'Railroads'),
  -- Shopping
  ('5311', 'shopping', 'Department Stores'),
  ('5651', 'shopping', 'Family Clothing Stores'),
  ('5691', 'shopping', 'Mens and Womens Clothing Stores'),
  ('5699', 'shopping', 'Miscellaneous Apparel and Accessory Shops'),
  ('5944', 'shopping', 'Jewelry, Watch, Clock, and Silverware Stores'),
  -- Casa e Utilities
  ('4900', 'utilities', 'Utilities — Electric, Gas, Water, Sanitary'),
  ('5200', 'home', 'Home Supply Warehouse Stores'),
  ('5211', 'home', 'Building Materials, Lumber Stores'),
  ('5251', 'home', 'Hardware Stores'),
  ('5712', 'home', 'Furniture, Home Furnishings'),
  -- Salute
  ('5912', 'health', 'Drug Stores and Pharmacies'),
  ('8011', 'health', 'Doctors'),
  ('8021', 'health', 'Dentists, Orthodontists'),
  ('8099', 'health', 'Medical Services'),
  -- Entertainment e Digital
  ('5815', 'entertainment', 'Digital Goods — Media, Books, Movies, Music'),
  ('5816', 'entertainment', 'Digital Goods — Games'),
  ('7832', 'entertainment', 'Motion Picture Theaters'),
  ('7922', 'entertainment', 'Theatrical Producers, Ticket Agencies'),
  ('7941', 'entertainment', 'Athletic Fields, Sports Clubs, Stadiums'),
  -- Viaggi
  ('7011', 'travel', 'Lodging — Hotels, Motels, Resorts'),
  ('4511', 'travel', 'Airlines, Air Carriers'),
  ('4722', 'travel', 'Travel Agencies and Tour Operators'),
  ('7512', 'travel', 'Automobile Rental Agency'),
  -- Istruzione
  ('8220', 'education', 'Colleges, Universities'),
  ('8299', 'education', 'Schools and Educational Services'),
  -- Assicurazioni e Finanza
  ('6300', 'insurance', 'Insurance Sales and Underwriting'),
  ('6012', 'finance', 'Financial Institutions — Merchandise and Services');
```

NOTA IMPORTANTE: la tabella `mcc_category_mapping` usa `default_category_name` come stringa, non come FK verso `categories`. Questo perché le categorie dell'utente sono personalizzabili, quindi il mapping avviene a runtime: prendi il default_category_name dal mapping MCC, poi cerca nella tabella `categories` dell'utente una categoria con quel nome (o nome simile). Se non esiste, la transazione resta non categorizzata e va nella review inbox.

### 2.2 Logica di Categorizzazione — Cascade a 3 Livelli

Implementa questa logica in un composable Vue (`useCategorization.ts`) e/o in una Edge Function (se vuoi categorizzare anche durante il sync automatico).

```
LIVELLO 1 — MCC Mapping (quando merchant_category_code è presente)
├── Leggi MCC dalla transazione
├── Cerca in mcc_category_mapping
├── Mappa default_category_name → categoria dell'utente
├── Se trovata → assegna, categorization_source = 'mcc'
└── Se non trovata → passa a Livello 2

LIVELLO 2 — Rules Matching (regole utente + regole di sistema)
├── Prima cerca nelle categorization_rules dell'utente (ordinate per priority DESC)
├── Per ogni regola, matcha match_value contro il campo specificato (counterpart_name o description)
├── Se match → assegna, categorization_source = 'user_rule'
├── Se no match utente, prova regole di sistema (hardcoded nel codice):
│   ├── Pattern italiani: ESSELUNGA → groceries, ENI STATION → transport, etc.
│   ├── Pattern globali: NETFLIX → entertainment, AMAZON → shopping, etc.
│   └── Se match → assegna, categorization_source = 'system_rule'
└── Se no match → passa a Livello 3

LIVELLO 3 — AI Classification (batch, opzionale, implementabile dopo)
├── Accumula transazioni non categorizzate
├── Quando ce ne sono 10+ (o trigger manuale dall'utente), chiama Edge Function
├── Edge Function chiama Claude API (Haiku) con batch di transazioni
├── Per ogni risultato con confidence > 0.7 → assegna, categorization_source = 'ai'
├── Per risultati con confidence <= 0.7 → lascia non categorizzata
└── L'utente le troverà nella Review Inbox
```

Regole di sistema (built-in) — le più importanti per il mercato italiano:

```typescript
const SYSTEM_RULES = [
  // Supermercati italiani
  { pattern: /esselung|conad|coop\b|lidl|eurospin|carrefour|penny|pam\b|despar|md\s/i, category: 'groceries' },
  // Utilities italiane
  { pattern: /enel|a2a|iren|sorgenia|eni\s*gas|italgas|acea|hera/i, category: 'utilities' },
  // Trasporti italiani
  { pattern: /trenitalia|italo\s|atm\s*milano|atb\b|flixbus|uber|bolt\s*ride/i, category: 'transport' },
  // Benzina
  { pattern: /eni\s*station|q8|ip\s*dist|tamoil|shell|total\s*erg/i, category: 'transport' },
  // Fast food e delivery
  { pattern: /mcdonald|burger\s*king|starbucks|just\s*eat|deliveroo|glovo/i, category: 'dining' },
  // Digitale e streaming
  { pattern: /netflix|spotify|disney\+|prime\s*video|apple\s*music|youtube\s*premium|dazn/i, category: 'entertainment' },
  // E-commerce
  { pattern: /amazon|ebay|zalando|aliexpress|temu|shein/i, category: 'shopping' },
  // Telefonia
  { pattern: /vodafone|tim\s|iliad|wind\s*tre|fastweb|ho\.\s*mobile/i, category: 'utilities' },
  // Assicurazioni
  { pattern: /generali|allianz|unipol|zurich|axa/i, category: 'insurance' },
]
```

### 2.3 Frontend — Review Inbox e Gestione Regole

COMPONENTE 1: ReviewInbox — lista transazioni da categorizzare

Specifiche:
- Mostra tutte le bank_transactions dove category_id IS NULL o reviewed = false
- Per ogni transazione: data, importo, counterpart_name, description
- Azione primaria: seleziona una categoria dalla lista delle categorie dell'utente
- Dopo la categorizzazione, prompt: "Vuoi categorizzare automaticamente tutte le transazioni da [counterpart_name]?" → se sì, crea una regola utente
- Azione secondaria: "Ignora" (marca come reviewed senza categoria — per transazioni non rilevanti tipo trasferimenti interni)
- Badge contatore nell'header dell'app: "3 transazioni da categorizzare"
- Ordinamento: più recenti prima

COMPONENTE 2: RulesManager — gestione regole (in Settings, sotto Banking)

Specifiche:
- Lista delle regole utente attive con: pattern, categoria, campo di match, se auto-creata
- Possibilità di modificare, eliminare, riordinare per priorità
- Pulsante "Aggiungi regola" manualmente
- Anteprima: mostra quante transazioni esistenti matcherebbero la regola

### 2.4 Layer 3 — AI Classification (Opzionale, Implementabile Dopo)

Questo layer è un enhancement, non un requisito per la Fase 2. Puoi aggiungerlo successivamente.

```typescript
// Edge Function: classify-transactions
// Chiamata in batch, NON per singola transazione

// Input: array di transazioni non categorizzate
// Output: array di { transaction_id, suggested_category, confidence }

// Prompt per Claude API (Haiku):
`You are a bank transaction categorizer for an Italian personal finance app.
Categorize each transaction into ONE of these categories:
${categories.map(c => `- ${c.name}`).join('\n')}

Transactions to categorize:
${transactions.map((t, i) => 
  `${i+1}. Counterpart: "${t.counterpart_name}" | Description: "${t.description}" | Amount: €${Math.abs(t.amount)} | MCC: ${t.merchant_category_code || 'N/A'}`
).join('\n')}

Respond ONLY with JSON array, no markdown:
[{"index": 1, "category": "groceries", "confidence": 0.95}, ...]

Rules:
- confidence is 0.0 to 1.0
- If unsure, set confidence below 0.5
- Consider Italian merchant names and payment patterns
- Internal transfers between own accounts should be category "transfer" with high confidence`
```

Implementazione:
- Usa Claude Haiku via Supabase Edge Function (basso costo, bassa latenza)
- Batch di 10-20 transazioni per chiamata
- Solo per transazioni che non hanno match MCC né match regole
- Risultati con confidence > 0.7: auto-assegna la categoria
- Risultati con confidence <= 0.7: mantieni nella review inbox
- L'utente quando corregge una categorizzazione AI → sistema propone di creare una regola utente (alimenta Layer 2)
- Costo stimato: con Haiku, ~$0.001 per batch di 20 transazioni → praticamente gratis

### 2.5 Checklist di Chiusura Fase 2

- [ ] Tabella mcc_category_mapping creata e popolata con seed data
- [ ] Tabella categorization_rules creata con RLS
- [ ] Logica di categorizzazione a cascade funzionante (Layer 1 + Layer 2 minimo)
- [ ] Nuove transazioni importate vengono auto-categorizzate dove possibile
- [ ] Review Inbox mostra transazioni non categorizzate
- [ ] L'utente può categorizzare manualmente e creare regole
- [ ] Regole utente funzionano per le transazioni successive
- [ ] RulesManager in Settings permette CRUD delle regole
- [ ] Badge contatore transazioni da categorizzare visibile nell'app
- [ ] Transazioni categorizzate appaiono correttamente nella vista all_expenses

---

## FASE 3 — Envelope Budgeting (Settimane 5-6)

A questo punto hai transazioni reali dalla banca, categorizzate automaticamente. Il setup del budget diventa naturale: "hai speso €380 in Alimentari il mese scorso, vuoi allocare un budget per questa categoria?"

### 3.1 Database — Budget Allocations

```sql
-- Allocazioni budget per categoria/mese
create table budget_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  category_id uuid references categories(id) not null,
  period char(7) not null,            -- 'YYYY-MM', es. '2026-03'
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category_id, period)
);

create index idx_budget_alloc_user_period on budget_allocations(user_id, period);

alter table budget_allocations enable row level security;

create policy "users_manage_own_budgets" on budget_allocations
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Metadata opzionale del piano mensile
create table budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  period char(7) not null,
  total_income numeric(12,2),         -- income dichiarato per il mese
  notes text,
  carry_over boolean default true,
  created_at timestamptz default now(),
  unique(user_id, period)
);

alter table budget_plans enable row level security;

create policy "users_manage_own_plans" on budget_plans
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 3.2 Vista Budget Status — Query Unificata

Questa vista è il cuore del budgeting. Calcola spent/remaining usando TUTTE le fonti (manuali + bancarie) tramite la vista `all_expenses` creata in Fase 1.

```sql
create or replace view budget_status as
select 
  ba.user_id,
  ba.period,
  ba.category_id,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  ba.amount as allocated,
  coalesce(spent.total, 0) as spent,
  ba.amount - coalesce(spent.total, 0) as remaining,
  case 
    when ba.amount = 0 then 0
    else round((coalesce(spent.total, 0) / ba.amount) * 100, 1)
  end as percentage_used
from budget_allocations ba
join categories c on c.id = ba.category_id
left join lateral (
  select sum(ae.amount) as total
  from all_expenses ae
  where ae.category_id = ba.category_id
    and ae.user_id = ba.user_id
    and to_char(ae.transaction_date, 'YYYY-MM') = ba.period
) spent on true;
```

NOTA: adatta i nomi delle colonne al tuo schema effettivo. L'importante è che questa vista tiri da `all_expenses` (che unifica manuali + bancarie), non solo dalla tabella transactions.

### 3.3 Frontend — Componenti Budget

COMPONENTE 1: BudgetProgressBar — barra per singola categoria

Specifiche:
- Mostra: icona categoria, nome, importo speso/allocato, barra visuale, percentuale
- Colori graduali: verde (0-70%), giallo (70-90%), arancione (90-100%), rosso (>100%)
- Click/tap apre il dettaglio transazioni di quella categoria nel mese
- Se non c'è allocazione per la categoria, non mostrare la barra
- Animazione CSS transition sulla width quando il valore cambia

COMPONENTE 2: BudgetOverview — sezione nella dashboard (NON pagina separata)

Specifiche:
- Header: "Budget [Mese Anno]" + totale allocato + totale speso + totale rimanente
- Lista di BudgetProgressBar per ogni categoria con allocazione attiva
- In fondo: importo "Non allocato" se total_income - sum(allocations) > 0
- Collapsibile: l'utente può minimizzarlo se preferisce vista classica
- Se non ci sono allocazioni, CTA: "Imposta il budget per questo mese"
- Se ci sono dati storici ma no budget, CTA smart: "Il mese scorso hai speso €X in Y — imposta un budget?"

COMPONENTE 3: BudgetSetup — pagina di configurazione mensile

Specifiche:
- Lista di tutte le categorie con input numerico per ciascuna
- Pre-compilazione intelligente (in ordine di priorità):
  - Se esiste piano mese precedente → copia quei valori (rollover)
  - Se no piano ma ci sono transazioni bancarie → suggerisci media ultimi 2-3 mesi
  - Se niente di tutto ciò → campi vuoti
- In alto: income totale dichiarato (opzionale)
- In basso: barra riepilogo totale allocato vs income, con evidenza "non assegnato"
- Pulsante "Salva piano" → upsert batch di tutte le allocazioni
- Pulsante "Copia mese precedente" se esiste un piano passato

COMPONENTE 4: Post-save feedback — micro-interazione dopo inserimento spesa

Specifiche:
- Toast/snackbar dopo salvataggio spesa: "Alimentari: €170 rimanenti su €350"
- Solo se la categoria ha un budget attivo per il mese corrente
- Se la spesa porta in overspend, evidenzia in rosso
- Durata: 3 secondi, dismissable
- Funziona sia per spese manuali che per categorizzazione di transazioni bancarie

### 3.4 Edge Case da Gestire

- Categoria eliminata con allocazione attiva: ON DELETE SET NULL o gestione esplicita
- Spesa con data in mese diverso: deve scalare dal budget del mese corretto (la vista SQL lo gestisce via to_char)
- Cambio categoria di una spesa: i contatori di entrambe le categorie si aggiornano automaticamente (la vista SQL ricalcola)
- Budget con importo 0: nessun division by zero, mostra 0%
- Transazione bancaria non categorizzata: non scala da nessun budget (corretto, perché senza categoria non ha senso)
- Mese senza piano: la dashboard funziona normalmente senza budget, mostra solo tracking

### 3.5 Checklist di Chiusura Fase 3

- [ ] Tabelle budget_allocations e budget_plans create con RLS
- [ ] Vista budget_status funzionante con dati da all_expenses (manuali + bancarie)
- [ ] BudgetOverview nella dashboard mostra progress bars per categoria
- [ ] BudgetSetup permette di creare/modificare il piano mensile
- [ ] Pre-compilazione intelligente basata su storico bancario funzionante
- [ ] Rollover da mese precedente funzionante
- [ ] Inserimento spesa manuale aggiorna i contatori in tempo reale
- [ ] Categorizzazione transazione bancaria aggiorna i contatori
- [ ] Overspend visualizzato chiaramente (rosso, negativo)
- [ ] Mese senza piano: nessun errore, tracking classico
- [ ] FEATURE FREEZE della PWA dichiarato — nessuna nuova feature da qui in poi

---

## FASE 4 — UX Audit con Google Stitch (Settimana 7)

L'app è ora feature-complete. Include: auth, tracking manuale, connessione bancaria, import automatico, categorizzazione a cascade, budget mensile per categoria. È il momento di rifinire l'esperienza utente.

### 4.1 Preparazione — Catalogare le Schermate

Fai screenshot di TUTTE le schermate della PWA completata:

1. Login / Auth
2. Dashboard principale CON budget attivo
3. Dashboard SENZA budget (tracking only)
4. Inserimento nuova spesa manuale
5. Lista transazioni bancarie importate
6. Review Inbox (transazioni da categorizzare)
7. Connessione banca (selezione istituto)
8. Budget Setup (configurazione allocazioni)
9. Dettaglio categoria con transazioni
10. Settings (connessioni bancarie, regole categorizzazione, profilo)
11. Empty states (primo accesso, nessuna transazione, nessuna connessione)

Per ogni screenshot, annota: cosa funziona bene, cosa è scomodo, cosa manca.

### 4.2 Prompt Strategy per Stitch

Template strutturato per ogni schermata:

```
CONTEXT: Personal finance app with open banking integration. Users connect 
their bank account, transactions are auto-imported and auto-categorized, 
monthly budgets show remaining amounts per category. Target: 25-45 year 
old professionals who want control without complexity.

CURRENT SCREEN: [descrizione + screenshot]

DESIGN DIRECTION: Clean, high-trust, mobile-first. Reference: Revolut 
(for banking feel) meets YNAB (for budget clarity). Must communicate 
security and control.

SPECIFIC REQUIREMENTS:
- [vincolo 1]
- [vincolo 2]

WHAT TO IMPROVE:
- [problema specifico 1]
- [problema specifico 2]

Generate 3 variations.
```

### 4.3 Ordine di Lavoro in Stitch

1. Dashboard principale (definisce il linguaggio visivo dell'intera app)
2. Budget progress bars / overview (il componente più visibile e nuovo)
3. Lista transazioni bancarie (deve comunicare che i dati sono reali e aggiornati)
4. Review Inbox (deve essere efficiente — l'utente vuole finire in fretta)
5. Inserimento spesa manuale
6. Budget Setup
7. Connessione banca (deve comunicare sicurezza e affidabilità)
8. Settings
9. Auth / Onboarding

### 4.4 Criteri di Valutazione Design

Per ogni variante prodotta da Stitch:

- Scannerability: in 2 secondi capisco lo stato del mio budget?
- Information hierarchy: i numeri importanti (rimanente per categoria) sono prominenti?
- Touch targets: bottoni almeno 44x44px, usabilità col pollice
- Consistenza: stesse azioni hanno stesso aspetto ovunque
- Accessibilità: contrasto sufficiente, colori funzionano per daltonici (non solo verde/rosso, usa anche forme/icone)
- Trust: le schermate banking comunicano sicurezza? (importa per un'app che si connette al conto)
- Densità: giusto equilibrio tra spazio vuoto e informazioni

### 4.5 Regole per Non Perdere Tempo

- Massimo 3 varianti per schermata
- Decisione entro 24 ore dalla generazione — non tornare indietro
- Non redesignare componenti che funzionano già bene
- Salva TUTTO: export Figma, codice HTML/CSS, DESIGN.md da Stitch
- Annota le decisioni con motivazioni ("scelto X perché Y")

### 4.6 Checklist di Chiusura Fase 4

- [ ] Mockup high-fidelity per tutte le schermate principali
- [ ] Una direzione di design scelta per l'intera app (non "ci penso dopo")
- [ ] Export Figma e/o codice HTML/CSS salvato per ogni schermata
- [ ] Decisioni di design documentate con motivazioni

---

## FASE 5 — Design Consolidation + PWA Polish (Settimane 8-9)

### 5.1 DESIGN.md — Single Source of Truth

Crea un file DESIGN.md nel repo della PWA:

```markdown
# Design System — Expense Tracker

## Colors
- Primary: #XXXX (azioni principali, CTA)
- Success: #XXXX (budget on track)
- Warning: #XXXX (budget 70-90%)
- Danger: #XXXX (budget >90%, overspend)
- Bank-connected: #XXXX (colore per indicare dati bancari vs manuali)
- Neutral scale: 50 → 900

## Typography
- Font family: [nome]
- Headings: pesi e dimensioni per H1-H4
- Body: peso, dimensione, line-height
- Numbers/amounts: font con tabular figures per allineamento cifre

## Spacing
- Base unit: Xpx
- Component padding, section gap, etc.

## Components
- Buttons (primary, secondary, ghost, danger)
- Input fields
- Cards
- Progress bars con specifiche colori per soglie budget
- Toast/snackbar
- Badge (per contatore review inbox)
- Bank connection card
- Transaction row (manuale vs bancaria — distinguibili visivamente?)
- Bottom navigation

## Screen Specifications
Per ogni schermata: layout grid, breakpoint, annotazioni
```

### 5.2 Applicare il Redesign alla PWA — Scope Ridotto

NON rifare tutto. Applica solo le 4 schermate ad alto impatto:
1. Dashboard + BudgetOverview
2. Lista transazioni (bancarie + manuali)
3. Inserimento spesa
4. Review Inbox

Lascia Settings, onboarding, e schermate secondarie com'è. Questo ti dà un prodotto presentabile con circa 1 settimana di lavoro.

### 5.3 Polish Checklist — Indipendente dal Redesign

Queste vanno fatte comunque:

- [ ] Loading states: skeleton/spinner per ogni schermata
- [ ] Error states: messaggio utile se Supabase o Enable Banking non rispondono
- [ ] Empty states: primo accesso mostra onboarding chiaro, non pagina vuota
- [ ] Stato "nessuna banca connessa": CTA chiara per connettere
- [ ] Stato "transazioni da categorizzare": badge visibile, non nascosto
- [ ] Feedback tattile: ogni azione ha risposta visiva (save, delete, categorize)
- [ ] Performance: dashboard sotto 2 secondi al primo load
- [ ] PWA installabile: manifest.json corretto, service worker, icone tutte le dimensioni
- [ ] Responsive: 320px-428px senza horizontal scroll
- [ ] Sicurezza percepita: HTTPS everywhere, no dati sensibili in localStorage, sessione auto-expire

### 5.4 Checklist di Chiusura Fase 5

- [ ] DESIGN.md completo nel repo
- [ ] PWA con design aggiornato (almeno le 4 schermate prioritarie)
- [ ] Tutti gli stati gestiti (loading, error, empty)
- [ ] PWA installabile e usabile come demo
- [ ] Nessun lavoro in sospeso sulla PWA

---

## FASE 6 — Preparazione Flutter (Settimana 10)

### 6.1 Non Scrivere Codice Flutter — Solo Preparazione

L'obiettivo è avere tutto pronto per sviluppare Flutter come pura esecuzione.

### 6.2 CONTEXT.md per il Repo Flutter

```markdown
# Expense Tracker — Flutter App

## What
App di personal finance con open banking integration per tracking 
automatico delle spese e budget mensile per categoria.
Mobile-first, iOS + Android. Backend: Supabase (condiviso con PWA).

## Core Features
1. Auth (email + biometria)
2. Connessione banca via Enable Banking (OAuth)
3. Import automatico transazioni bancarie
4. Categorizzazione automatica (MCC + regole + AI)
5. Review inbox per transazioni non categorizzate
6. Inserimento spese manuali
7. Budget mensile per categoria (envelope budgeting)
8. Dashboard con budget status in tempo reale

## Existing Infrastructure
- Supabase project: [URL]
- Auth: email + password
- Database: PostgreSQL con RLS
- Edge Functions: banking-auth, banking-sync, classify-transactions
- Tabelle: users, categories, transactions, bank_connections, 
  bank_transactions, budget_allocations, budget_plans, 
  categorization_rules, mcc_category_mapping
- Viste: all_expenses, budget_status

## Design Reference
- DESIGN.md in questo repo
- Mockup Figma: [link]
- PWA funzionante come reference: [URL]
```

### 6.3 CLAUDE.md per Claude Code

```markdown
# Claude Code Instructions — Expense Tracker Flutter

## Stack
- Flutter 3.x stable
- State management: Riverpod
- Routing: GoRouter
- Backend: supabase_flutter
- Local storage: Hive per cache offline
- Testing: flutter_test + integration_test

## Architecture
- Feature-first folder structure:
  /lib
    /features
      /auth
      /banking        (connessione banca, sync)
      /transactions   (lista, dettaglio, inserimento manuale)
      /categorization (review inbox, regole)
      /budget         (setup, overview, progress bars)
      /settings
    /core
      /supabase       (client, repositories)
      /theme          (design tokens da DESIGN.md)
      /widgets        (componenti condivisi)

## Conventions
- Dart null-safety strict
- File names: snake_case
- Un file per widget, max ~200 righe
- Costanti design in theme.dart centralizzato
- Nessun magic number

## Supabase Integration
- Auth: supabase_flutter gestisce sessione e refresh
- RLS attivo — filtrare per user_id anche lato client per sicurezza
- Usare la vista budget_status per dati aggregati
- Usare la vista all_expenses per dati unificati
- Edge Functions: chiamare via supabase.functions.invoke()

## Enable Banking in Flutter
- Il flusso OAuth apre il browser di sistema (url_launcher)
- Il callback torna nell'app via deep link (app scheme)
- Configurare deep link in AndroidManifest.xml e Info.plist
- Il resto della logica è identico: chiama Edge Functions

## Priorità MVP Flutter
1. Auth (email + biometria via local_auth)
2. Dashboard con budget overview
3. Connessione banca + sync
4. Review inbox categorizzazione
5. Inserimento spesa manuale
6. Budget setup mensile
7. Settings (connessioni, regole, profilo)
```

### 6.4 Backlog Strutturato

```
MILESTONE 1 — Foundation
- [ ] Scaffold progetto Flutter + dipendenze
- [ ] Configurazione supabase_flutter
- [ ] Theme system da DESIGN.md
- [ ] Auth flow (login, registrazione, sessione, logout)
- [ ] Biometric lock (local_auth)
- [ ] Deep link configuration (per callback Enable Banking)

MILESTONE 2 — Banking
- [ ] Pagina connessione banca (lista banche italiane)
- [ ] Flusso OAuth via browser di sistema
- [ ] Callback handler via deep link
- [ ] Sync transazioni (primo sync + refresh)
- [ ] Lista transazioni bancarie
- [ ] Gestione connessioni in Settings

MILESTONE 3 — Categorizzazione
- [ ] Review Inbox
- [ ] Categorizzazione manuale con creazione regola
- [ ] Badge contatore non categorizzate
- [ ] Gestione regole in Settings

MILESTONE 4 — Budget
- [ ] Dashboard con BudgetOverview
- [ ] Progress bars per categoria
- [ ] Budget Setup screen
- [ ] Rollover mese precedente
- [ ] Pre-compilazione da storico

MILESTONE 5 — Core UX
- [ ] Inserimento spesa manuale
- [ ] Dettaglio categoria con transazioni
- [ ] Post-save feedback con stato budget

MILESTONE 6 — Polish & Release
- [ ] Empty states e onboarding
- [ ] Error handling robusto
- [ ] Offline mode basico (cache Hive)
- [ ] Notifiche locali (reminder, alert budget)
- [ ] App icon, splash screen
- [ ] Play Store / App Store listing
- [ ] Beta testing (Firebase App Distribution / TestFlight)
```

### 6.5 Package Flutter da Valutare

| Funzionalità | Package | Note |
|---|---|---|
| Supabase | supabase_flutter | SDK ufficiale |
| State management | flutter_riverpod | Leggero, moderno |
| Routing | go_router | Standard de facto, supporta deep links |
| Biometria | local_auth | Fingerprint + FaceID |
| Browser OAuth | url_launcher | Per aprire flusso Enable Banking |
| Deep links | app_links (Android) + universal_links (iOS) | Per callback OAuth |
| Charts | fl_chart | O custom se serve più controllo |
| Icone app | flutter_launcher_icons | Genera icone per tutti i formati |
| Splash | flutter_native_splash | Splash screen nativa |
| Notifiche | flutter_local_notifications | Reminder e alert budget |
| Cache | hive_flutter | Offline storage leggero |
| Internazionalizzazione | flutter_localizations + intl | Se multi-lingua |

### 6.6 Checklist di Chiusura Fase 6

- [ ] Repo Flutter creato con struttura cartelle
- [ ] CONTEXT.md e CLAUDE.md nel repo
- [ ] DESIGN.md copiato/referenziato
- [ ] Backlog con ticket ordinati
- [ ] Package scelti e documentati
- [ ] Deep link scheme deciso e documentato
- [ ] supabase_flutter testato (almeno auth)
- [ ] Pronto per sviluppo Flutter puro

---

## Anti-Pattern — Cosa NON Fare

NON aggiungere feature alla PWA dopo la Fase 3. Il budget allocation è l'ULTIMA feature. Export CSV, grafici avanzati, multi-valuta, dark mode, recurring transactions → vanno in IDEAS.md per Flutter, non nella PWA.

NON iniziare Flutter durante le fasi 1-5. Il context-switching tra Vue/TypeScript e Dart/Flutter è costoso. Finisci la PWA, stacca, poi inizia Flutter.

NON generare troppe varianti in Stitch. 3 per schermata, decisione entro 24 ore. La paralisi da scelta è reale.

NON ottimizzare il database prematuramente. Con un utente e qualche centinaio di transazioni al mese, Supabase non ha problemi di performance. Materialized views e ottimizzazioni quando avrai migliaia di utenti.

NON implementare il Layer 3 AI prima che i Layer 1 e 2 funzionino bene. L'AI classification è un enhancement, non un requisito. Le regole MCC + pattern matching coprono già il 70-80% delle transazioni comuni.

NON pubblicare sugli store senza beta testing. Almeno 1-2 settimane con 5-10 persone reali su device reali. Firebase App Distribution e TestFlight sono gratuiti.

NON trascurare il listing sugli store. Il 90% degli utenti decide in 7 secondi dalla pagina store. Screenshot professionali, descrizione con keyword, icona riconoscibile. Puoi usare Stitch anche per mockup delle screenshot store.

NON dimenticare la scadenza del consenso bancario. Il consenso Enable Banking dura tipicamente 90-180 giorni. L'app deve notificare l'utente quando sta per scadere e guidarlo al rinnovo. Senza questo, l'utente perde l'import automatico e non capisce perché.

---

## Timeline Riassuntiva

```
Sett. 1:    Fase 1a — Setup Enable Banking + DB + Edge Functions
Sett. 2:    Fase 1b — Frontend OAuth + sync + lista transazioni
Sett. 3:    Fase 2a — MCC mapping + regole sistema + logica cascade
Sett. 4:    Fase 2b — Review Inbox UI + regole utente + (opz.) AI Layer 3
Sett. 5:    Fase 3a — DB budget + vista budget_status + BudgetSetup
Sett. 6:    Fase 3b — BudgetOverview + progress bars + integrazione + test
Sett. 7:    Fase 4  — Screenshot PWA → Stitch audit → scelta design
Sett. 8:    Fase 5a — DESIGN.md + applicazione redesign 4 schermate chiave
Sett. 9:    Fase 5b — Polish (loading/error/empty states, performance, PWA)
Sett. 10:   Fase 6  — Prep Flutter (repo, docs, backlog, package eval)
Sett. 11+:  Flutter development (fuori scope di questo piano)
```

---

## Schema Riassuntivo del Database Finale

Al completamento delle Fasi 1-3, il database avrà questa struttura:

```
TABELLE ESISTENTI (già presenti nella PWA):
├── users (auth.users di Supabase)
├── categories (categorie spese personalizzabili dall'utente)
└── transactions (spese manuali inserite dall'utente)

TABELLE FASE 1 — Banking:
├── bank_connections (connessioni banca attive/scadute)
└── bank_transactions (transazioni importate dalla banca)

TABELLE FASE 2 — Categorizzazione:
├── categorization_rules (regole utente per auto-categorizzazione)
└── mcc_category_mapping (tabella globale codici MCC → categoria)

TABELLE FASE 3 — Budget:
├── budget_allocations (importo allocato per categoria/mese)
└── budget_plans (metadata piano mensile: income, note)

VISTE:
├── all_expenses (unifica transactions + bank_transactions per il budget)
└── budget_status (allocated vs spent per categoria/mese, da all_expenses)
```

Tutte le tabelle utente hanno RLS attivo con policy su auth.uid() = user_id.
La tabella mcc_category_mapping è globale (no RLS, read-only per gli utenti).
