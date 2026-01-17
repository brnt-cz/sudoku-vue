<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import SudokuTable from './components/SudokuTable.vue';
import confetti from 'canvas-confetti';

// Composables
import { useTheme } from './composables/useTheme.js';
import { useSudokuGames } from './composables/useSudokuGames.js';
import { useSudokuWorker } from './composables/useSudokuWorker.js';

// Utils & Types
import {
    solveSudoku,
    createEmptyGrid,
    isGridComplete,
    isGridSolved
} from './utils/sudokuGenerator.js';
import { DIFFICULTY_MAP, DIFFICULTY_LABELS, STORAGE_KEYS } from './types.js';
import { getFromStorage, setToStorage } from './utils/localStorage.js';

/**
 * Validuje, zda je objekt platný SudokuGrid
 * @param {unknown} data
 * @returns {boolean}
 */
function isValidGrid(data) {
    if (!Array.isArray(data) || data.length !== 9) return false;
    return data.every(row =>
        Array.isArray(row) &&
        row.length === 9 &&
        row.every(cell =>
            cell &&
            typeof cell === 'object' &&
            'value' in cell &&
            'isStatic' in cell
        )
    );
}

/**
 * Kontroluje, zda je grid prázdný (všechny buňky bez hodnoty)
 * @param {import('./types.js').SudokuGrid} grid
 * @returns {boolean}
 */
function isGridEmpty(grid) {
    return grid.every(row => row.every(cell => !cell.value));
}

// State
const grid = ref(createEmptyGrid());
const difficulty = ref('medium');
const solveError = ref(null);
const isPanelOpen = ref(false);

// Composables
const { theme, themeIcon, themeTitle, toggleTheme } = useTheme();
const {
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
} = useSudokuGames(grid);
const { isGenerating, generateSudoku: generateSudokuAsync } = useSudokuWorker();

// Inicializace - načteme uložený grid nebo vygenerujeme nový
onMounted(async () => {
    document.title = 'Sudoku';

    // Pokusíme se načíst uložený grid z localStorage
    const savedGrid = getFromStorage(STORAGE_KEYS.CURRENT_GRID);

    if (savedGrid && isValidGrid(savedGrid) && !isGridEmpty(savedGrid)) {
        // Máme platný uložený grid, použijeme ho
        grid.value = savedGrid;
        return;
    }

    // Nemáme uložený grid, vygenerujeme nový
    try {
        grid.value = await generateSudokuAsync(DIFFICULTY_MAP[difficulty.value], difficulty.value);
    } catch (error) {
        console.error('Chyba při generování sudoku:', error);
        grid.value = createEmptyGrid();
    }
});

// Ukládáme aktuální grid do localStorage při každé změně
watch(grid, (newGrid) => {
    setToStorage(STORAGE_KEYS.CURRENT_GRID, newGrid);
}, { deep: true });

// Computed pro kontrolu, zda je hra vyřešena
const isCurrentGridSolved = computed(() => isGridSolved(grid.value));
const isCurrentGridComplete = computed(() => isGridComplete(grid.value));

// Watch pro confetti při vyřešení
let confettiDebounceTimeout = null;
onUnmounted(() => {
    if (confettiDebounceTimeout) {
        clearTimeout(confettiDebounceTimeout);
    }
});

watch(isCurrentGridComplete, (complete) => {
    if (!complete) return;

    // Debounce - počkáme 100ms než zkontrolujeme řešení
    if (confettiDebounceTimeout) {
        clearTimeout(confettiDebounceTimeout);
    }

    confettiDebounceTimeout = setTimeout(() => {
        if (isGridSolved(grid.value)) {
            confetti();
        }
        confettiDebounceTimeout = null;
    }, 100);
});

// Methods
function handleLoad(game) {
    loadGame(game);
    solveError.value = null;
}

function handleSave() {
    saveGame();
}

function handleEmptyGrid() {
    grid.value = createEmptyGrid();
    currentGameId.value = null;
}

function handleSolve() {
    const solution = solveSudoku(grid.value);
    if (solution) {
        grid.value = solution;
        solveError.value = null;
    } else {
        solveError.value = 'Toto sudoku není řešitelné.';
    }
}

function handleDifficultyChange(e) {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    difficulty.value = target.value;
}

async function handleGenerate() {
    try {
        grid.value = await generateSudokuAsync(DIFFICULTY_MAP[difficulty.value], difficulty.value);
        currentGameId.value = null;
        solveError.value = null;
    } catch (error) {
        console.error('Chyba při generování:', error);
        solveError.value = 'Nepodařilo se vygenerovat sudoku.';
    }
}

function updateGrid(newGrid) {
    grid.value = newGrid;
}

function handleNameKeydown(e, id) {
    if (e.key === 'Enter') saveName(id);
    if (e.key === 'Escape') cancelEditName();
}

/**
 * Kontroluje, zda je hra vyřešena (memoizovaně)
 * @param {number} gameId
 * @returns {boolean}
 */
function isGameSolved(gameId) {
    return solvedGameIds.value.has(gameId);
}
</script>

