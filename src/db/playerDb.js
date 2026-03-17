// ═══ SUPABASE DATA ACCESS LAYER ═══
import { supabase } from '../supabaseClient';
import { ROLES, VOICE_QS } from '../data/skillItems';

export async function loadPlayersFromDB() {
    // Fetch inactive member auth_user_ids to exclude archived players from all calculations
    const { data: inactiveMembers } = await supabase.from('program_members').select('auth_user_id').eq('active', false);
    const inactiveAuthIds = new Set((inactiveMembers || []).map(m => m.auth_user_id).filter(Boolean));

    const { data: pRows, error: pErr } = await supabase.from('players').select('*').eq('submitted', true).order('created_at', { ascending: false });
    if (pErr) { console.error('Load players error:', pErr); return []; }
    // Exclude archived players
    const activePRows = pRows.filter(p => !p.auth_user_id || !inactiveAuthIds.has(p.auth_user_id));
    const playerIds = activePRows.map(p => p.id);
    if (!playerIds.length) return [];
    const [{ data: gRows }, { data: aRows }] = await Promise.all([
        supabase.from('competition_grades').select('*').in('player_id', playerIds).order('sort_order'),
        supabase.from('coach_assessments').select('*').in('player_id', playerIds)
    ]);
    return activePRows.map(p => {
        const grades = (gRows || []).filter(g => g.player_id === p.id).map(g => ({
            level: g.level, ageGroup: g.age_group, shield: g.shield, team: g.team, association: g.association,
            matches: String(g.matches || ''), batInn: String(g.batting_innings || ''), runs: String(g.runs || ''), hs: String(g.high_score || ''), avg: String(g.batting_avg || ''),
            notOuts: String(g.not_outs || ''), ballsFaced: String(g.balls_faced || ''),
            bowlInn: String(g.bowling_innings || ''), overs: String(g.overs || ''), wkts: String(g.wickets || ''), sr: g.strike_rate != null ? String(g.strike_rate) : '',
            bAvg: g.bowling_avg != null ? String(g.bowling_avg) : '', econ: g.economy != null ? String(g.economy) : '',
            bestBowlWkts: String(g.best_bowl_wkts || ''), bestBowlRuns: String(g.best_bowl_runs || ''),
            ct: String(g.catches || ''), ro: String(g.run_outs || ''), st: String(g.stumpings || ''),
            keeperCatches: String(g.keeper_catches || ''), hsBallsFaced: String(g.hs_balls_faced || ''), hsBoundaries: String(g.hs_boundaries || ''),
            format: g.format || ''
        }));
        const topBat = (p.top_batting_scores || []).map(b => ({
            runs: String(b.runs || ''), balls: String(b.balls || ''), fours: String(b.fours || ''), sixes: String(b.sixes || ''),
            notOut: !!b.notOut, comp: b.comp || '', vs: b.vs || '', format: b.format || ''
        }));
        const topBowl = (p.top_bowling_figures || []).map(b => ({
            wkts: String(b.wkts || ''), runs: String(b.runs || ''), overs: String(b.overs || ''), maidens: String(b.maidens || ''),
            comp: b.comp || '', vs: b.vs || '', format: b.format || ''
        }));
        const ass = (aRows || []).find(a => a.player_id === p.id);
        let cd = {};
        if (ass) {
            cd = {
                batA: ass.batting_archetype, bwlA: ass.bowling_archetype, narrative: ass.narrative, sqRec: ass.squad_rec,
                pl_explore: ass.plan_explore, pl_challenge: ass.plan_challenge, pl_execute: ass.plan_execute,
                ...Object.fromEntries((ass.strengths || []).map((s, i) => [`str${i + 1}`, s])),
                ...Object.fromEntries((ass.priorities || []).map((s, i) => [`pri${i + 1}`, s])),
                ...(ass.phase_ratings || {}), ...(ass.tech_primary || {}), ...(ass.tech_secondary || {}),
                ...(ass.game_iq || {}), ...(ass.mental || {}), ...(ass.physical || {})
            };
        }
        return {
            id: p.id, name: p.name, dob: p.dob, club: p.club, assoc: p.association, role: p.role,
            bat: p.batting_hand, bowl: p.bowling_type, voice: p.voice_answers || [],
            grades, topBat, topBowl, injury: p.injury, goals: p.goals, submitted: p.submitted, cd,
            gender: p.gender, self_ratings: p.self_ratings || {},
            // ── v2 profile enrichment ──
            heightCm: p.height_cm, batPosition: p.batting_position,
            batPhases: p.batting_phases, bwlPhases: p.bowling_phases,
            bwlSpeed: p.bowling_speed, gotoShots: p.goto_shots,
            pressureShot: p.pressure_shot, shutdownDelivery: p.shutdown_delivery,
            bwlVariations: p.bowling_variations,
            spinComfort: p.spin_comfort, shortBallComfort: p.short_ball_comfort,
            playerBatArch: p.player_bat_archetype, playerBwlArch: p.player_bwl_archetype,
            batArchAnswers: p.bat_arch_answers, bwlArchAnswers: p.bwl_arch_answers,
            playerBatArchSecondary: p.bat_arch_secondary, playerBwlArchSecondary: p.bwl_arch_secondary,
            onboardingProgress: p.onboarding_progress, profileVersion: p.profile_version || 1,
        };
    });
}

