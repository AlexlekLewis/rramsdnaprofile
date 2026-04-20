// ═══ SKILL ITEMS, ARCHETYPES, ROLES, PHASES, VOICE ═══
import { B } from './theme';

export const ROLES = [
    { id: "batter", label: "Specialist Batter", sh: "BAT", dbId: "specialist_batter" },
    { id: "pace", label: "Pace Bowler", sh: "PACE", dbId: "pace_bowler" },
    { id: "spin", label: "Spin Bowler", sh: "SPIN", dbId: "spin_bowler" },
    { id: "keeper", label: "WK-Batter", sh: "WK", dbId: "wicketkeeper_batter" },
    { id: "allrounder", label: "Batting All-Rounder", sh: "AR", dbId: "batting_allrounder" },
    { id: "bowlrounder", label: "Bowling All-Rounder", sh: "BAR", dbId: "bowling_allrounder" },
];

// ═══ ARCHETYPES v3 — Questionnaire-driven T20 identity system ═══
// Players self-identify via 12 multiple-choice questions per discipline.
// The algorithm scores answers against hidden archetype weights, then reveals the result.
// Coaches select archetypes directly based on observation signals.

export const BAT_ARCH = [
    { id: "enforcer", nm: "POWERPLAY ENFORCER", sub: "Sets the tone. Takes on the new ball. Puts the opposition on the back foot from ball one.", c: B.pk },
    { id: "tempo", nm: "TEMPO CONTROLLER", sub: "Reads the game from the moment they walk in. Calculates how to win and manages risk accordingly.", c: B.sky },
    { id: "finisher", nm: "THE FINISHER", sub: "Lives for the last five overs. Hits the older ball to all parts and finds boundaries against all bowling types.", c: B.prp },
    { id: "power", nm: "POWER HITTER", sub: "Clears the boundary consistently. Changes the game with raw hitting ability.", c: B.pk },
    { id: "innovator", nm: "THE INNOVATOR", sub: "Plays shots other batters can't. Scores in areas the field can't cover. A 360-degree problem for bowlers.", c: B.grn },
];

export const BWL_ARCH = [
    { id: "newball", nm: "NEW BALL STRIKER", sub: "Takes on the top order with the new ball. Swings it, seams it, and looks to take wickets up front.", c: B.pk },
    { id: "spinctrl", nm: "SPIN CONTROLLER", sub: "Controls the middle overs through accuracy and pressure. Makes the batter hit where they want them to.", c: B.sky },
    { id: "spinatk", nm: "SPIN ATTACKER", sub: "Takes wickets through deception, turn, and variation. Breaks partnerships and creates breakthroughs.", c: B.prp },
    { id: "deathclose", nm: "DEATH CLOSER", sub: "Owns the last four overs. Limits boundaries through variation and composure when the pressure is at its peak.", c: B.pk },
    { id: "moenforcer", nm: "MIDDLE-OVERS ENFORCER", sub: "Controls the middle overs with pace. Bowls hard lengths, uses the crease, and makes batting uncomfortable.", c: B.org },
];

// ═══ SKILL ITEMS (position-indexed — NEVER reorder) ═══

export const BAT_ITEMS = ["Stance & Setup", "Trigger Movement & Balance", "Front-Foot Drive", "Back-Foot Play", "Power Hitting", "Sweep & Reverse Sweep", "Playing Spin", "Playing Pace", "Strike Rotation", "Death-Over Hitting"];
export const PACE_ITEMS = ["Run-Up Rhythm", "Action Alignment", "Front-Leg Brace", "Wrist & Seam", "Stock Ball Control", "Yorker Execution", "Slower Ball Variation", "Bouncer Effectiveness", "Wide-Line Strategy", "Bowling to Plans"];
export const SPIN_ITEMS = ["Stock Ball Accuracy", "Revolutions & Spin Rate", "Wrong'un Execution", "Flight & Dip Control", "Use of Crease", "Match-Up Bowling", "Middle-Over Control", "Powerplay Tactics", "Death-Over Spin", "Reading the Batter"];
export const KEEP_ITEMS = ["Stance & Ready Position", "Footwork to Pace", "Standing Up to Spin", "Glove Work", "Stumping Speed", "Diving & Athleticism", "Communication", "Throwing Accuracy"];
export const IQ_ITEMS = ["Powerplay Awareness", "Middle-Over Management", "Death-Over Decisions", "Match Reading", "Field Awareness", "Adaptability"];
export const MN_ITEMS = ["Courage Under Pressure", "Curiosity & Learning", "Emotional Regulation", "Competitive Drive", "Communication & Leadership", "Coachability", "Resilience"];

export const PH_MAP = {
    pace: ["Explosive Power", "Core Stability", "Eccentric Quad Strength", "Shoulder Mobility", "Aerobic Recovery"],
    spin: ["Shoulder Flexibility", "Core & Rotational Power", "Aerobic Endurance", "Balance & Landing", "General Movement"],
    keeper: ["Lateral Movement", "Squat Endurance", "Hand-Eye Coordination", "Core Stability", "Aerobic Fitness"],
    batter: ["Explosive Power", "Agility & Running", "Core Balance", "Upper Body Power", "Aerobic Fitness"],
    allrounder: ["Explosive Power", "Bowling Athleticism", "Core Balance", "Aerobic Fitness", "General Movement"],
    bowlrounder: ["Explosive Power", "Core Stability", "Bowling Athleticism", "Aerobic Recovery", "General Movement"],
};

// ═══ JUNIOR SELF-ASSESSMENT ITEMS (U14) ═══
// Broader, simpler items that map to the same key prefix system.
// Fewer items per domain — domain averages still valid for SAGI.

