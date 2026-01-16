/**
 * Composable pro práci s Web Workerem na generování sudoku
 */

import { ref, onUnmounted } from 'vue';
import { generateSudoku as generateSudokuSync } from '../utils/sudokuGenerator.js';

/**
 * @returns {{
 *   isGenerating: import('vue').Ref<boolean>,
 *   generateSudoku: (minFilled?: number) => Promise<import('../types.js').SudokuGrid>
 * }}
 */
export function useSudokuWorker() {
    const isGenerating = ref(false);

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
     * Generuje sudoku - preferuje Worker, fallback na synchronní
     * @param {number} [minFilled=30]
     * @returns {Promise<import('../types.js').SudokuGrid>}
     */
    async function generateSudoku(minFilled = 30) {
        isGenerating.value = true;

        try {
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