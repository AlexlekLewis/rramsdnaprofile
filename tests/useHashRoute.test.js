// ═══ Tests — useHashRoute pure helpers ═══
//
// Covers parseHash + buildHash. The hook itself requires jsdom; saved for
// the Playwright smoke once Phase 2 has real routes to walk.

import { describe, test, expect } from 'vitest';
import { parseHash, buildHash } from '../src/admin/useHashRoute';

describe('parseHash', () => {
    test('empty hash defaults to /dashboard', () => {
        expect(parseHash('')).toEqual({ path: '/dashboard', params: {} });
        expect(parseHash('#')).toEqual({ path: '/dashboard', params: {} });
    });

    test('parses simple paths', () => {
        expect(parseHash('#/players')).toEqual({ path: '/players', params: {} });
        expect(parseHash('#/coaches')).toEqual({ path: '/coaches', params: {} });
    });

    test('adds leading slash if missing', () => {
        expect(parseHash('#players')).toEqual({ path: '/players', params: {} });
    });

    test('parses query params after ?', () => {
        expect(parseHash('#/players?id=abc-123')).toEqual({
            path: '/players',
            params: { id: 'abc-123' },
        });
    });

    test('parses multiple query params', () => {
        expect(parseHash('#/journals?player=abc&date=2026-05-05')).toEqual({
            path: '/journals',
            params: { player: 'abc', date: '2026-05-05' },
        });
    });

    test('handles URL-encoded values', () => {
        const r = parseHash('#/players?name=' + encodeURIComponent('Sam Smith'));
        expect(r.path).toBe('/players');
        expect(r.params.name).toBe('Sam Smith');
    });

    test('handles missing hash arg', () => {
        expect(parseHash(undefined)).toEqual({ path: '/dashboard', params: {} });
        expect(parseHash(null)).toEqual({ path: '/dashboard', params: {} });
    });
});

describe('buildHash', () => {
    test('builds path-only hash', () => {
        expect(buildHash('/players')).toBe('#/players');
        expect(buildHash('/coaches', {})).toBe('#/coaches');
    });

    test('adds leading slash to path', () => {
        expect(buildHash('players')).toBe('#/players');
    });

    test('appends query params', () => {
        expect(buildHash('/players', { id: 'abc' })).toBe('#/players?id=abc');
    });

    test('appends multiple params', () => {
        const out = buildHash('/journals', { player: 'abc', date: '2026-05-05' });
        // URLSearchParams ordering is insertion-order in modern engines.
        expect(out).toBe('#/journals?player=abc&date=2026-05-05');
    });

    test('URL-encodes values with spaces', () => {
        const out = buildHash('/players', { name: 'Sam Smith' });
        expect(out).toBe('#/players?name=Sam+Smith');
    });
});

describe('parseHash + buildHash round-trip', () => {
    test('player picker URL round-trips', () => {
        const original = { path: '/players', params: { id: 'abc-123' } };
        const round = parseHash(buildHash(original.path, original.params));
        expect(round).toEqual(original);
    });

    test('multi-param journals URL round-trips', () => {
        const original = { path: '/journals', params: { player: 'abc', date: '2026-05-05' } };
        const round = parseHash(buildHash(original.path, original.params));
        expect(round).toEqual(original);
    });
});
