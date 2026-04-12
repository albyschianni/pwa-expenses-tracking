# UX Audit — Expense Tracker PWA v2.2.0
## Panoramica generale dell'app

### Identità visiva
- **Dark theme** esclusivo: background #0f172a (slate-900), card #1e293b (slate-800)
- **Accent primario**: teal/cyan (#2dd4bf) — usato per CTA, selezioni attive, badge
- **Colori semantici**: rosso per spese, verde emerald per entrate, ambra per warning
- **Tipografia**: system font, gerarchia chiara (bold per importi, regular per label)
- **Border radius**: generoso (rounded-2xl / rounded-xl) — stile card moderno

### Navigazione
- **Tab bar a 5 voci**: Home · Grafici · [FAB] · Ricorrenti · Impostazioni
- **FAB centrale**: teal, taglia la tab bar — pattern "primary action" molto riconoscibile
- **Side drawer**: accessibile dall'hamburger nell'header, attualmente sottoutilizzato
- **Sub-pages overlay**: banking, dettagli, form — coprono lo schermo con z-index elevato
- **No back button nativo**: tutti i ritorni sono gestiti con pulsanti espliciti

### Flussi principali
1. **Aggiunta manuale**: FAB → form → salva → home aggiornata
2. **Visualizzazione**: home scroll → tap card → detail sheet
3. **Modifica/elimina**: detail sheet → bottoni → conferma
4. **Cambio mese**: header tap → month picker → conferma
5. **Banking**: settings → connetti banca → OAuth → sync automatico → categorizzazione
6. **Budget**: settings → budget mensile → inserimento importi per categoria

### Punti di forza attuali
- Gerarchia visiva chiara: il balance hero domina, tutto il resto è supporto
- Differenziazione spesa/entrata sempre coerente (rosso/verde)
- Transazioni bancarie integrate senza rompere il flusso manuale
- Categorie con icone emoji: riconoscibili a colpo d'occhio
- Performance: caricamento rapido, no skeleton loader visibile

### Gap UX trasversali da risolvere in Flutter
1. **Truncation merchant names**: nomi bancari lunghi troncati ovunque
2. **Nessun raggruppamento per data** nella lista (manca "Oggi / Ieri / Lunedì 28")
3. **Feedback azioni**: nessuna animazione/conferma visiva su salvataggio, eliminazione
4. **Gestione errori**: nessun UI di errore visibile (tutto silenzioso nei log)
5. **Accessibilità**: contrasti buoni ma nessun supporto Dynamic Type / font scaling
6. **Onboarding**: nessuno — utente nuovo vede lista vuota senza guida
7. **Empty states**: minimali, potrebbero essere più educativi

### Schermate da documentare ancora
- [ ] Grafici (chart + dettaglio categorie + budget)
- [ ] Transazioni bancarie (lista aggregata + filtro data)
- [ ] Dettaglio singolo conto bancario
- [ ] Settings (panoramica + sezione budget + sezione categorie)
- [ ] Portafogli condivisi
- [ ] Ricorrenti
- [ ] Auth (login/signup)