// ── Shared helper: build the column data from the form object ──
function buildPlayerRow(pd) {
    const rid = ROLES.find(r => r.label === pd.role)?.id || 'batter';
    const selfRatings = {};
    Object.keys(pd).filter(k => k.startsWith('sr_')).forEach(k => { selfRatings[k.replace('sr_', '')] = pd[k]; });
    const topBatScores = (pd.topBat || []).filter(b => +b.runs > 0).map(b => ({
        runs: +b.runs || 0, balls: +b.balls || 0, fours: +b.fours || 0, sixes: +b.sixes || 0,
        notOut: !!b.notOut, comp: b.comp || '', vs: b.vs || '', format: b.format || ''
    }));
    const topBowlFigs = (pd.topBowl || []).filter(b => +b.wkts > 0 || +b.runs > 0).map(b => ({
        wkts: +b.wkts || 0, runs: +b.runs || 0, overs: +b.overs || 0, maidens: +b.maidens || 0,
        comp: b.comp || '', vs: b.vs || '', format: b.format || ''
    }));
    return {
        name: pd.name || null, dob: pd.dob || null, phone: pd.phone || null, email: pd.email || null,
        club: pd.club || null, association: pd.assoc || null, role: rid,
        batting_hand: pd.bat || null, bowling_type: pd.bowl || null,
        parent_name: pd.parentName || null, parent_email: pd.parentEmail || null,
        injury: pd.injury || null, goals: pd.goals || null, gender: pd.gender || null,
        voice_answers: VOICE_QS.map((_, i) => pd[`v_${i}`] || ''),
        self_ratings: selfRatings, top_batting_scores: topBatScores, top_bowling_figures: topBowlFigs,
        height_cm: pd.heightCm ? +pd.heightCm : null,
        batting_position: pd.batPosition || null,
        batting_phases: pd.batPhases || null,
        bowling_phases: pd.bwlPhases || null,
        bowling_speed: pd.bwlSpeed || null,
        goto_shots: pd.gotoShots || null,
        pressure_shot: pd.pressureShot || null,
        shutdown_delivery: pd.shutdownDelivery || null,
        bowling_variations: pd.bwlVariations || null,
        spin_comfort: pd.spinComfort ? +pd.spinComfort : null,
        short_ball_comfort: pd.shortBallComfort ? +pd.shortBallComfort : null,
        player_bat_archetype: pd.playerBatArch || null,
        player_bwl_archetype: pd.playerBwlArch || null,
        bat_arch_answers: pd.batArchAnswers || null,
        bwl_arch_answers: pd.bwlArchAnswers || null,
        bat_arch_secondary: pd.playerBatArchSecondary || null,
        bwl_arch_secondary: pd.playerBwlArchSecondary || null,
        profile_version: 2,
    };
}

