# TicTacToe

Ein modernes TicTacToe-Spiel im Browser — gebaut mit vanilla HTML, CSS und JavaScript. Kein Framework, keine Abhängigkeiten.

## Features

### Spielmodi
- **Spieler vs. Spieler** — zwei Personen am selben Gerät
- **Spieler vs. KI** — drei Schwierigkeiten:
  - *Leicht* — zufällige Züge
  - *Mittel* — mischt optimale und zufällige Züge
  - *Unschlagbar* — Minimax-Algorithmus, nicht zu besiegen

### Spielerlebnis
- Spielernamen frei eingebbar, werden im Scoreboard und in der Historie angezeigt
- Rundenende-Modal mit Ergebnis (weiter mit `Enter`)
- Gewinnzellen werden grün hervorgehoben
- Konfetti-Animation bei Sieg
- Unentschieden-Flash-Animation
- Sound-Effekte (Klick, Sieg, Unentschieden) — stummschaltbar

### Statistik & Persistenz
- Laufender Spielstand pro Session
- Rundenhistorie
- Bestenliste (Top 10) — gespeichert in `localStorage`, bleibt nach Neuladen erhalten
- Dark Mode — Einstellung wird ebenfalls gespeichert

### Bedienung
- Maus oder Tastatur: Felder über **Numpad-Layout** (7–9 oben, 1–3 unten)
- `Enter` im Rundenende-Modal → nächste Runde starten

## Starten

Einfach `index.html` im Browser öffnen — kein Server, kein Build-Schritt nötig.

```
TicTacToe Projekt/
├── index.html
├── style.css
└── script.js
```

## Technik

| Thema | Umsetzung |
|---|---|
| KI | Minimax-Algorithmus (rekursiv, vollständig) |
| Sound | Web Audio API — keine externen Dateien |
| Konfetti | Canvas API — reines JS |
| Persistenz | `localStorage` |
| Layout | CSS Grid, 3-spaltig, responsiv mit `clamp()` |
| Dark Mode | CSS Custom Properties (`--var`) + `body.dark` |
