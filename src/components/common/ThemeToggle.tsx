'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle: React.FC = () => {
    const [theme, setThemeState] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setThemeState(savedTheme);
        } else {
            setThemeState('system');
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        
        const applyTheme = () => {
            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.setAttribute('data-theme', systemTheme);
            } else {
                root.setAttribute('data-theme', theme);
            }
        };

        applyTheme();
        localStorage.setItem('theme', theme);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = (e: MediaQueryListEvent) => {
            if (theme === 'system') {
                root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
    }, [theme, mounted]);

    const toggleTheme = () => {
        const themes: Theme[] = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setThemeState(nextTheme);
    };

    const icons = {
        light: <Sun size={20} />,
        dark: <Moon size={20} />,
        system: <Monitor size={20} />
    };

    if (!mounted) {
        return <div className={styles.skeleton} />;
    }

    return (
        <div className={styles.container}>
            <button
                className={styles.button}
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
            >
                {icons[theme]}
            </button>
        </div>
    );
};