export const BAT_ITEMS_JR = ["My Batting Technique", "Hitting Boundaries", "Playing Against Spin", "Playing Against Fast Bowling", "Running & Finding Gaps"];
export const PACE_ITEMS_JR = ["My Bowling Action", "Bowling Accuracy", "My Variations", "Bowling Fast & Using Bounce", "Bowling Smart"];
export const SPIN_ITEMS_JR = ["My Bowling Action", "Spinning the Ball", "My Variations", "Bowling Accuracy", "Reading the Batter"];
export const KEEP_ITEMS_JR = ["Keeping to Fast Bowling", "Keeping to Spin", "Catching & Glove Work", "Throwing & Moving"];
export const IQ_ITEMS_JR = ["Reading the Game", "Making Smart Decisions", "Knowing What\u2019s Happening Around Me"];
export const MN_ITEMS_JR = ["Handling Pressure", "Bouncing Back After a Bad Moment", "Listening to My Coach", "Being Competitive"];
export const PH_MAP_JR = {
    pace: ["Speed & Power", "Strength", "Fitness"],
    spin: ["Flexibility", "Balance", "Fitness"],
    keeper: ["Agility", "Hand-Eye Coordination", "Fitness"],
    batter: ["Speed & Agility", "Power & Strength", "Fitness"],
    allrounder: ["Speed & Power", "Balance", "Fitness"],
    bowlrounder: ["Speed & Power", "Strength", "Fitness"],
};
export const FLD_ITEMS_JR = ["Fielding", "Catching", "Throwing"];

// Junior rating labels (simpler than senior)
export const JUNIOR_RATING_LABELS = { 1: "Not yet", 2: "Learning", 3: "Getting there", 4: "Good", 5: "Really good" };
export const SENIOR_RATING_LABELS = { 1: "Just starting", 2: "Developing", 3: "Solid", 4: "Strong", 5: "Elite" };

// ═══ MATCH-UP CONFIDENCE PROFILE ═══
// Replaces technical self-assessment for all ages.
// Each match-up has a confidence statement + frequency statement.
// Stored as sr_mc_[domain]_[idx]_c (confidence) and sr_mc_[domain]_[idx]_f (frequency)

export const CONFIDENCE_SCALE = ["Not at all", "A little", "Mostly", "Yes", "Absolutely"];
export const FREQUENCY_SCALE = ["Rarely", "Sometimes", "Often", "Most of the time", "Nearly always"];
export const CONFIDENCE_SCALE_JR = ["No", "A little bit", "Kind of", "Yes", "Definitely"];
export const FREQUENCY_SCALE_JR = ["Hardly ever", "Sometimes", "A fair bit", "Most of the time", "Almost always"];

export const BAT_MATCHUPS = [
    { id: "vs_pace",
      conf: "I back myself to score against fast bowling",
      confJr: "I feel good batting against fast bowlers",
      freq: "When I face fast bowling, I score runs...",
      freqJr: "When someone bowls fast at me, I score runs...",
    },
    { id: "vs_spin",
      conf: "I'm confident playing against spin bowling",
      confJr: "I feel good batting against spin bowlers",
      freq: "When I face spin, I find ways to score...",
      freqJr: "When someone bowls spin at me, I score runs...",
    },
    { id: "boundaries",
      conf: "I back myself to hit a boundary when I want to",
      confJr: "I can hit the ball to the fence when I try",
      freq: "When I go for a big shot, I get it right...",
      freqJr: "When I try to hit a boundary, it works...",
    },
    { id: "rotation",
      conf: "I can find gaps and keep the scoreboard moving when boundaries are hard to come by",
      confJr: "I can find gaps and run quick when I can't hit a boundary",
      freq: "When the field is spread, I find ways to score singles and twos...",
      freqJr: "When I can't hit a four, I find ways to still score...",
    },
    { id: "pressure",
      conf: "I stay confident when my team is under scoreboard pressure",
      confJr: "I feel okay batting when my team really needs runs",
      freq: "When the game is tight, I make good decisions...",
      freqJr: "When the game is really close, I play well...",
    },
    { id: "pp_batting",
      conf: "I'm confident scoring in the powerplay with the field up",
      confJr: "I feel good batting at the start when fielders are close",
      freq: "In the powerplay, I take advantage of the field restrictions...",
      freqJr: "At the start of the innings, I score well...",
    },
    { id: "death_batting",
      conf: "I back myself to score quickly in the last few overs",
      confJr: "I can score fast at the end of the innings",
      freq: "In the death overs, I hit the runs my team needs...",
      freqJr: "At the end of the innings, I score the runs we need...",
    },
];

export const BWL_MATCHUPS = [
    { id: "vs_aggressor",
      conf: "I stay confident when a batter is attacking me",
      confJr: "I feel okay when a batter is trying to hit me everywhere",
      freq: "When a batter attacks me, I still bowl well...",
      freqJr: "When a batter tries to hit me, I still bowl well...",
    },
    { id: "vs_defender",
      conf: "I can create chances against batters who are blocking and defending",
      confJr: "I can get batters out even when they're blocking",
      freq: "Against defensive batters, I find a way to create chances...",
      freqJr: "When a batter keeps blocking, I find a way to get them out...",
    },
    { id: "pressure_bowl",
      conf: "I back myself to bowl well when the game is on the line",
      confJr: "I feel good bowling when the game is really close",
      freq: "Under pressure, I execute my plans...",
      freqJr: "When the game is close, I bowl well...",
    },
    { id: "variations",
      conf: "I'm confident landing my variations when I need them",
      confJr: "I can bowl my different deliveries when I need to",
      freq: "When I bowl a variation, it comes out how I want it...",
      freqJr: "When I try a different delivery, it works...",
    },
    { id: "to_plan",
      conf: "I can bowl to a plan and hit the areas I'm aiming for",
      confJr: "I can bowl where I want the ball to go",
      freq: "When I have a plan, I execute it...",
      freqJr: "When I aim for a spot, I hit it...",
    },
    { id: "death_bowl",
      conf: "I'm confident bowling at the death when batters are trying to hit boundaries",
      confJr: "I feel okay bowling at the end when batters are trying to smash it",
      freq: "In the last few overs, I limit the damage and keep my cool...",
      freqJr: "At the end of the innings, I bowl well and stay calm...",
    },
];