<template>
    <div class="App">
        <button
            @click="toggleTheme"
            class="fixed left-4 top-4 z-50 p-2 rounded shadow bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-800 focus:outline-none transition"
            :title="themeTitle"
            :aria-label="themeTitle"
        >
            <!-- Monitor - systémové téma -->
            <svg v-if="themeIcon === 'monitor'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <!-- Slunce - přepnout na světlé -->
            <svg v-else-if="themeIcon === 'sun'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <!-- Měsíc - přepnout na systémové -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        </button>

        <div class="flex flex-row justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div class="flex flex-col justify-center items-center flex-grow">
                <SudokuTable :grid="grid" @update:grid="updateGrid" />

                <div class="mt-4 flex flex-col gap-2 items-center">
                    <div class="flex gap-2 flex-wrap justify-center">
                        <select
                            :value="difficulty"
                            @change="handleDifficultyChange"
                            class="px-2 py-1 rounded border-2 border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white dark:bg-gray-100 dark:text-black"
                            aria-label="Výběr obtížnosti"
                        >
                            <option value="easy">{{ DIFFICULTY_LABELS.easy }}</option>
                            <option value="medium">{{ DIFFICULTY_LABELS.medium }}</option>
                            <option value="hard">{{ DIFFICULTY_LABELS.hard }}</option>
                        </select>

                        <button
                            class="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            @click="handleGenerate"
                            :disabled="isGenerating"
                            :aria-busy="isGenerating"
                        >
                            <svg v-if="isGenerating" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin" aria-hidden="true">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14"></path>
                            </svg>
                            <span v-if="isGenerating">Generuji...</span>
                            <span v-else>Nové sudoku</span>
                        </button>

                        <button
                            class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-green-300 flex items-center gap-2"
                            @click="handleSave"
                            aria-label="Uložit aktuální hru"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Uložit hru
                        </button>
                    </div>

                    <div class="flex gap-2 flex-wrap justify-center">
                        <button
                            class="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-purple-300 flex items-center gap-2"
                            @click="handleSolve"
                            aria-label="Automaticky vyřešit sudoku"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                                <path d="M9 18h6"></path>
                                <path d="M10 22h4"></path>
                            </svg>
                            Vyřešit
                        </button>

                        <button
                            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center gap-2"
                            @click="handleEmptyGrid"
                            aria-label="Vytvořit prázdné sudoku"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <line x1="15" y1="3" x2="15" y2="21"></line>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="3" y1="15" x2="21" y2="15"></line>
                            </svg>
                            Prázdné sudoku
                        </button>
                    </div>
                </div>

                <div v-if="solveError" class="mt-2 text-red-600 dark:text-red-400 text-sm" role="alert">
                    {{ solveError }}
                </div>

                <div v-if="isCurrentGridSolved" class="mt-2 text-green-600 dark:text-green-400 text-sm font-bold" role="status">
                    Gratulujeme! Sudoku je vyřešeno!
                </div>
            </div>

            <!-- Plovoucí tlačítko pro mobilní zařízení -->
            <button
                @click="isPanelOpen = !isPanelOpen"
                class="fixed right-4 top-4 z-50 px-3 py-2 rounded shadow bg-black text-white hover:bg-gray-800 focus:outline-none transition md:hidden"
                :title="isPanelOpen ? 'Zavřít uložené hry' : 'Otevřít uložené hry'"
                :aria-label="isPanelOpen ? 'Zavřít panel uložených her' : 'Otevřít panel uložených her'"
                :aria-expanded="isPanelOpen"
                aria-controls="saved-games-panel"
            >
                <svg v-if="isPanelOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>

            <!-- Overlay pro zavření panelu kliknutím mimo -->
            <div
                v-if="isPanelOpen"
                class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                @click="isPanelOpen = false"
                aria-hidden="true"
            />

            <aside
                id="saved-games-panel"
                :class="[
                    'w-80 md:w-72 bg-white dark:bg-gray-800 border-l scroller border-gray-300 dark:border-gray-700 shadow-lg p-5 md:p-4 fixed right-0 top-0 h-full flex flex-col z-40 transition-transform duration-300',
                    isPanelOpen ? 'translate-x-0' : 'translate-x-full',
                    'md:translate-x-0'
                ]"
                :aria-hidden="!isPanelOpen && 'true'"
                role="complementary"
                aria-label="Panel uložených her"
            >
                <h2 class="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 text-center">Uložené hry</h2>

                <div v-if="savedGames.length === 0" class="text-gray-500 dark:text-gray-400 text-center">
                    Žádná uložená hra
                </div>

                <ul class="flex-1 overflow-y-auto space-y-3 md:space-y-2 mb-6" aria-label="Seznam uložených her">
                    <li
                        v-for="game in savedGames"
                        :key="game.id"
                        :class="[
                            'bg-gray-100 dark:bg-gray-700 dark:text-white rounded px-3 py-2 md:px-2 md:py-1 flex flex-col space-y-2 md:space-y-1 transition-colors',
                            highlightedId === game.id ? 'animate-pulse bg-gray-300 dark:bg-gray-600' : '',
                            isGameSolved(game.id) ? 'opacity-100' : ''
                        ]"
                    >
                        <div class="flex items-center justify-between">
                            <span :class="['truncate text-sm md:text-xs font-bold flex items-center gap-2', game.name ? '' : 'italic text-gray-500 dark:text-gray-300']">
                                {{ game.name || 'Nepojmenovaná hra' }}
                                <svg
                                    v-if="isGameSolved(game.id)"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    class="inline-block text-green-500"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-label="Vyřešeno"
                                    role="img"
                                >
                                    <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15"/>
                                    <path d="M6 10.5l3 3 5-5" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>

                            <template v-if="editNameId === game.id">
                                <input
                                    type="text"
                                    :value="editNameValue"
                                    autofocus
                                    @input="handleNameChange"
                                    @keydown="(e) => handleNameKeydown(e, game.id)"
                                    class="flex-1 px-2 ml-2 py-1 md:px-1 md:py-0.5 text-sm md:text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-white w-24 md:w-20"
                                    :aria-label="'Přejmenovat hru ' + (game.name || 'Nepojmenovaná hra')"
                                    maxlength="100"
                                />
                                <button
                                    class="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded ml-1 flex items-center cursor-pointer"
                                    @click="saveName(game.id)"
                                    title="Uložit název"
                                    aria-label="Uložit název"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </button>
                            </template>
                            <template v-else>
                                <button
                                    class="ml-2 p-2 md:p-1 bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600 rounded cursor-pointer"
                                    title="Přejmenovat"
                                    :aria-label="'Přejmenovat hru ' + (game.name || 'Nepojmenovaná hra')"
                                    @click="startEditName(game.id, game.name || '')"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="18" height="18" class="md:w-3.5 md:h-3.5" fill="currentColor" aria-hidden="true">
                                        <path d="M15.72 2.927a2.25 2.25 0 1 1 3.182 3.182l-1.303 1.302-3.182-3.182 1.303-1.302zm-2.01 2.01l3.182 3.182-9.09 9.091a2 2 0 0 1-.78.486l-3.23 1.076a.626.626 0 0 1-.79-.79l1.075-3.23a2 2 0 0 1 .487-.779l9.09-9.09z"/>
                                    </svg>
                                </button>
                            </template>
                        </div>

                        <div class="flex items-center justify-between">
                            <span class="truncate text-sm md:text-xs">{{ game.savedAt }}</span>
                            <div class="flex gap-2">
                                <button
                                    class="p-2 bg-[#009966] hover:bg-[#007a52] text-white rounded focus:outline-none flex items-center cursor-pointer"
                                    @click="handleLoad(game)"
                                    title="Načíst"
                                    :aria-label="'Načíst hru ' + (game.name || 'Nepojmenovaná hra')"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"></path>
                                    </svg>
                                </button>
                                <button
                                    class="p-2 bg-[#C7012A] hover:bg-[#a50122] text-white rounded focus:outline-none flex items-center cursor-pointer"
                                    @click="deleteGame(game.id)"
                                    title="Smazat"
                                    :aria-label="'Smazat hru ' + (game.name || 'Nepojmenovaná hra')"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </li>
                </ul>

                <!-- Koš -->
                <div class="mt-auto">
                    <h3 class="text-base font-bold mt-2 mb-2 md:mb-1 text-gray-700 dark:text-gray-200 text-center">Koš</h3>

                    <div v-if="trash.length === 0" class="text-gray-400 dark:text-gray-500 text-sm md:text-xs italic text-center">
                        Koš je prázdný
                    </div>

                    <ul class="space-y-3 md:space-y-2" aria-label="Koš - smazané hry">
                        <li
                            v-for="game in trash"
                            :key="game.id"
                            class="bg-gray-200 dark:bg-gray-600 dark:text-white rounded px-3 py-2 md:px-2 md:py-1 flex flex-col space-y-2 md:space-y-1"
                        >
                            <div class="truncate text-sm md:text-xs font-bold">{{ game.name || 'Nepojmenovaná hra' }}</div>
                            <div class="flex items-center justify-between">
                                <span class="truncate text-sm md:text-xs">
                                    {{ game.savedAt }}
                                    <span class="ml-1 text-gray-500">{{ formatDeleteDate(game.deletedAt) }}</span>
                                </span>
                                <div class="flex gap-2">
                                    <button
                                        class="p-2 bg-[#009966] hover:bg-[#007a52] text-white rounded focus:outline-none flex items-center cursor-pointer"
                                        title="Obnovit"
                                        :aria-label="'Obnovit hru ' + (game.name || 'Nepojmenovaná hra')"
                                        @click="restoreGame(game.id)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                            <path d="M3 3v5h5"></path>
                                        </svg>
                                    </button>
                                    <button
                                        class="p-2 bg-[#C7012A] hover:bg-[#a50122] text-white rounded focus:outline-none flex items-center cursor-pointer"
                                        title="Smazat trvale"
                                        :aria-label="'Trvale smazat hru ' + (game.name || 'Nepojmenovaná hra')"
                                        @click="permanentDeleteGame(game.id)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </aside>
        </div>
    </div>
</template>