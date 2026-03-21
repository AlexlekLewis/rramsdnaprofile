# RRAM DNA Profile — Expert Panel Review

**Date:** 2026-03-21
**Panel:** 10 domain experts across cricket coaching, talent ID, sport science, UX, and engineering
**Scope:** Full codebase review of the 8-pillar DNA assessment system

---

## TOP 10 SYSTEMIC PRIORITIES (Cross-Expert Synthesis)

| # | Issue | Experts | Priority | Category |
|---|-------|---------|----------|----------|
| 1 | No biological maturation input — system rewards early physical maturers | Talent ID, International | HIGH | Engine |
| 2 | SAGI penalty not age-modulated — developmentally inappropriate for U11-U13 | Sport Psych, Talent ID | HIGH | Engine |
| 3 | No objective measurement layer — entirely subjective ratings | International, HP Coach | HIGH | Engine |
| 4 | No "Bowling All-Rounder" role — bowling-first allrounders misclassified | Community Coach | HIGH | Data Model |
| 5 | Community players with no stats get zero Match Impact — silent penalty | Community Coach | HIGH | Engine |
| 6 | Onboarding competition history step too complex for U11-U13 | UX Designer | CRITICAL | UX |
| 7 | No accessibility (ARIA, contrast, screen reader) | UX Designer | HIGH | UX |
| 8 | No "Anchor" batting archetype for occupation-focused batters | Batting Coach | MEDIUM | Data Model |
| 9 | Archetype-to-pillar weighting creates circular reinforcement | International, Batting Coach | MEDIUM | Engine |
| 10 | Client-side PDI computation for 22+ players on render — perf risk at scale (FIXED) | App Engineer | MEDIUM | Performance |
| 11 | Phase effectiveness not weighted by bowling archetype | Bowling Coach | HIGH | Engine |
| 12 | Format-specific stat benchmarks needed (T20 vs 50-over) | HP Coach | HIGH | Engine |
| 13 | Pathway-tiered domain weights by CTI band, not just age | HP Coach | HIGH | Engine |
| 14 | Fielding position/role not captured | Fielding Coach | HIGH | Data Model |
| 15 | Bowling variations not captured in engine/coach assessment | Bowling Coach | HIGH | Engine |
| 16 | Power Hitting pillar penalises non-power batting styles | Batting Coach | MEDIUM | Engine |
| 17 | Running Between Wickets misplaced in fielding items | Fielding Coach | MEDIUM | Data Model |
| 18 | Edge function calls missing auth headers (FIXED) | App Engineer | HIGH | Security |
| 19 | Dev bypass not gated by build environment (FIXED) | App Engineer | CRITICAL | Security |

---

## EXPERT 1: Senior Community Coach (25yr experience)

**Strengths:** Junior-specific language excellent (JUNIOR_RATING_LABELS), simplified junior item sets reduce assessment fatigue, confidence/frequency dual-scale clever proxy for self-awareness.