export const MENTAL_MATCHUPS = [
    { id: "pressure_moments",
      conf: "I handle pressure well — big moments don't overwhelm me",
      confJr: "I stay calm when the pressure is on",
      freq: "In pressure moments, I make good decisions...",
      freqJr: "When the pressure is on, I do the right thing...",
    },
    { id: "bounce_back",
      conf: "I bounce back quickly after a bad moment — dropped catch, getting out cheaply, getting hit",
      confJr: "I get over it quickly when something goes wrong",
      freq: "After a setback, I refocus and perform well...",
      freqJr: "After a bad moment, I bounce back and play well...",
    },
    { id: "focus",
      conf: "I stay focused and switched on for the whole game, even when I'm not batting or bowling",
      confJr: "I stay focused and pay attention for the whole game",
      freq: "I maintain concentration through the entire match...",
      freqJr: "I stay switched on for the whole game...",
    },
    { id: "coachable",
      conf: "I listen to feedback and actively try to improve the things my coach suggests",
      confJr: "I listen to my coach and try to get better at what they suggest",
      freq: "When my coach gives me something to work on, I put it into practice...",
      freqJr: "When my coach tells me to try something, I give it a real go...",
    },
    { id: "teammate",
      conf: "I'm a good teammate — I support others and communicate well on the field",
      confJr: "I encourage my teammates and talk to them on the field",
      freq: "I support my teammates and communicate during games...",
      freqJr: "I cheer my teammates on and help them out...",
    },
];

// ═══ 8-PILLAR: NEW ITEMS ═══
// TRAP 1: Existing items MUST NOT be reordered or removed. New items appended only.

// Athletic Fielding — universal across ALL roles (prefixed fld_)
export const FLD_ITEMS = [
    "Ground Fielding",
    "Catching Reliability",
    "Close / Sharp Catching",
    "Throwing Accuracy & Speed",
    "Running Between Wickets",
];

// Power Hitting — includes 2 items that move FROM BAT_ITEMS indexes 4,9 + 2 new (prefixed pwr_)
// Items at index 0,1 reference BAT_ITEMS[4] ("Power Hitting") and BAT_ITEMS[9] ("Death-Over Hitting")
// Items at index 2,3 are new captures
export const PWR_ITEMS = [
    "Power Hitting",            // Mirrors BAT_ITEMS[4] — scored here for the Power Hitting pillar
    "Death-Over Hitting",       // Mirrors BAT_ITEMS[9] — scored here for the Power Hitting pillar
    "Lofted Hitting Confidence", // NEW: ability to clear the in-field on demand
    "Scoring Arc / Range",       // NEW: 360° range, all-ground scoring
];

// ═══ 8-PILLAR: LABELS & KEYS ═══
export const PILLAR_LABELS = [
    { k: "tm", l: "Technical Mastery", c: B.pk },
    { k: "te", l: "Tactical Execution", c: B.sky },
    { k: "pc", l: "Physical Conditioning", c: B.nv },
    { k: "mr", l: "Mental Resilience", c: B.prp },
    { k: "af", l: "Athletic Fielding", c: B.grn },
    { k: "mi", l: "Match Impact", c: B.org },
    { k: "pw", l: "Power Hitting", c: B.pk },
    { k: "sa", l: "Self-Awareness", c: B.bl },
];

// ═══ ARCHETYPE → PILLAR AFFINITY MAP (v3) ═══
// Which pillars each archetype emphasises (used for archetype alignment multiplier)
// Values sum to ~1.0 per archetype — the "expected profile shape"
export const BAT_ARCH_AFFINITY = {
    enforcer: { pw: 0.25, mi: 0.25, mr: 0.15, tm: 0.15, te: 0.10, af: 0.05, pc: 0.05, sa: 0 },
    tempo:    { te: 0.25, sa: 0.20, tm: 0.15, mr: 0.15, mi: 0.10, af: 0.05, pw: 0.05, pc: 0.05 },
    finisher: { mr: 0.25, mi: 0.20, pw: 0.15, te: 0.15, tm: 0.10, sa: 0.10, af: 0.05, pc: 0 },
    power:    { pw: 0.30, mi: 0.20, tm: 0.15, mr: 0.15, te: 0.05, pc: 0.05, af: 0.05, sa: 0.05 },
    innovator:{ te: 0.25, pw: 0.20, tm: 0.15, mi: 0.15, sa: 0.10, mr: 0.05, af: 0.05, pc: 0.05 },
};

export const BWL_ARCH_AFFINITY = {
    newball:    { tm: 0.25, mi: 0.25, mr: 0.15, te: 0.10, pc: 0.10, pw: 0.05, af: 0.05, sa: 0.05 },
    spinctrl:   { te: 0.25, mr: 0.20, tm: 0.15, sa: 0.15, mi: 0.10, pc: 0.05, af: 0.05, pw: 0.05 },
    spinatk:    { tm: 0.25, mi: 0.20, te: 0.15, mr: 0.15, sa: 0.10, pc: 0.05, af: 0.05, pw: 0.05 },
    deathclose: { mr: 0.25, te: 0.20, mi: 0.15, tm: 0.15, pw: 0.10, pc: 0.05, af: 0.05, sa: 0.05 },
    moenforcer: { pc: 0.20, tm: 0.20, mr: 0.15, te: 0.15, mi: 0.15, af: 0.05, pw: 0.05, sa: 0.05 },
};

// ═══ ARCHETYPE QUESTIONNAIRE — player self-identification via multiple choice ═══
// Each question maps answer options to archetype weights.
// Player never sees archetype names. Algorithm computes result from accumulated weights.
// PE=Powerplay Enforcer, TC=Tempo Controller, FI=Finisher, PH=Power Hitter, IN=Innovator
// NBS=New Ball Striker, SC=Spin Controller, SA=Spin Attacker, DC=Death Closer, MOE=Middle-Overs Enforcer

