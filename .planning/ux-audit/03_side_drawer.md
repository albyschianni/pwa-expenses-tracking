# Screen 3 — Side Drawer (Menu laterale)

## Struttura visiva
- Drawer che scorre da destra, oscura la home con backdrop
- Header "Menu" + X per chiudere
- Una sola voce: "Conti Condivisi" con icona e sottotitolo
- Footer con versione app "Expense Tracker v2.2.0"

## Logica funzionale
- Accesso alternativo ai wallet condivisi (duplica il tab Portafogli)
- Introdotto in una fase precedente, ora ha poco contenuto
- La versione app è utile per support/debugging

## Criticità UX attuali
- **Sottoutilizzato**: un drawer con 1 sola voce non giustifica il pattern
- Duplica navigazione già presente nella tab bar (Portafogli)
- Aprire dal hamburger in alto a destra è un gesto non immediato su mobile
- Il footer versione è nascosto in fondo a un drawer quasi vuoto

## Suggerimenti per Flutter
- **Valutare eliminazione** del drawer e spostare tutto nella tab bar o in Settings
- Se mantenuto: aggiungere shortcuts utili (Transazioni bancarie, Budget, Esporta)
- Oppure convertirlo in un profilo sheet (avatar + nome + azioni account)
- La versione app va in Settings, non nel drawer
