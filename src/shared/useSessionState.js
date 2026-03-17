import { useState, useEffect } from 'react';

/**
 * Hook that persists state in localStorage.
 * Survives page reloads, tab close, and browser restart.
 */
export function useSessionState(key, defaultValue) {
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored !== null ? JSON.parse(stored) : defaultValue;
        } catch { return defaultValue; }
    });
    useEffect(() => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
    }, [key, value]);
    return [value, setValue];
}