export const BAT_QUESTIONS = [
    { q: "When do you enjoy batting the most?", opts: [
        { text: "Right at the start when the field is up", w: { enforcer: 1.0, power: 0.3 } },
        { text: "In the middle when I can build my innings", w: { tempo: 1.0, innovator: 0.3 } },
        { text: "At the end when the game is on the line", w: { finisher: 1.0, power: 0.2 } },
        { text: "I\u2019m happy batting anywhere", w: { tempo: 0.5, finisher: 0.3, innovator: 0.2 } },
    ]},
    { q: "Your team needs 70 runs from 8 overs. What do you think first?", opts: [
        { text: "I need to hit boundaries straight away", w: { power: 0.8, finisher: 0.5 } },
        { text: "Work out which overs to attack and which to take singles", w: { tempo: 1.0 } },
        { text: "Stay calm, pick the right balls, finish the job", w: { finisher: 1.0 } },
        { text: "Find ways to score in areas they don\u2019t expect", w: { innovator: 1.0 } },
    ]},
    { q: "What makes you feel most confident at the crease?", opts: [
        { text: "Hitting a big boundary early", w: { enforcer: 0.8, power: 0.6 } },
        { text: "Finding the gaps and keeping the score moving", w: { tempo: 1.0 } },
        { text: "Knowing I can score off any type of bowling", w: { finisher: 0.7, innovator: 0.5 } },
        { text: "Playing a shot that surprises the bowler", w: { innovator: 1.0 } },
    ]},
    { q: "The bowler sets a field to stop your favourite shot. What do you do?", opts: [
        { text: "Hit it harder \u2014 I back my power to beat the field", w: { power: 1.0 } },
        { text: "Find a different area to score", w: { innovator: 0.8, tempo: 0.4 } },
        { text: "Take singles and wait for a bad ball", w: { tempo: 1.0 } },
        { text: "Try something unexpected \u2014 a scoop or reverse sweep", w: { innovator: 1.0 } },
    ]},
    { q: "Your opening partner gets out in the second over. What\u2019s your mindset?", opts: [
        { text: "Keep attacking \u2014 the field is still up", w: { enforcer: 1.0 } },
        { text: "Settle in and rebuild, but keep the scoreboard ticking", w: { tempo: 1.0 } },
        { text: "Stay calm and play my natural game", w: { finisher: 0.5, tempo: 0.5 } },
        { text: "Put pressure back on the bowler", w: { enforcer: 0.5, innovator: 0.5 } },
    ]},
    { q: "What type of shot do you love playing the most?", opts: [
        { text: "A big hit over the boundary", w: { power: 1.0, enforcer: 0.3 } },
        { text: "A clean drive through the gap", w: { tempo: 0.8, enforcer: 0.3 } },
        { text: "A scoop, ramp, or reverse sweep", w: { innovator: 1.0 } },
        { text: "A six when the game is tight", w: { finisher: 1.0 } },
    ]},
    { q: "It\u2019s the powerplay. Only two fielders are out. How do you play?", opts: [
        { text: "Go hard \u2014 this is the best time to score fast", w: { enforcer: 1.0 } },
        { text: "Mix it up \u2014 some boundaries, some singles", w: { tempo: 0.8, innovator: 0.3 } },
        { text: "Look for the big shots over the top", w: { power: 1.0 } },
        { text: "Play creative shots to find gaps the fielders can\u2019t cover", w: { innovator: 1.0 } },
    ]},
    { q: "What bothers you the most when batting?", opts: [
        { text: "Not scoring fast enough", w: { enforcer: 0.7, power: 0.5 } },
        { text: "Playing a stupid shot at the wrong time", w: { tempo: 1.0 } },
        { text: "Not being there at the end when my team needs me", w: { finisher: 1.0 } },
        { text: "Being stuck and unable to find a way to score", w: { innovator: 0.8, tempo: 0.3 } },
    ]},
    { q: "A spinner is bowling well and it\u2019s hard to score. What do you do?", opts: [
        { text: "Use my feet and try to hit over the top", w: { power: 0.7, enforcer: 0.5 } },
        { text: "Sweep or reverse sweep to areas without fielders", w: { innovator: 1.0 } },
        { text: "Take singles and wait for a loose ball", w: { tempo: 1.0 } },
        { text: "Back myself to pick the right ball and hit it hard", w: { finisher: 0.7, power: 0.4 } },
    ]},
    { q: "Last over. Your team needs 12 to win. How do you approach it?", opts: [
        { text: "Stay calm, pick the right balls, back myself", w: { finisher: 1.0 } },
        { text: "Go big from ball one \u2014 try to finish it early", w: { power: 0.8, enforcer: 0.4 } },
        { text: "Work out a plan \u2014 which balls to attack, which to run", w: { tempo: 1.0 } },
        { text: "Try something the bowler won\u2019t expect", w: { innovator: 0.8, finisher: 0.3 } },
    ]},
    { q: "How would your teammates describe your batting?", opts: [
        { text: "Aggressive \u2014 puts bowlers under pressure early", w: { enforcer: 1.0 } },
        { text: "Smart \u2014 always knows what the team needs", w: { tempo: 1.0 } },
        { text: "Clutch \u2014 the one they want in at the end", w: { finisher: 1.0 } },
        { text: "Powerful \u2014 when I hit it, it stays hit", w: { power: 1.0 } },
        { text: "Unpredictable \u2014 plays shots no one else tries", w: { innovator: 1.0 } },
    ]},
    { q: "A fast bowler is bowling short at you. What do you want to do?", opts: [
        { text: "Pull or hook it for six", w: { power: 1.0, enforcer: 0.3 } },
        { text: "Duck, sway, and wait for a better ball", w: { tempo: 1.0 } },
        { text: "Ramp or upper cut it over the keeper", w: { innovator: 1.0 } },
        { text: "Work it into a gap and take the single", w: { finisher: 0.5, tempo: 0.5 } },
    ]},
];

