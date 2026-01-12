/**
 * KeyboardShortcutsHelp Component
 * @description キーボードショートカット一覧モーダル
 */

'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutItem {
    key: string;
    description: string;
    modifier?: string;
}

const SHORTCUTS: ShortcutItem[] = [
    { key: 'Space', description: 'スキャン停止/再開' },
    { key: 'I', description: '指標表示切替' },
    { key: 'R', description: 'データ再読み込み' },
    { key: '1', description: 'Marketタブに切替' },
    { key: '2', description: 'Tradeタブに切替' },
    { key: '3', description: 'Configタブに切替' },
    { key: '?', description: 'このヘルプを表示', modifier: 'Shift' },
];

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
    isOpen,
    onClose,
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                            <Keyboard className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            キーボードショートカット
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="space-y-3">
                    {SHORTCUTS.map((shortcut, index) => (
                        <div 
                            key={index}
                            className="flex items-center justify-between py-2 px-3 bg-zinc-800/50 rounded-lg"
                        >
                            <span className="text-zinc-300 text-sm">
                                {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                                {shortcut.modifier && (
                                    <>
                                        <kbd className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs font-mono rounded border border-zinc-600">
                                            {shortcut.modifier}
                                        </kbd>
                                        <span className="text-zinc-500 text-xs">+</span>
                                    </>
                                )}
                                <kbd className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs font-mono rounded border border-zinc-600 min-w-[2rem] text-center">
                                    {shortcut.key}
                                </kbd>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 text-center">
                        入力フィールドにフォーカス中は無効
                    </p>
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsHelp;
