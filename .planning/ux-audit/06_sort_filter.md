# Screen 8 — Filtri e Ordinamento (Home)

## Struttura visiva
- Riga filtri: pill "Tutti · Spese · Entrate" (sx) + dropdown "Più recenti ↓" (dx)
- Dropdown ordinamento: overlay card con 4 opzioni (Più recenti · Meno recenti · Importo ↓ · Importo ↑)
- Check verde sull'opzione attiva

## Logica funzionale
- Filtro tipo (Tutti/Spese/Entrate): filtra la lista localmente, non ricarica dal DB
- Ordinamento: riordina la lista localmente
- I due controlli sono indipendenti e combinabili
- Nessun filtro per categoria o per range di importo

## Criticità UX attuali
- Il dropdown si apre sopra le card e non ha backdrop — tap fuori non lo chiude
- "Più recenti" è sempre attivo di default ma non è ovvio all'utente
- Mancano filtri utili: per categoria, per banca sorgente, per importo minimo/massimo
- Le pill "Tutti · Spese · Entrate" sono piccole e ravvicinate — area tap ridotta

## Suggerimenti per Flutter
- Filtro categoria: chip scrollabili orizzontali sotto i pill tipo
- Backdrop che chiude il dropdown al tap esterno
- Filtro "Da categorizzare" come pill rapida (molto usata con banking)
- Bottom sheet dedicato per filtri avanzati (importo range, banca sorgente, categoria)
