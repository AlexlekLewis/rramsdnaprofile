// ═══ SUPABASE DATA ACCESS LAYER ═══
import { supabase } from '../supabaseClient';
import { ROLES, VOICE_QS } from '../data/skillItems';

export async function loadPlayersFromDB() {
    // Fetch inactive member auth_user_ids to exclude archived players from all calculations
    const { data: inactiveMembers, error: inactiveErr } = await supabase.from('program_members').select('auth_user_id').eq('active', false);
    if (inactiveErr) console.error('Failed to load inactive members:', inactiveErr.message);
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
                overall_batting: ass.overall_batting || null, overall_rating: ass.overall_rating || null,
                batting_qualities: ass.batting_qualities || null,
                _playerVoice: ass.player_voice || null,
                ...Object.fromEntries((ass.strengths || []).map((s, i) => [`str${i + 1}`, s])),
                ...Object.fromEntries((ass.priorities || []).map((s, i) => [`pri${i + 1}`, s])),
                ...(ass.phase_ratings || {}), ...(ass.tech_primary || {}), ...(ass.tech_secondary || {}),
                ...(ass.game_iq || {}), ...(ass.mental || {}), ...(ass.physical || {}),
                ...(ass.fielding || {})
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
    // Flatten best performances from inside each grade card
    const topBatScores = (pd.grades || []).filter(g => g.topBat && +g.topBat.runs > 0).map(g => ({
        runs: +g.topBat.runs || 0, balls: +g.topBat.balls || 0, fours: +g.topBat.fours || 0, sixes: +g.topBat.sixes || 0,
        notOut: !!g.topBat.notOut, comp: g.level || '', vs: g.topBat.vs || '', format: g.topBat.format || ''
    }));
    const topBowlFigs = (pd.grades || []).filter(g => g.topBowl && (+g.topBowl.wkts > 0 || +g.topBowl.runs > 0)).map(g => ({
        wkts: +g.topBowl.wkts || 0, runs: +g.topBowl.runs || 0, overs: +g.topBowl.overs || 0, maidens: +g.topBowl.maidens || 0,
        comp: g.level || '', vs: g.topBowl.vs || '', format: g.topBowl.format || ''
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
        updated_at: new Date().toISOString(),
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
    // Refresh session before submit — mobile users may have expired tokens after long form fills
    try {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session?.user?.id) authUserId = refreshData.session.user.id;
    } catch (e) {
        console.warn('Session refresh before submit failed:', e.message);
    }

    const row = { ...buildPlayerRow(pd), submitted: true, onboarding_progress: pd.onboardingProgress || null, updated_at: new Date().toISOString() };
    if (authUserId) row.auth_user_id = authUserId;

    let player;
    if (draftId) {
        // Update existing draft → submitted
        const { data, error: pErr } = await supabase.from('players').update(row).eq('id', draftId).select().single();
        if (pErr) {
            // RLS may silently block update if session expired (PGRST116 = 0 rows returned).
            // Fallback: insert a new row instead of updating the draft.
            console.warn('Draft update failed, falling back to insert:', pErr.message);
            const { data: insertData, error: insertErr } = await supabase.from('players').insert(row).select().single();
            if (insertErr) throw new Error(`Player save failed: ${insertErr.message}`);
            player = insertData;
            // Clean up old draft grades (best-effort, don't block submission)
            supabase.from('competition_grades').delete().eq('player_id', draftId).then(() => {});
        } else {
            player = data;
            await supabase.from('competition_grades').delete().eq('player_id', draftId);
        }
    } else {
        const { data, error: pErr } = await supabase.from('players').insert(row).select().single();
        if (pErr) throw new Error(`Player save failed: ${pErr.message}`);
        player = data;
    }

    const grades = buildGradeRows(pd, player.id);
    if (grades.length) {
        const { error: gErr } = await supabase.from('competition_grades').insert(grades);
        if (gErr) {
            console.error('Save grades error (player saved OK):', gErr);
            // Throw so the UI can inform the user their grades didn't save
            throw new Error(`Player saved but competition grades failed: ${gErr.message}`);
        }
    }
    return player;
}

// ═══ SERVER-SIDE SUBMIT (RPC) ═══
// Uses a single POST request via Supabase RPC — works reliably even on networks
// that block PATCH/PUT methods (school laptops, corporate firewalls, content filters).
// The RPC runs as SECURITY DEFINER so it bypasses RLS and handles everything server-side.

export async function submitPlayerViaRPC(pd, authUserId, draftId) {
    if (!authUserId || !draftId) throw new Error('Auth and draft ID required for RPC submit');

    // Refresh session before submit — ensures the RPC call has a valid JWT
    try {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session?.user?.id) authUserId = refreshData.session.user.id;
    } catch (e) {
        console.warn('Pre-RPC session refresh failed:', e.message);
    }

    // Build the player data payload (same shape as DB columns)
    const playerData = { ...buildPlayerRow(pd), onboarding_progress: pd.onboardingProgress || null };

    // Build grade rows (without player_id — the RPC handles that)
    const grades = (pd.grades || []).filter(g => g.level).map((g, i) => ({
        level: g.level, age_group: g.ageGroup, shield: g.shield || '', team: g.team || '',
        association: g.association || '', matches: +g.matches || 0, batting_innings: +g.batInn || 0,
        runs: +g.runs || 0, high_score: +g.hs || 0, batting_avg: +g.avg || 0,
        not_outs: +g.notOuts || 0, balls_faced: +g.ballsFaced || 0,
        bowling_innings: +g.bowlInn || 0, overs: +g.overs || 0, wickets: +g.wkts || 0,
        strike_rate: g.sr ? +g.sr : null, bowling_avg: g.bAvg ? +g.bAvg : null,
        economy: g.econ ? +g.econ : null,
        best_bowl_wkts: +g.bestBowlWkts || 0, best_bowl_runs: +g.bestBowlRuns || 0,
        catches: +g.ct || 0, run_outs: +g.ro || 0, stumpings: +g.st || 0,
        keeper_catches: +g.keeperCatches || 0, hs_balls_faced: +g.hsBallsFaced || 0,
        hs_boundaries: +g.hsBoundaries || 0, format: g.format || '', sort_order: i
    }));

    const { data: rpcResult, error: rpcErr } = await supabase.rpc('submit_player_profile_v2', {
        p_player_id: draftId,
        p_auth_user_id: authUserId,
        p_player_data: playerData,
        p_grades: grades,
    });

    if (rpcErr) throw new Error(`RPC submit failed: ${rpcErr.message}`);
    if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Server-side submit returned failure');

    return rpcResult;
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

    // Check for existing draft — use .limit(1) to handle duplicate drafts safely
    const { data: existingRows } = await supabase.from('players')
        .select('id').eq('auth_user_id', authUserId).eq('submitted', false).limit(1);
    const existing = existingRows?.[0] || null;

    let player;
    if (existing) {
        const { data, error } = await supabase.from('players').update(row).eq('id', existing.id).select().single();
        if (error) {
            // RLS may block update if session token degraded — try session refresh first
            console.warn('Draft update blocked, attempting session refresh:', error.message);
            try {
                await supabase.auth.refreshSession();
                // Retry the update after refresh
                const { data: retryData, error: retryErr } = await supabase.from('players').update(row).eq('id', existing.id).select().single();
                if (!retryErr) { player = retryData; }
                else {
                    // Refresh didn't help — fall back to insert (but mark old draft for cleanup)
                    console.warn('Draft update still blocked after refresh, falling back to insert:', retryErr.message);
                    const { data: insertData, error: insertErr } = await supabase.from('players').insert(row).select().single();
                    if (insertErr) throw new Error(`Draft save failed: ${insertErr.message}`);
                    player = insertData;
                }
            } catch (refreshErr) {
                // Session refresh itself failed — fall back to insert
                const { data: insertData, error: insertErr } = await supabase.from('players').insert(row).select().single();
                if (insertErr) throw new Error(`Draft save failed: ${insertErr.message}`);
                player = insertData;
            }
        } else {
            player = data;
            await supabase.from('competition_grades').delete().eq('player_id', player.id);
        }
    } else {
        const { data, error } = await supabase.from('players').insert(row).select().single();
        if (error) throw new Error(`Draft save failed: ${error.message}`);
        player = data;
    }

    const grades = buildGradeRows(pd, player.id);
    if (grades.length) {
        const { error: gErr } = await supabase.from('competition_grades').insert(grades);
        if (gErr) {
            console.error('Draft grade save error:', gErr);
            // For drafts, warn but don't throw — grades will be re-saved on final submit
            console.warn('Draft grades failed to save — they will be retried on final submission.');
        }
    }
    return player;
}

export async function loadDraftFromDB(authUserId) {
    if (!authUserId) return null;

    // Use .limit(1) + order by most recent to handle duplicate drafts safely
    // (.maybeSingle() errors on duplicates, which silently returns null and loses the draft)
    const { data: drafts, error } = await supabase.from('players')
        .select('*').eq('auth_user_id', authUserId).eq('submitted', false)
        .order('created_at', { ascending: false }).limit(1);
    // Distinguish "no draft exists" (normal) from "database error" (should be surfaced)
    if (error) {
        console.error('loadDraftFromDB: database error loading draft:', error.message);
        throw new Error('Could not load your saved progress. Please try refreshing the page.');
    }
    if (!drafts?.length) return null;
    const p = drafts[0];

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
    // Map top performances back into grades by matching comp (level code)
    const topBatArr = (p.top_batting_scores || []);
    const topBowlArr = (p.top_bowling_figures || []);
    const gradesWithPerf = (grades.length ? grades : [{}]).map(g => {
        const tb = topBatArr.find(b => b.comp === g.level);
        const tw = topBowlArr.find(b => b.comp === g.level);
        return {
            ...g,
            topBat: tb ? { runs: String(tb.runs || ''), balls: String(tb.balls || ''), fours: String(tb.fours || ''), sixes: String(tb.sixes || ''), notOut: !!tb.notOut, vs: tb.vs || '', format: tb.format || '' } : undefined,
            topBowl: tw ? { wkts: String(tw.wkts || ''), runs: String(tw.runs || ''), overs: String(tw.overs || ''), maidens: String(tw.maidens || ''), vs: tw.vs || '', format: tw.format || '' } : undefined,
        };
    });

    const progress = p.onboarding_progress || {};
    const extra = progress.draftExtra || {};

    const pd = {
        name: p.name || '', dob: p.dob || '', phone: p.phone || '', email: p.email || '',
        club: p.club || '', assoc: p.association || '', gender: p.gender || '',
        parentName: p.parent_name || '', parentEmail: p.parent_email || '',
        role: ROLES.find(r => r.id === p.role)?.label || '',
        bat: p.batting_hand || '', bowl: p.bowling_type || '',
        injury: p.injury || '', goals: p.goals || '',
        grades: gradesWithPerf,
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

// ── History snapshot throttle: 5 minutes between snapshots per player ──
const HISTORY_INTERVAL_MS = 5 * 60 * 1000;

export async function saveAssessmentToDB(playerId, cd) {
    // Fetch session at function scope so it's accessible for both history and upsert
    let session = null;
    try {
        const { data } = await supabase.auth.getSession();
        session = data?.session || null;
    } catch (e) {
        console.warn('Failed to get session for coach_id:', e.message);
    }

    // ── Snapshot existing assessment into history — throttled to avoid bloat ──
    const historyKey = `rra_last_history_${playerId}`;
    let lastHistory = 0;
    try { lastHistory = parseInt(localStorage.getItem(historyKey) || '0'); } catch { }
    const now = Date.now();

    if (now - lastHistory > HISTORY_INTERVAL_MS) {
        try {
            const { data: existing } = await supabase
                .from('coach_assessments')
                .select('*')
                .eq('player_id', playerId)
                .maybeSingle();
            if (existing) {
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
                try { localStorage.setItem(historyKey, String(now)); } catch { }
            }
        } catch (e) {
            // History save failure should never block the actual assessment save
            console.warn('Assessment history snapshot failed:', e.message);
        }
    }

    // ── Build JSONB domain columns ──
    const phaseKeys = ['pb_pp', 'pw_pp', 'pb_mid', 'pw_mid', 'pb_death', 'pw_death'];
    const phase_ratings = Object.fromEntries(phaseKeys.filter(k => cd[k] != null).map(k => [k, cd[k]]));
    const tech_primary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t1_')));
    const tech_secondary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t2_')));
    const game_iq = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('iq_')));
    const mental = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('mn_')));
    const physical = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('ph_')));
    const fielding = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('fld_')));
    const strengths = [cd.str1, cd.str2, cd.str3].filter(Boolean);
    const priorities = [cd.pri1, cd.pri2, cd.pri3].filter(Boolean);

    // ── Auto-calculate status (covers ALL rated domains including fielding) ──
    const allRatingKeys = [...Object.keys(tech_primary), ...Object.keys(tech_secondary), ...Object.keys(game_iq), ...Object.keys(mental), ...Object.keys(physical), ...Object.keys(fielding)];
    const ratedCount = allRatingKeys.filter(k => cd[k] > 0).length;
    const status = (ratedCount > 0 && cd.narrative && strengths.length > 0) ? 'complete' : 'draft';

    const row = {
        player_id: playerId, coach_id: session?.user?.id || null,
        batting_archetype: cd.batA || null, bowling_archetype: cd.bwlA || null,
        phase_ratings, tech_primary, tech_secondary, game_iq, mental, physical,
        fielding: Object.keys(fielding).length > 0 ? fielding : null,
        narrative: cd.narrative || null, strengths, priorities,
        plan_explore: cd.pl_explore || null, plan_challenge: cd.pl_challenge || null, plan_execute: cd.pl_execute || null,
        squad_rec: cd.sqRec || null,
        // Use ?? null (not || null) to preserve score of 0
        overall_batting: cd._overallBatting ?? null,
        overall_rating: cd._overallRating ?? null,
        batting_qualities: cd._battingQualities ?? null,
        session_date: new Date().toISOString().split('T')[0],
        status,
        player_voice: cd._playerVoice || null,
        updated_at: new Date().toISOString()
    };
    const { data: upsertData, error: upsertErr } = await supabase
        .from('coach_assessments')
        .upsert(row, { onConflict: 'player_id' })
        .select();
    if (upsertErr) {
        console.error('Assessment upsert failed:', upsertErr.message, upsertErr.details);
        throw upsertErr;
    }
    if (!upsertData || upsertData.length === 0) {
        console.error('Assessment upsert returned 0 rows — RLS likely blocked the write. uid:', session?.user?.id);
        throw new Error('Save was blocked by database permissions. Please sign out and sign back in.');
    }
}

