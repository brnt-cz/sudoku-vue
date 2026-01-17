/**
 * Composable pro práci s Web Workerem na generování sudoku
 * Primárně používá externí API, fallback na lokální generování
 */

import { ref, onUnmounted } from 'vue';
import { generateSudoku as generateSudokuSync } from '../utils/sudokuGenerator.js';
import { useSudokuApi } from './useSudokuApi.js';

/**
 * @returns {{
 *   isGenerating: import('vue').Ref<boolean>,
 *   generateSudoku: (minFilled?: number, difficulty?: string) => Promise<import('../types.js').SudokuGrid>
 * }}
 */
export function useSudokuWorker() {
    const isGenerating = ref(false);
    const { fetchSudoku } = useSudokuApi();

    /** @type {Worker | null} */
    let worker = null;

    /**
     * Vytvoří nový Worker pokud neexistuje
     * @returns {Worker | null}
     */
    function getWorker() {
        if (worker) return worker;

        try {
            // Vite podporuje import worker jako URL
            worker = new Worker(
                new URL('../workers/sudokuWorker.js', import.meta.url),
                { type: 'module' }
            );
            return worker;
        } catch (error) {
            console.warn('Web Worker není podporován, použijeme synchronní generování:', error);
            return null;
        }
    }

    /**
     * Generuje sudoku pomocí lokálního workeru
     * @param {number} minFilled
     * @returns {Promise<import('../types.js').SudokuGrid>}
     */
    async function generateWithWorker(minFilled) {
        const workerInstance = getWorker();

        if (workerInstance) {
            return await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout při generování sudoku'));
                }, 10000); // 10s timeout

                workerInstance.onmessage = (event) => {
                    clearTimeout(timeout);
                    const response = event.data;

                    if (response.type === 'success') {
                        resolve(response.grid);
                    } else {
                        reject(new Error(response.error || 'Chyba při generování'));
                    }
                };

                workerInstance.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(error);
                };

                workerInstance.postMessage({ type: 'generate', minFilled });
            });
        }

        // Fallback - synchronní generování
        return generateSudokuSync(minFilled);
    }

    /**
     * Generuje sudoku - primárně z API, fallback na lokální generování
     * @param {number} [minFilled=30] - Počet vyplněných políček pro lokální generování
     * @param {string} [difficulty='medium'] - Požadovaná obtížnost (easy, medium, hard)
     * @returns {Promise<import('../types.js').SudokuGrid>}
     */
    async function generateSudoku(minFilled = 30, difficulty = 'medium') {
        isGenerating.value = true;

        try {
            // Primární zdroj: externí API
            const apiResult = await fetchSudoku(difficulty);

            if (apiResult && apiResult.grid) {
                console.log('Sudoku načteno z API, obtížnost:', apiResult.difficulty);
                return apiResult.grid;
            }

            // Fallback: lokální generování
            console.log('API nevrátilo požadovanou obtížnost, používám lokální generování');
            return await generateWithWorker(minFilled);
        } catch (error) {
            console.warn('Chyba při generování z API, fallback na lokální:', error);
            return await generateWithWorker(minFilled);
        } finally {
            isGenerating.value = false;
        }
    }

    // Cleanup při unmount
    onUnmounted(() => {
        if (worker) {
            worker.terminate();
            worker = null;
        }
    });

    return {
        isGenerating,
        generateSudoku
    };
}