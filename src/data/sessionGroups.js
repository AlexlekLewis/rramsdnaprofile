// ═══ SESSION GROUP ASSIGNMENTS — Assessment Week 1 ═══
// Source: Elite Program Roster (Google Sheet, v6 · 8 Sessions · 85 Players)
// Each player is assigned to their PRIMARY weekday session.
// Players who only appear in weekend sessions get a weekend primary.
// Names are normalised (lowercase, trimmed) for fuzzy matching against DB player names.
//
// TRAP: Player names in the database may differ slightly from the Google Sheet
// (trailing spaces, middle names, case). The matcher uses .includes() for resilience.

export const SESSION_GROUPS = [
    {
        id: 'tue-5-7',
        label: 'TUE 5–7 PM',
        shortLabel: 'Tue 5–7',
        day: 'Tuesday',
        time: '5:00–7:00 PM',
        color: '#6366F1', // indigo
        players: [
            'Mitchell Clark',
            'Jinang Shah',
            'Harsh Sinha',
            'Jake Frederiksen',
            'Aston Burns',
            'Callum Hayes',
            'Jake Keena',
            'Ethan Oza',
            'Thomas Webb',
            'Lincoln Kaluri',
            'Arihant Kalla',
            'Noah Butcher',
            'Aadhya Patel',
            'Zoe Oza',
            'Dhriti Patel',
            'Sara Prajapati',
            'Anvi Patel',
            'Ava Lloyd',
        ],
    },
    {
        id: 'tue-7-9',
        label: 'TUE 7–9 PM',
        shortLabel: 'Tue 7–9',
        day: 'Tuesday',
        time: '7:00–9:00 PM',
        color: '#8B5CF6', // violet
        players: [
            'Shaan Loganathan',
            'Joshua Richardson',
            'Jack Mosca',
            'Reyansh Reddy Manthena',
            'Shayaan Anwar',
            'Max Avard',
            'Aarav Bhatia',
            'Vikhyath Kolipaka',
            'Aarav Sharma',
            'Dheer Chaudhari',
            'Dhruva Bezawada',
            'Leith Salwathura',
            'Samar Minhas',
            'Sartaj Singh Dhanoa',
            'Viraj Dev Kumaran',
            'Zach van der Nest',
            'Riaan Pasuleti',
            'Jessica Aquilina',
            'Mishka Chahwala',
            'Ananya Mahajan',
            'Sahasra Pulibandla',
            'Guhika Vij',
            'Riyan Prajapati',
            'Harish Salwathura',
            'Panav Doshi',
        ],
    },
    {
        id: 'thu-5-7',
        label: 'THU 5–7 PM',
        shortLabel: 'Thu 5–7',
        day: 'Thursday',
        time: '5:00–7:00 PM',
        color: '#EC4899', // pink
        players: [
            'Syed Shayan Ahmad',
            'Karthikeya Rallapalli',
            'Krish Kothare',
            'Cooper Lewin',
            'Evan Siju',
            'James Crook',
            'Kai Jordan',
            'Ranveer Sharma',
            'Ryleigh Schaerer',
            'Sridhar Parthasarathy Srivatsan',
            'Udaypartap Singh Cheema',
            'Emily Pugsley',
            'Georgia Hancock',
            'Angad Singh Pantlya',
            'Kunwar Badwal',
            'Dulin Gunawardhana',
            'Zara Farooqui',
        ],
    },
    {
        id: 'thu-7-9',
        label: 'THU 7–9 PM',
        shortLabel: 'Thu 7–9',
        day: 'Thursday',
        time: '7:00–9:00 PM',
        color: '#F59E0B', // amber
        players: [
            'Krish Talwar',
            'Arnav Bhargava',
            'Pranjol Josh Roy',
            'Shivang Kotnala',
            'Veersumatt Singh Sidhu',
            'Xavier Mitchell',
            'Jonathan Kunnur',
            'Rohan Kudav',
            'Hayden Vo',
            'Viraaj Singh Sanger',
            'Ashen Hettinayaka Mudiyanselage',
            'Jia Kohli',
            'Kabir Thapar',
            'Niharika Gautam',
            'Priyam Sharma',
            'Shaurya Pratap Mondal',
            'Tanish Billa',
            'Sophie Lindsay',
            'Thomas Watt',
            'Ishita Tiwari',
            'Vrishti Mangrolia',
            'Rituja Talekar',
            'Vivaan Lakhatariya',
        ],
    },
    {
        id: 'sat-8-10',
        label: 'SAT 8–10 AM',
        shortLabel: 'Sat 8–10',
        day: 'Saturday',
        time: '8:00–10:00 AM',
        color: '#10B981', // emerald (weekend visual cue)
        players: [],  // All SAT 8-10 players already assigned to weekday primaries
    },
    {
        id: 'sat-2-4',
        label: 'SAT 2–4 PM',
        shortLabel: 'Sat 2–4',
        day: 'Saturday',
        time: '2:00–4:00 PM',
        color: '#14B8A6', // teal
        players: [],  // All SAT 2-4 players already assigned to weekday primaries
    },
    {
        id: 'sat-4-6',
        label: 'SAT 4–6 PM',
        shortLabel: 'Sat 4–6',
        day: 'Saturday',
        time: '4:00–6:00 PM',
        color: '#0EA5E9', // sky
        players: [
            'Sanveer Cheema',  // Only appears in weekend session
        ],
    },
    {
        id: 'sun-2-4',
        label: 'SUN 2–4 PM',
        shortLabel: 'Sun 2–4',
        day: 'Sunday',
        time: '2:00–4:00 PM',
        color: '#F97316', // orange
        players: [
            'Jedda Hubball',  // Only appears in weekend session
        ],
    },
];

