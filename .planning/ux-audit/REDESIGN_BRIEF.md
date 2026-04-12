# Expense Tracker — UX/UI Redesign Brief
## Versione PWA 2.2.0 → Flutter

---

## 1. CONTESTO APP

### Cos'è
Expense Tracker è un'app mobile per il tracciamento delle spese personali con integrazione bancaria automatica via Open Banking (Enable Banking / PSD2).

### A cosa serve
- Registrare e categorizzare spese e entrate mensili
- Importare automaticamente le transazioni dai conti bancari collegati
- Visualizzare report e grafici per categoria
- Impostare budget mensili per categoria (Envelope Budgeting)
- Gestire spese condivise con altri utenti (wallet condivisi)

### Target utente
- Utente italiano, 20-40 anni
- Ha almeno un conto bancario digitale (Fineco, Revolut, HYPE, N26...)
- Vuole avere controllo sulle proprie finanze senza dover inserire tutto manualmente
- Non è un esperto di finanza ma vuole capire dove va il suo denaro
- Usa principalmente lo smartphone

### Problema che risolve
Le app di finanza personale tradizionali richiedono inserimento manuale costante → l'utente smette di usarle dopo pochi giorni. Questa app automatizza l'importazione via Open Banking, riduce il lavoro manuale a semplice categorizzazione/verifica, e mostra un quadro finanziario completo senza sforzo.

### Evoluzione attesa
L'app si evolverà verso un modello dove **l'inserimento manuale è l'eccezione**, non la regola. Open Banking diventa il motore principale: le transazioni arrivano automaticamente, l'AI le categorizza, l'utente verifica e corregge solo quando necessario.

---

## 2. USER FLOWS PRINCIPALI

### FLOW A — Aggiungere una spesa manualmente
```
1. Home → tap FAB (+)
2. Form → toggle Spesa/Entrata
3. Inserire importo (tastiera sistema)
4. Inserire descrizione (opzionale)
5. Verificare/cambiare data
6. Selezionare categoria (griglia 3 col, scroll)
7. Tap "Salva"
8. Ritorno alla Home, lista aggiornata
```
**Attriti:**
- Step 3: tastiera di sistema per importo → lenta, non ottimizzata per numeri
- Step 6: griglia richiede scroll, le categorie in fondo sono nascoste
- Step 8: nessun feedback visivo del salvataggio
- **Tot: 7 step per un'azione frequente**

### FLOW B — Visualizzare e categorizzare transazioni bancarie
```
1. Sync automatico ogni 15 min (background)
2. Utente apre app → vede badge NEW sulle card
3. Tap su transazione → detail sheet
4. Vede descrizione, data, categoria assegnata (o mancante)
5. Se mancante: tap "Modifica" → form completo
6. Seleziona categoria → Salva
7. Torna alla lista
```
**Attriti:**
- Step 5-6: aprire il form completo per cambiare solo la categoria è overkill
- Nessuna azione di categorizzazione "inline" nella lista
- Badge NEW su molte righe crea rumore visivo
- **La categorizzazione dovrebbe essere 1 tap dalla lista, non 3+**

### FLOW C — Controllare i grafici mensili
```
1. Tap tab Grafici
2. Visualizza summary 3 card (entrate/saldo/uscite)
3. Toggle Spese/Entrate
4. Scroll per vedere grafico donut
5. Scroll per vedere dettaglio categorie
6. Tap categoria → espande lista transazioni
7. (Opzionale) Vede barra budget se configurato
```
**Attriti:**
- Il grafico donut e il dettaglio categorie sono separati da troppo scroll
- Il tooltip al tap sul grafico mostra solo nome+importo, nessuna azione
- Il budget appare come "bonus" sotto ogni categoria, non è una vista dedicata

### FLOW D — Configurare budget mensile
```
1. Tab Settings
2. Scroll fino a "Budget mensile"
3. Tap → bottom sheet
4. Inserire importo per ogni categoria (input numerico)
5. Chiudere il sheet
```
**Attriti:**
- Budget nascosto in fondo a Settings → bassa discoverability
- Non c'è un modo di vedere budget + spese attuali nella stessa schermata di configurazione
- Nessun suggerimento automatico basato sulla spesa storica

