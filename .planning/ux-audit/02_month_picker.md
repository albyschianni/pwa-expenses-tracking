# Screen 2 — Month Picker (Selettore mese)

## Struttura visiva
- **Bottom sheet** che sale da sotto, oscura parzialmente la home
- Anno selezionabile con frecce < Anno >
- Griglia 3x4 dei mesi (Gen-Dic), mese attivo evidenziato in teal
- CTA "Conferma" full-width in fondo

## Logica funzionale
- È il filtro temporale globale dell'app
- Cambia il dataset di tutte le tab (Home, Grafici)
- Il mese corrente è pre-selezionato all'apertura
- Non ha selezione "anno corrente completo" o range — solo singolo mese

## Criticità UX attuali
- Nessun accesso rapido a "Questo mese" — devi già essere sul mese giusto
- Non c'è differenza visiva tra mesi passati, corrente e futuri (stessa opacità)
- La griglia occupa molto spazio per 12 opzioni — un wheel picker sarebbe più compatto
- Il backdrop non chiude il picker (solo il tap su "Conferma") — comportamento non intuitivo

## Suggerimenti per Flutter
- Swipe orizzontale sull'header del mese per cambiare mese (pattern più nativo)
- Mesi futuri grayed out o non selezionabili se non ci sono dati
- Quick chip "Questo mese" per tornare velocemente al presente
- Haptic feedback al cambio mese