function buildGradeRows(pd, playerId) {
    return (pd.grades || []).filter(g => g.level).map((g, i) => ({
        player_id: playerId, level: g.level, age_group: g.ageGroup, shield: g.shield || '', team: g.team || '',
        association: g.association || '', matches: +g.matches || 0, batting_innings: +g.batInn || 0, runs: +g.runs || 0, high_score: +g.hs || 0,
        batting_avg: +g.avg || 0, not_outs: +g.notOuts || 0, balls_faced: +g.ballsFaced || 0,
        bowling_innings: +g.bowlInn || 0, overs: +g.overs || 0, wickets: +g.wkts || 0,
        strike_rate: g.sr ? +g.sr : null, bowling_avg: g.bAvg ? +g.bAvg : null, economy: g.econ ? +g.econ : null,
        best_bowl_wkts: +g.bestBowlWkts || 0, best_bowl_runs: +g.bestBowlRuns || 0,
        catches: +g.ct || 0, run_outs: +g.ro || 0, stumpings: +g.st || 0, keeper_catches: +g.keeperCatches || 0,
        hs_balls_faced: +g.hsBallsFaced || 0, hs_boundaries: +g.hsBoundaries || 0,
        format: g.format || '', sort_order: i
    }));
}

export async function savePlayerToDB(pd, authUserId, draftId) {
    const row = { ...buildPlayerRow(pd), submitted: true, onboarding_progress: pd.onboardingProgress || null };
    if (authUserId) row.auth_user_id = authUserId;

    let player;
    if (draftId) {
        // Update existing draft → submitted
        const { data, error: pErr } = await supabase.from('players').update(row).eq('id', draftId).select().single();
        if (pErr) throw new Error(`Player save failed: ${pErr.message}`);
        player = data;
        await supabase.from('competition_grades').delete().eq('player_id', draftId);
    } else {
        const { data, error: pErr } = await supabase.from('players').insert(row).select().single();
        if (pErr) throw new Error(`Player save failed: ${pErr.message}`);
        player = data;
    }

    const grades = buildGradeRows(pd, player.id);
    if (grades.length) {
        const { error: gErr } = await supabase.from('competition_grades').insert(grades);
        if (gErr) console.error('Save grades error (player saved OK):', gErr);
    }
    return player;
}

// ═══ DRAFT SAVE / LOAD ═══

export async function saveDraftToDB(pd, step, authUserId) {
    if (!authUserId) throw new Error('Auth required for draft save');

    const progress = pd.onboardingProgress || {};
    const row = {
        ...buildPlayerRow(pd),
        submitted: false,
        auth_user_id: authUserId,
        onboarding_progress: {
            ...progress,
            draftStep: step,
            draftExtra: { primarySkill: pd.primarySkill, secondarySkill: pd.secondarySkill },
        },
    };

    // Check for existing draft
    const { data: existing } = await supabase.from('players')
        .select('id').eq('auth_user_id', authUserId).eq('submitted', false).maybeSingle();

    let player;
    if (existing) {
        const { data, error } = await supabase.from('players').update(row).eq('id', existing.id).select().single();
        if (error) throw new Error(`Draft update failed: ${error.message}`);
        player = data;
        await supabase.from('competition_grades').delete().eq('player_id', player.id);
    } else {
        const { data, error } = await supabase.from('players').insert(row).select().single();
        if (error) throw new Error(`Draft save failed: ${error.message}`);
        player = data;
    }

    const grades = buildGradeRows(pd, player.id);
    if (grades.length) {
        const { error: gErr } = await supabase.from('competition_grades').insert(grades);
        if (gErr) console.error('Draft grade save error:', gErr);
    }
    return player;
}

