/**
 * Composable pro správu tématu aplikace
 * Podporuje: media (systémové), dark, light
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { getFromStorage, setToStorage, isValidTheme } from '../utils/localStorage.js';
import { STORAGE_KEYS } from '../types.js';

/**
 * @returns {{
 *   theme: import('vue').Ref<import('../types.js').Theme>,
 *   nextTheme: import('vue').ComputedRef<import('../types.js').Theme>,
 *   themeIcon: import('vue').ComputedRef<string>,
 *   themeTitle: import('vue').ComputedRef<string>,
 *   isDark: import('vue').ComputedRef<boolean>,
 *   toggleTheme: () => void
 * }}
 */
export function useTheme() {
    /** @type {import('vue').Ref<import('../types.js').Theme>} */
    const theme = ref('media');

    /** @type {(() => void) | null} */
    let mediaQueryCleanup = null;

    // Načtení z localStorage při mountu
    onMounted(() => {
        const savedTheme = getFromStorage(STORAGE_KEYS.THEME, 'media', isValidTheme);
        theme.value = savedTheme;
        applyTheme();
        setupMediaQueryListener();
    });

    // Cleanup při unmountu
    onUnmounted(() => {
        if (mediaQueryCleanup) {
            mediaQueryCleanup();
            mediaQueryCleanup = null;
        }
    });

    // Computed properties
    const nextTheme = computed(() => {
        if (theme.value === 'media') return 'dark';
        if (theme.value === 'dark') return 'light';
        return 'media';
    });

    // Ikony jsou definovány jako SVG path data
    const themeIcon = computed(() => {
        // media = monitor, dark = slunce, light = měsíc
        if (theme.value === 'media') return 'monitor';
        if (theme.value === 'dark') return 'sun';
        return 'moon';
    });

    const themeTitle = computed(() => {
        if (theme.value === 'media') return 'Systémové (media) - klikni na tmavý režim';
        if (theme.value === 'dark') return 'Tmavý režim - klikni na světlý';
        return 'Světlý režim - klikni na systémové';
    });

    const isDark = computed(() => {
        if (theme.value === 'dark') return true;
        if (theme.value === 'light') return false;
        // Pro media závisí na systémovém nastavení
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    /**
     * Aplikuje téma na document
     */
    function applyTheme() {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;

        if (theme.value === 'dark') {
            root.classList.add('dark');
        } else if (theme.value === 'light') {
            root.classList.remove('dark');
        } else {
            // media - podle systémového nastavení
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }

    /**
     * Nastaví listener pro změnu systémového tématu
     */
    function setupMediaQueryListener() {
        // Zrušíme předchozí listener
        if (mediaQueryCleanup) {
            mediaQueryCleanup();
            mediaQueryCleanup = null;
        }

        if (theme.value !== 'media') return;
        if (typeof window === 'undefined') return;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');

        const listener = (/** @type {MediaQueryListEvent} */ e) => {
            if (theme.value === 'media') {
                if (e.matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        };

        mq.addEventListener('change', listener);
        mediaQueryCleanup = () => mq.removeEventListener('change', listener);
    }

    /**
     * Přepne na další téma
     */
    function toggleTheme() {
        theme.value = nextTheme.value;
    }

    // Watch pro změnu tématu
    watch(theme, () => {
        applyTheme();
        setToStorage(STORAGE_KEYS.THEME, theme.value);
        setupMediaQueryListener();
    });

    return {
        theme,
        nextTheme,
        themeIcon,
        themeTitle,
        isDark,
        toggleTheme
    };
}