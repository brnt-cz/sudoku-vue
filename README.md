# Sudoku Vue

Interaktivni sudoku hra postavena na Vue 3 s podporou ukladani her, tmaveho rezimu a automatickeho reseni.

## Funkce

- Generovani novych sudoku s volitelnou obtiznosti (lehka, stredni, tezka)
- Automaticke reseni sudoku
- Ukladani a nacitani her do localStorage
- Kos se smazanymi hrami (automaticke mazani po 7 dnech)
- Prejmenovaní ulozenych her
- Tmavy/svetly rezim + systemove nastaveni
- Confetti efekt pri vyreseni
- Plne responzivni design
- Podpora pristupnosti (a11y)

## Technologie

- **Vue 3** - Composition API, `<script setup>`
- **Vite 7** - build tool
- **Tailwind CSS 4** - styling
- **Web Workers** - generovani sudoku na pozadi
- **canvas-confetti** - efekt pri vyhre

## Instalace

```bash
# Klonovani repozitare
git clone <repo-url>
cd sudoku-vue

# Instalace zavislosti
npm install

# Spusteni vyvojoveho serveru
npm run dev

# Build pro produkci
npm run build

# Nahled produkcniho buildu
npm run preview
```

## Struktura projektu

```
src/
├── App.vue                      # Hlavni komponenta
├── main.js                      # Vstupni bod aplikace
├── types.js                     # JSDoc typy a konstanty
│
├── components/
│   └── SudokuTable.vue          # Komponenta sudoku mrizky
│
├── composables/
│   ├── useTheme.js              # Sprava tematu (dark/light/media)
│   ├── useSudokuGames.js        # Sprava ulozenych her a kose
│   └── useSudokuWorker.js       # Web Worker pro generovani
│
├── utils/
│   ├── sudokuGenerator.js       # Generator a resitel sudoku
│   ├── shuffle.js               # Fisher-Yates shuffle
│   └── localStorage.js          # Bezpecna prace s localStorage
│
├── workers/
│   └── sudokuWorker.js          # Web Worker pro generovani
│
└── assets/
    └── main.css                 # Globalni styly
```

## Pouziti

### Ovladani

| Akce | Popis |
|------|-------|
| **Nove sudoku** | Vygeneruje nove sudoku podle zvolene obtiznosti |
| **Ulozit hru** | Ulozi aktualni stav do localStorage |
| **Vyresit** | Automaticky vyresi sudoku |
| **Prazdne sudoku** | Vytvori prazdnou mrizku pro vlastni zadani |

### Klavesove zkratky

- `1-9` - Zadani cisla do bunky
- `Backspace/Delete` - Smazani cisla z bunky
- `Tab` - Presun na dalsi bunku

### Obtiznost

| Uroven | Predvyplnenych policek |
|--------|------------------------|
| Lehka | 36 |
| Stredni | 30 |
| Tezka | 24 |

## Architektura

### Composables

Aplikace vyuziva Vue 3 Composition API s vlastnimi composables:

- **useTheme** - Reaktivni sprava tematu s podporou `prefers-color-scheme`
- **useSudokuGames** - CRUD operace pro ulozene hry s memoizaci
- **useSudokuWorker** - Asynchronni generovani sudoku ve Web Workeru

### Optimalizace vykonu

- **Web Worker** - Generovani sudoku bezi na pozadi, neblokuje UI
- **Memoizace** - Kontrola vyresenych her je cachovana v computed property
- **Debouncing** - Confetti efekt je debounced pro zamezeni vicenasobneho spusteni
- **Optimalizovany algoritmus** - `isGridSolved()` ma slozitost O(n) misto backtrackingu

### Bezpecnost

- Validace dat z localStorage pred pouzitim
- Sanitizace uzivatelskych vstupu
- Try/catch kolem vsech JSON operaci
- Maximalni delka nazvu hry (100 znaku)

## Pozadavky

- Node.js 20.19+ nebo 22.12+
- Moderni prohlizec s podporou ES modules a Web Workers

## Licence

MIT