### FLOW E — Connettere una banca
```
1. Tab Settings → "Conti bancari" → "+ Aggiungi"
2. Lista banche disponibili con search
3. Tap banca → redirect OAuth esterno
4. Login sul sito della banca
5. Ritorno all'app → callback handler
6. Banca aggiunta, sync automatico parte
```
**Attriti:**
- Il punto di ingresso (Settings) è nascosto — la funzione principale dell'app è sepolta
- Nessuna onboarding/spiegazione prima del flow OAuth
- Il ritorno dal browser esterno può essere disorientante

---

## 3. ANALISI UX ATTUALE

### ✅ Cosa funziona bene (NON toccare)

**Visual design:**
- Dark theme coerente e ben eseguito — mantenerlo
- Gerarchia visiva chiara: balance hero domina, supporto in secondo piano
- Colori semantici (rosso spese, verde entrate) sempre coerenti
- Icone emoji per categorie: immediate e riconoscibili a colpo d'occhio
- Border radius generosi (card style) → sensazione moderna

**Funzionalità:**
- Grafico donut con tooltip al tap sul segmento → ottimo
- Espansione categoria con lista transazioni inline → ottimo
- Doppia progress bar in Grafici (% totale + % budget) → chiaro e utile
- Toggle Spese/Entrate nei grafici → intuitivo
- Badge "Importata dalla banca" + riga "Conto" nel detail → trasparenza apprezzabile
- Filtri Tutte/Da categorizzare/Entrate/Uscite nelle transazioni bancarie → molto utili
- Rilevamento automatico trasferimenti interni → fondamentale, invisibile all'utente (bene)
- Scorciatoie periodo nel date range filter (Anno corrente, Ultimi 3 mesi...) → ottimo

**Architettura informazione:**
- La tab bar a 5 voci è comprensibile e stabile
- FAB centrale per azione primaria è il pattern giusto
- Bottom sheet per dettagli/form → corretto per mobile

### ⚠️ Cosa è migliorabile

**Ridondanze:**
- "Importata dalla banca" (banner) + riga "Conto: FinecoBank" nel detail → stesso concetto 2 volte
- Tab "Portafogli" nella tab bar + "Conti Condivisi" nel side drawer → duplicato
- Side drawer con 1 sola voce non giustifica il pattern
- "Regole di categorizzazione" e "Statistiche AI" in Settings → non necessarie per l'utente finale (da rimuovere)

**Punti di frizione:**
- Categorizzazione manuale richiede troppi step (3-4) per azione frequente
- Nomi merchant troncati ovunque ("LOCK INSIDE CISLA...") → perde informazione utile
- Tastiera di sistema per importo → non ottimizzata
- Nessun raggruppamento per data nella lista home ("Oggi", "Ieri", "28 mar")
- Nessun feedback visivo su salvataggio/eliminazione
- Budget nascosto in Settings → bassa discoverability
- Tab "Ricorrenti" occupa slot prezioso nella tab bar per funzione usata raramente

**Gap:**
- Nessun onboarding per nuovi utenti
- Empty state Home è generico ("Premi + per aggiungere") — con Open Banking dovrebbe suggerire di collegare una banca
- Mancano stati di errore visibili (sync fallito, connessione persa)
- Nessuna ricerca nella lista transazioni

---

## 4. PROPOSTA DI MIGLIORAMENTO

### NAVIGAZIONE — Ripensare la tab bar

**Attuale:**
```
Home · Grafici · [FAB] · Ricorrenti · Settings
```

