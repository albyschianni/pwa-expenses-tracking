# Screen 1 — Home (Dashboard principale)

## Struttura visiva (top → bottom)
1. **Header** — Avatar (sx), Mese selezionato con chevron (centro), Menu hamburger (dx)
2. **Wallet switcher** — Pill "Personale ↓" (cambio tra conto personale e wallet condivisi)
3. **Balance hero** — Importo grande colorato (+verde / -rosso), label "Saldo di [mese]"
4. **Breakdown** — Spese (rosso) | Entrate (verde) separati da divisore verticale
5. **Filtri tipo** — Pill: Tutti · Spese · Entrate + Dropdown ordinamento "Più recenti ↓"
6. **Lista transazioni** — Card per ogni transazione, scroll verticale
7. **Bottom tab bar** — Home · Grafici · [FAB +] · Ricorrenti · Impostazioni

## Anatomia card transazione
- **Icon** — cerchio colorato con emoji categoria (sx)
- **Titolo** — nome merchant/descrizione, troncato con "..." (bold)
- **Sottotitolo** — data (es. "30 mar") + icona banca 🏦 se importata
- **Badge NEW** — pill arancione per transazioni bancarie non ancora viste
- **Importo** — rosso per spese, verde per entrate (dx, bold)

## Logica funzionale
- Il mese è il filtro globale dell'app — tutte le transazioni si riferiscono al mese selezionato
- "Personale" vs wallet condiviso cambia completamente il dataset visualizzato
- Badge NEW scompare alla riapertura dell'app (non al click)
- L'ordinamento è locale (non ricarica dal DB)
- Il FAB centrale (+) apre il form di creazione spesa/entrata

## Criticità UX attuali
- Titoli troncati: nomi merchant lunghi perdono info utile (es. "LOCK INSIDE CISLA...")
- Badge NEW su molte righe crea rumore visivo quando ci sono tante transazioni nuove
- Il wallet switcher è poco visibile — piccola pill grigia sopra un numero enorme
- Nessuna separazione visiva per data (es. "Oggi", "Ieri", "28 mar") — tutto piatto
- L'icona banca 🏦 nella lista non è immediatamente riconoscibile come "da banca"

## Suggerimenti per Flutter
- Separatori per data (sticky header "Oggi", "Ieri", "28 mar")
- Titolo merchant su 2 righe o truncation intelligente (mostra sempre almeno il merchant primario)
- Badge NEW → punto colorato discreto invece di pill piena
- Swipe action su card (es. swipe sx per eliminare, swipe dx per categorizzare)
- Wallet switcher più prominente o integrato nell'header
