// ═══ HASH ROUTER ═══
//
// Tiny URL-state hook for the AdminShell. ~30 lines, zero dependency.
// Lives only inside the lazy-loaded AdminShell chunk, so the player and
// coach bundles never see it.
//
// URL pattern:
//   #/players                  — path = '/players',     params = {}
//   #/players?id=<uuid>        — path = '/players',     params = { id: '<uuid>' }
//   #/journals?player=X&date=Y — path = '/journals',    params = { player: 'X', date: 'Y' }
//
// Why hash and not pathname:
//   The app currently has no router. Adding a real one would wrap player and
//   coach portals in router context they don't need (~12 KB gz dependency leak).
//   `hashchange` gives us back/forward/refresh stability for free.
//   Migration to react-router-dom later is mechanical (~2h) — see ADR-001.

import { useCallback, useEffect, useState } from 'react';

const DEFAULT_PATH = '/dashboard';

function parseHash(hash) {
    // Strip the leading '#' and any leading '/'.
    let raw = (hash || '').replace(/^#/, '');
    if (!raw) return { path: DEFAULT_PATH, params: {} };

    // Split path?query
    const [pathPart, queryPart] = raw.split('?');
    let path = pathPart || DEFAULT_PATH;
    if (!path.startsWith('/')) path = '/' + path;

    const params = {};
    if (queryPart) {
        const sp = new URLSearchParams(queryPart);
        for (const [k, v] of sp) params[k] = v;
    }
    return { path, params };
}

function buildHash(path, params) {
    let h = '#' + (path.startsWith('/') ? path : '/' + path);
    if (params && Object.keys(params).length > 0) {
        const sp = new URLSearchParams(params);
        h += '?' + sp.toString();
    }
    return h;
}

export function useHashRoute() {
    const [route, setRoute] = useState(() =>
        parseHash(typeof window === 'undefined' ? '' : window.location.hash)
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onChange = () => setRoute(parseHash(window.location.hash));
        window.addEventListener('hashchange', onChange);
        // Sync once in case the hash changed before this hook mounted.
        onChange();
        return () => window.removeEventListener('hashchange', onChange);
    }, []);

    const navigate = useCallback((path, params) => {
        if (typeof window === 'undefined') return;
        const target = buildHash(path, params || {});
        if (window.location.hash !== target) {
            window.location.hash = target;
        }
    }, []);

    return { path: route.path, params: route.params, navigate };
}

// Exported helpers for tests + non-hook callers.
export { parseHash, buildHash };