export async function loadDraftFromDB(authUserId) {
    if (!authUserId) return null;

    const { data: p, error } = await supabase.from('players')
        .select('*').eq('auth_user_id', authUserId).eq('submitted', false).maybeSingle();
    if (error || !p) return null;

    const { data: gRows } = await supabase.from('competition_grades')
        .select('*').eq('player_id', p.id).order('sort_order');

    const grades = (gRows || []).map(g => ({
        level: g.level, ageGroup: g.age_group, shield: g.shield, team: g.team, association: g.association,
        matches: String(g.matches || ''), batInn: String(g.batting_innings || ''), runs: String(g.runs || ''),
        hs: String(g.high_score || ''), avg: String(g.batting_avg || ''),
        notOuts: String(g.not_outs || ''), ballsFaced: String(g.balls_faced || ''),
        bowlInn: String(g.bowling_innings || ''), overs: String(g.overs || ''), wkts: String(g.wickets || ''),
        sr: g.strike_rate != null ? String(g.strike_rate) : '', bAvg: g.bowling_avg != null ? String(g.bowling_avg) : '',
        econ: g.economy != null ? String(g.economy) : '',
        bestBowlWkts: String(g.best_bowl_wkts || ''), bestBowlRuns: String(g.best_bowl_runs || ''),
        ct: String(g.catches || ''), ro: String(g.run_outs || ''), st: String(g.stumpings || ''),
        keeperCatches: String(g.keeper_catches || ''), hsBallsFaced: String(g.hs_balls_faced || ''),
        hsBoundaries: String(g.hs_boundaries || ''), format: g.format || ''
    }));
    const topBat = (p.top_batting_scores || []).map(b => ({
        runs: String(b.runs || ''), balls: String(b.balls || ''), fours: String(b.fours || ''), sixes: String(b.sixes || ''),
        notOut: !!b.notOut, comp: b.comp || '', vs: b.vs || '', format: b.format || ''
    }));
    const topBowl = (p.top_bowling_figures || []).map(b => ({
        wkts: String(b.wkts || ''), runs: String(b.runs || ''), overs: String(b.overs || ''), maidens: String(b.maidens || ''),
        comp: b.comp || '', vs: b.vs || '', format: b.format || ''
    }));

    const progress = p.onboarding_progress || {};
    const extra = progress.draftExtra || {};

    const pd = {
        name: p.name || '', dob: p.dob || '', phone: p.phone || '', email: p.email || '',
        club: p.club || '', assoc: p.association || '', gender: p.gender || '',
        parentName: p.parent_name || '', parentEmail: p.parent_email || '',
        role: ROLES.find(r => r.id === p.role)?.label || '',
        bat: p.batting_hand || '', bowl: p.bowling_type || '',
        injury: p.injury || '', goals: p.goals || '',
        grades: grades.length ? grades : [{}],
        topBat: topBat.length ? topBat : [{}],
        topBowl: topBowl.length ? topBowl : [{}],
        heightCm: p.height_cm ? String(p.height_cm) : '',
        batPosition: p.batting_position || '',
        batPhases: p.batting_phases || null, bwlPhases: p.bowling_phases || null,
        bwlSpeed: p.bowling_speed || '', gotoShots: p.goto_shots || null,
        pressureShot: p.pressure_shot || '', shutdownDelivery: p.shutdown_delivery || '',
        bwlVariations: p.bowling_variations || null,
        spinComfort: p.spin_comfort, shortBallComfort: p.short_ball_comfort,
        playerBatArch: p.player_bat_archetype || null, playerBwlArch: p.player_bwl_archetype || null,
        batArchAnswers: p.bat_arch_answers || null, bwlArchAnswers: p.bwl_arch_answers || null,
        playerBatArchSecondary: p.bat_arch_secondary || null, playerBwlArchSecondary: p.bwl_arch_secondary || null,
        onboardingProgress: progress,
        primarySkill: extra.primarySkill || '', secondarySkill: extra.secondarySkill || '',
    };

    // Restore voice answers & self-ratings
    (p.voice_answers || []).forEach((v, i) => { if (v) pd[`v_${i}`] = v; });
    Object.entries(p.self_ratings || {}).forEach(([k, v]) => { pd[`sr_${k}`] = v; });

    return { pd, step: progress.draftStep || 0, draftId: p.id };
}

