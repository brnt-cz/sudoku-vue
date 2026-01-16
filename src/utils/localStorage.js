/**
 * Bezpečná práce s localStorage
 * Řeší try/catch a validaci dat
 */

/**
 * Bezpečně načte a parsuje JSON z localStorage
 * @template T
 * @param {string} key - Klíč v localStorage
 * @param {T} defaultValue - Výchozí hodnota při chybě
 * @param {((data: unknown) => data is T) | null} [validator] - Volitelná validační funkce
 * @returns {T} Načtená hodnota nebo výchozí hodnota
 */
export function getFromStorage(key, defaultValue, validator = null) {
    try {
        const data = localStorage.getItem(key);
        if (data === null) {
            return defaultValue;
        }

        const parsed = JSON.parse(data);

        // Pokud je validator, ověříme data
        if (validator && !validator(parsed)) {
            console.warn(`[localStorage] Neplatná data pro klíč "${key}", použita výchozí hodnota`);
            localStorage.removeItem(key);
            return defaultValue;
        }

        return parsed;
    } catch (error) {
        console.error(`[localStorage] Chyba při čtení klíče "${key}":`, error);
        // Poškozená data - odstraníme
        try {
            localStorage.removeItem(key);
        } catch {
            // localStorage může být nedostupný
        }
        return defaultValue;
    }
}

/**
 * Bezpečně uloží hodnotu do localStorage jako JSON
 * @template T
 * @param {string} key - Klíč v localStorage
 * @param {T} value - Hodnota k uložení
 * @returns {boolean} True pokud se uložení podařilo
 */
export function setToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[localStorage] Chyba při ukládání klíče "${key}":`, error);
        return false;
    }
}

/**
 * Bezpečně odstraní klíč z localStorage
 * @param {string} key - Klíč k odstranění
 * @returns {boolean} True pokud se odstranění podařilo
 */
export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`[localStorage] Chyba při mazání klíče "${key}":`, error);
        return false;
    }
}

/**
 * Validuje, že hodnota je pole uložených her
 * @param {unknown} data
 * @returns {data is import('../types.js').SavedGame[]}
 */
export function isValidSavedGamesArray(data) {
    if (!Array.isArray(data)) return false;

    return data.every(game => {
        if (typeof game !== 'object' || game === null) return false;
        if (typeof game.id !== 'number') return false;
        if (!Array.isArray(game.grid)) return false;
        if (game.grid.length !== 9) return false;

        // Ověříme strukturu gridu
        return game.grid.every(row => {
            if (!Array.isArray(row) || row.length !== 9) return false;
            return row.every(cell => {
                if (typeof cell !== 'object' || cell === null) return false;
                if (typeof cell.value !== 'string') return false;
                if (typeof cell.isStatic !== 'boolean') return false;
                return true;
            });
        });
    });
}

/**
 * Validuje téma
 * @param {unknown} data
 * @returns {data is import('../types.js').Theme}
 */
export function isValidTheme(data) {
    return data === 'media' || data === 'dark' || data === 'light';
}