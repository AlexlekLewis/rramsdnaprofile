// ═══ FITNESS INSTRUCTIONAL VIDEO — SEGMENT MAP ═══
//
// One MP4 file holds the whole 2026 Royals Home Fitness program. Each Demo
// button on the player Fitness pages opens the same file but jumps to the
// exact seconds for that exercise, then auto-pauses when the section ends.
//
// Boundaries derived from the timestamp table the coach supplied. Each
// segment's end is the next segment's start, so demos never bleed into the
// next exercise.
//
// To swap videos in a future program: replace FITNESS_VIDEO_URL and update
// any timestamps that shifted. Adding new exercises = add a new entry to
// EXERCISE_DEMOS keyed by the database exercise id.

// Empty string until the MP4 is uploaded to Supabase Storage.
// Buttons render either way; the modal shows a friendly "video being
// prepared" message when the URL is empty.
export const FITNESS_VIDEO_URL = '';

// Approximate file length in seconds — used as the end of the final FAQ
// segment when nothing comes after it. Refine once the real file is in.
export const FITNESS_VIDEO_TOTAL_SECONDS = 930;

// Per-exercise demo windows, keyed by the exercise.id stored in the
// fitness_programs.activation_block / fitness_program_blocks.exercises
// jsonb arrays.
//
//   start    seconds into the file where the demo begins
//   end      seconds into the file where the demo ends (next section)
//   demoNote (optional) short note shown on compound cards where the
//            demo only covers one of the two paired movements
export const EXERCISE_DEMOS = {
    // Activation / warm-up — demo-only windows. The shared overview
    // (0:17–0:29 where the coach names all three) is reachable via the
    // "Watch full instructional video" button.
    hip_bridges: { start: 29.5, end: 45.6 },
    arm_circles: { start: 45.6, end: 55.3 },
    star_jumps:  { start: 55.3, end: 70.2 },

    // Day 1 — Full Body 1
    jumping_squats:         { start: 70.2,  end: 103.1 },
    bulgarian_split_squat:  { start: 103.1, end: 143.5 },
    depth_drop_pushup:      { start: 143.5, end: 192.9 },
    push_ups:               { start: 192.9, end: 235.4 },
    mountain_climbers_palof:{ start: 235.4, end: 279.6,
        demoNote: 'Demo covers Mountain Climbers — Banded Palof Rotations to follow.' },
    russian_rotations:      { start: 279.6, end: 315.7 },

    // Day 2 — Full Body 2
    alternating_jumping_lunges: { start: 315.7, end: 348.6 },
    kneel_to_step_up:           { start: 348.6, end: 382.5 },
    renegade_row_shoulder_taps: { start: 382.5, end: 411.1,
        demoNote: 'Demo covers Renegade Row — Shoulder Taps to follow.' },
    body_row_superman:          { start: 411.1, end: 442.8,
        demoNote: 'Demo covers Superman Hold — Body Row to follow.' },
    neg_leg_raises_palof_press: { start: 442.8, end: 487.5,
        demoNote: 'Demo covers Negative Assisted Leg Raises — Banded Palof Press to follow.' },
    oblique_plank_crunch:       { start: 487.5, end: 533.1 },

    // Day 3 — Conditioning + full-body stretch
    aerobic_run_20min:        { start: 533.1, end: 571.4 },
    acceleration_10m_sprints: { start: 571.4, end: 595.5 },
    anaerobic_20m_sprints:    { start: 595.5, end: 632.7 },
    full_body_stretch:        { start: 632.7, end: 851.3 }, // includes overview + 8 stretches + close
};

// Stand-alone segments not tied to a specific exercise card.
export const FULL_VIDEO_SEGMENT = {
    label: 'Watch full instructional video',
    start: 0,
    end: null, // play to end of file
};

export const FAQ_SEGMENTS = [
    {
        id: 'faq_order',
        label: 'Should I follow the program order?',
        start: 851.3,
        end: 880.9,
    },
    {
        id: 'faq_multi_day',
        label: 'Can I do multiple days at once or add weight?',
        start: 880.9,
        end: FITNESS_VIDEO_TOTAL_SECONDS,
    },
];

export function hasFitnessVideo() {
    return typeof FITNESS_VIDEO_URL === 'string' && FITNESS_VIDEO_URL.length > 0;
}

export function getDemoForExercise(exerciseId) {
    if (!exerciseId) return null;
    return EXERCISE_DEMOS[exerciseId] || null;
}