export async function saveAssessmentToDB(playerId, cd) {
    // ── Snapshot existing assessment into history before overwriting ──
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: existing } = await supabase
            .from('coach_assessments')
            .select('*')
            .eq('player_id', playerId)
            .single();
        if (existing) {
            // Count existing history records to determine version number
            const { count } = await supabase
                .from('assessment_history')
                .select('id', { count: 'exact', head: true })
                .eq('player_id', playerId);
            await supabase.from('assessment_history').insert({
                player_id: playerId,
                assessment_data: existing,
                version: (count || 0) + 1,
                created_by: session?.user?.id || null,
            });
        }
    } catch (e) {
        // History save failure should never block the actual assessment save
        console.warn('Assessment history snapshot failed:', e.message);
    }

    const phaseKeys = ['pb_pp', 'pw_pp', 'pb_mid', 'pw_mid', 'pb_death', 'pw_death'];
    const phase_ratings = Object.fromEntries(phaseKeys.filter(k => cd[k] != null).map(k => [k, cd[k]]));
    const tech_primary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t1_')));
    const tech_secondary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t2_')));
    const game_iq = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('iq_')));
    const mental = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('mn_')));
    const physical = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('ph_')));
    const strengths = [cd.str1, cd.str2, cd.str3].filter(Boolean);
    const priorities = [cd.pri1, cd.pri2, cd.pri3].filter(Boolean);
    const row = {
        player_id: playerId, batting_archetype: cd.batA || null, bowling_archetype: cd.bwlA || null,
        phase_ratings, tech_primary, tech_secondary, game_iq, mental, physical,
        narrative: cd.narrative || null, strengths, priorities,
        plan_explore: cd.pl_explore || null, plan_challenge: cd.pl_challenge || null, plan_execute: cd.pl_execute || null,
        squad_rec: cd.sqRec || null, updated_at: new Date().toISOString()
    };
    const { error: upsertErr } = await supabase.from('coach_assessments').upsert(row, { onConflict: 'player_id' });
    if (upsertErr) throw upsertErr;
}

// ═══ CALIBRATION DATA LOADERS ═══

export async function loadSkillDefs() {
    const { data, error } = await supabase.from('skill_definitions').select('*');
    if (error) throw error;
    const out = {};
    (data || []).forEach(r => {
        if (!out[r.skill_name]) out[r.skill_name] = {};
        out[r.skill_name][r.level] = r.description;
    });
    return out;
}

export async function loadStatBenchmarks() {
    const { data, error } = await supabase.from('stat_benchmarks').select('*');
    if (error) throw error;
    const out = {};
    (data || []).forEach(r => {
        if (!out[r.cti_band]) out[r.cti_band] = {};
        out[r.cti_band][r.metric] = r.benchmarks;
    });
    return out;
}

export async function loadStatDomainWeights() {
    const { data, error } = await supabase.from('stat_domain_weights').select('*');
    if (error) throw error;
    const out = {};
    (data || []).forEach(r => { out[r.age_tier] = { t: +r.t, i: +r.i, m: +r.m, h: +r.h, ph: +r.ph, s: +r.s }; });
    return out;
}

export async function loadStatSubWeights() {
    const { data, error } = await supabase.from('stat_sub_weights').select('*');
    if (error) throw error;
    const out = {};
    (data || []).forEach(r => { out[r.role] = [+r.batting, +r.bowling, +r.fielding]; });
    return out;
}
