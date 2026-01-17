/**
 * Composable pro načítání sudoku z externího API
 * https://sudoku-api.vercel.app/
 */

import { ref } from 'vue';

const API_URL = 'https://sudoku-api.vercel.app/api/dosuku';
const API_LIMIT = 5;

/**
 * Mapování obtížnosti z API na interní formát
 * @type {Record<string, string>}
 */
const DIFFICULTY_MAP_FROM_API = {
    'Easy': 'easy',
    'Medium': 'medium',
    'Hard': 'hard'
};

/**
 * Mapování interní obtížnosti na API formát
 * @type {Record<string, string>}
 */
const DIFFICULTY_MAP_TO_API = {
    'easy': 'Easy',
    'medium': 'Medium',
    'hard': 'Hard'
};

/**
 * Transformuje API odpověď (2D pole čísel) na interní formát gridu
 * @param {number[][]} apiGrid - Mřížka z API (0 = prázdné)
 * @returns {import('../types.js').SudokuGrid}
 */
function transformApiGridToInternal(apiGrid) {
    return apiGrid.map(row =>
        row.map(cell => ({
            value: cell === 0 ? '' : String(cell),
            isStatic: cell !== 0
        }))
    );
}

/**
 * @returns {{
 *   isLoading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string | null>,
 *   fetchSudoku: (difficulty?: string) => Promise<{grid: import('../types.js').SudokuGrid, solution: number[][], difficulty: string} | null>
 * }}
 */
export function useSudokuApi() {
    const isLoading = ref(false);
    const error = ref(null);

    /**
     * Načte sudoku z API
     * API nepodporuje výběr obtížnosti, proto načteme více sudoku a vybereme odpovídající
     * @param {string} [difficulty='medium'] - Požadovaná obtížnost (easy, medium, hard)
     * @returns {Promise<{grid: import('../types.js').SudokuGrid, solution: number[][], difficulty: string} | null>}
     */
    async function fetchSudoku(difficulty = 'medium') {
        isLoading.value = true;
        error.value = null;

        try {
            const query = encodeURIComponent(`{newboard(limit:${API_LIMIT}){grids{value,solution,difficulty},results,message}}`);
            const response = await fetch(`${API_URL}?query=${query}`);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.newboard || !data.newboard.grids || data.newboard.grids.length === 0) {
                throw new Error('Neplatná odpověď z API');
            }

            const grids = data.newboard.grids;
            const targetDifficulty = DIFFICULTY_MAP_TO_API[difficulty] || 'Medium';

            // Hledáme sudoku s požadovanou obtížností
            let selectedGrid = grids.find(g => g.difficulty === targetDifficulty);

            // Pokud nenajdeme, vrátíme null - použije se lokální generování
            if (!selectedGrid) {
                console.log(`API nevrátilo sudoku s obtížností ${difficulty}`);
                return null;
            }

            const grid = transformApiGridToInternal(selectedGrid.value);
            const apiDifficulty = DIFFICULTY_MAP_FROM_API[selectedGrid.difficulty] || 'medium';

            return {
                grid,
                solution: selectedGrid.solution,
                difficulty: apiDifficulty
            };
        } catch (err) {
            error.value = err.message || 'Chyba při načítání z API';
            console.warn('Chyba API sudoku:', err);
            return null;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        isLoading,
        error,
        fetchSudoku
    };
}