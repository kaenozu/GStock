'use client';

import { useEffect } from 'react';

export const ThemeInitializer: React.FC = () => {
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
        const root = document.documentElement;

        const applyTheme = () => {
            let theme: 'light' | 'dark' = 'dark';
            
            if (savedTheme === 'system') {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            } else if (savedTheme) {
                theme = savedTheme;
            }

            root.setAttribute('data-theme', theme);
        };

        applyTheme();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = () => {
            if (savedTheme === 'system') {
                const systemTheme = mediaQuery.matches ? 'dark' : 'light';
                root.setAttribute('data-theme', systemTheme);
            }
        };

        mediaQuery.addEventListener('change', handleThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
    }, []);

    return null;
};
