
import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'warning'
}) => {
    if (!isOpen) return null;

    const getColors = () => {
        switch (variant) {
            case 'danger': return { border: 'border-red-500', icon: 'text-red-500', button: 'bg-red-500 hover:bg-red-600' };
            case 'info': return { border: 'border-cyan-500', icon: 'text-cyan-500', button: 'bg-cyan-500 hover:bg-cyan-600' };
            default: return { border: 'border-yellow-500', icon: 'text-yellow-500', button: 'bg-yellow-500 hover:bg-yellow-600' };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`bg-slate-900 border ${colors.border} rounded-xl p-6 max-w-md w-full shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200`}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full bg-white/5 ${colors.icon}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            {message}
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                <X size={16} />
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`px-4 py-2 rounded-lg text-white font-bold text-sm transition-colors flex items-center gap-2 ${colors.button}`}
                            >
                                <Check size={16} />
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