// ═══ PLAYER-FACING ASSESSMENT LOADER (DNA VIEW) ═══
// Returns only player-safe fields — NO raw scores, PDI, SAGI, CCM, or domain percentages

export async function loadPlayerDNAData(authUserId) {
    if (!authUserId) return null;

    // 1. Get the player record
    const { data: player, error: pErr } = await supabase
        .from('players')
        .select('id, name, dob, role, club, association, gender, player_bat_archetype, player_bwl_archetype, bat_arch_secondary, bwl_arch_secondary, bat_arch_answers, bwl_arch_answers, batting_hand, bowling_type, batting_position, batting_phases, bowling_phases, goto_shots, pressure_shot, bowling_variations, bowling_speed, spin_comfort, short_ball_comfort, height_cm')
        .eq('auth_user_id', authUserId)
        .eq('submitted', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (pErr || !player) return null;

    // 2. Get coach assessment (player-safe fields only)
    const { data: assessment } = await supabase
        .from('coach_assessments')
        .select('batting_archetype, bowling_archetype, narrative, strengths, priorities, plan_explore, plan_challenge, plan_execute, squad_rec, updated_at')
        .eq('player_id', player.id)
        .maybeSingle();

    return {
        player: {
            id: player.id,
            name: player.name,
            dob: player.dob,
            role: player.role,
            club: player.club,
            association: player.association,
            gender: player.gender,
            heightCm: player.height_cm,
            playerBatArch: player.player_bat_archetype,
            playerBwlArch: player.player_bwl_archetype,
            playerBatArchSecondary: player.bat_arch_secondary,
            playerBwlArchSecondary: player.bwl_arch_secondary,
            batArchAnswers: player.bat_arch_answers,
            bwlArchAnswers: player.bwl_arch_answers,
            bat: player.batting_hand,
            bowl: player.bowling_type,
            batPosition: player.batting_position,
            batPhases: player.batting_phases,
            bwlPhases: player.bowling_phases,
            gotoShots: player.goto_shots,
            pressureShot: player.pressure_shot,
            bwlVariations: player.bowling_variations,
            bwlSpeed: player.bowling_speed,
            spinComfort: player.spin_comfort,
            shortBallComfort: player.short_ball_comfort,
        },
        assessment: assessment ? {
            coachBatArch: assessment.batting_archetype,
            coachBwlArch: assessment.bowling_archetype,
            narrative: assessment.narrative,
            strengths: assessment.strengths || [],
            priorities: assessment.priorities || [],
            planExplore: assessment.plan_explore,
            planChallenge: assessment.plan_challenge,
            planExecute: assessment.plan_execute,
            squadRec: assessment.squad_rec,
            updatedAt: assessment.updated_at,
        } : null,
    };
}

// ═══ COACH ASSESSMENT SCORES ═══

export async function loadPlayerScores() {
    const { data, error } = await supabase
        .from('coach_assessments')
        .select('player_id, batting_archetype, bowling_archetype, overall_rating, overall_batting, status, updated_at');
    if (error) { console.error('loadPlayerScores error:', error); return []; }
    return data || [];
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

// ═══ REOPEN PLAYER PROFILE ═══
// Allows a coach/admin to reopen a submitted player profile so the player
// can re-enter onboarding and edit their data. Sets submitted=false on both
// the players row and the user_profiles row (which controls portal routing).
// Also cleans up any orphan draft rows that may have been created.
export async function reopenPlayerProfile(playerId) {
    // 1. Get the player's auth_user_id so we can update user_profiles
    const { data: player, error: pErr } = await supabase
        .from('players')
        .select('auth_user_id')
        .eq('id', playerId)
        .single();
    if (pErr || !player?.auth_user_id) {
        console.error('Reopen profile: could not find player', pErr);
        return { success: false, error: pErr?.message || 'Player not found' };
    }

    // 2. Delete any orphan draft rows (submitted=false) for this user
    const { error: delErr } = await supabase
        .from('players')
        .delete()
        .eq('auth_user_id', player.auth_user_id)
        .eq('submitted', false);
    if (delErr) console.warn('Reopen profile: failed to clean drafts', delErr.message);

    // 3. Set the submitted player row back to draft
    const { error: upErr } = await supabase
        .from('players')
        .update({ submitted: false })
        .eq('id', playerId);
    if (upErr) {
        console.error('Reopen profile: failed to update player', upErr);
        return { success: false, error: upErr.message };
    }

    // 4. Update user_profiles routing so player lands in onboarding
    const { error: profErr } = await supabase
        .from('user_profiles')
        .update({ submitted: false })
        .eq('id', player.auth_user_id);
    if (profErr) {
        console.error('Reopen profile: failed to update user_profiles', profErr);
        return { success: false, error: profErr.message };
    }

    return { success: true };
}