export const BWL_QUESTIONS = [
    { q: "When do you like bowling the most?", opts: [
        { text: "With the new ball at the start", w: { newball: 1.0 } },
        { text: "In the middle overs when I can build pressure", w: { spinctrl: 0.7, moenforcer: 0.5 } },
        { text: "At the death when the game is on the line", w: { deathclose: 1.0 } },
        { text: "Whenever my captain needs a wicket", w: { spinatk: 0.8, newball: 0.3 } },
    ]},
    { q: "What feels best when you\u2019re bowling?", opts: [
        { text: "Taking a wicket \u2014 hitting the stumps or finding the edge", w: { newball: 0.8, spinatk: 0.5 } },
        { text: "Bowling three or four dot balls in a row", w: { spinctrl: 1.0, moenforcer: 0.3 } },
        { text: "Tricking the batter with a delivery they didn\u2019t expect", w: { spinatk: 1.0 } },
        { text: "Nailing a yorker when the batter is trying to hit me", w: { deathclose: 1.0 } },
    ]},
    { q: "A batter is attacking you and hitting boundaries. What\u2019s your response?", opts: [
        { text: "Bowl faster and more aggressively \u2014 attack back", w: { newball: 0.8, moenforcer: 0.5 } },
        { text: "Go tighter with my line and length", w: { spinctrl: 1.0, moenforcer: 0.3 } },
        { text: "Change it up \u2014 slower ball, different line, surprise them", w: { spinatk: 0.7, deathclose: 0.5 } },
        { text: "Bowl to my plan \u2014 I trust my skills", w: { deathclose: 0.7, spinctrl: 0.4 } },
    ]},
    { q: "What\u2019s your biggest strength as a bowler?", opts: [
        { text: "I can move the ball and beat the bat", w: { newball: 1.0 } },
        { text: "I\u2019m accurate \u2014 I don\u2019t give away easy runs", w: { spinctrl: 1.0, moenforcer: 0.3 } },
        { text: "I have lots of different deliveries", w: { spinatk: 0.7, deathclose: 0.5 } },
        { text: "I\u2019m good under pressure", w: { deathclose: 1.0 } },
        { text: "I bowl hard and make batting uncomfortable", w: { moenforcer: 1.0 } },
    ]},
    { q: "The field is spread in the middle overs. What\u2019s your plan?", opts: [
        { text: "Bowl a tight line so they can\u2019t score freely", w: { spinctrl: 1.0 } },
        { text: "Use my variations to get a wicket", w: { spinatk: 1.0 } },
        { text: "Hit a hard length and use my pace", w: { moenforcer: 1.0 } },
        { text: "Change my pace a lot to keep them guessing", w: { spinatk: 0.5, deathclose: 0.5 } },
    ]},
    { q: "Your captain asks you to bowl the last over. Team needs 10 to win. How do you feel?", opts: [
        { text: "Excited \u2014 this is my moment", w: { deathclose: 1.0 } },
        { text: "Confident \u2014 I\u2019ll stick to my plan", w: { deathclose: 0.5, spinctrl: 0.5 } },
        { text: "I\u2019d rather bowl earlier, but I\u2019ll give it my best", w: { newball: 0.5, moenforcer: 0.3, spinctrl: 0.2 } },
        { text: "I\u2019ll use every trick I know to stop them", w: { spinatk: 0.6, deathclose: 0.5 } },
    ]},
    { q: "What do you work on most in training?", opts: [
        { text: "Getting the ball to swing or seam", w: { newball: 1.0 } },
        { text: "Hitting my length over and over again", w: { spinctrl: 0.8, moenforcer: 0.5 } },
        { text: "My variations \u2014 slower balls, wrong\u2019uns, different deliveries", w: { spinatk: 0.8, deathclose: 0.4 } },
        { text: "Yorkers and death bowling", w: { deathclose: 1.0 } },
        { text: "Bowling at pace and making the batter uncomfortable", w: { moenforcer: 1.0 } },
    ]},
    { q: "A left-hand batter comes in. What do you think?", opts: [
        { text: "Great \u2014 I can angle the ball across them", w: { newball: 1.0 } },
        { text: "I\u2019ll adjust my line and bowl to my field", w: { spinctrl: 1.0, moenforcer: 0.3 } },
        { text: "I have deliveries that spin away from them", w: { spinatk: 1.0 } },
        { text: "Doesn\u2019t change much \u2014 I\u2019ll back my skills", w: { deathclose: 0.5, moenforcer: 0.5 } },
    ]},
    { q: "What bothers you most when bowling?", opts: [
        { text: "Not getting wickets when I\u2019m bowling well", w: { newball: 0.7, spinatk: 0.5 } },
        { text: "Going for too many runs", w: { spinctrl: 1.0, moenforcer: 0.3 } },
        { text: "When the batter reads what I\u2019m doing", w: { spinatk: 1.0 } },
        { text: "Getting hit at the end when the game is close", w: { deathclose: 1.0 } },
    ]},
    { q: "How would your teammates describe your bowling?", opts: [
        { text: "Dangerous with the new ball \u2014 gets early wickets", w: { newball: 1.0 } },
        { text: "Tight \u2014 never gives anything away", w: { spinctrl: 1.0 } },
        { text: "Tricky \u2014 hard to read and full of surprises", w: { spinatk: 1.0 } },
        { text: "Clutch \u2014 bowls well when the pressure is on", w: { deathclose: 1.0 } },
        { text: "Tough \u2014 makes batting hard and uncomfortable", w: { moenforcer: 1.0 } },
    ]},
    { q: "The batter is just blocking everything. What do you do?", opts: [
        { text: "Bowl faster or fuller to force a mistake", w: { newball: 0.7, moenforcer: 0.5 } },
        { text: "Keep going \u2014 dots are good, they\u2019ll make a mistake", w: { spinctrl: 1.0 } },
        { text: "Try a different delivery to tempt them into a shot", w: { spinatk: 1.0 } },
        { text: "Mix up my pace \u2014 go slower, then surprise them", w: { deathclose: 0.7, spinatk: 0.4 } },
    ]},
    { q: "You get hit for six. Next ball, what do you bowl?", opts: [
        { text: "Same ball but better \u2014 I back my skills", w: { newball: 0.5, moenforcer: 0.5, spinctrl: 0.3 } },
        { text: "Something completely different to surprise them", w: { spinatk: 0.8, deathclose: 0.4 } },
        { text: "A yorker or full ball \u2014 make it hard to hit again", w: { deathclose: 1.0 } },
        { text: "Tighter line, back of a length \u2014 take the boundary away", w: { spinctrl: 0.6, moenforcer: 0.6 } },
    ]},
];

