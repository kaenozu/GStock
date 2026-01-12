/**
 * useKeyboardShortcuts Hook
 * @description キーボードショートカットのカスタムフック
 * @module hooks/useKeyboardShortcuts
 */

'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
}

/**
 * キーボードショートカットを登録するフック
 */
export function useKeyboardShortcuts(
    shortcuts: KeyboardShortcut[],
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true } = options;

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // 入力フィールドにフォーカスがある場合は無視
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
            const altMatch = shortcut.alt ? event.altKey : !event.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                event.preventDefault();
                shortcut.action();
                return;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, handleKeyDown]);
}

/**
 * デフォルトのショートカット定義
 */
export const DEFAULT_SHORTCUTS = {
    TOGGLE_PAUSE: { key: ' ', description: 'スキャン停止/再開' },
    TOGGLE_INDICATORS: { key: 'i', description: '指標表示切替' },
    REFRESH: { key: 'r', description: '再読み込み' },
    TAB_MARKET: { key: '1', description: 'Marketタブ' },
    TAB_TRADE: { key: '2', description: 'Tradeタブ' },
    TAB_CONFIG: { key: '3', description: 'Configタブ' },
    HELP: { key: '?', shift: true, description: 'ショートカット一覧' },
} as const;
