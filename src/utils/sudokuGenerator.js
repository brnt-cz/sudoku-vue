/**
 * Sudoku generátor a řešitel
 * Opravená verze s lepším error handling a exportovanými utilitami
 */

import { shuffle } from './shuffle.js';

/**
 * Vytvoří hlubokou kopii gridu
 * @param {import('../types.js').SudokuGrid} grid
 * @returns {import('../types.js').SudokuGrid}
 */
export function copyGrid(grid) {
    return grid.map(row => row.map(cell => ({ ...cell })));
}

/**
 * Najde první prázdnou buňku v gridu
 * @param {import('../types.js').SudokuGrid} grid
 * @returns {{ row: number, col: number } | null}
 */
export function findEmpty(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (!grid[row][col].value) return { row, col };
        }
    }
    return null;
}

/**
 * Ověří, zda je hodnota platná na dané pozici
 * @param {import('../types.js').SudokuGrid} grid
 * @param {number} row
 * @param {number} col
 * @param {string} value
 * @returns {boolean}
 */
export function isValid(grid, row, col, value) {
    // Kontrola řádku a sloupce
    for (let i = 0; i < 9; i++) {
        if (grid[row][i].value === value) return false;
        if (grid[i][col].value === value) return false;
    }

    // Kontrola 3x3 bloku
    const startRow = 3 * Math.floor(row / 3);
    const startCol = 3 * Math.floor(col / 3);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[startRow + i][startCol + j].value === value) return false;
        }
    }

    return true;
}

/**
 * Spočítá počet řešení sudoku (do maxCount)
 * @param {import('../types.js').SudokuGrid} grid
 * @param {number} [maxCount=2]
 * @returns {number}
 */
export function getSolutionCount(grid, maxCount = 2) {
    const cloned = copyGrid(grid);
    let count = 0;

    function solve(innerGrid) {
        if (count >= maxCount) return count;

        const empty = findEmpty(innerGrid);
        if (!empty) {
            count += 1;
            return count;
        }

        const { row, col } = empty;
        for (let num = 1; num <= 9; num++) {
            const value = num.toString();
            if (isValid(innerGrid, row, col, value)) {
                innerGrid[row][col].value = value;
                solve(innerGrid);
                innerGrid[row][col].value = '';
            }
        }
        return count;
    }

    return solve(cloned);
}

/**
 * Vyřeší sudoku pomocí backtracking algoritmu
 * @param {import('../types.js').SudokuGrid} grid
 * @returns {import('../types.js').SudokuGrid | null} Vyřešený grid nebo null pokud není řešitelné
 */
export function solveSudoku(grid) {
    const cloned = copyGrid(grid);

    function solve(innerGrid) {
        const empty = findEmpty(innerGrid);
        if (!empty) return true;

        const { row, col } = empty;
        for (let num = 1; num <= 9; num++) {
            const value = num.toString();
            if (isValid(innerGrid, row, col, value)) {
                innerGrid[row][col].value = value;
                if (solve(innerGrid)) return true;
                innerGrid[row][col].value = '';
            }
        }
        return false;
    }

    if (solve(cloned)) {
        return cloned;
    }
    return null;
}

/**
 * Vyplní prázdný grid náhodným platným sudoku
 * @param {import('../types.js').SudokuGrid} grid
 * @returns {boolean}
 */
function fillSudoku(grid) {
    const empty = findEmpty(grid);
    if (!empty) return true;

    const { row, col } = empty;
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).map(String);

    for (const value of nums) {
        if (isValid(grid, row, col, value)) {
            grid[row][col].value = value;
            if (fillSudoku(grid)) return true;
            grid[row][col].value = '';
        }
    }
    return false;
}

/**
 * Vytvoří prázdný grid 9x9
 * @returns {import('../types.js').SudokuGrid}
 */
export function createEmptyGrid() {
    return Array(9)
        .fill(0)
        .map(() =>
            Array(9)
                .fill(null)
                .map(() => ({ value: '', isStatic: false }))
        );
}

/**
 * Generuje nové sudoku s unikátním řešením
 * @param {number} [minFilled=20] - Minimální počet předvyplněných políček
 * @param {number} [maxTries=50] - Maximální počet pokusů
 * @returns {import('../types.js').SudokuGrid}
 * @throws {Error} Pokud se nepodaří vygenerovat sudoku
 */
export function generateSudoku(minFilled = 20, maxTries = 50) {
    let attempt = 0;

    while (attempt++ < maxTries) {
        // Vytvoříme prázdný grid a vyplníme ho
        const full = createEmptyGrid();
        fillSudoku(full);

        // Vytvoříme náhodně zamíchaný seznam pozic
        /** @type {[number, number][]} */
        const positions = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                positions.push([row, col]);
            }
        }
        shuffle(positions);

        // Odebíráme čísla, dokud to má unikátní řešení
        let removed = 0;
        const maxToRemove = 81 - minFilled;

        for (const [row, col] of positions) {
            if (removed >= maxToRemove) break;

            const backup = full[row][col].value;
            full[row][col].value = '';

            // Ověříme, že má stále unikátní řešení
            if (getSolutionCount(full, 2) !== 1) {
                // Vrátíme hodnotu zpět
                full[row][col].value = backup;
            } else {
                removed++;
            }
        }

        // Označíme vyplněné buňky jako statické
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                full[row][col].isStatic = !!full[row][col].value;
            }
        }

        return full;
    }

    // Fallback - vrátíme jednodušší sudoku místo vyhození chyby
    console.warn('Nepodařilo se vygenerovat optimální sudoku, zkouším jednodušší variantu');
    return generateSudoku(Math.min(minFilled + 10, 45), maxTries);
}

/**
 * Ověří, zda je grid kompletně vyplněný
 * @param {import('../types.js').SudokuGrid} grid
 * @returns {boolean}
 */
export function isGridComplete(grid) {
    return grid.every(row => row.every(cell => cell.value !== ''));
}

/**
 * Ověří, zda je grid správně vyřešený
 * Optimalizovaná verze - nejdříve kontroluje kompletnost
 * @param {import('../types.js').SudokuGrid} grid
 * @returns {boolean}
 */
export function isGridSolved(grid) {
    // Rychlá kontrola - je vůbec vyplněný?
    if (!isGridComplete(grid)) return false;

    // Kontrola řádků
    for (let row = 0; row < 9; row++) {
        const seen = new Set();
        for (let col = 0; col < 9; col++) {
            const value = grid[row][col].value;
            if (seen.has(value)) return false;
            seen.add(value);
        }
    }

    // Kontrola sloupců
    for (let col = 0; col < 9; col++) {
        const seen = new Set();
        for (let row = 0; row < 9; row++) {
            const value = grid[row][col].value;
            if (seen.has(value)) return false;
            seen.add(value);
        }
    }

    // Kontrola 3x3 bloků
    for (let blockRow = 0; blockRow < 3; blockRow++) {
        for (let blockCol = 0; blockCol < 3; blockCol++) {
            const seen = new Set();
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const value = grid[blockRow * 3 + i][blockCol * 3 + j].value;
                    if (seen.has(value)) return false;
                    seen.add(value);
                }
            }
        }
    }

    return true;
}