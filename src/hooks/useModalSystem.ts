
import { useState, useCallback } from 'react';

export type ModalVariant = 'danger' | 'warning' | 'info';

export interface ModalConfig {
    isOpen: boolean;
    title: string;
    message: string;
    variant?: ModalVariant;
    onConfirm: () => void;
}

export function useModalSystem() {
    const [modalConfig, setModalConfig] = useState<ModalConfig>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    }, []);

    const openModal = useCallback((config: Omit<ModalConfig, 'isOpen'>) => {
        setModalConfig({
            ...config,
            isOpen: true,
        });
    }, []);

    return {
        modalConfig,
        openModal,
        closeModal,
    };
}
