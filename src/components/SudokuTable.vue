<script setup>
/**
 * SudokuTable - komponenta pro zobrazení a editaci sudoku mřížky
 * @typedef {import('../types.js').GridCell} GridCell
 * @typedef {import('../types.js').SudokuGrid} SudokuGrid
 */

import { isValid } from '../utils/sudokuGenerator.js';

/**
 * @type {{
 *   grid: SudokuGrid
 * }}
 */
const props = defineProps({
    grid: {
        type: Array,
        required: true,
        validator: (/** @type {unknown} */ value) => {
            if (!Array.isArray(value) || value.length !== 9) return false;
            return value.every(row =>
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
    }
});

const emit = defineEmits(['update:grid']);

/**
 * Kontroluje, zda je hodnota validní na dané pozici
 * Používá importovanou funkci, ale s úpravou pro aktuální buňku
 * @param {SudokuGrid} grid
 * @param {number} row
 * @param {number} col
 * @param {string} value
 * @returns {boolean}
 */
const isValidForCell = (grid, row, col, value) => {
    if (!value) return true;

    // Kontrola řádku (mimo aktuální buňku)
    for (let i = 0; i < 9; i++) {
        if (i !== col && grid[row][i].value === value) return false;
    }

    // Kontrola sloupce (mimo aktuální buňku)
    for (let i = 0; i < 9; i++) {
        if (i !== row && grid[i][col].value === value) return false;
    }

    // Kontrola 3x3 bloku (mimo aktuální buňku)
    const startRow = 3 * Math.floor(row / 3);
    const startCol = 3 * Math.floor(col / 3);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = startRow + i;
            const c = startCol + j;
            if ((r !== row || c !== col) && grid[r][c].value === value) {
                return false;
            }
        }
    }

    return true;
};

/**
 * Handler pro změnu hodnoty v buňce
 * @param {number} row
 * @param {number} col
 * @param {Event} event
 */
const handleInputChange = (row, col, event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const value = target.value;

    // Validace vstupu - pouze čísla 1-9 nebo prázdný string
    if (!/^[1-9]?$/.test(value)) return;

    if (value === "") {
        const newGrid = props.grid.map((r, i) =>
            r.map((c, j) =>
                i === row && j === col
                    ? { ...c, value: "" }
                    : c
            )
        );
        emit('update:grid', newGrid);
        return;
    }

    // Kontrola validity pouze pro neprázdné hodnoty
    if (isValidForCell(props.grid, row, col, value)) {
        const newGrid = props.grid.map((r, i) =>
            r.map((c, j) =>
                i === row && j === col
                    ? { ...c, value }
                    : c
            )
        );
        emit('update:grid', newGrid);
    } else {
        // Vrátit původní hodnotu do inputu při neplatném vstupu
        target.value = props.grid[row][col].value || '';
    }
};

/**
 * Generuje CSS třídy pro buňku podle její pozice
 * @param {number} rowIndex
 * @param {number} colIndex
 * @returns {string}
 */
const getCellClass = (rowIndex, colIndex) => {
    let classes = 'w-10 h-10 flex justify-center items-center border border-gray-400 dark:border-gray-700';

    // Silnější okraj pro oddělení 3x3 bloků
    if (rowIndex % 3 === 2 && rowIndex !== 8) {
        classes += ' border-b-2 border-b-gray-300 dark:border-b-gray-500';
    }
    if (colIndex % 3 === 2 && colIndex !== 8) {
        classes += ' border-r-2 border-r-gray-300 dark:border-r-gray-500';
    }

    return classes;
};

/**
 * Generuje CSS třídy pro input podle stavu buňky
 * @param {GridCell} cell
 * @returns {string}
 */
const getInputClass = (cell) => {
    let classes = 'w-full h-full text-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:z-10';

    if (cell.isStatic) {
        classes += ' text-black dark:text-white bg-gray-200 dark:bg-gray-900 font-bold';
    } else {
        classes += ' bg-white dark:text-white dark:bg-gray-800';
    }

    return classes;
};

/**
 * Generuje aria-label pro buňku
 * @param {number} row
 * @param {number} col
 * @param {GridCell} cell
 * @returns {string}
 */
const getCellAriaLabel = (row, col, cell) => {
    const position = `Řádek ${row + 1}, sloupec ${col + 1}`;
    const block = `blok ${Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1}`;

    if (cell.value) {
        const type = cell.isStatic ? 'předvyplněno' : 'vyplněno';
        return `${position}, ${block}, hodnota ${cell.value} (${type})`;
    }

    return `${position}, ${block}, prázdné`;
};
</script>

<template>
    <div
        class="grid grid-cols-9 grid-rows-9 gap-0 border-2 border-gray-400 dark:border-gray-600"
        role="grid"
        aria-label="Sudoku mřížka 9x9"
    >
        <template v-for="(row, rowIndex) in grid" :key="rowIndex">
            <div
                v-for="(cell, colIndex) in row"
                :key="`${rowIndex}-${colIndex}`"
                :class="getCellClass(rowIndex, colIndex)"
                role="gridcell"
            >
                <input
                    type="text"
                    inputmode="numeric"
                    pattern="[1-9]"
                    maxlength="1"
                    :value="cell.value || ''"
                    :readonly="cell.isStatic"
                    :aria-readonly="cell.isStatic"
                    :aria-label="getCellAriaLabel(rowIndex, colIndex, cell)"
                    @input="handleInputChange(rowIndex, colIndex, $event)"
                    :class="getInputClass(cell)"
                />
            </div>
        </template>
    </div>
</template>