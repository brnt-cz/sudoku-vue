/**
 * @typedef {Object} GridCell
 * @property {string} value - Hodnota buňky (1-9 nebo '')
 * @property {boolean} isStatic - Zda je buňka předvyplněná
 */

/**
 * @typedef {GridCell[][]} SudokuGrid
 */

/**
 * @typedef {Object} SavedGame
 * @property {number} id - Unikátní ID hry
 * @property {SudokuGrid} grid - Stav mřížky
 * @property {string} savedAt - Datum uložení
 * @property {string} [name] - Název hry
 * @property {Difficulty} [difficulty] - Obtížnost hry
 * @property {number} [deletedAt] - Timestamp smazání (pro koš)
 */

/**
 * @typedef {'easy' | 'medium' | 'hard'} Difficulty
 */

/**
 * @typedef {'media' | 'dark' | 'light'} Theme
 */

/**
 * Konstanty pro počet vyplněných políček podle obtížnosti
 * @type {Record<Difficulty, number>}
 */
export const DIFFICULTY_MAP = {
    easy: 36,
    medium: 30,
    hard: 24
};

/**
 * Popisky obtížností
 * @type {Record<Difficulty, string>}
 */
export const DIFFICULTY_LABELS = {
    easy: "* Lehká",
    medium: "** Střední",
    hard: "*** Těžká"
};

/**
 * Klíče pro localStorage
 */
export const STORAGE_KEYS = {
    GAMES: 'sudoku_saved_games',
    TRASH: 'sudoku_games_trash',
    THEME: 'sudoku_theme',
    CURRENT_GRID: 'sudoku_current_grid'
};

/**
 * Doba automatického mazání z koše (7 dní)
 */
export const TRASH_AUTO_REMOVE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Maximální délka názvu hry
 */
export const MAX_GAME_NAME_LENGTH = 100;

/**
 * Animace v ms
 */
export const ANIMATION_DURATION_MS = 600;