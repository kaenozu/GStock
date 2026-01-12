import { useState, useCallback, useEffect } from 'react';
import useSound from 'use-sound';

// --- Sound Assets (Data URIs for portability) ---
// Simple "Click" sound (base64 wav)
const DATA_URI_CLICK = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'; // Too short, just placeholder pattern. 
// I will use valid, very short beep base64s to ensure they play.
// These are generated minimal wave headers + silence + beep data.
// For real production we'd use files, but this avoids file system dependency for the demo.

// Authentic "Mechanical Click" (Short High Pitch)
const CLICK_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';
// "Chime" (Glassy)
const CHIME_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3';
// "Error" (Low Thud)
const ERROR_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3';

// Use Mixkit free preview assets for demo. In production, download these.

type SoundType = 'execution' | 'signal' | 'error';

export const useSoundSystem = () => {
    // Sound enabled state (persisted in localStorage)
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('gstock-sound-enabled');
        if (saved !== null) {
            setEnabled(saved === 'true');
        }
    }, []);

    const toggleSound = useCallback(() => {
        setEnabled(prev => {
            const next = !prev;
            localStorage.setItem('gstock-sound-enabled', String(next));
            return next;
        });
    }, []);

    // Hooks for each sound
    const [playClick] = useSound(CLICK_SOUND, { volume: 0.5 });
    const [playChime] = useSound(CHIME_SOUND, { volume: 0.4 });
    const [playError] = useSound(ERROR_SOUND, { volume: 0.5 });

    const play = useCallback((type: SoundType) => {
        if (!enabled) return;
        try {
            switch (type) {
                case 'execution': playClick(); break;
                case 'signal': playChime(); break;
                case 'error': playError(); break;
            }
        } catch (e) {
            console.warn('Sound playback failed', e);
        }
    }, [enabled, playClick, playChime, playError]);

    return {
        enabled,
        toggleSound,
        play
    };
};
