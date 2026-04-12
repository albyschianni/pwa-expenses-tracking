# Screen 4 & 5 — Form Nuova Spesa / Nuova Entrata

## Struttura visiva
- Modal che copre quasi tutto lo schermo (non bottom sheet — è un full overlay)
- Header: "Annulla" (sx) · titolo dinamico "Nuova Spesa" / "Nuova Entrata" · "Salva" teal (dx)
- Toggle Spesa / Entrata — cambia colore (rosso/verde) e filtra le categorie
- Campo Importo — large input con € prefisso, bordo teal quando focus
- Campo Descrizione — placeholder contestuale ("Es: Cena al ristorante" / "Es: Stipendio marzo")
- Campo Data — testo che apre un date picker nativo
- Griglia categorie — 3 colonne, icona + label, selezione evidenziata con bordo teal
- Tab bar visibile in trasparenza sotto (non bloccata)

## Logica funzionale
- Toggle Spesa/Entrata filtra le categorie mostrate (categorie spesa vs entrata)
- La prima categoria del tipo selezionato è pre-selezionata
- Salva è disabilitato finché importo > 0
- La data default è oggi
- Modifica: stessa UI, titolo "Modifica Spesa", dati pre-compilati

## Criticità UX attuali
- **Importo**: nessuna tastiera numerica dedicata — apre la tastiera di sistema (lenta, non ottimale per importi)
- La griglia categorie richiede scroll verso il basso — le ultime categorie non sono visibili senza scorrere
- "Annulla" e "Salva" sono piccoli testo nell'header — su mobile il tap area è ridotta
- Nessun feedback visivo al salvataggio (solo chiusura del modal)
- Non c'è campo "Note" per dettagli aggiuntivi
- La data è un testo cliccabile, non immediatamente riconoscibile come input

## Suggerimenti per Flutter
- Tastiera numerica custom per l'importo (grande, con virgola, immediata)
- Categorie in scroll orizzontale o chip list invece di griglia a scroll
- Bottom sheet invece di modal full-screen (più naturale su mobile)
- Animazione di conferma al salvataggio (es. check verde)
- Swipe down per chiudere (gesture naturale iOS/Android)
- Campo note opzionale collassato (espandibile)
