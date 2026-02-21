import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';
export type AccentTheme = 'green' | 'purple';

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('synCinema_theme') as Theme | null;
        if (stored) return stored;
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    });

    const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
        const stored = localStorage.getItem('synCinema_accent') as AccentTheme | null;
        if (stored) return stored;
        return 'green'; // Default to Ben 10 theme
    });

    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
        }

        localStorage.setItem('synCinema_theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = document.documentElement;
        if (accentTheme === 'purple') {
            root.setAttribute('data-accent-theme', 'purple');
        } else {
            root.removeAttribute('data-accent-theme');
        }
        localStorage.setItem('synCinema_accent', accentTheme);
    }, [accentTheme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const toggleAccentTheme = useCallback(() => {
        setAccentTheme(prev => prev === 'green' ? 'purple' : 'green');
    }, []);

    return { theme, toggleTheme, accentTheme, toggleAccentTheme };
};

