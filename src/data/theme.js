// ═══ THEME — Colors, Font, Style Tokens ═══

export const B = {
    pk: "#E96BB0", pkL: "#FDF0F7", pkM: "#F5C6DE", bl: "#0075C9", blL: "#EEF4FA",
    nv: "#323E48", nvD: "#001D48", w: "#FFF", g50: "#F8F9FB", g100: "#F2F4F8",
    g200: "#E0E4EB", g400: "#9CA3AF", g600: "#4A4A6A", g800: "#1A1A2E",
    grn: "#10B981", amb: "#F59E0B", red: "#EF4444", prp: "#8B5CF6", sky: "#0EA5E9", org: "#FF6B35"
};

export const F = "'Montserrat',sans-serif";

export const LOGO = 'https://res.cloudinary.com/dmktzeitu/image/upload/v1771512681/rra-dna-cards/melbourne-logo-pink.png';

// Style tokens
export const sCard = { background: B.w, borderRadius: 12, padding: 16, border: `1px solid ${B.g200}`, marginBottom: 12 };
export const sGrad = { background: `linear-gradient(135deg,${B.nvD} 0%,${B.bl} 60%,${B.pk} 100%)` };

// Responsive helpers — call these in render for live responsiveness
export function isDesktop() { return typeof window !== 'undefined' && window.innerWidth >= 768; }
// Wider breakpoint for layouts that need real estate (admin sidebar shell).
// 1024px = iPad landscape and most laptops. Below this, sidebars become drawers.
export function isWide() { return typeof window !== 'undefined' && window.innerWidth >= 1024; }
export function getDkWrap() { return isDesktop() ? { maxWidth: 780, margin: '0 auto', padding: '0 16px' } : {}; }
export function getDSZ() { return isDesktop() ? 32 : 26; }
export function getDSF() { return isDesktop() ? 10 : 9; }
