# Screen 6 & 7 — Detail Dialog (Spesa manuale vs Spesa bancaria)

## Struttura visiva comune
- Bottom sheet con handle bar in cima
- Header: icona categoria (cerchio colorato) + importo grande + pill tipo + categoria
- Lista dettagli: righe key/value con divisori (Descrizione · Data · Categoria · Conto · Aggiunta da)
- Azioni in fondo

## Variante A — Spesa manuale (wallet condiviso)
- Mostra "Aggiunta da: Alberto Schianni" (utile nei wallet condivisi)
- Bottone "Modifica" full-width teal (primario)
- Bottone "Elimina" full-width grigio con testo rosso (secondario)
- Nessuna riga "Conto"

## Variante B — Spesa bancaria (FinecoBank)
- Mostra "Conto: 🏦 FinecoBank"
- Banner teal "Importata dalla banca" (indicatore source)
- Bottoni Modifica + Elimina affiancati, più piccoli (secondari)
- La modifica per tx bancarie aggiorna solo la categoria (non importo/data)

## Logica funzionale
- Modifica bancaria → aggiorna solo `category_id` in `bank_transactions` + crea regola automatica
- Elimina manuale → delete fisico da `expenses`
- Elimina bancaria → delete fisico da `bank_transactions` (tx non riappare al prossimo sync perché ha external_id unico)
- "Aggiunta da" appare solo nei wallet condivisi (non nel personale)

## Criticità UX attuali
- La descrizione bancaria è il testo grezzo del remittance ("LOCK INSIDE CISLAGO IT Carta...") — poco leggibile
- Il banner "Importata dalla banca" e la riga "Conto" sono ridondanti — stesso concetto ripetuto due volte
- I bottoni Modifica/Elimina affiancati su tx bancarie hanno area tap ridotta
- Nessuna indicazione che la modifica di una tx bancaria crea una regola automatica (opacità sulle conseguenze)
- Non c'è modo di "ricategorizzare velocemente" senza aprire il form completo

## Suggerimenti per Flutter
- Mostrare `counterpart_name` come titolo principale se disponibile, `description` come sottotitolo
- Eliminare il banner ridondante, tenere solo la riga "Conto" con chip banca
- Su tx bancarie: quick action inline per cambio categoria (categoria picker diretto, senza modal)
- Indicazione discreta "Verrà ricordato per transazioni simili" quando si modifica categoria bancaria
- Conferma eliminazione con bottom sheet dedicato (non overlay interno)
