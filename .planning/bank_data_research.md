# Research: Enable Banking API — Formato Transazioni per Banche Italiane

> Data ricerca: 2026-04-05
> Autore: AI Research Agent (Claude)
> Scopo: Migliorare `classify-transactions` per coprire più banche italiane ed europee

---

## 1. Documentazione Ufficiale Enable Banking (EB) — Formato Transazioni

### 1.1 Schema del Transaction Object

L'API Enable Banking (`api.enablebanking.com`) restituisce le transazioni tramite l'endpoint:

```
GET /accounts/{account_id}/transactions
```

Risposta: `HalTransactions` con array `transactions[]` e opzionale `continuation_key`.

**Tutti i campi del Transaction Object** (fonte: [API Reference EB](https://enablebanking.com/docs/api/reference/)):

| Campo EB | Tipo | Note |
|---|---|---|
| `entry_reference` | string | ID nativo banca. **Spesso assente** per acquisti carta prepagata (es. Fineco) |
| `transaction_id` | string | ID alternativo; nullato per connector dove non disponibile (changelog Feb 2024) |
| `transaction_date` | date | Data operazione (nullable) |
| `booking_date` | date | Data registrazione nel conto |
| `value_date` | date | Data valuta |
| `transaction_amount` | `{amount, currency}` | Importo sempre positivo; segno da `credit_debit_indicator` |
| `credit_debit_indicator` | enum | `CRDT` o `DBIT` |
| `status` | enum | `BOOK` (prenotata) o `PDNG` (in sospeso) |
| `remittance_information` | `string[]` | **Array di stringhe** — testo libero rimessa/causale |
| `creditor` | `{name, postal_address}` | Beneficiario (strutturato) |
| `creditor_account` | `{iban, scheme}` | IBAN beneficiario |
| `creditor_agent` | `{bic_fi, name}` | Banca beneficiario |
| `debtor` | `{name, postal_address}` | Ordinante (strutturato) |
| `debtor_account` | `{iban, scheme}` | IBAN ordinante |
| `debtor_agent` | `{bic_fi, name}` | Banca ordinante |
| `merchant_category_code` | string | Codice MCC ISO 18245 (nullable, spesso assente) |
| `bank_transaction_code` | `{code, sub_code}` | Codice ISO 20022 (es. `PMNT-CCRD-POSD`) |
| `balance_after_transaction` | `{amount, currency}` | Saldo post-transazione (nullable) |
| `reference_number` | string | Riferimento (es. RF07...) |
| `reference_number_schema` | enum | `SEBG`, `FIRF`, `INTL`, ecc. |
| `note` | string | Note aggiuntive (nullable, raramente popolato) |
| `exchange_rate` | object | FX per transazioni multi-valuta |

**Come viene usato nel banking-sync.ts del progetto:**

```typescript
description: (tx.remittance_information || []).join(' ').trim() || null,
counterpart_name: tx.credit_debit_indicator === 'DBIT'
  ? tx.creditor?.name || null
  : tx.debtor?.name || null,
counterpart_iban: tx.credit_debit_indicator === 'DBIT'
  ? tx.creditor_account?.iban || null
  : tx.debtor_account?.iban || null,
merchant_category_code: tx.merchant_category_code || null,
bank_transaction_code: tx.bank_transaction_code || null,
```

Quindi:
- `description` = join di `remittance_information[]`
- `counterpart_name` = `creditor.name` (se uscita) o `debtor.name` (se entrata)
- `merchant_category_code` = passato direttamente se disponibile

### 1.2 Esempio Concreto (Danske Bank Synthetic Sample)

Fonte: https://enablebanking.com/sample-data/DK-Danske_Bank-synthetic-1.json

```
Transazione 1 — Pagamento ristorante (DBIT)
  entry_reference: "2509656"
  amount: 49.0 DKK
  credit_debit_indicator: "DBIT"
  merchant_category_code: "5812"   (Food/Beverage — Ristoranti)
  creditor.name: "MobilePay Martin Larsen"
  bank_transaction_code: {code: "MerchantCardTransactions", sub_code: "Point-of-Sale(POS)Payment"}
  remittance_information: ["MobilePay Martin Larsen"]

Transazione 2 — Stipendio (CRDT)
  entry_reference: "D126890141"
  amount: 18350.0 DKK
  credit_debit_indicator: "CRDT"
  merchant_category_code: null
  debtor.name: "AXB LTD A/S"
  bank_transaction_code: {code: "ReceivedCreditTransfers"}
  remittance_information: ["Løn September\nWe have received..."]

Transazione 3 — Acquisto e-commerce internazionale (DBIT)
  entry_reference: "0489597555"
  amount: 1131.35 DKK
  credit_debit_indicator: "DBIT"
  merchant_category_code: "5571"   (Sporting Goods/Motorcycle shops)
  creditor.name: "hollandbikeshop.com"
  bank_transaction_code: {code: "CustomerCardTransactions", sub_code: "Cross-BorderCreditCardPayment"}
```

**Conclusione dal sample data:**
- MCC presente per transazioni carta → altamente affidabile
- `creditor.name` = nome merchant pulito per pagamenti POS/carta
- `remittance_information` = spesso contiene lo stesso valore di `creditor.name` per acquisti carta
- `debtor.name` per accrediti = nome del mittente (utile per stipendio/rimborsi)

---

## 2. Pattern Specifici per Banca

### 2.1 N26

**Standard:** Berlin Group NextGenPSD2 v1.3.6
**Fonte:** [n26/psd2-tpp-docs GitHub](https://github.com/n26/psd2-tpp-docs)

**Bank Transaction Codes N26:**

| Tipo transazione | bankTransactionCode |
|---|---|
| Pagamento carta (autorizzazione) | `PMNT-MCRD-UPCT` |
| Pagamento carta (presentment/addebito definitivo) | `PMNT-CCRD-POSD` |
| Storno carta | `PMNT-MCRD-DAJT` / `PMNT-MCRD-OTHR` |
| Bonifico SEPA inviato | `PMNT-ICDT-ESCT` |
| Bonifico SEPA ricevuto | `PMNT-RCDT-ESCT` |
| Addebito diretto SEPA | `PMNT-IDDT-ESDD` |
| Storno SDD | `PMNT-IDDT-PRDD` |
| Prelievo ATM | `PMNT-CCRD-CWDL` |
| Deposito contanti | `PMNT-CNTR-CDPT` |
| Commissioni/spese | `PMNT-MDOP-FEES` |
| Interessi risparmio | `PMNT-MCOP-INTR` |
| Moneybeam (trasferimento interno N26) | `PMNT-ICDT-BOOK` |

**Campi chiave N26:**

- `creditorName`: **Presente** — nome merchant per pagamenti carta e bonifici
- `remittanceInformationUnstructured`: **Aggiunto da aprile 2022** — causale testo libero
- `additionalInformation`: Campo speciale usato come **ID di collegamento tra autorizzazione e presentment** della stessa operazione carta
- MCC: Non documentato come campo standard, probabilmente assente o opzionale

**Esempio JSON N26 (da documentazione ufficiale):**

```json
{
  "transactionId": "26e6eccd-2753-45b8-abc8-050207849edc",
  "creditorName": "partner name",
  "creditorAccount": {
    "iban": "DE65100110011234567890"
  },
  "transactionAmount": {
    "amount": "-10.0",
    "currency": "EUR"
  },
  "bookingDate": "2021-07-05",
  "valueDate": "2021-07-05",
  "remittanceInformationUnstructuredArray": ["Debited transaction"],
  "bankTransactionCode": "PMNT-RCDT-ESCT"
}
```

**Note pratiche N26 con Enable Banking:**
- Per pagamenti carta: `creditor.name` = nome merchant; `remittance_information` può contenere stesso valore
- Per Moneybeam: `bank_transaction_code.code` = `PMNT-ICDT-BOOK` → identificabile come trasferimento interno
- Il campo `additionalInformation` non è mappato direttamente nello schema EB pubblico

---

### 2.2 Intesa Sanpaolo

**Standard:** CBI Globe (piattaforma comune + implementazione propria)
**Fonte:** [Enable Banking Italy docs](https://enablebanking.com/docs/markets/it), [OpenBankingTracker](https://www.openbankingtracker.com/provider/intesa-sanpaolo)

**Caratteristiche:**
- Autenticazione: Redirect con SCA via app mobile Intesa Sanpaolo
- Un solo consent attivo per TPP per utente (attenzione: nuovi consent invalidano i precedenti)
- Supporta SEPA Credit Transfer e Instant SEPA (SCT Inst)
- Credit card: **Non accessibile** via PSD2 API (solo conti correnti)

**Campi transazione Intesa Sanpaolo con EB:**
- `remittance_information[]`: Presente — contiene causale bonifico o descrizione acquisto
- `creditor.name` / `debtor.name`: Presente per bonifici; per acquisti carta POS **può essere vuoto** (solo remittance)
- `merchant_category_code`: **Non noto** — probabilmente assente per la maggior parte delle tx
- `bank_transaction_code`: Presente ma con valori proprietari CBI

**Pattern descrizioni tipiche (da conoscenza del dominio bancario italiano):**
- Bonifici in uscita: `"BONIFICO A NOME [Nome] [Causale]"`
- Bonifici in entrata: `"ACCREDITO BONIFICO DA [Nome] [Causale]"`
- Addebiti SDD: `"ADDEBITO DIRETTO SEPA [Creditor]"`
- Pagamenti POS (quando descrizione disponibile): `"PAGAMENTO POS [Merchant] [Città]"`
- Canoni: `"CANONE MENSILE"`, `"IMPOSTA DI BOLLO"`
- F24: `"PAGAMENTO F24"`

---

### 2.3 UniCredit

**Standard:** Implementazione propria Berlin Group (non esclusivamente CBI Globe)
**Fonte:** [UniCredit Developer Portal](https://developer.unicredit.eu), [Enable Banking changelog Feb 2024]

**Caratteristiche:**
- Autenticazione: Redirect con member code + PIN + OTP SMS o push
- Rimosso il flag beta da Enable Banking in febbraio 2024 (stabile)
- Credit card: **Non accessibile** via PSD2 API
- Supporta SEPA e Instant SEPA

**Campi transazione UniCredit:**
- `remittance_information[]`: Presente — spesso la causale come inserita dal mittente/destinatario
- `creditor.name` / `debtor.name`: Presente per bonifici SEPA
- Per pagamenti carta: descrizione spesso in `remittance_information` con formato proprietario
- `merchant_category_code`: **Raramente popolato** — UniCredit non è noto per esporre MCC via PSD2

**Pattern descrizioni UniCredit:**
- Possono contenere riferimenti interni lunghi + nome merchant
- Es.: `"PAGO BANCOMAT VISAPAY MERCHANT NAME CITTA' DATA"` (formato con spazi e maiuscolo)

---

### 2.4 Widiba (controllata MPS)

**Standard:** CBI Globe
**Fonte:** [Banca Widiba OpenBankingTracker](https://www.openbankingtracker.com/provider/banca-widiba)

**Caratteristiche:**
- Widiba è una banca digitale del gruppo Monte dei Paschi
- Si affida alla piattaforma CBI Globe per le API PSD2
- Transazioni ultime 90 giorni (limite GoCardless/Nordigen)

**Campi transazione Widiba:**
- Essendo su CBI Globe: schema standardizzato ma implementazione minimale
- `remittance_information[]`: Presente ma spesso con poco dettaglio
- `creditor.name`: Presente per bonifici; per carta può essere limitato
- `merchant_category_code`: Non noto, probabilmente assente

---

### 2.5 Illimity

**Standard:** Berlin Group NextGenPSD2 v1.3 via piattaforma **Fabrick**
**Fonte:** [Illimity Developer Portal](https://www.illimity.com/it/illimity-developer-portal), [OpenBankingTracker](https://www.openbankingtracker.com/provider/illimity)

**Caratteristiche:**
- Illimity espone le API tramite il partner fintech Fabrick
- Berlin Group v1.3 — campo `merchantCategoryCode` definito nello standard

**Campi transazione Illimity:**
- `remittance_information[]`: Presente
- `creditorName` / `debtorName`: Presente per bonifici
- `merchantCategoryCode`: Potenzialmente disponibile (Fabrick/Illimity sono avanzati tecnologicamente)
- Qualità dati superiore rispetto a banche tradizionali grazie a stack Fabrick

---

### 2.6 BNL (Banca Nazionale del Lavoro)

**Standard:** CBI Globe
**Fonte:** [Enable Banking changelog Feb 2024] — rimosso flag beta, connector stabile

**Caratteristiche:**
- Fa parte del gruppo BNP Paribas
- CBI Globe come interfaccia PSD2
- Rimosso beta da EB in febbraio 2024

**Campi transazione BNL:**
- `remittance_information[]`: Presente — formato CBI
- `creditor.name` / `debtor.name`: Presente per bonifici
- `merchant_category_code`: Non noto — probabilmente assente
- Acquisti carta: la descrizione può avere il formato CBI con prefissi tipo `"PAGAMENTO POS"` + merchant

---

### 2.7 Banca Mediolanum

**Standard:** Implementazione propria (non esclusivamente CBI Globe)
**Fonte:** [Enable Banking changelog Feb 2024] — aggiunta Payment Initiation SEPA/BULK, rimosso beta

**Caratteristiche:**
- Credit card: **Non accessibile** via PSD2 API (confermato da EB docs)
- Connector stabile dal febbraio 2024 con aggiunta PISP
- Autenticazione redirect

**Campi transazione Mediolanum:**
- `remittance_information[]`: Presente
- `creditor.name` / `debtor.name`: Presente per bonifici
- `merchant_category_code`: Non documentato

---

### 2.8 ING Italia

**Standard:** Implementazione propria ING (Berlin Group)
**Fonte:** [ING Developer Portal](https://developer.ing.com), [Enable Banking changelog July 2024]

**Caratteristiche:**
- Abilitato da EB per l'Italia in luglio 2024 (aggiornamento changelog EB)
- ING supporta sia conti correnti che carte prepagati e carte di credito (unico tra banche IT)
- Usa standard Berlin Group con piccole estensioni proprietarie

**Campi transazione ING:**
- `remittance_information[]`: Presente — causale trasferimento
- `creditorName` / `debtorName`: Presente per SEPA
- Pagamenti carta: il merchant può stare in `creditorName` o `remittanceInformationUnstructured`
- `additionalInformation`: ING usa questo campo — contiene dettagli aggiuntivi sulla transazione
- `merchantCategoryCode`: Potenzialmente disponibile (ING è noto per la qualità dei dati)

**Formato MT940 ING (per confronto):**
ING ha un formato MT940 dettagliato che include sequenze proprietarie per tipo di transazione, che si riflette nel formato PSD2. Le transazioni carte spesso hanno il merchant name in posizione fissa nella stringa remittance.

---

### 2.9 Postepay / BancoPoste (Poste Italiane)

**Standard:** CBI Globe esclusivamente
**Fonte:** [Poste Italiane Open Banking](https://www.posteitaliane.it/en/open-banking.html), [Enable Banking changelog March 2024]

**Caratteristiche:**
- **BancoPoste** e **Postepay S.p.A.** sono due entità separate — l'utente deve scegliere al momento del consenso
- Autenticazione: PosteID per entrambe
- Fix specifico in EB marzo 2024: "Fix account transactions request" per Postepay (IT) — indica problemi pregressi con la fetch delle transazioni
- CBI Globe come unica interfaccia

**Campi transazione Postepay:**
- `remittance_information[]`: Presente ma formato variabile (storico problematico)
- Per ricariche Postepay Evolution: la `remittance_information` contiene tipo operazione + merchant
- `creditor.name` / `debtor.name`: Presente per bonifici; per operazioni carta limitato
- `merchant_category_code`: Non noto — CBI Globe spesso non espone MCC

**Attenzione speciale:**
La Postepay è principalmente una carta prepagata — la maggior parte delle transazioni sono acquisti carta POS dove il merchant name può non essere disponibile come campo strutturato. Spesso finisce tutto in `remittance_information` come stringa non strutturata.

---

## 3. Differenze Strutturali Chiave tra Banche

### 3.1 Dove si trova il nome del merchant

| Banca | Campo principale | Campo fallback | Note |
|---|---|---|---|
| N26 | `creditor.name` | `remittance_information[0]` | Molto affidabile; creditor.name pulito |
| Intesa Sanpaolo | `remittance_information[]` | `creditor.name` | Causale in remittance; creditor.name per bonifici |
| UniCredit | `remittance_information[]` | `creditor.name` | Formato spesso tutto maiuscolo |
| Widiba | `remittance_information[]` | `creditor.name` | CBI Globe; dati moderatamente dettagliati |
| Illimity | `creditor.name` | `remittance_information[]` | Stack Fabrick → qualità alta |
| BNL | `remittance_information[]` | `creditor.name` | CBI Globe standard |
| Mediolanum | `remittance_information[]` | `creditor.name` | Connessione stabile dal 2024 |
| ING Italia | `creditor.name` | `remittance_information[]` + `additionalInformation` | Dati ricchi; card supported |
| Postepay | `remittance_information[]` | (limitato) | Transazioni carta spesso senza merchant strutturato |
| BancoPoste | `remittance_information[]` | `creditor.name` | CBI Globe standard |

### 3.2 Presenza MCC (merchant_category_code)

| Banca | MCC disponibile? | Note |
|---|---|---|
| N26 | Probabilmente NO | Non documentato nel PSD2 spec N26 |
| Intesa Sanpaolo | NO / raramente | Non esposto via CBI Globe |
| UniCredit | NO / raramente | Non documentato |
| Widiba | NO | CBI Globe non espone MCC |
| Illimity | FORSE | Stack avanzato Fabrick potrebbe includerlo |
| BNL | NO | CBI Globe |
| Mediolanum | NO / raramente | Non documentato |
| ING Italia | POSSIBILE | ING ha infrastruttura avanzata |
| Postepay | NO | CBI Globe, carta prepagata |
| BancoPoste | NO | CBI Globe |
| **Danske/Nordiche** | **SÌ** | Berlin Group nordico lo fornisce sistematicamente |

**Conclusione:** In Italia, l'MCC è raramente disponibile. Il sistema attuale (Layer 0 MCC nel classify-transactions) è corretto come approccio ma avrà bassissimo hit rate per banche italiane. Le banche nordeuropee e N26 sono le più affidabili per MCC.

### 3.3 Presenza del bank_transaction_code

| Livello | Formato | Esempio | Note |
|---|---|---|---|
| Berlin Group ISO 20022 | `PMNT-CCRD-POSD` | Pagamento carta POS | N26, ING, Illimity |
| CBI Globe proprietario | Codice testo | es. `"12"` con desc `"Utlandsbetalning"` | Intesa, BNL, Mediolanum, Widiba |
| Assente | null | — | Alcune tx carta prepagata Postepay |

Il `bank_transaction_code` in EB è `{code, sub_code}` dove `code` può essere:
- Un codice ISO 20022 strutturato (banche Berlin Group compliant): identificabile come `PMNT-*-*`
- Un codice/testo proprietario della banca: meno standardizzato
- Una stringa descrittiva: es. `"CustomerCardTransactions"`

### 3.4 Transazioni carta prepagata senza dati utili

**Problema noto** (già gestito in `isEmptyCardTransaction()`):
Le transazioni carta prepagata — tipicamente Fineco, Postepay — arrivano **senza** `entry_reference`, senza `transaction_id`, con `remittance_information` vuota o solo `"transazione"`. Questo è un limite delle banche che non espongono i dettagli POS tramite PSD2.

**Esempio transazione "vuota" Fineco carta prepagata:**
```json
{
  "entry_reference": null,
  "transaction_id": null,
  "remittance_information": ["transazione"],
  "creditor": null,
  "merchant_category_code": null,
  "bank_transaction_code": null,
  "credit_debit_indicator": "DBIT",
  "transaction_amount": {"amount": "15.50", "currency": "EUR"}
}
```

---

## 4. Pattern Descrizioni Transazioni per Banca (Italia)

### 4.1 Prefissi comuni per tipo di transazione

**Formato "tutto maiuscolo" — tipico di CBI Globe (Intesa, BNL, BPER, Mediolanum, Widiba):**
```
PAGAMENTO POS - [MERCHANT] [CITTA'] [DATA]
BONIFICO ACCREDITO - [NOME MITTENTE] - [CAUSALE]
ADDEBITO DIRETTO SEPA - [COMPANY] - [ID MANDATO]
RICARICA CARTA PREPAGATA - [NUMERO CARTA]
GIROCONTO - [DESCRIZIONE]
ACCREDITO STIPENDIO - [AZIENDA]
IMPOSTA DI BOLLO
CANONE MENSILE
SPESE TENUTA CONTO
F24 - [IMPORTO]
```

**N26 — formato più pulito:**
```
[Nome Merchant] (in creditor.name per pagamenti carta)
[Causale bonifico] (in remittanceInformationUnstructured)
```
- N26 è noto per restituire il nome del merchant pulito in `creditor.name` senza prefissi
- La causale dei bonifici Moneybeam è in `remittanceInformationUnstructured`

**ING Italia — formato misto:**
```
[Nome merchant in creditor.name]
[additionalInformation] = dettagli aggiuntivi
```
ING ha dati generalmente di buona qualità per le banche europee.

**Postepay:**
```
RICARICA [MODALITÀ]
ACQUISTO POS [CIRCUITO] [MERCHANT]
PRELIEVO ATM [CITTA']
ACCREDITO [TIPO]
```

**Intesa Sanpaolo (formato storico da app e estratti conto):**
```
PAGAMENTO CON CARTA PRESSO [MERCHANT] [CITTA'] [NAZIONE]
BONIFICO A FAVORE DI [NOME] - [CAUSALE]
ACCREDITO BONIFICO DA [NOME] - [CAUSALE]
ADDEBITO SDD [COMPANY] - [DESCRIZIONE]
ACCREDITO STIPENDIO
```

### 4.2 HYPE (già gestito in classify-transactions)

**Fonte:** Commento nel codice esistente (`extractMerchantName`)

HYPE usa il prefisso `"PAGAMENTO PRESSO "` per i pagamenti POS/carta:
```
PAGAMENTO PRESSO APPLE.COM/BILL CORK IE
PAGAMENTO PRESSO AMAZON.IT
PAGAMENTO PRESSO ESSELUNGA S.P.A. MILANO
```

Il sistema già rimuove questo prefisso con:
```typescript
cleaned = cleaned.replace(/^PAGAMENTO\s+PRESSO\s+/i, '')
```

### 4.3 Fineco (già gestito parzialmente)

Il sistema gestisce già il boilerplate Fineco:
```
Carta N. ****1234  [MERCHANT]  Data operazione 01/01/2024
Dt-ord: 01/01/2024  Banca Ord: BANCA XYZ  Ord: MARIO ROSSI  Ben: [MERCHANT]  Causale: [TESTO]
```

---

## 5. Confronto con GoCardless/Nordigen (Alternative a EB)

GoCardless (ex-Nordigen) usa camelCase e nomi leggermente diversi ma struttura equivalente:

| Enable Banking | GoCardless/Nordigen | Note |
|---|---|---|
| `remittance_information[]` | `remittanceInformationUnstructured` | Stesso concetto |
| `creditor.name` | `creditorName` | Stesso campo |
| `debtor.name` | `debtorName` | Stesso campo |
| `creditor_account.iban` | `creditorAccount.iban` | Stesso |
| `bank_transaction_code` | `proprietaryBankTransactionCode` | GoCardless usa campo proprietario |
| `merchant_category_code` | Non standard in GoCardless | EB è più completo |

**Esempio GoCardless (da documentazione ufficiale):**
```json
{
  "transactionId": "2020103000624289-1",
  "debtorName": "MON MOTHMA",
  "debtorAccount": {"iban": "GL53SAFI055151515"},
  "transactionAmount": {"currency": "EUR", "amount": "45.00"},
  "bookingDate": "2020-10-30",
  "remittanceInformationUnstructured": "For the support of Restoration of the Republic foundation"
}
```

---

## 6. Standard Berlin Group (Base Tecnica)

La maggior parte delle banche europee, incluse quelle italiane, implementano il **Berlin Group NextGenPSD2 XS2A Framework** (versione corrente: 1.3.x).

**Campi chiave nel Transaction Object Berlin Group:**

- `creditorName` — nome del beneficiario
- `debtorName` — nome dell'ordinante
- `remittanceInformationUnstructured` — causale testo libero (stringa o array)
- `remittanceInformationStructured` — causale strutturata (riferimento)
- `additionalInformation` — campo aperto per info extra
- `merchantCategoryCode` — MCC ISO 18245 (**opzionale, le banche NON sono obbligate a fornirlo**)
- `bankTransactionCode` — codice ISO 20022 o proprietario
- `proprietaryBankTransactionCode` — alternativa proprietaria

**Punto critico sul MCC (da OpenBankingTracker):**
> "The values of this object are not normalized and the meaning and format could differ per PSD2-framework or even per bank. Banks are NOT required to provide this field."

---

## 7. Raccomandazioni per Migliorare `classify-transactions`

### 7.1 Miglioramenti all'estrazione del nome merchant

**Problema attuale:** `extractMerchantName()` gestisce solo Fineco e il prefisso HYPE generico.

**Raccomandazioni:**

1. **Aggiungere pattern per CBI Globe (Intesa, BNL, Mediolanum, Widiba, Postepay):**
   ```typescript
   // Rimuovi prefissi POS italiani comuni
   cleaned = cleaned.replace(/^PAGAMENTO\s+(CON\s+CARTA|POS)\s+(PRESSO\s+)?/i, '')
   cleaned = cleaned.replace(/^ACQUISTO\s+POS\s+/i, '')
   cleaned = cleaned.replace(/^ADDEBITO\s+POS\s+/i, '')
   
   // Rimuovi suffissi data e città tipici CBI Globe
   // Es. "ESSELUNGA MILANO 25/03/24" → "ESSELUNGA MILANO"
   cleaned = cleaned.replace(/\s+\d{2}\/\d{2}\/\d{2,4}\s*$/i, '')
   
   // Rimuovi circuito carta finale
   cleaned = cleaned.replace(/\s+(VISA|MASTERCARD|MAESTRO|VPAY|AMEX)\s*$/i, '')
   ```

2. **Aggiungere pattern per N26 Moneybeam:**
   ```typescript
   // N26 Moneybeam: il bank_transaction_code contiene "PMNT-ICDT-BOOK"
   // già gestito come trasferimento interno (PMNT-ICDT-BOOK → book transfer)
   ```

3. **Migliorare il riconoscimento per bonifici strutturati (prefix stripping):**
   ```typescript
   // Intesa/UniCredit/BNL: estrai la causale utile dopo il nome
   cleaned = cleaned.replace(/^BONIFICO\s+(A\s+FAVORE\s+DI|ACCREDITO|DA)\s+/i, '')
   cleaned = cleaned.replace(/^ACCREDITO\s+BONIFICO\s+(DA\s+)?/i, '')
   ```

### 7.2 Migliorare `deterministicCategory()`

1. **Aggiungere riconoscimento via `bank_transaction_code` per banche Berlin Group:**
   ```typescript
   const btc = tx.bank_transaction_code?.code || tx.bank_transaction_code?.sub_code || ''
   
   // Pagamento POS (carta) → non classificare come categoria specifica senza merchant name
   // ma è utile per debug
   if (/PMNT-CCRD-POSD|CustomerCardTransactions.*POS/i.test(btc)) {
     // Card payment confermato → usa merchant name da creditor.name
   }
   
   // Stipendio via SEPA credit
   if (/PMNT-RCDT-SALA|salary|payroll/i.test(btc)) return 'Stipendio'
   
   // Prelievo ATM
   if (/PMNT-CCRD-CWDL|ATMwithdrawal/i.test(btc)) return 'Prelievi'
   
   // Addebito diretto (utenze, abbonamenti)
   if (/PMNT-IDDT-ESDD/i.test(btc)) {
     // SEPA Direct Debit → potenzialmente Bollette o Abbonamenti
     // usa il creditor.name per distinguere
   }
   ```

2. **Espandere il riconoscimento merchant italiani:**
   - Supermercati: aggiungere `Famila`, `Dok`, `Bennet`, `Sigma`, `Despar`, `PAM`, `Simply`, `Iper`, `A&O`, `U2`, `Galassia`
   - Farmacie: aggiungere `Dr. Max`, `Farmacia comunale`, `Lloyds Farmacia`
   - Carburante: aggiungere `IP`, `ERG`, `Kuwait`, `Esso`, `Shell`, `Avia`
   - Trasporti: aggiungere `Flixbus`, `Itabus`, `Arriva`, `ACTV`, `GTT`, `SETA`, `Tper`, `BusItalia`
   - Fast food: aggiungere `Autogrill`, `Chef Express`, `MyChef`

3. **Logica migliorata per `counterpart_name`:**
   Il codice attuale concatena `description` e `counterpart_name` come `text`:
   ```typescript
   const text = [desc, counterpart].filter(Boolean).join(' ')
   ```
   Questo è corretto. Ma si può aggiungere il check su `raw_data.creditor?.name` se `counterpart_name` è null per alcuni connector che lo mandano in posizione diversa:
   ```typescript
   const rawCreditorName = tx.raw_data?.creditor?.name || ''
   const rawDebtorName = tx.raw_data?.debtor?.name || ''
   const text = [desc, counterpart, rawCreditorName, rawDebtorName].filter(Boolean).join(' ')
   ```

### 7.3 Gestione MCC — Realtà per l'Italia

L'MCC Layer 0 funziona bene per:
- Banche nordeuropee (Danske, Nordea, SEB, ecc.)
- Revolut (espone MCC)
- Alcune transazioni N26 (non sistematicamente)

Per le banche italiane (Intesa, UniCredit, BNL, Mediolanum, Widiba, Postepay), l'MCC sarà quasi sempre `null`. Non è un problema del codice attuale, è un limite strutturale delle API PSD2 italiane.

**Raccomandazione:** Mantenere il sistema MCC come ottimizzazione per banche non italiane. Non rimuoverlo.

### 7.4 Suggerimenti per il prompt AI

Il prompt attuale manda all'AI:
```
Merchant: "{merchant}"
MCC: {mcc}  // solo se presente
```

**Miglioramenti suggeriti:**

1. Aggiungere il `bank_transaction_code` al prompt quando disponibile:
   ```typescript
   if (tx.bank_transaction_code?.code) {
     parts.push(`Codice transazione: ${tx.bank_transaction_code.code}`)
   }
   ```
   Questo aiuta l'AI a distinguere es. un SDD (potenzialmente bolletta) da un pagamento POS.

2. Passare esplicitamente `counterpart_name` e `description` separati quando entrambi presenti:
   ```typescript
   if (tx.counterpart_name) parts.push(`Beneficiario: "${tx.counterpart_name}"`)
   if (tx.description && tx.description !== tx.counterpart_name) {
     parts.push(`Causale: "${tx.description.substring(0, 80)}"`)
   }
   ```

3. Indicare la banca di provenienza (disponibile da `connection.bank_name`?) per contestualizzare il formato.

### 7.5 Nuovi pattern da aggiungere a `extractMerchantName()`

```typescript
// UniCredit: formato tutto maiuscolo con suffisso DATA CARTA
cleaned = cleaned.replace(/\s+\d{4}\/\d{2}\/\d{2}\s*$/, '')

// Postepay/BancoPoste: formato "ACQUISTO POS [CIRCUITO] [MERCHANT]"
cleaned = cleaned.replace(/^ACQUISTO\s+POS\s+(MASTERCARD|VISA|MAESTRO)\s+/i, '')

// ING: può avere "ING DIRECT" o "ING" come prefisso per trasferimenti interni
// (già parzialmente coperto da INTERNAL_TRANSFER_PATTERNS)

// CBI Globe generico: formato "[TIPO OPERAZIONE] - [MERCHANT] - [DATA/REF]"
// Prendi solo la seconda parte se c'è questo pattern
const cbiParts = cleaned.match(/^[A-Z\s]+\s+-\s+(.+?)\s+-\s+[0-9A-Z/]+$/)
if (cbiParts) cleaned = cbiParts[1]

// Intesa: rimuovi "VISA PAGAMENTO CON CARTA N. xxxxxx"
cleaned = cleaned.replace(/VISA\s+PAGAMENTO\s+CON\s+CARTA\s+N\.\s*\*+\d+\s*/gi, '')

// Postepay prepagata: spesso ha formato "[AMOUNT]*[MERCHANT]*[LOCATION]"
// Separa su asterisco
cleaned = cleaned.replace(/^\d+[\.,]\d+\s*\*\s*/, '')
```

### 7.6 Miglioramenti per la gestione trasferimenti interni

Il pattern esistente gestisce già N26 GmbH, Wise, Revolut. Da aggiungere:

```typescript
// Aggiunte suggerite a INTERNAL_TRANSFER_PATTERNS.descriptions:
/hype\s*(s\.r\.l\.|srl|s\.p\.a\.)?/i,  // trasferimento a/da HYPE stesso
/flowe\s*(s\.r\.l\.|srl)?/i,            // trasferimento a/da Flowe
/satispay/i,                             // se usato come metodo di ricarica
/tinaba\s*(s\.r\.l\.|srl)?/i,           // Tinaba
/buddybank/i,                            // UniCredit BuddyBank
```

---

## 8. Architettura Dati: Come le Banche Italiane Popolano i Campi EB

### Schema di priorità per determinare il merchant name

```
1. tx.merchant_category_code → lookup MCC table (affidabile ma rarissimo in IT)
2. tx.counterpart_name (= creditor.name per DBIT / debtor.name per CRDT)
   → già pulito da EB dal campo strutturato della banca
   → affidabile per bonifici SEPA
   → per carte: dipende dalla banca (N26 e ING: sempre presente; CBI Globe: spesso null)
3. tx.description (= join di remittance_information[])
   → testo grezzo causale
   → richiede parsing per estrarre merchant name
   → per carte CBI Globe: contiene prefissi tipo "PAGAMENTO POS - "
   → per N26: se creditor.name vuoto, rimittance ripete il nome merchant
4. tx.raw_data.creditor.name (fallback se mapping banking-sync non l'ha catturato)
   → uguale a tx.counterpart_name per DBIT; includere come safety net
5. tx.bank_transaction_code → utile per tipo transazione, non per merchant
6. Fallback: AI Classification
```

### Mappa visiva della qualità dati per banca

```
Banca              | counterpart_name | remittance | MCC | bank_tx_code
-------------------|-----------------|-----------|-----|-------------
N26                | ★★★★★          | ★★★★      | ✗   | ★★★★★ (ISO)
ING Italia         | ★★★★★          | ★★★★      | ?★  | ★★★★★ (ISO)
Illimity (Fabrick) | ★★★★           | ★★★★      | ?★  | ★★★★  (ISO)
Revolut            | ★★★★★          | ★★★       | ★★  | ★★★★  (ISO)
Intesa Sanpaolo    | ★★★            | ★★★       | ✗   | ★★★   (CBI)
UniCredit          | ★★★            | ★★★       | ✗   | ★★★   (CBI/prop)
BNL                | ★★★            | ★★★       | ✗   | ★★    (CBI)
Mediolanum         | ★★★            | ★★★       | ✗   | ★★    (prop)
Widiba             | ★★             | ★★★       | ✗   | ★★    (CBI)
Postepay           | ★★             | ★★        | ✗   | ★     (CBI/vuoto)
BancoPoste         | ★★             | ★★★       | ✗   | ★★    (CBI)
Fineco (carta)     | ✗              | ★★        | ✗   | ✗     (vuoto)
```

---

## 9. Fonti Consultate

- [Enable Banking API Reference](https://enablebanking.com/docs/api/reference/)
- [Enable Banking — Open Banking Italy](https://enablebanking.com/docs/markets/it)
- [Enable Banking Changelog February 2024](https://enablebanking.com/blog/2024/03/11/changelog-february-2024)
- [Enable Banking Changelog March 2024](https://enablebanking.com/blog/2024/04/04/changelog-march-2024)
- [Enable Banking Sample Data — Danske Bank Synthetic JSON](https://enablebanking.com/sample-data/DK-Danske_Bank-synthetic-1.json)
- [N26 PSD2 TPP Docs — GitHub](https://github.com/n26/psd2-tpp-docs)
- [N26 PSD2 Additional API Spec](https://github.com/n26/psd2-tpp-docs/blob/main/doc/assets/openapi/additional_api_spec.md)
- [GoCardless Bank Account Data — Transactions Output](https://developer.gocardless.com/bank-account-data/transactions)
- [Actual Budget — GoCardless README](https://github.com/actualbudget/actual/blob/master/packages/sync-server/src/app-gocardless/README.md)
- [Fintable — Italy Banks Coverage](https://fintable.io/coverage/banks/Italy)
- [Fintable — N26 Bank](https://fintable.io/coverage/banks/Italy/7096_n26-bank)
- [Fintable — Banca Widiba](https://fintable.io/coverage/banks/Italy/8753_banca-widiba)
- [Intesa Sanpaolo Open Banking Tracker](https://www.openbankingtracker.com/provider/intesa-sanpaolo)
- [Illimity Open Banking Tracker](https://www.openbankingtracker.com/provider/illimity)
- [Illimity Developer Portal](https://www.illimity.com/it/illimity-developer-portal)
- [ING Developer Portal](https://developer.ing.com/openbanking/resources/get-started/psd2)
- [Poste Italiane Open Banking PSD2](https://www.posteitaliane.it/en/open-banking.html)
- [CBI Globe Platform](https://www.cbiglobe.com/)
- [Berlin Group NextGenPSD2 Downloads](https://www.berlin-group.org/nextgenpsd2-downloads)
- [Transaction Object — Klarna XS2A Docs](https://docs.openbanking.klarna.com/xs2a/objects/transaction.html)
- [Open Banking Tracker — Italy](https://www.openbankingtracker.com/country/italy)
- [Yapily — Transaction Categorisation Engine](https://www.yapily.com/blog/how-to-develop-a-scalable-categorisation-engine/)
- [Tink — Merchant Information Product](https://tink.com/products/merchant-information/)