**Gaps:** No "Bowling All-Rounder" role distinction. System assumes season statistics are available (community U11-U13 often don't track individual stats). No fielding-only assessment for players who mainly field.

**Risks:** Rating scale anchor drift across coaches (coach weight is 0.75). First-year players with no competition history get CCM of zero, bypassing competition context entirely.

**Recommendations:**
- HIGH: Add "Bowling All-Rounder" role to ROLES array
- HIGH: Introduce "no-stats" pathway for Match Impact (use Phase Effectiveness when no individual stats)
- MEDIUM: Add coach calibration guidance with observable behaviours per rating level

---

## EXPERT 2: Specialist Batting Coach

**Strengths:** BAT_ITEMS covers essential T20 craft comprehensively. Archetype questionnaire uses scenario-based prompts with hidden weights. Five batting archetypes map to recognisable T20 profiles.

**Gaps:** No "Anchor" archetype for occupation-focused batters. No assessment of batting against specific ball types (yorkers, slower balls). Phase batting ratings double-assess with batting items.

**Recommendations:**
- MEDIUM: Add "Anchor/Accumulator" as 6th batting archetype
- MEDIUM: Add ball-type-specific matchup items (vs yorker, vs slower ball)
- LOW: Merge Phase Effectiveness with domain ratings to eliminate redundancy

---

## EXPERT 3: Specialist Bowling Coach

**Strengths:** Distinct pace vs spin skill sets with role-specific items. Bowling variations well-captured via array. Phase effectiveness appropriately separate for batting/bowling.

**Gaps:** No bowling workload tracking (spell lengths, over counts). No new-ball vs old-ball assessment. Death bowling assessment identical for pace and spin.

**Recommendations:**
- MEDIUM: Add workload capacity rating (consecutive overs, multiple spells)
- MEDIUM: Differentiate death bowling items for pace (yorker execution) vs spin (pace variation)

---

## EXPERT 4: Specialist Fielding Coach

**Strengths:** FLD_ITEMS cover ground fielding, catching, throwing. Keeper gets specialised Athletic Fielding weight (af: 0.16).

**Gaps:** Only 5 fielding items vs 10+ for batting. No fielding position preference capture. No outfield vs inner-ring distinction.

**Recommendations:**
- MEDIUM: Expand FLD_ITEMS to 8 items (add Outfield Catches, Inner-Ring Anticipation, Relay Throwing)
- LOW: Add fielding position preference (similar to batting position)

---

## EXPERT 5: High Performance Coach

**Strengths:** Trajectory flag identifies young-for-grade performers. CCM formula contextualises ratings against competition. 12-week plan framework (Explore/Challenge/Execute) aligns with periodisation principles.

**Gaps:** Growth delta calculated but disconnected from identification. No periodisation or training load integration. SAGI is interesting but needs validation studies.

**Recommendations:**
- HIGH: Integrate calcGrowthDelta into trajectory identification (rate of improvement as talent signal)
- MEDIUM: Add "Development Velocity" metric alongside PDI grade

---

## EXPERT 6: Talent Identification Specialist

**Strengths:** ARM mechanism contextualises age-relative performance. Trajectory flag identifies potential, not just current performance. Age-tier domain weights shift emphasis developmentally.

**Gaps:** No biological maturation indicator (PHV, maturity offset). No gender-specific pathways or maturation timelines. Late developers structurally disadvantaged in CCM formula.

**Risks:** Systematic early-maturer bias in talent identification outputs.

**Recommendations:**
- HIGH: Add maturity status input (early/on-time/late) — create Maturity-Adjusted ARM
- HIGH: Integrate calcGrowthDelta into trajectory identification
- MEDIUM: Introduce gender-aware age brackets and ARM calibration

---

## EXPERT 7: Sport Psychologist

**Strengths:** Dual-layer SAGI (internal confidence-frequency + cross-layer coach-player) is psychologically sophisticated. Match-up confidence approach avoids crude self-rating. Journal mood system appropriately simple.

**Gaps:** SAGI penalty function (penalty_factor = 2.0) not age-calibrated — penalises U11-U13 metacognitive immaturity. MN_ITEMS capture behaviours, not psychological constructs (single items per construct). No safeguards against negative self-perception from archetype percentages.

**Risks:** Young players may anchor identity to early archetype assignments (identity foreclosure). SAGI label "Over-estimates" is psychologically damaging language.

**Recommendations:**
- HIGH: Age-modulate SAGI penalty factor (1.0 for U11-U13, 1.5 for U14-U16, 2.0 for U17+)
- HIGH: Add developmental framing to archetype display ("Your T20 identity at this stage — this will change as you develop")
- MEDIUM: Reframe SAGI labels ("Confidence ahead of execution" instead of "Over-estimates")

---

## EXPERT 8: International Talent ID Expert

**Strengths:** 8-pillar system with Self-Awareness as scored domain is genuinely novel vs ECB/CA/IPL frameworks. Archetype questionnaire with hidden weights is strong T20 player typing. CCM formula contextualises subjective ratings against competition level.

**Gaps:** No video or movement quality assessment integration. No match performance data beyond basic aggregates. No "trainability" or learning rate dimension.

**Risks:** Over-reliance on archetype system could narrow player development. Statistical benchmarks calibrated for Australian conditions only.

**Recommendations:**
- HIGH: Build objective data layer for Physical and Power pillars (GPS, bat speed, fitness tests)
- MEDIUM: Introduce "Development Velocity" metric from calcGrowthDelta
- MEDIUM: Decouple archetype from pillar weighting (archetypes should describe, not prescribe)

---

## EXPERT 9: UX/Product Designer

**Strengths:** Draft-save onboarding system with resume-from-last-step. Archetype reveal moment well-designed. Player portal home screen has good information hierarchy. Journal/IDP features are empowering.

**Gaps:** No mobile touch optimisation beyond 768px breakpoint (isDesktop() not resize-aware). Onboarding competition history step too complex for U11-U13. Empty states lack encouragement. Zero accessibility implementation (no ARIA, poor colour contrast).

**Risks:** Onboarding drop-off at competition history step. Coach assessment fatigue (100+ pages for 22 players). Information overload on mobile roster view.

**Recommendations:**
- CRITICAL: Add "optional" labels and simplify competition history for U11-U13
- HIGH: Implement responsive touch targets (44px minimum)
- HIGH: Add ARIA roles, labels, and improve colour contrast
- MEDIUM: Add coach assessment time estimate and batch progress

---

## EXPERT 10: Senior App Engineer

**Strengths:** Clean separation of concerns (db layer, engine, components). Error boundaries and Suspense fallbacks properly placed. Rating engine is well-tested (160 tests). Supabase RLS with upsert verification pattern (check data.length > 0). Lazy loading of heavy dependencies.

**Gaps:** All styling is inline objects — no CSS framework, making theming/responsiveness harder. Client-side PDI computation in roster render loop (O(n) per render). No caching layer for engine constants or competition tiers. CoachAssessment.jsx at 725 lines should be split.

**Risks:** Performance degradation at 50+ players (PDI recalculation on every re-render). No rate limiting on Supabase calls. Inline styles create 100KB+ of style objects in the bundle.

**Recommendations:**
- MEDIUM: Memoize PDI calculations with useMemo keyed on player data hash
- MEDIUM: Split CoachAssessment into sub-components (RosterView, AssessmentView, SummaryView)
- LOW: Consider CSS Modules or Tailwind for styling (reduces bundle, enables responsive utilities)
- LOW: Add Supabase query deduplication (SWR-style caching)

---

## IMPLEMENTATION ROADMAP

### Immediate (Pre-Launch)
1. Simplify competition history for U11-U13 (CRITICAL UX finding)
2. Age-modulate SAGI penalty factor (engine constant change)
3. Add developmental framing to archetype display in PlayerDNA

### Near-Term (Post-Launch Sprint 1)
4. Add "Bowling All-Rounder" role
5. No-stats pathway for Match Impact pillar
6. Memoize PDI calculations in roster view
7. Accessibility basics (ARIA labels, colour contrast)

### Medium-Term (Sprint 2-3)
8. Maturity status input + Maturity-Adjusted ARM
9. Development Velocity metric from calcGrowthDelta
10. Objective data layer for Physical/Power pillars
11. Decouple archetype from pillar weighting
12. Expand FLD_ITEMS to 8 items

### Future
13. Video/movement quality assessment integration
14. Phase-specific match data (SR by phase)
15. Coach calibration/moderation system
16. Anchor batting archetype