// ═══ JUNIOR QUESTIONNAIRE (U14 — age as of 1 September) ═══
// Mostly enjoyment-based with a couple of simple scenarios.
// Shorter (8 questions each), simpler language, same archetype IDs.
// Maps to the same scoring algorithm — just fewer data points.

export const BAT_QUESTIONS_JR = [
    { q: "What\u2019s the most fun part of batting for you?", opts: [
        { text: "Smashing the ball for a big six", w: { power: 1.0, enforcer: 0.3 } },
        { text: "Finding the gaps and running quick", w: { tempo: 1.0 } },
        { text: "Playing a cool shot nobody expects", w: { innovator: 1.0 } },
        { text: "Helping my team win a close game", w: { finisher: 1.0, tempo: 0.3 } },
    ]},
    { q: "When do you like batting?", opts: [
        { text: "At the start \u2014 I want to face the first ball", w: { enforcer: 1.0 } },
        { text: "In the middle \u2014 I like to build an innings", w: { tempo: 1.0, innovator: 0.2 } },
        { text: "At the end \u2014 I like the pressure", w: { finisher: 1.0 } },
        { text: "Anywhere \u2014 I just like batting", w: { tempo: 0.4, finisher: 0.3, innovator: 0.3 } },
    ]},
    { q: "What\u2019s your favourite shot?", opts: [
        { text: "A big hit over the fence", w: { power: 1.0, enforcer: 0.3 } },
        { text: "A nice drive along the ground", w: { tempo: 0.8, enforcer: 0.3 } },
        { text: "A sweep or reverse sweep", w: { innovator: 1.0 } },
        { text: "Any shot that wins the game", w: { finisher: 1.0 } },
    ]},
    { q: "A bowler keeps bowling the same ball. What do you do?", opts: [
        { text: "Try to smash it for a boundary", w: { power: 0.8, enforcer: 0.5 } },
        { text: "Wait for the right one, then hit it", w: { tempo: 1.0 } },
        { text: "Try a different shot to surprise them", w: { innovator: 1.0 } },
        { text: "Stay patient and pick my moment", w: { finisher: 0.7, tempo: 0.4 } },
    ]},
    { q: "You hit a four. How do you feel?", opts: [
        { text: "I want to hit another one straight away", w: { enforcer: 1.0, power: 0.3 } },
        { text: "Good \u2014 now I\u2019ll look for a single", w: { tempo: 1.0 } },
        { text: "Great \u2014 I\u2019ll try something different next ball", w: { innovator: 1.0 } },
        { text: "Good \u2014 I\u2019ll keep going until the end", w: { finisher: 1.0 } },
    ]},
    { q: "What are you best at?", opts: [
        { text: "Hitting the ball really hard", w: { power: 1.0 } },
        { text: "Not getting out and scoring steadily", w: { tempo: 1.0 } },
        { text: "Playing lots of different shots", w: { innovator: 1.0 } },
        { text: "Scoring when the team really needs it", w: { finisher: 0.8, enforcer: 0.3 } },
    ]},
    { q: "The bowler bowls a short ball at you. What do you want to do?", opts: [
        { text: "Pull it for six!", w: { power: 1.0, enforcer: 0.3 } },
        { text: "Duck and wait for a better ball", w: { tempo: 1.0 } },
        { text: "Ramp or scoop it somewhere unexpected", w: { innovator: 1.0 } },
        { text: "Hit it into a gap and run", w: { finisher: 0.5, tempo: 0.5 } },
    ]},
    { q: "How would your friends describe your batting?", opts: [
        { text: "Big hitter \u2014 goes for boundaries", w: { power: 0.8, enforcer: 0.5 } },
        { text: "Smart \u2014 doesn\u2019t get out much", w: { tempo: 1.0 } },
        { text: "Creative \u2014 plays shots nobody else does", w: { innovator: 1.0 } },
        { text: "Reliable \u2014 always there at the end", w: { finisher: 1.0 } },
    ]},
];

