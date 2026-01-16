/**
 * Composable pro správu uložených sudoku her
 * Zahrnuje ukládání, načítání, mazání a koš
 */

import { ref, computed, watch, onMounted } from 'vue';
import {
    getFromStorage,
    setToStorage,
    isValidSavedGamesArray
} from '../utils/localStorage.js';
import { STORAGE_KEYS, TRASH_AUTO_REMOVE_MS, MAX_GAME_NAME_LENGTH } from '../types.js';
import { copyGrid, isGridSolved as checkIsGridSolved } from '../utils/sudokuGenerator.js';

/**
 * @param {import('vue').Ref<import('../types.js').SudokuGrid>} grid - Ref na aktuální grid
 * @returns {{
 *   savedGames: import('vue').Ref<import('../types.js').SavedGame[]>,
 *   trash: import('vue').Ref<import('../types.js').SavedGame[]>,
 *   currentGameId: import('vue').Ref<number | null>,
 *   highlightedId: import('vue').Ref<number | null>,
 *   editNameId: import('vue').Ref<number | null>,
 *   editNameValue: import('vue').Ref<string>,
 *   solvedGameIds: import('vue').ComputedRef<Set<number>>,
 *   loadGame: (game: import('../types.js').SavedGame) => void,
 *   saveGame: () => void,
 *   deleteGame: (id: number) => void,
 *   restoreGame: (id: number) => void,
 *   permanentDeleteGame: (id: number) => void,
 *   startEditName: (id: number, name: string) => void,
 *   handleNameChange: (e: Event) => void,
 *   saveName: (id: number) => void,
 *   cancelEditName: () => void,
 *   formatDeleteDate: (deletedAt?: number) => string
 * }}
 */
