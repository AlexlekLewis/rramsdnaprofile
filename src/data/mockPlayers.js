// ═══ MOCK PLAYERS — only used when Supabase has no data ═══

export const MOCK = [
    {
        id: "p1", name: "Liam Patel", dob: "15/03/2012", club: "Doncaster CC", assoc: "ECA", role: "pace", bat: "Right-Hand Bat", bowl: "Right-Arm Fast",
        voice: ["My outswinger", "Yorker under pressure", "Bowling with new ball in powerplay", "Take 15+ wickets"],
        grades: [
            { level: "local_j1", ageGroup: "U14", shield: "Shield 1", team: "Doncaster U14", association: "ECA", matches: "12", batInn: "10", runs: "285", hs: "67", avg: "28.5", bowlInn: "12", overs: "68", wkts: "24", sr: "17.0", bAvg: "17.9", econ: "6.32", ct: "6", ro: "2", st: "", format: "" },
            { level: "local_j2", ageGroup: "U16", shield: "Shield 2", team: "Doncaster U16", association: "ECA", matches: "6", batInn: "5", runs: "98", hs: "34", avg: "16.3", bowlInn: "6", overs: "32", wkts: "11", sr: "17.5", bAvg: "16.9", econ: "5.81", ct: "3", ro: "0", st: "", format: "" }],
        injury: "Mild lower back stiffness", goals: "Dowling Shield selection & death bowling", submitted: true,
        cd: { batA: "tempo", bwlA: "newball", t1_0: 4, t1_1: 3, t1_2: 4, t1_3: 3, t1_4: 3, t1_5: 2, t1_6: 3, t1_7: 4, t1_8: 3, t1_9: 3, t2_0: 3, t2_1: 3, t2_2: 3, t2_3: 2, t2_4: 3, t2_5: 2, iq_0: 3, iq_1: 3, iq_2: 2, iq_3: 3, iq_4: 3, iq_5: 3, mn_0: 4, mn_1: 4, mn_2: 3, mn_3: 4, mn_4: 3, mn_5: 4, mn_6: 3, ph_0: 4, ph_1: 3, ph_2: 3, ph_3: 3, ph_4: 3 }
    },
    {
        id: "p2", name: "Maya Chen", dob: "22/07/2010", club: "Fitzroy Doncaster CC", assoc: "Premier Cricket", role: "batter", bat: "Left-Hand Bat", bowl: "Right-Arm Offspin",
        voice: ["Building innings and accelerating", "Playing genuine pace", "Chasing in middle overs", "Score 400+ runs, avg 35+"],
        grades: [
            { level: "local_j1", ageGroup: "U16", shield: "Premier", team: "FD U16", association: "Premier Cricket", matches: "14", batInn: "12", runs: "412", hs: "87", avg: "37.5", bowlInn: "5", overs: "12", wkts: "3", sr: "24.0", bAvg: "26.0", econ: "6.5", ct: "8", ro: "3", st: "", format: "" },
            { level: "prem_low", ageGroup: "Open/Senior", shield: "3rd XI", team: "FD 3rds", association: "Premier Cricket", matches: "3", batInn: "3", runs: "64", hs: "41", avg: "21.3", bowlInn: "0", overs: "0", wkts: "0", sr: "", bAvg: "", econ: "", ct: "2", ro: "1", st: "", format: "One-Day / Limited Overs" }],
        injury: "None", goals: "Dowling Shield & Vic U17", submitted: true, cd: {}
    },
    {
        id: "p3", name: "Josh Williams", dob: "08/11/2013", club: "Preston CC", assoc: "VTCA", role: "allrounder", bat: "Right-Hand Bat", bowl: "Right-Arm Medium",
        voice: ["Batting in the powerplay", "Death bowling gets expensive", "Opening and getting off to good starts", "Make a rep squad"],
        grades: [
            { level: "local_j1", ageGroup: "U12", shield: "Shield 1", team: "Preston U12 Gold", association: "VTCA", matches: "10", batInn: "9", runs: "198", hs: "52", avg: "22.0", bowlInn: "8", overs: "28", wkts: "8", sr: "21.0", bAvg: "20.6", econ: "5.89", ct: "5", ro: "1", st: "", format: "" }],
        injury: "None", goals: "Death bowling & yorkers", submitted: true, cd: {}
    },
    {
        id: "p4", name: "Tom Richardson", dob: "19/05/2007", club: "Ringwood CC", assoc: "ECA", role: "keeper", bat: "Right-Hand Bat", bowl: "N/A",
        voice: ["Glovework standing up to spin", "Death-over hitting", "Keeping to our spinner", "Play seniors consistently"],
        grades: [
            { level: "local_j1", ageGroup: "U18", shield: "Shield 1", team: "Ringwood U18", association: "ECA", matches: "11", batInn: "11", runs: "356", hs: "78", avg: "39.6", bowlInn: "0", overs: "0", wkts: "0", sr: "", bAvg: "", econ: "", ct: "14", ro: "2", st: "6", format: "" },
            { level: "prem_low", ageGroup: "Open/Senior", shield: "2nd XI", team: "Ringwood 2nds", association: "ECA", matches: "8", batInn: "8", runs: "189", hs: "54", avg: "27.0", bowlInn: "0", overs: "0", wkts: "0", sr: "", bAvg: "", econ: "", ct: "18", ro: "0", st: "4", format: "Two-Day / Multi-Day" },
            { level: "prem_low", ageGroup: "Open/Senior", shield: "2nd XI", team: "Ringwood 2nds T20", association: "ECA", matches: "4", batInn: "4", runs: "87", hs: "42", avg: "29.0", bowlInn: "0", overs: "0", wkts: "0", sr: "", bAvg: "", econ: "", ct: "3", ro: "1", st: "2", format: "T20" }],
        injury: "Previous R index finger dislocation (2024) — recovered", goals: "Lock down 2nd XI keeping, push for 1sts", submitted: true, cd: {}
    }
];