export const BWL_QUESTIONS_JR = [
    { q: "What\u2019s the best feeling when you\u2019re bowling?", opts: [
        { text: "Knocking the stumps out of the ground", w: { newball: 1.0, spinatk: 0.3 } },
        { text: "Bowling so well they can\u2019t score off me", w: { spinctrl: 1.0, moenforcer: 0.3 } },
        { text: "Tricking the batter with a surprise delivery", w: { spinatk: 1.0 } },
        { text: "Getting a wicket when the game is close", w: { deathclose: 1.0 } },
    ]},
    { q: "When do you like bowling?", opts: [
        { text: "At the start with the new ball", w: { newball: 1.0 } },
        { text: "In the middle when I can bowl lots of dots", w: { spinctrl: 0.7, moenforcer: 0.5 } },
        { text: "At the end when everything matters", w: { deathclose: 1.0 } },
        { text: "Whenever my team needs a wicket", w: { spinatk: 0.8, newball: 0.3 } },
    ]},
    { q: "What are you best at with the ball?", opts: [
        { text: "Making the ball move \u2014 swing or spin", w: { newball: 0.7, spinatk: 0.5 } },
        { text: "Bowling in the right spot every time", w: { spinctrl: 1.0, moenforcer: 0.3 } },
        { text: "Having lots of different deliveries", w: { spinatk: 0.8, deathclose: 0.4 } },
        { text: "Bowling fast and making it uncomfortable", w: { moenforcer: 1.0 } },
    ]},
    { q: "The batter hits you for four. What do you do next ball?", opts: [
        { text: "Bowl it faster \u2014 come back harder", w: { newball: 0.6, moenforcer: 0.6 } },
        { text: "Bowl the same spot \u2014 trust my skills", w: { spinctrl: 0.8, moenforcer: 0.4 } },
        { text: "Try something totally different", w: { spinatk: 0.8, deathclose: 0.4 } },
        { text: "Bowl a yorker so they can\u2019t hit me again", w: { deathclose: 1.0 } },
    ]},
    { q: "What do you practise the most?", opts: [
        { text: "Swinging or seaming the ball", w: { newball: 1.0 } },
        { text: "Hitting my length again and again", w: { spinctrl: 0.8, moenforcer: 0.5 } },
        { text: "Different deliveries and variations", w: { spinatk: 0.8, deathclose: 0.4 } },
        { text: "Yorkers and death bowling", w: { deathclose: 1.0 } },
    ]},
    { q: "How would your friends describe your bowling?", opts: [
        { text: "Dangerous \u2014 takes lots of wickets", w: { newball: 1.0, spinatk: 0.3 } },
        { text: "Tight \u2014 really hard to score off", w: { spinctrl: 1.0 } },
        { text: "Tricky \u2014 hard to pick what\u2019s coming", w: { spinatk: 1.0 } },
        { text: "Tough \u2014 bowls fast and makes you uncomfortable", w: { moenforcer: 1.0, deathclose: 0.2 } },
    ]},
    { q: "Your captain says you have to bowl the last over. How do you feel?", opts: [
        { text: "Excited \u2014 I love the pressure!", w: { deathclose: 1.0 } },
        { text: "Okay \u2014 I\u2019ll just try to bowl my best", w: { spinctrl: 0.5, moenforcer: 0.4, newball: 0.3 } },
        { text: "I\u2019d rather bowl earlier, but I\u2019ll give it a go", w: { newball: 0.6, spinctrl: 0.4 } },
        { text: "Good \u2014 I\u2019ll use all my tricks to stop them", w: { spinatk: 0.5, deathclose: 0.6 } },
    ]},
    { q: "A batter is blocking everything. What\u2019s your plan?", opts: [
        { text: "Bowl faster or fuller to get them out", w: { newball: 0.7, moenforcer: 0.5 } },
        { text: "Keep bowling dots \u2014 they\u2019ll make a mistake", w: { spinctrl: 1.0 } },
        { text: "Try a surprise delivery to trick them", w: { spinatk: 1.0 } },
        { text: "Change my pace to confuse them", w: { deathclose: 0.7, spinatk: 0.4 } },
    ]},
];

// ═══ CRICKET AGE — age as of September 1 of the current season ═══
export function getCricketAge(dob) {
    if (!dob) return null;
    const p = dob.split("/");
    if (p.length !== 3) return null;
    const birthDate = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    if (isNaN(birthDate.getTime())) return null;
    // Cricket age = age as of September 1 of the current year
    const now = new Date();
    const sep1 = new Date(now.getFullYear(), 8, 1); // month 8 = September
    let age = sep1.getFullYear() - birthDate.getFullYear();
    const mDiff = sep1.getMonth() - birthDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && sep1.getDate() < birthDate.getDate())) age--;
    return age;
}

export const JUNIOR_AGE_CUTOFF = 14; // U14 = cricket age < 14 as of Sep 1
// Called after questionnaire is complete. Returns { primary, secondary, scores }
const DUAL_THRESHOLD = 15; // secondary within 15% of primary = dual archetype

export function scoreArchetypeAnswers(answers, questions, archetypeIds) {
    // answers = array of selected option indices [0, 2, 1, 3, ...]
    // questions = BAT_QUESTIONS or BWL_QUESTIONS
    // archetypeIds = array of archetype ID strings
    const scores = {};
    const maxPossible = {};
    archetypeIds.forEach(id => { scores[id] = 0; maxPossible[id] = 0; });

    questions.forEach((q, qi) => {
        // Accumulate max possible per archetype from each question
        archetypeIds.forEach(id => {
            const bestForArch = Math.max(0, ...q.opts.map(o => o.w[id] || 0));
            maxPossible[id] += bestForArch;
        });
        // Accumulate actual score from selected answer
        const sel = answers[qi];
        if (sel != null && q.opts[sel]) {
            const weights = q.opts[sel].w;
            Object.entries(weights).forEach(([arch, wt]) => {
                if (scores[arch] !== undefined) scores[arch] += wt;
            });
        }
    });

    // Normalise to 0-100
    const pct = {};
    archetypeIds.forEach(id => {
        pct[id] = maxPossible[id] > 0 ? Math.round((scores[id] / maxPossible[id]) * 100) : 0;
    });

    // Find primary and secondary
    const sorted = Object.entries(pct).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0]?.[0] || null;
    const secondary = (sorted[1] && sorted[0][1] - sorted[1][1] <= DUAL_THRESHOLD) ? sorted[1][0] : null;

    return { primary, secondary, scores: pct, raw: scores };
}

export function scoreBatArchetype(answers) {
    return scoreArchetypeAnswers(answers, BAT_QUESTIONS, BAT_ARCH.map(a => a.id));
}
export function scoreBwlArchetype(answers) {
    return scoreArchetypeAnswers(answers, BWL_QUESTIONS, BWL_ARCH.map(a => a.id));
}

// ═══ LEGACY COMPAT: BAT_SIGNAL_MAP still exported for any remaining consumers ═══
// The questionnaire system replaces signal-based scoring, but existing onboarding data
// (go-to shots, phases, position) can still contribute supplementary weight.
export const BAT_SIGNAL_MAP = {
    shots: {}, phases: {}, positions: {}, comfortSpin: {}, comfortPace: {},
};

