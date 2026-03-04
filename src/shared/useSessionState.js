import { useState, useEffect } from 'react';

/**
 * Hook that persists state in sessionStorage.
 * Survives page reloads within the same tab but not across tabs.
 */
export function useSessionState(key, defaultValue) {
    const [value, setValue] = useState(() => {
        try {
            const stored = sessionStorage.getItem(key);
            return stored !== null ? JSON.parse(stored) : defaultValue;
        } catch { return defaultValue; }
    });
    useEffect(() => {
        try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { }
    }, [key, value]);
    return [value, setValue];
}