export function useSudokuGames(grid) {
    /** @type {import('vue').Ref<import('../types.js').SavedGame[]>} */
    const savedGames = ref([]);

    /** @type {import('vue').Ref<import('../types.js').SavedGame[]>} */
    const trash = ref([]);

    /** @type {import('vue').Ref<number | null>} */
    const currentGameId = ref(null);

    /** @type {import('vue').Ref<number | null>} */
    const highlightedId = ref(null);

    /** @type {import('vue').Ref<number | null>} */
    const editNameId = ref(null);

    /** @type {import('vue').Ref<string>} */
    const editNameValue = ref('');

    /** @type {number | null} */
    let highlightTimeout = null;

    // Načtení z localStorage
    onMounted(() => {
        savedGames.value = getFromStorage(
            STORAGE_KEYS.GAMES,
            [],
            isValidSavedGamesArray
        );

        trash.value = getFromStorage(
            STORAGE_KEYS.TRASH,
            [],
            isValidSavedGamesArray
        );

        // Vyčistíme staré položky z koše
        cleanupTrash();
    });

    /**
     * Memoizovaný set ID vyřešených her
     * Přepočítá se pouze při změně savedGames
     */
    const solvedGameIds = computed(() => {
        const solved = new Set();
        for (const game of savedGames.value) {
            if (checkIsGridSolved(game.grid)) {
                solved.add(game.id);
            }
        }
        return solved;
    });

    /**
     * Vyčistí staré položky z koše
     */
    function cleanupTrash() {
        const now = Date.now();
        const filtered = trash.value.filter(
            game => !game.deletedAt || (now - game.deletedAt < TRASH_AUTO_REMOVE_MS)
        );

        if (filtered.length < trash.value.length) {
            trash.value = filtered;
            setToStorage(STORAGE_KEYS.TRASH, filtered);
        }
    }

    /**
     * Načte hru do gridu
     * @param {import('../types.js').SavedGame} game
     */
    function loadGame(game) {
        grid.value = copyGrid(game.grid);
        currentGameId.value = game.id;
    }

    /**
     * Uloží aktuální hru
     */
    function saveGame() {
        const newGridSnapshot = copyGrid(grid.value);

        if (currentGameId.value !== null) {
            // Aktualizace existující hry
            savedGames.value = savedGames.value.map(game =>
                game.id === currentGameId.value
                    ? { ...game, grid: newGridSnapshot, savedAt: new Date().toLocaleString() }
                    : game
            );
            setToStorage(STORAGE_KEYS.GAMES, savedGames.value);

            // Highlight efekt s cleanup
            highlightedId.value = currentGameId.value;
            if (highlightTimeout) clearTimeout(highlightTimeout);
            highlightTimeout = setTimeout(() => {
                highlightedId.value = null;
                highlightTimeout = null;
            }, 600);
        } else {
            // Nová hra
            const newId = Date.now();
            savedGames.value = [
                ...savedGames.value,
                {
                    id: newId,
                    grid: newGridSnapshot,
                    savedAt: new Date().toLocaleString(),
                    name: ""
                }
            ];
            currentGameId.value = newId;
            editNameId.value = newId;
            editNameValue.value = "";
            setToStorage(STORAGE_KEYS.GAMES, savedGames.value);
        }
    }

    /**
     * Přesune hru do koše
     * @param {number} id
     */
    function deleteGame(id) {
        const gameToTrash = savedGames.value.find(game => game.id === id);
        savedGames.value = savedGames.value.filter(game => game.id !== id);
        setToStorage(STORAGE_KEYS.GAMES, savedGames.value);

        if (currentGameId.value === id) {
            currentGameId.value = null;
        }

        if (gameToTrash) {
            trash.value = [
                ...trash.value.filter(g => g.id !== id),
                { ...gameToTrash, deletedAt: Date.now() }
            ];
            setToStorage(STORAGE_KEYS.TRASH, trash.value);
        }
    }

    /**
     * Obnoví hru z koše
     * @param {number} id
     */
    function restoreGame(id) {
        const gameToRestore = trash.value.find(game => game.id === id);
        if (gameToRestore) {
            trash.value = trash.value.filter(game => game.id !== id);
            setToStorage(STORAGE_KEYS.TRASH, trash.value);

            const { deletedAt, ...gameWithoutDeletedAt } = gameToRestore;
            savedGames.value = [
                ...savedGames.value,
                { ...gameWithoutDeletedAt, savedAt: new Date().toLocaleString() }
            ];
            setToStorage(STORAGE_KEYS.GAMES, savedGames.value);
        }
    }

    /**
     * Trvale smaže hru z koše
     * @param {number} id
     */
    function permanentDeleteGame(id) {
        trash.value = trash.value.filter(game => game.id !== id);
        setToStorage(STORAGE_KEYS.TRASH, trash.value);
    }

    /**
     * Začne editaci názvu hry
     * @param {number} id
     * @param {string} name
     */
    function startEditName(id, name) {
        editNameId.value = id;
        editNameValue.value = name || '';
    }

    /**
     * Handler pro změnu názvu
     * @param {Event} e
     */
    function handleNameChange(e) {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const sanitized = String(target.value || '').trim();

        // Omezení délky
        if (sanitized.length <= MAX_GAME_NAME_LENGTH) {
            editNameValue.value = target.value;
        }
    }

    /**
     * Uloží název hry
     * @param {number} id
     */
    function saveName(id) {
        const trimmed = editNameValue.value.trim();
        savedGames.value = savedGames.value.map(game =>
            game.id === id ? { ...game, name: trimmed } : game
        );
        editNameId.value = null;
        editNameValue.value = '';
        setToStorage(STORAGE_KEYS.GAMES, savedGames.value);
    }

    /**
     * Zruší editaci názvu
     */
    function cancelEditName() {
        editNameId.value = null;
        editNameValue.value = '';
    }

    /**
     * Formátuje datum smazání pro zobrazení
     * @param {number} [deletedAt]
     * @returns {string}
     */
    function formatDeleteDate(deletedAt) {
        if (!deletedAt) return '';
        const expiresAt = new Date(deletedAt + TRASH_AUTO_REMOVE_MS);
        return ` • do: ${expiresAt.toLocaleDateString()}`;
    }

    // Watch pro automatické čištění koše
    watch(trash, () => {
        cleanupTrash();
    }, { immediate: true });

    return {
        savedGames,
        trash,
        currentGameId,
        highlightedId,
        editNameId,
        editNameValue,
        solvedGameIds,
        loadGame,
        saveGame,
        deleteGame,
        restoreGame,
        permanentDeleteGame,
        startEditName,
        handleNameChange,
        saveName,
        cancelEditName,
        formatDeleteDate
    };
}