export const PHASES = [{ id: "pp", nm: "POWERPLAY (1-6)" }, { id: "mid", nm: "MIDDLE (7-16)" }, { id: "death", nm: "DEATH (17-20)" }];

// ═══ VOICE QUESTIONS (position-indexed — NEVER reorder, append only) ═══

export const VOICE_QS = [
    "What part of your game are you most proud of?",
    "What's the one thing you most want to improve?",
    "Describe a match situation where you feel most confident.",
    "What does success look like in the next 12 weeks?",
    // ── Appended v2 ──
    "How would you describe your batting style in one sentence?",
    "What's your go-to shot or delivery under pressure?",
];

// ═══ T20 IDENTITY DATA (new for v2 onboarding expansion) ═══

export const BAT_POSITIONS = [
    { id: "top", label: "Top Order (1-3)" },
    { id: "middle", label: "Middle Order (4-5)" },
    { id: "lower", label: "Lower Order (6-7)" },
    { id: "tail", label: "Tail (8+)" },
];

export const BATTING_PHASE_PREFS = [
    { id: "pp", label: "Powerplay", icon: "⚡" },
    { id: "mid", label: "Middle Overs", icon: "🎯" },
    { id: "death", label: "Death Overs", icon: "🔥" },
];

export const BOWLING_PHASE_PREFS = [
    { id: "new", label: "New Ball", icon: "🔴" },
    { id: "mid", label: "Middle Overs", icon: "🎯" },
    { id: "death", label: "Death Overs", icon: "🔥" },
];

export const BOWLING_SPEEDS = [
    { id: "slow", label: "Slow (< 100 km/h)", range: "< 100" },
    { id: "medium", label: "Medium (100-120 km/h)", range: "100-120" },
    { id: "fast", label: "Fast (120-135 km/h)", range: "120-135" },
    { id: "express", label: "Express (135+ km/h)", range: "135+" },
];

export const GOTO_SHOTS = [
    "Drive", "Pull", "Cut", "Sweep", "Reverse Sweep",
    "Ramp / Scoop", "Switch Hit", "Flick", "Lap / Paddle",
    "Lofted Hit", "Late Cut", "Upper Cut",
];

export const PACE_VARIATIONS = [
    "Yorker", "Slower Ball", "Bouncer", "Cutter",
    "Knuckle Ball", "Wide-Line", "Back-of-Length",
];

export const SPIN_VARIATIONS = [
    "Wrong'un / Googly", "Arm Ball", "Top Spinner",
    "Slider", "Flipper", "Carrom Ball", "Undercutter",
];

// ═══ ASSESSMENT SESSION TAGGING ═══
// Maps each rateable skill label to the assessment session in which a coach
// can realistically observe it:
//   'weekday' — Skill Week (midweek drill session, WD1-4)
//   'weekend' — Game Sense Week (weekend live match, WE1-4)
//   'both'    — observable in both sessions (default for un-mapped labels)
//
// Source of truth: the "Assessment Week One" session plan sheet (what the
// 2-hour weekday drill block actually exposes) and the RRA Assessment Week
// Form PDF (which items are captured overall). Labels not listed here are
// treated as 'both' so they remain editable in either session.
//
// Weekday coverage is currently scoped to batter-relevant observables.
// Bowling-technical labels are intentionally 'both' until weekend planning
// is done and the bowling split is confirmed.
export const SKILL_SESSIONS = {
    // ─── BATTING TECHNICAL ───
    "Stance & Setup": "weekday",
    "Trigger Movement & Balance": "weekday",
    "Front-Foot Drive": "weekday",
    "Back-Foot Play": "weekday",
    "Power Hitting": "weekday",
    "Sweep & Reverse Sweep": "weekday",
    "Playing Spin": "weekday",
    "Playing Pace": "weekday",
    "Strike Rotation": "weekend",
    "Death-Over Hitting": "weekday",
    // ─── POWER HITTING PILLAR EXTRAS (360 Drill + Must Go For 6) ───
    "Lofted Hitting Confidence": "weekday",
    "Scoring Arc / Range": "weekday",
    // ─── GAME INTELLIGENCE (all weekend — needs live match context) ───
    "Powerplay Awareness": "weekend",
    "Middle-Over Management": "weekend",
    "Death-Over Decisions": "weekend",
    "Match Reading": "weekend",
    "Field Awareness": "weekend",
    "Adaptability": "weekend",
    // ─── MENTAL (mixed — drills expose some, pressure moments expose others) ───
    "Courage Under Pressure": "weekday",
    "Curiosity & Learning": "weekday",
    "Coachability": "weekday",
    "Emotional Regulation": "weekend",
    "Competitive Drive": "weekend",
    "Communication & Leadership": "weekend",
    "Resilience": "weekend",
    // ─── PHYSICAL (batter-mapped labels) ───
    "Explosive Power": "weekday",
    "Core Balance": "weekday",
    "Upper Body Power": "weekday",
    "Agility & Running": "weekend",
    "Aerobic Fitness": "weekend",
    "Hand-Eye Coordination": "weekday",
    // ─── ATHLETIC FIELDING (all weekend — no fielding in weekday plan) ───
    "Ground Fielding": "weekend",
    "Catching Reliability": "weekend",
    "Close / Sharp Catching": "weekend",
    "Throwing Accuracy & Speed": "weekend",
    "Running Between Wickets": "weekend",
};

export function getItemSession(label) {
    return SKILL_SESSIONS[label] || "both";
}

// Returns true if an item is editable under the given activeSession.
// activeSession: 'weekday' | 'weekend' | null (no gating).
export function isItemActiveForSession(label, activeSession) {
    if (!activeSession) return true;
    const s = SKILL_SESSIONS[label] || "both";
    return s === "both" || s === activeSession;
}
