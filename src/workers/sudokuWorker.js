/**
 * Web Worker pro generování sudoku
 * Běží na pozadí, aby neblokoval UI
 */

import { generateSudoku } from '../utils/sudokuGenerator.js';

/**
 * @typedef {Object} WorkerMessage
 * @property {'generate'} type
 * @property {number} [minFilled]
 */

/**
 * @typedef {Object} WorkerResponse
 * @property {'success' | 'error'} type
 * @property {import('../types.js').SudokuGrid} [grid]
 * @property {string} [error]
 */

self.onmessage = function(event) {
    /** @type {WorkerMessage} */
    const message = event.data;

    if (message.type === 'generate') {
        try {
            const grid = generateSudoku(message.minFilled || 30);
            /** @type {WorkerResponse} */
            const response = { type: 'success', grid };
            self.postMessage(response);
        } catch (error) {
            /** @type {WorkerResponse} */
            const response = {
                type: 'error',
                error: error instanceof Error ? error.message : 'Neznámá chyba'
            };
            self.postMessage(response);
        }
    }
};