// ── Normalise a name for matching (lowercase, trim, collapse whitespace) ──
function norm(name) {
    return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// ── Build a lookup: normalised player name → session group id ──
// Called once at import time — O(players × groups) but tiny dataset
const _lookup = {};
SESSION_GROUPS.forEach(g => {
    g.players.forEach(sheetName => {
        _lookup[norm(sheetName)] = g.id;
    });
});

/**
 * Match a database player name to a session group.
 * Handles: trailing spaces, middle names, case differences.
 * Returns the session group id or null if unmatched.
 */
export function getPlayerSessionGroup(dbName) {
    const n = norm(dbName);
    // 1. Exact normalised match
    if (_lookup[n]) return _lookup[n];
    // 2. DB name contains a sheet name (handles middle names like "Noah Anand Butcher" → "Noah Butcher")
    for (const [sheetNorm, groupId] of Object.entries(_lookup)) {
        const sheetParts = sheetNorm.split(' ');
        const dbParts = n.split(' ');
        // Match if first name AND last name both present in DB name
        if (sheetParts.length >= 2 && dbParts.length >= 2) {
            if (dbParts[0] === sheetParts[0] && dbParts[dbParts.length - 1] === sheetParts[sheetParts.length - 1]) {
                return groupId;
            }
        }
    }
    // 3. Starts-with match for truncated DB names (e.g. DB "Zach" → sheet "Zach van der Nest")
    const dbParts = n.split(' ');
    if (dbParts.length === 1) {
        for (const [sheetNorm, groupId] of Object.entries(_lookup)) {
            if (sheetNorm.startsWith(n)) return groupId;
        }
    }
    return null;
}

/**
 * Group an array of player objects by session time.
 * Returns: [{ group: SESSION_GROUP, players: [...] }, ...] + { ungrouped: [...] }
 */
export function groupPlayersBySession(players) {
    const grouped = SESSION_GROUPS
        .filter(g => g.players.length > 0)  // Skip empty weekend groups
        .map(g => ({ group: g, players: [] }));
    const ungrouped = [];

    players.forEach(p => {
        const gId = getPlayerSessionGroup(p.name);
        if (gId) {
            const bucket = grouped.find(b => b.group.id === gId);
            if (bucket) { bucket.players.push(p); return; }
        }
        ungrouped.push(p);
    });

    return { grouped, ungrouped };
}
