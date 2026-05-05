// ═══ DATE HELPERS — Australia/Melbourne anchored ═══
// Use these everywhere a date is shown to or chosen by a user.
// Avoid raw `.toISOString().split('T')[0]` for user-visible dates: it silently
// converts to UTC and breaks across the AEDT/AEST DST boundary (early April + October).

const TZ = 'Australia/Melbourne';

/** "YYYY-MM-DD" anchored in Melbourne, regardless of viewer's local timezone. */
export function dayKey(d = new Date()) {
    if (typeof d === 'string') {
        // Already a YYYY-MM-DD string? Pass through.
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        d = new Date(d);
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    const yyyy = parts.find(p => p.type === 'year').value;
    const mm = parts.find(p => p.type === 'month').value;
    const dd = parts.find(p => p.type === 'day').value;
    return `${yyyy}-${mm}-${dd}`;
}

/** Today as a YYYY-MM-DD string in Melbourne. */
export function todayKey() { return dayKey(new Date()); }

/** Add `n` days to a YYYY-MM-DD string and return a YYYY-MM-DD string. */
export function addDays(yyyymmdd, n) {
    const [y, m, d] = yyyymmdd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Inclusive list of YYYY-MM-DD strings from start to end. */
export function daysBetween(startKey, endKey) {
    const out = [];
    let cur = startKey;
    while (cur <= endKey) {
        out.push(cur);
        cur = addDays(cur, 1);
    }
    return out;
}

/** Day-of-week 0–6 (Sun–Sat) for a YYYY-MM-DD string in Melbourne. */
export function weekdayIndex(yyyymmdd) {
    const [y, m, d] = yyyymmdd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Tue" / "Tuesday". */
export function dayName(yyyymmdd, long = false) {
    return (long ? DAY_LONG : DAY_SHORT)[weekdayIndex(yyyymmdd)];
}

/** "Tue 12 May" — short readable form. */
export function shortLabel(yyyymmdd) {
    const [, m, d] = yyyymmdd.split('-').map(Number);
    return `${dayName(yyyymmdd)} ${d} ${MONTH_SHORT[m - 1]}`;
}

/** "Tuesday, 12 May 2026" — long readable form. */
export function longLabel(yyyymmdd) {
    const [y, m, d] = yyyymmdd.split('-').map(Number);
    return `${dayName(yyyymmdd, true)}, ${d} ${MONTH_SHORT[m - 1]} ${y}`;
}

/** "5–7pm" given "17:00:00" and "19:00:00". Handles 12-hour formatting. */
export function timeRange(startTime, endTime) {
    const fmt = (t) => {
        if (!t) return '';
        const [h] = String(t).split(':').map(Number);
        const isPm = h >= 12;
        const h12 = h % 12 || 12;
        return `${h12}${isPm ? 'pm' : 'am'}`;
    };
    if (!startTime || !endTime) return startTime || endTime || '';
    return `${fmt(startTime)}–${fmt(endTime)}`;
}

/** True if the date string is strictly before today (Melbourne). */
export function isPast(yyyymmdd) { return yyyymmdd < todayKey(); }

/** True if the date string is today (Melbourne). */
export function isToday(yyyymmdd) { return yyyymmdd === todayKey(); }

/** Return Monday's YYYY-MM-DD for the week containing `yyyymmdd`. */
export function weekStart(yyyymmdd) {
    const dow = weekdayIndex(yyyymmdd); // 0=Sun
    const offset = dow === 0 ? -6 : 1 - dow; // back to Monday
    return addDays(yyyymmdd, offset);
}