**Proposta Flutter:**
```
Home · Grafici · [FAB] · Conti · Settings
```
- **Ricorrenti** → spostato dentro Settings (usato raramente, non merita tab primario)
- **Conti** → tab dedicato per Open Banking (è la funzione di punta dell'app)
- Il FAB rimane centrale ma **contestuale**: in Home aggiunge spesa manuale, in Conti avvia sync manuale

Razionale: con l'evoluzione verso Open Banking, i "Conti" diventano il cuore dell'app. Tenerli in Settings è contraddittorio.

### CATEGORIZZAZIONE — Ridurre a 1 tap

**Attuale:** tap card → detail sheet → tap Modifica → form completo → scegli categoria → Salva

**Proposta:** tap card → detail sheet → **categoria picker inline** (chip scrollabili) → tap categoria → salva automatico

Il form completo rimane accessibile tramite "Modifica avanzata" per chi vuole cambiare descrizione/data, ma la categoria si cambia in 1 tap direttamente dal detail sheet.

### HOME — Aggiungere raggruppamento per data

```
OGGI
  ├── ESSELUNGA · Spesa Alimentare · -€12,50
  └── ENI · Trasporti · -€45,00

IERI
  └── NETFLIX · Abbonamenti · -€17,99

LUNEDÌ 28 MAR
  ├── ...
```
Questo pattern è universale nelle app fintech (Revolut, N26, Satispay) e riduce drasticamente la fatica cognitiva nella lettura della lista.

### BADGE NEW — Sostituire con punto discreto

Il badge arancione "NEW" su ogni card è troppo rumoroso quando ci sono molte transazioni nuove.

**Proposta:** punto teal piccolo (●) nell'angolo dell'icona categoria, scompare al tap. Meno rumore visivo, stessa informazione.

### BUDGET — Migliore discoverability

**Proposta:** nella tab Grafici, aggiungere un toggle o tab secondario "Budget" accanto a "Spese/Entrate". Vista dedicata che mostra tutte le categorie con barra budget prominente, senza dover scrollare nel dettaglio.

### EMPTY STATE HOME — Contestuale

Se l'utente non ha conti bancari collegati:
> "Collega il tuo conto per importare le transazioni automaticamente → [Connetti ora]"

Se ha conti ma nessuna transazione nel mese:
> "Nessuna transazione questo mese · Le transazioni verranno sincronizzate automaticamente"

### FORM AGGIUNTA SPESA — Tastiera numerica custom

La tastiera per l'importo deve essere dedicata: cifre grandi, virgola, backspace. Nessun campo testuale → nessun ritardo tastiera sistema. Pattern usato da Revolut, Satispay, Splitwise.

---

## 5. LINEE GUIDA UX/UI

### Principi

**1. Open Banking prima di tutto**
Il flusso principale è: transazione arriva → AI categorizza → utente verifica. L'inserimento manuale è il fallback. Ogni elemento UI deve riflettere questa priorità.

**2. Zero ridondanza**
Se un'informazione è già visibile, non ripeterla. (Banner "Importata dalla banca" + riga "Conto" → tieni solo uno.)

**3. Azioni frequenti in 1-2 tap**
Categorizzare una transazione = 1 tap. Vedere il saldo del mese = 0 tap (è nella home). Aggiungere una spesa = FAB + importo + categoria.

**4. Feedback immediato**
Ogni azione deve avere risposta visiva: salvataggio (check verde), eliminazione (slide out), sync (spinner discreto nell'header del conto).

**5. Dark theme nativo**
Non light mode. Il dark theme è parte dell'identità dell'app. Su Flutter usare un tema coerente con surface/background distinti, non tutto uguale.

**6. Dati sempre visibili, azioni su richiesta**
La lista mostra i dati. Le azioni (modifica, elimina) appaiono solo al tap. Nessun bottone sempre visibile che occupa spazio nella lista.

### Pattern consigliati per Flutter

| Elemento | Pattern | Note |
|---|---|---|
| Lista transazioni | `ListView.builder` con `SliverList` per sticky headers data | Raggruppamento per data |
| Detail transazione | `DraggableScrollableSheet` | Bottom sheet con snap points |
| Categoria picker | `Wrap` con chip scrollabili | Non griglia a scroll |
| Importo input | Custom numpad widget | Grandi cifre, virgola, backspace |
| Grafici | `fl_chart` (Flutter) | Donut + bar chart |
| Navigazione | `NavigationBar` Material 3 | Tab bar nativa Flutter |
| Animazioni | `AnimatedSwitcher`, `Hero` per transizioni | Leggere, max 300ms |
| Pull-to-refresh | `RefreshIndicator` nativo | Su lista home e transazioni bancarie |
| Swipe actions | `Dismissible` o `flutter_slidable` | Su card transazioni |

---

## 6. DESCRIZIONE SCHERMATE PER STITCH

---

### SCREEN 01 — Home Dashboard

**Obiettivo:** Panoramica finanziaria del mese + lista transazioni

**Elementi UI:**
- Header: avatar (sx) · mese selezionabile (centro) · hamburger menu (dx)
- Wallet switcher: pill "Personale ↓" per switch tra conto personale e condivisi
- Balance hero: importo grande (+verde / -rosso) + label "Saldo di [mese]"
- Breakdown: Spese | Entrate con divisore verticale
- Filtri: pill Tutti · Spese · Entrate + dropdown ordinamento
- Lista transazioni con raggruppamento per data (da implementare)
- Bottom tab bar con FAB centrale

**Card transazione:**
- Cerchio icona categoria (sx) · titolo merchant · data + icona banca · importo (dx)
- Punto ● teal se non ancora visto (sostituisce badge NEW)

**Comportamento:**
- Tap card → detail sheet
- Tap mese → month picker bottom sheet
- Tap FAB → form nuova spesa
- Pull down → refresh dati

**Miglioramenti Flutter:**
- Sticky header per data ("Oggi", "Ieri", "28 mar")
- Punto discreto invece di badge NEW
- Swipe sx su card → elimina (con conferma)
- Swipe dx su card bancaria → quick categorize

---

### SCREEN 02 — Month Picker

**Obiettivo:** Selezionare il mese di riferimento per tutti i dati dell'app

**Elementi UI:**
- Bottom sheet con handle
- Anno con frecce < >
- Griglia 3x4 mesi, mese attivo in teal
- CTA "Conferma" full-width

**Miglioramenti Flutter:**
- Swipe orizzontale sull'header del mese per navigare (più nativo)
- Mesi futuri senza dati → grayed out
- Chip "Questo mese" per tornare velocemente al presente
- Haptic feedback al cambio

---

### SCREEN 03 — Form Aggiunta / Modifica Spesa

**Obiettivo:** Inserire o modificare una transazione manuale

**Elementi UI:**
- Header: Annulla · titolo dinamico · Salva (teal)
- Toggle Spesa / Entrata (cambia colore e filtra categorie)
- Importo: campo grande con € prefisso
- Descrizione: campo testo opzionale
- Data: tappabile, apre date picker
- Categoria: griglia 3 colonne scrollabile

**Comportamento:**
- Salva disabilitato se importo = 0
- Prima categoria del tipo selezionato pre-selezionata
- Toggle cambia filtro categorie in tempo reale

**Miglioramenti Flutter:**
- Tastiera numerica custom full-screen per importo (prima schermata)
- Categoria in chip list orizzontale scrollabile invece di griglia
- Bottom sheet invece di full modal
- Swipe down per chiudere
- Animazione check verde al salvataggio

---

### SCREEN 04 — Detail Transazione

**Obiettivo:** Visualizzare dettagli completi + azioni su una transazione

**Variante A — Manuale:**
- Bottom sheet: icona+importo+tipo+categoria in header
- Righe: Descrizione · Data · Categoria · Aggiunto da (solo wallet condivisi)
- Azioni: Modifica (teal, full-width) + Elimina (grigio/rosso)

**Variante B — Bancaria:**
- Stessa struttura + riga "Conto: [banca]"
- Azioni: Modifica + Elimina affiancati (più piccoli)
- Rimosso banner "Importata dalla banca" (ridondante con riga Conto)

**Miglioramenti Flutter:**
- Quick category picker inline: chip scrollabili direttamente nel sheet
- "Salva automatico" al cambio categoria (no bottone Salva separato)
- Toast discreto "Categoria aggiornata · Regola creata per transazioni simili"
- Confirma eliminazione con mini bottom sheet ("Sei sicuro?")

---

### SCREEN 05 — Grafici

**Obiettivo:** Analisi visiva delle spese/entrate per categoria + stato budget

**Elementi UI:**
- 3 card: Entrate · Saldo · Uscite
- Toggle Spese / Entrate
- Card summary: totale + n. transazioni + media
- Grafico donut con totale al centro, tooltip al tap sul segmento
- "Dettaglio categorie": lista ordinata per importo, ogni riga ha:
  - icona + nome + (n. transazioni) · importo · % sul totale · chevron
  - Progress bar % sul totale (colore categoria)
  - Se budget configurato: "Obiettivo mensile" + €speso/€budget · % + barra colorata (verde/giallo/rosso)
  - Espandibile: lista transazioni con descrizione + data + importo

**Comportamento:**
- Toggle cambia grafico e lista
- Tap segmento donut → tooltip nome+importo+%
- Tap riga categoria → espande/chiude lista transazioni
- Una sola categoria espansa alla volta

**Miglioramenti Flutter:**
- Tab "Budget" separato per vista dedicata budget mensile
- Tap su transazione nell'espansione → apre il suo detail sheet
- Animazione smooth espansione/chiusura
- Colore progress bar budget: verde <70%, giallo 70-90%, rosso >90%, rosso pieno >100%

---

### SCREEN 06 — Conti Bancari (ex Settings)

**Obiettivo:** Gestione delle banche collegate e accesso alle transazioni

**Lista conti:**
- Header: "Conti bancari" + "+ Aggiungi"
- Card per ogni banca: icona · nome · badge "Attivo" · ultimo sync · scadenza consenso · n. conti
- Azioni card: Sincronizza (wide) · Ricollega (icona) · Elimina (icona rosso)
- Tap sulla card (header) → dettaglio transazioni di quel conto
- In fondo: shortcut "Transazioni bancarie" → vista aggregata tutti i conti

**Miglioramenti Flutter:**
- Spostare in tab dedicata "Conti" (non in Settings)
- Mostrare logo banca vero invece di icona generica
- Badge di warning se consenso in scadenza (<30gg)
- Swipe to sync su card
- Stato sync in tempo reale (spinner durante sync)

---

### SCREEN 07 — Transazioni Bancarie (singolo conto)

**Obiettivo:** Lista completa transazioni di un conto con filtri

**Elementi UI:**
- Header: ← · nome banca · n. transazioni · Sincronizza
- Date range filter: chip "1 gen – 31 dic 2026 ↓" → espande picker con Da/A + scorciatoie
- Filtri tipo: Tutte · Da categorizzare · Entrate · Uscite
- Lista transazioni: icona categoria · titolo · data · categoria assegnata · importo
- Trasferimenti interni: badge "Trasferimento interno" in blu, importo sfumato

**Empty state "Da categorizzare":**
- Icona + "Nessuna transazione da categorizzare" → stato positivo da celebrare

**Comportamento:**
- Tap transazione → detail sheet (con quick category picker)
- Filtri si combinano con date range
- Sync aggiorna lista in tempo reale

**Miglioramenti Flutter:**
- Batch categorization: seleziona multiple transazioni simili → assegna categoria una volta
- Search bar per cercare merchant specifico
- Indicatore "X da categorizzare" come badge sul filtro

---

### SCREEN 08 — Connetti Nuova Banca

**Obiettivo:** Aggiungere una nuova connessione bancaria via OAuth

**Elementi UI:**
- Header: "Connetti il tuo conto" + sottotitolo esplicativo
- Search bar "Cerca la tua banca..."
- Lista banche scrollabile: logo generico · nome · paese (IT)

**Comportamento:**
- Tap banca → redirect browser OAuth
- Ritorno app → callback handler → banca aggiunta → sync automatico

**Miglioramenti Flutter:**
- Logo vero della banca invece di icona generica
- Raggruppamento: "Più usate" in cima, poi alfabetico
- Spiegazione breve prima del redirect ("Verrai reindirizzato sul sito della banca. Non condividiamo mai le tue credenziali.")
- Deep link per ritorno app senza aprire browser (ASWebAuthenticationSession su iOS)

---

### SCREEN 09 — Settings

**Obiettivo:** Configurazione account e preferenze app

**Struttura proposta (pulita):**
```
[Profilo] — card cliccabile
[Categorie] — gestione e riordino
[Budget mensile] — envelope budgeting
[Esporta transazioni] — CSV mese corrente
[Esporta tutti i dati] — JSON GDPR
[Privacy Policy]
[Valuta] — EUR/USD/GBP
[Spese ricorrenti] — spostato qui da tab bar
─────────
[Esci]
```

**Rimosso:**
- Regole di categorizzazione → admin panel
- Statistiche AI → admin panel
- Conti bancari → tab dedicata

**Miglioramenti Flutter:**
- Raggruppare voci per area (Account · Dati · Preferenze)
- Settings accessibili con swipe down dall'avatar (pattern iOS)

---

### SCREEN 10 — Profilo

**Obiettivo:** Gestione account utente

**Elementi UI:**
- Bottom sheet con handle
- Avatar circolare + "Tocca per cambiare foto"
- Campi: Nome (editabile inline) · Email + Cambia · Password + Cambia
- Footer: data creazione account · Privacy Policy · Termini
- Zona pericolosa: "Elimina account" (rosso, in fondo)

**Comportamento:**
- Avatar tap → image picker (libreria o fotocamera)
- "Cambia" email/password → flow separato con conferma

**Miglioramenti Flutter:**
- Salvataggio nome automatico (no bottone Salva)
- "Elimina account" con doppia conferma (scrivi "ELIMINA" + bottone)

---

### SCREEN 11 — Categorie

**Obiettivo:** Gestione delle categorie di spesa e entrata

**Elementi UI:**
- Bottom sheet full-height
- Toggle Spese / Entrate
- Lista: frecce riordino (↑↓) · icona · nome · badge Sistema/Custom · dot colore · toggle attivo/disattivo
- "+ Aggiungi" per categorie custom

**Comportamento:**
- Toggle disattiva la categoria (non appare nei form, non nel grafico)
- Riordino con frecce (da migrare a drag-and-drop)
- Categorie Sistema non eliminabili, solo disattivabili
- Categorie Custom: eliminabili se non usate

**Miglioramenti Flutter:**
- Drag-and-drop nativo per riordino (ReorderableListView)
- Color picker e emoji picker per categorie custom
- Anteprima della categoria mentre la si crea

---

### SCREEN 12 — Budget Mensile

**Obiettivo:** Configurazione obiettivi di spesa per categoria

**Elementi UI:**
- Bottom sheet con titolo + spiegazione
- Lista categorie spesa: icona colorata · nome · € + input numerico · × per rimuovere
- Categorie senza budget: input con placeholder "—"
- Note "Le modifiche si salvano automaticamente"

**Comportamento:**
- Inserire valore → salva template + budget mese corrente
- × → elimina budget per quella categoria
- Auto-copia template a ogni nuovo mese

**Miglioramenti Flutter:**
- Mostrare sotto ogni input la media storica degli ultimi 3 mesi ("Media: €142/mese")
- Suggerimento automatico basato sulla media storica
- Vista "stato attuale" nel setup: € budget vs € già spesi nel mese corrente

---

### SCREEN 13 — Portafogli Condivisi

**Obiettivo:** Gestione delle spese condivise con altri utenti

**Lista wallet:**
- Header: "Portafogli Condivisi" + "+ Nuovo"
- Card wallet: icona utente · nome · ruolo (Owner/Membro) · valuta

**Form nuovo wallet:**
- Bottom sheet: campo nome + Annulla/Crea

**Comportamento:**
- Tap card → dettaglio wallet (lista transazioni condivise, gestione membri)
- Wallet switcher in Home cambia il dataset visualizzato

**Miglioramenti Flutter:**
- Mostrare saldo e n. transazioni direttamente nella card lista
- Avatar membri visibili nella card (stack di foto profilo)
- Notifica push quando un membro aggiunge una transazione

---

### SCREEN 14 — Spese Ricorrenti

**Obiettivo:** Gestione delle transazioni ricorrenti automatiche

**Elementi UI:**
- Header: "Transazioni Ricorrenti" + n. configurate + "+ Aggiungi"
- Lista: icona categoria · nome · frequenza ("Ogni 1 del mese") · importo · toggle on/off
- Banner informativo: "Le transazioni vengono aggiunte automaticamente quando apri l'app nel giorno configurato"

**Form nuova ricorrente:**
- Stesso layout del form spesa normale + campo "Giorno del mese" (1-28)

**Comportamento:**
- Toggle → abilita/disabilita senza eliminare
- Auto-generazione al primo avvio del giorno configurato

**Miglioramenti Flutter:**
- Spostare in Settings (non tab primario)
- Mostrare "Prossima generazione: 1 maggio 2026" sotto ogni voce
- Drag-to-reorder
- Integrazione con budget: se ricorrente > budget categoria → warning

---

## NOTE FINALI PER IL REDESIGN

### Priorità di intervento (alto → basso)

1. **Navigazione tab bar** → sostituire Ricorrenti con Conti
2. **Quick categorization** → picker inline nel detail sheet
3. **Raggruppamento per data** → sticky headers nella lista home
4. **Tastiera numerica custom** → per input importo
5. **Badge NEW → punto discreto** → ridurre rumore visivo
6. **Empty states contestuali** → guida l'utente verso Open Banking
7. **Feedback azioni** → animazioni salvataggio/eliminazione
8. **Budget discoverability** → tab o sezione prominente in Grafici

### Elementi da eliminare in Flutter
- Side drawer (sostituito da tab Conti e Settings)
- Banner "Importata dalla banca" (ridondante)
- Voci "Regole AI" e "Statistiche AI" da Settings (→ admin panel)
- Tab "Ricorrenti" dalla tab bar (→ Settings)

### Identità visiva da preservare
- Dark theme #0f172a / #1e293b
- Accent teal #2dd4bf
- Rosso spese / Verde entrate
- Icone emoji per categorie
- Card con border radius generoso
- Typography: peso bold per numeri, regular per label
