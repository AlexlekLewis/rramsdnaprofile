// ═══ SKILL DEFINITIONS — PLAYER (plain English) & COACH (standardised rubric) ═══
// Each key matches the label string used in AssRow.
// Values are objects: { 1: "...", 2: "...", 3: "...", 4: "...", 5: "..." }

// ─── BATTING TECHNICAL ───
const P_BAT = {
    "Stance & Setup": {
        1: "I'm still figuring out how to stand at the crease",
        2: "I have a stance but it doesn't feel natural yet",
        3: "My stance feels comfortable and I'm balanced most of the time",
        4: "My setup is solid — I feel ready to play any ball",
        5: "My stance and setup let me move freely to any delivery"
    },
    "Trigger Movement & Balance": {
        1: "I don't really have a trigger move before the ball",
        2: "I have a small movement but I sometimes lose balance",
        3: "My trigger helps me get into position most of the time",
        4: "My movement is smooth and I stay balanced even on quick bowlers",
        5: "My trigger is automatic — I'm always in the right position early"
    },
    "Front-Foot Drive": {
        1: "I'm still learning how to step forward and drive",
        2: "I can play a front-foot drive sometimes but mis-time it a lot",
        3: "I play a decent drive most of the time on full balls",
        4: "I drive confidently both sides and can place or loft it",
        5: "My driving is a real weapon — I time it off good bowling"
    },
    "Back-Foot Play": {
        1: "I struggle to get back and across to short balls",
        2: "I can play back sometimes but I'm not confident",
        3: "I pull and cut reasonably well on most short balls",
        4: "I'm strong off the back foot — I pull, cut and punch well",
        5: "Back-foot play is one of my biggest strengths"
    },
    "Power Hitting": {
        1: "I can't really hit big shots yet",
        2: "I try to hit big but I mis-hit more than I connect",
        3: "I can clear the infield when the ball is in my area",
        4: "I hit boundaries regularly and can clear the rope",
        5: "I'm a genuine power hitter — I hit sixes at will"
    },
    "Sweep & Reverse Sweep": {
        1: "I haven't really tried sweeping yet",
        2: "I try to sweep but it feels risky",
        3: "I can sweep to spin and it usually works",
        4: "Sweeping is a strong part of my game, including reverse",
        5: "I sweep and reverse sweep with full control against any bowler"
    },
    "Playing Spin": {
        1: "I find it hard to read spin bowlers",
        2: "I can pick some spin but I get beaten often",
        3: "I handle most spin reasonably well",
        4: "I read spin early and use my feet to attack",
        5: "I dominate spin — I pick it out of the hand and score freely"
    },
    "Playing Pace": {
        1: "Fast bowling makes me uncomfortable",
        2: "I can handle medium pace but struggle with real speed",
        3: "I deal with pace ok and can score off it",
        4: "I'm comfortable against pace and can use the speed",
        5: "I love facing pace — I use the speed of the ball to score"
    },
    "Strike Rotation": {
        1: "I don't really look for singles — I wait for big shots",
        2: "I try to rotate but I miss a lot of easy runs",
        3: "I rotate strike well and keep the scoreboard moving",
        4: "I'm very good at finding singles and twos in gaps",
        5: "I manipulate the field expertly — I score off almost every ball"
    },
    "Death-Over Hitting": {
        1: "I'm not really used to batting at the death",
        2: "I try to hit at the death but I play too many dots",
        3: "I can score at the death if the ball is in my area",
        4: "I'm effective at the death — I find boundaries under pressure",
        5: "I'm a death-overs specialist — I score at 10+ per over"
    }
};

const C_BAT = {
    "Stance & Setup": {
        1: "Unbalanced setup. Weight distribution poor. Grip issues. Not game-ready at ball release.",
        2: "Basic stance but stiff or closed. Limited ability to adjust. Head position inconsistent.",
        3: "Balanced, repeatable setup. Head still at release. Can adjust for line and length.",
        4: "Dynamic setup allowing movement to front or back. Relaxed hands, stable head. Game-aware.",
        5: "Elite setup. Allows full range of scoring options. Adapts for bowler type and match situation."
    },
    "Trigger Movement & Balance": {
        1: "No trigger or counter-productive movement. Falls over, lunges. Can't adjust mid-delivery.",
        2: "Has a trigger but timing inconsistent. Weight falls to off-side. Compromises shot options.",
        3: "Trigger gets into position >50% of deliveries. Stays balanced through contact most times.",
        4: "Smooth, repeatable trigger. Head over front knee. Maintains balance under 130+ km/h.",
        5: "Instinctive trigger allowing early decision-making. Balance maintained through all shot types. Elite head position."
    },
    "Front-Foot Drive": {
        1: "Bat face open/closed. No weight transfer. Plays at balls outside off without control.",
        2: "Shows intent but head falls away. Front foot doesn't get to pitch. Plays and misses regularly.",
        3: "Gets to pitch >50%. Drives through V with reasonable timing. Can be beaten by movement.",
        4: "Head and front foot work together. Drives gaps both sides. Can loft. Controls pace well.",
        5: "Full face, stable head, fluent weight transfer. Drives on the up. Finds gaps consistently off good length."
    },
    "Back-Foot Play": {
        1: "Can't transfer weight back. Plays from the crease. No pull or cut in arsenal.",
        2: "Moves back but head falls. Mistimes pull/cut. Vulnerable to short ball.",
        3: "Gets back and across. Plays pull and cut. Occasionally top-edges or mistimes.",
        4: "Strong back-foot game. Pulls, cuts, punches with control. Handles 130+ short balls.",
        5: "Dominant off back foot. Multiple scoring options to short ball. Controls hook and upper cut."
    },
    "Power Hitting": {
        1: "No bat speed or timing for boundary hitting. All-arms swing.",
        2: "Generates bat speed but mis-hits frequently. Poor connection percentage.",
        3: "Clears infield when ball is in slot. 40-50% connection rate on power shots.",
        4: "Strong bat speed, good connection. Hits boundaries to multiple areas. >60% connection.",
        5: "Elite bat speed and timing. Clears boundaries to all areas. 70%+ connection. Hits against pace and spin."
    },
    "Sweep & Reverse Sweep": {
        1: "Does not attempt sweep. No exposure to the shot.",
        2: "Attempts sweep but poor control. Top-edges, misses. No reverse sweep.",
        3: "Conventional sweep executed safely. Developing reverse. Can be predictable.",
        4: "Sweeps with control. Reverse sweep reliable. Uses as offensive weapon against spin.",
        5: "Full sweep repertoire. Switch-sweeps. Uses against pace and spin. Manipulates field with sweep variations."
    },
    "Playing Spin": {
        1: "Cannot pick variations. Stays in crease. Beaten regularly.",
        2: "Picks stock ball but struggles with variations. Doesn't use feet. Reactive.",
        3: "Reads most deliveries. Uses feet occasionally. Scores off bad balls.",
        4: "Reads out of hand. Uses feet proactively. Attacks and defends with intent.",
        5: "Picks all variations early. Dances down. Sweeps and hits over top. Dominates quality spin."
    },
    "Playing Pace": {
        1: "Flinches at pace. Can't time above 115 km/h. No scoring options against speed.",
        2: "Handles medium pace but shows technical flaws against 120+. Late on pull.",
        3: "Copes with 125+ km/h. Times drives and pulls. Occasionally beaten for pace.",
        4: "Comfortable at 130+. Uses pace to score. Pulls, drives, and works off hip.",
        5: "Thrives against pace. Uses speed. Times 135+ consistently. Multiple scoring zones."
    },
    "Strike Rotation": {
        1: "Ball-watching. No intent to rotate. High dot-ball percentage.",
        2: "Looks for singles but misses gaps. Poor calling. 50%+ dot balls.",
        3: "Rotates to obvious gaps. Calls well. <40% dot balls in middle overs.",
        4: "Manipulates field. Nudges, deflects, works into gaps. Strong running between wickets.",
        5: "Elite manipulation. Scores off almost every ball. <20% dots. Creates pressure through running."
    },
    "Death-Over Hitting": {
        1: "Cannot score at required rate in overs 17-20. Plays dots or gets out.",
        2: "Tries to hit but poor shot selection. Struggles with yorkers and slower balls.",
        3: "Finds boundary when ball is in slot. Handles some variations. SR 120-140 at death.",
        4: "Effective death-overs batter. Ramps, scoops, hits over top. SR 140-160.",
        5: "Specialist finisher. Scores 10+ RPO at death. Hits yorkers, slower balls, and good length for boundary."
    }
};

// ─── PACE BOWLING TECHNICAL ───
const P_PACE = {
    "Run-Up Rhythm": {
        1: "My run-up feels awkward and I'm not sure how many steps to take",
        2: "I have a run-up but I sometimes stutter or change pace",
        3: "My run-up is pretty smooth most of the time",
        4: "My run-up is consistent and I feel in rhythm every ball",
        5: "My run-up is automatic — I build speed and hit the crease perfectly"
    },
    "Action Alignment": {
        1: "My bowling action feels uncomfortable and I fall away a lot",
        2: "My action is ok but my body sometimes goes the wrong way",
        3: "My action is fairly repeatable and I stay upright",
        4: "My action is well aligned — hips, shoulders, and release all line up",
        5: "My action is textbook — fully aligned, explosive, and repeatable"
    },
    "Front-Leg Brace": {
        1: "My front leg collapses when I bowl",
        2: "I brace sometimes but it's not consistent",
        3: "My front leg braces most deliveries and I feel stable",
        4: "Strong brace that helps me generate pace and bounce",
        5: "My front-leg brace is a weapon — it gives me extra pace and height"
    },
    "Wrist & Seam": {
        1: "I'm not sure how to hold the seam properly yet",
        2: "I can hold seam but it wobbles on release",
        3: "I present a good seam most of the time",
        4: "My seam position is controlled and I get movement",
        5: "I have full wrist and seam control — I move it both ways at will"
    },
    "Stock Ball Control": {
        1: "I'm still working on landing the ball in one spot",
        2: "I can hit a good length but spray it too often",
        3: "I land my stock ball on a good length most of the time",
        4: "My stock ball is reliable — I hit my target consistently",
        5: "My stock ball builds pressure ball after ball"
    },
    "Yorker Execution": {
        1: "I can't really bowl yorkers yet",
        2: "I try yorkers but they come out as full tosses too often",
        3: "I can land a yorker when I focus — maybe 1 in 3",
        4: "My yorker is a real weapon — I land it most of the time",
        5: "I nail yorkers on demand — at the death, under pressure"
    },
    "Slower Ball Variation": {
        1: "I don't have a slower ball",
        2: "I have a slower ball but it's obvious and easy to pick",
        3: "My slower ball works sometimes and surprises batters",
        4: "I have 2-3 slower ball options and disguise them well",
        5: "My slower balls are elite — fully disguised and I use them tactically"
    },
    "Bouncer Effectiveness": {
        1: "I can't get the ball above waist height consistently",
        2: "I bowl short but it sits up and gets hit",
        3: "My bouncer hurries batters sometimes",
        4: "My bouncer is effective — it gets batters uncomfortable",
        5: "My bouncer is a genuine weapon — pace, height, and hostility"
    },
    "Wide-Line Strategy": {
        1: "I don't really think about bowling wide of off stump",
        2: "I try to bowl wide but I'm inconsistent with the line",
        3: "I can use the wide line as a tactic sometimes",
        4: "I bowl effective wide lines and set up batters with it",
        5: "I use width strategically — I create angles and force errors"
    },
    "Bowling to Plans": {
        1: "I just bowl and hope — I don't really have a plan",
        2: "I have a basic plan but I forget it under pressure",
        3: "I can stick to a plan for most of a spell",
        4: "I bowl to clear plans and adjust when I need to",
        5: "I always have a plan and I read the batter to adjust in real time"
    }
};

const C_PACE = {
    "Run-Up Rhythm": {
        1: "Inconsistent approach. Stutters, decelerates. No repeatable run-up.",
        2: "Has established run-up but rhythm breaks down under pressure or fatigue.",
        3: "Smooth approach >70% of deliveries. Consistent speed into crease.",
        4: "Fluid, accelerating approach. Hits crease in identical position. Maintains through spell.",
        5: "Elite run-up. Builds momentum perfectly. No variation even under fatigue or pressure."
    },
    "Action Alignment": {
        1: "Mixed action. Counter-rotation. Injury risk. Poor energy transfer.",
        2: "Basic action but alignment issues (falling away, chest-on/side-on mismatch).",
        3: "Repeatable action. Adequate alignment. Minor inefficiencies.",
        4: "Well-aligned hips, shoulders, release. Efficient energy transfer. Low injury risk.",
        5: "Textbook alignment. Maximum energy transfer. Fully repeatable under all conditions."
    },
    "Front-Leg Brace": {
        1: "Collapses on landing. No brace. Loses pace and bounce.",
        2: "Partial brace but inconsistent. Knee flexes past optimal. Leaks energy.",
        3: "Braces >60% of deliveries. Generates adequate bounce for surface.",
        4: "Strong, consistent brace. Generates extra bounce and pace. Maintained through spell.",
        5: "Elite brace. Near-locked front leg. Generates significant extra pace and bounce consistently."
    },
    "Wrist & Seam": {
        1: "Wobble seam. No control over presentation. Can't produce movement.",
        2: "Presents seam sometimes but inconsistent wrist position at release.",
        3: "Upright seam >50%. Some conventional swing or seam movement.",
        4: "Consistent seam presentation. Controls swing both ways. Deliberate wrist positions.",
        5: "Full seam and wrist control. Swings both ways on demand. Scrambled seam as variation."
    },
    "Stock Ball Control": {
        1: "Misses target >1m frequently. No consistent length or line.",
        2: "Hits target ~40%. Length varies. Inconsistent release point.",
        3: "Hits target ~60%. Consistent corridor. Holds length across a spell.",
        4: "Hits target >75%. Varies line on demand. Sustained across 4+ overs.",
        5: ">85% accuracy. Relentless consistency. Creates doubt. Holds at death."
    },
    "Yorker Execution": {
        1: "Cannot execute yorker. Delivers full toss or half-volley.",
        2: "Attempts yorker but <25% accuracy. Full tosses common.",
        3: "Lands yorker ~40%. Can be used as variation but not reliably at death.",
        4: "Yorker on demand >60%. Uses at death and in powerplay. Both sides of stumps.",
        5: "Elite yorker >75%. Wide, off-stump, block-hole. Accurate under death-overs pressure."
    },
    "Slower Ball Variation": {
        1: "No slower ball in repertoire.",
        2: "One slower ball option. Telegraphed — grip or action change visible.",
        3: "1-2 options. Some disguise. Effective as surprise ball.",
        4: "2-3 variations well disguised. Uses off pace. Tactical deployment.",
        5: "Multiple slower balls (knuckle, cutter, back-of-hand). Fully disguised. Elite change of pace."
    },
    "Bouncer Effectiveness": {
        1: "Cannot generate bounce for surface. Short ball sits up.",
        2: "Gets bounce but no pace behind it. Predictable.",
        3: "Effective bouncer that hurries batters. Can use as plan.",
        4: "Hostile short ball. Generates pace and steep bounce. Sets up batters.",
        5: "Elite bouncer. Pace, accuracy, and aggression. Creates genuine danger."
    },
    "Wide-Line Strategy": {
        1: "No understanding of bowling wide lines. Sprays or bowls middle stump.",
        2: "Attempts outside off but drifts to leg or too wide.",
        3: "Can hold 4th-5th stump line. Uses as containing tactic.",
        4: "Bowls effective wide channels. Sets up nick line. Creates angles.",
        5: "Manipulates crease position and angle. Wide line as attacking weapon. Creates wicket chances."
    },
    "Bowling to Plans": {
        1: "No plan. Bowls random lengths and lines. No adjustment.",
        2: "Has a basic plan but abandons under pressure or when hit.",
        3: "Executes basic plans (e.g. top of off). Adjusts with coach input.",
        4: "Self-manages plans. Reads batter. Adjusts field and line mid-over.",
        5: "Elite game management. Sets traps. Multi-over plans. Adjusts in real time."
    }
};

// ─── SPIN BOWLING TECHNICAL ───
const P_SPIN = {
    "Stock Ball Accuracy": {
        1: "I'm still learning to land the ball where I want",
        2: "I can hit my area sometimes but I bowl too many bad balls",
        3: "I land my stock ball in a good area most deliveries",
        4: "My accuracy is really good — I can bowl dots all over",
        5: "I can land the ball on a coin and build pressure for overs"
    },
    "Revolutions & Spin Rate": {
        1: "I don't spin the ball much yet",
        2: "I get some spin but it doesn't turn enough to trouble batters",
        3: "I get good spin on most balls and it turns off the pitch",
        4: "I spin it hard and get good turn and bounce",
        5: "I rip the ball — big turn, bounce, and drift"
    },
    "Wrong'un Execution": {
        1: "I can't bowl a wrong'un / googly yet",
        2: "I try it but it doesn't really spin the other way",
        3: "My wrong'un works sometimes and surprises batters",
        4: "My wrong'un is a weapon — it looks like my stock ball",
        5: "My wrong'un is elite — fully disguised and I use it tactically"
    },
    "Flight & Dip Control": {
        1: "I don't really think about flight — I just bowl flat",
        2: "I try to flight it but I lose accuracy when I do",
        3: "I can give it some air and still land it on a good length",
        4: "I use flight as a weapon — I make batters come forward",
        5: "My flight and dip are elite — I control trajectory precisely"
    },
    "Use of Crease": {
        1: "I always bowl from the same spot",
        2: "I sometimes change my position but it doesn't help much",
        3: "I move around the crease to create different angles",
        4: "I use the crease smartly to set up batters",
        5: "I manipulate the crease expertly — wide, tight, over and around"
    },
    "Match-Up Bowling": {
        1: "I bowl the same to every batter",
        2: "I notice who's left or right handed but don't change much",
        3: "I adjust my plan for different batters",
        4: "I read batters and bowl to their weaknesses",
        5: "I own match-ups — I know how to attack every type of batter"
    },
    "Middle-Over Control": {
        1: "I get hit in the middle overs and can't stop scoring",
        2: "I go ok in the middle but leak boundaries",
        3: "I control the middle overs and bowl dot balls",
        4: "The middle overs are where I'm most dangerous",
        5: "I dominate middle overs — I take wickets and concede almost nothing"
    },
    "Powerplay Tactics": {
        1: "I don't bowl in the powerplay",
        2: "I can bowl with the new ball but I'm nervous about it",
        3: "I can bowl the powerplay and hold my own",
        4: "I'm effective in the powerplay — I attack with the field up",
        5: "I thrive in the powerplay — I take wickets and control scoring"
    },
    "Death-Over Spin": {
        1: "I don't bowl at the death",
        2: "I bowl at the death but get hit most of the time",
        3: "I can hold my own at the death sometimes",
        4: "I'm effective at the death — I bowl smart and limit damage",
        5: "I'm a death-overs spinner — I execute under extreme pressure"
    },
    "Reading the Batter": {
        1: "I don't really watch what the batter does",
        2: "I notice some things but I'm not sure what to do with it",
        3: "I pick up clues — grip, stance, footwork — and adjust",
        4: "I read batters quickly and change my plan mid-over",
        5: "I'm always one step ahead — I set traps based on what I see"
    }
};

const C_SPIN = {
    "Stock Ball Accuracy": {
        1: "No consistent landing area. Bowls 2+ bad balls per over.",
        2: "Hits target ~40%. Drifts to leg or too wide/short.",
        3: "Hits target ~60%. Can hold length and line for an over.",
        4: "Hits target >75%. Sustained accuracy across 4-over spell.",
        5: ">85% accuracy. Lands in same spot ball after ball. Elite control."
    },
    "Revolutions & Spin Rate": {
        1: "Minimal revolutions. Ball goes straight. No turn off pitch.",
        2: "Some spin but inconsistent. Turns on helpful pitches only.",
        3: "Good revolutions. Consistent turn. Some bounce from spin.",
        4: "High spin rate. Significant turn and bounce. Drift in flight.",
        5: "Elite spin rate. Prodigious turn, bounce, and drift. Beats batters in the air and off pitch."
    },
    "Wrong'un Execution": {
        1: "Cannot bowl wrong'un. No exposure to skill.",
        2: "Attempts wrong'un but visible action change. No consistent spin.",
        3: "Wrong'un works as surprise ball. Some disguise. ~30% execution.",
        4: "Well-disguised wrong'un. Consistent spin. Uses tactically. >50% execution.",
        5: "Elite wrong'un. Fully disguised. Spins sharply. Deploys in pressure moments. >70% execution."
    },
    "Flight & Dip Control": {
        1: "Bowls flat. No trajectory variation. Predictable.",
        2: "Tries to flight but loses accuracy. Can't control dip.",
        3: "Uses flight as variation. Dip creates hesitation. Some control.",
        4: "Controls trajectory deliberately. Flight draws batters forward. Accurate when flighted.",
        5: "Elite trajectory control. Varies loop, dip, and pace within overs. Creates wickets through flight."
    },
    "Use of Crease": {
        1: "Bowls from same spot every ball. No crease awareness.",
        2: "Occasionally changes position but without tactical purpose.",
        3: "Uses wide and close to stumps as tactics. Creates different angles.",
        4: "Manipulates crease position to set up batters. Over and around wicket.",
        5: "Elite crease use. Changes angle, trajectory, and pace through position. Creates wicket opportunities."
    },
    "Match-Up Bowling": {
        1: "Same approach to every batter. No awareness of match-ups.",
        2: "Recognises LHB/RHB but doesn't adjust effectively.",
        3: "Adjusts line and length for batter type. Basic plans.",
        4: "Reads batter strengths/weaknesses. Creates plans. Adjusts mid-over.",
        5: "Elite match-up awareness. Owns specific batter types. Sets multi-ball traps."
    },
    "Middle-Over Control": {
        1: "Leaks runs in middle overs. Economy >8 RPO.",
        2: "Inconsistent control. Economy 7-8 RPO. Boundary per over.",
        3: "Holds middle overs. Economy 6-7 RPO. Maintains dots.",
        4: "Controls middle overs. Economy <6 RPO. Takes wickets.",
        5: "Dominates middle phase. Economy <5 RPO. Consistent wicket threat."
    },
    "Powerplay Tactics": {
        1: "Not trusted in powerplay. No experience.",
        2: "Can bowl in PP but leaks boundaries. Nervous with field up.",
        3: "Effective PP bowler. Holds nerve. Uses pace and trajectory.",
        4: "Attacks in PP. Takes wickets with field up. Controls scoring.",
        5: "Elite PP spinner. Uses pace, flight, and seam. Consistent wickets."
    },
    "Death-Over Spin": {
        1: "Cannot be trusted at death. Gets targeted.",
        2: "Bowls at death but gets hit. Poor yorker/slower ball options.",
        3: "Can hold own at death occasionally. Uses pace and angle.",
        4: "Effective death bowler. Varies pace. Uses wider crease. Limits damage.",
        5: "Specialist death spinner. Executes under max pressure. Wide/yorker/slower combos."
    },
    "Reading the Batter": {
        1: "No observation of batter cues. Reactionary bowling.",
        2: "Notices some cues but can't adapt in real time.",
        3: "Picks up trigger movements, grip, stance. Adjusts within over.",
        4: "Reads intent early. Anticipates shots. Sets fields accordingly.",
        5: "Elite reading. Identifies weaknesses within 2-3 balls. Sets traps. One step ahead."
    }
};

// ─── WICKETKEEPING TECHNICAL ───
const P_KEEP = {
    "Stance & Ready Position": { 1: "I'm still learning how to crouch behind the stumps", 2: "My stance is ok but I get tired quickly", 3: "I'm comfortable in my ready position for most bowlers", 4: "My stance lets me react quickly to anything", 5: "My ready position is automatic — I'm balanced and explosive" },
    "Footwork to Pace": { 1: "I struggle to move to balls outside off or down leg", 2: "I can get to some but I'm late on quicker bowlers", 3: "My footwork is ok — I get into position most of the time", 4: "My footwork is smooth and I move well to both sides", 5: "I flow to the ball — my footwork is elite and I make it look easy" },
    "Standing Up to Spin": { 1: "I don't stand up to the stumps yet", 2: "I stand up sometimes but I'm nervous about missing it", 3: "I can stand up and take most spin cleanly", 4: "I'm confident standing up — I take and stump well", 5: "Standing up is one of my strengths — I create chances" },
    "Glove Work": { 1: "I drop catches and fumble the ball often", 2: "I catch some but fumble edges and low balls", 3: "My hands are soft and I take most catches cleanly", 4: "My glove work is really clean — I take tough chances", 5: "My hands are exceptional — I take everything" },
    "Stumping Speed": { 1: "I'm too slow to stump — the batter gets back", 2: "I stump sometimes but I'm not quick enough consistently", 3: "My stumpings are clean when I get a chance", 4: "I'm quick behind the stumps and take sharp chances", 5: "Lightning fast stumpings — I'm a genuine stumping weapon" },
    "Diving & Athleticism": { 1: "I don't really dive for the ball", 2: "I dive sometimes but I struggle to hold on", 3: "I can dive and hold catches reasonably well", 4: "I'm athletic and make good diving stops and catches", 5: "I pull off spectacular saves and catches — my athleticism is elite" },
    "Communication": { 1: "I'm quiet behind the stumps", 2: "I try to talk but I'm not sure what to say", 3: "I communicate field changes and encourage my bowlers", 4: "I'm vocal and help direct the team from behind the stumps", 5: "I'm a general behind the stumps — I run the field and energise the team" },
    "Throwing Accuracy": { 1: "My throws miss the stumps most times", 2: "I can hit from close but struggle from further out", 3: "My throwing is accurate from most positions", 4: "I hit the stumps often and throw flat and fast", 5: "My throwing is a weapon — I create run-outs and force pressure" }
};

const C_KEEP = {
    "Stance & Ready Position": { 1: "Poor base. Weight too far forward/back. Slow to react.", 2: "Adequate base but can't sustain. Tires mid-session.", 3: "Balanced, repeatable stance. Reacts to pace and spin.", 4: "Dynamic stance. Adapts for bowler type. Quick lateral.", 5: "Elite stance. Explosive movement. Maintains all day." },
    "Footwork to Pace": { 1: "Static. Reaches rather than moves. Late to edges.", 2: "Moves but late. Snatches at balls outside off.", 3: "Gets into position >60%. Smooth movement both sides.", 4: "Fluid lateral footwork. Takes edges cleanly. Low and through.", 5: "Elite movement. Makes difficult takes look routine." },
    "Standing Up to Spin": { 1: "Cannot stand up. No experience at stumps to spin.", 2: "Stands up but fumbles. Misses stumping chances.", 3: "Takes cleanly when up. Stumpings from clear chances.", 4: "Confident standing up. Creates stumping pressure. Quick hands.", 5: "Elite up to stumps. Takes on both sides. Creates chances from nothing." },
    "Glove Work": { 1: "Hard hands. Drops regulation catches. Fumbles returns.", 2: "Takes straightforward catches. Drops edges. Hard hands at times.", 3: "Soft hands. Clean takes >70%. Takes most edges.", 4: "Soft, reliable hands. Takes difficult chances. >85% catch rate.", 5: "Exceptional hands. Takes everything. World-class technique." },
    "Stumping Speed": { 1: "Slow hands. Batter always home. No threat standing up.", 2: "Stumpings from obvious chances only. Slow gather-to-break.", 3: "Clean stumpings. Adequate speed. Takes regulation chances.", 4: "Quick hands. Takes sharp chances. <0.3s gather-to-break.", 5: "Lightning. Takes half-chances. Sub-0.2s. Genuine weapon." },
    "Diving & Athleticism": { 1: "Doesn't attempt dives. Limited range.", 2: "Dives but drops or can't recover. Limited range.", 3: "Takes diving catches. Good range both sides.", 4: "Athletic. Full-length dives. Quick recovery for byes.", 5: "Spectacular saves and catches. Elite range. Quick to feet." },
    "Communication": { 1: "Silent behind stumps. No presence.", 2: "Occasional calls. Not consistent. Low energy.", 3: "Communicates field changes. Encourages bowlers.", 4: "Vocal leader. Directs field. Motivates. Reads game.", 5: "General. Runs the field. Manages bowlers. Elite game awareness." },
    "Throwing Accuracy": { 1: "Inaccurate throws. No direct hits. Slow release.", 2: "Hits from short range. Wild from 15m+.", 3: "Accurate from most positions. Flat throw.", 4: "Hits stumps regularly from any angle. Quick release.", 5: "Elite throwing. Creates run-outs. Forces pressure running between." }
};

// ─── GAME INTELLIGENCE ───
const P_IQ = {
    "Powerplay Awareness": { 1: "I don't really think about what overs we're in", 2: "I know the powerplay matters but I'm not sure what to do", 3: "I understand the powerplay and try to adjust", 4: "I make smart decisions about risk and tempo in PP", 5: "I read the powerplay instinctively — attack, rotate, or hold" },
    "Middle-Over Management": { 1: "I just play the same way in every phase", 2: "I try to adjust but I play too many dots in the middle", 3: "I manage the middle overs ok — I rotate and score", 4: "I read the middle phase well and control the tempo", 5: "I own the middle overs — I manipulate fields and batters" },
    "Death-Over Decisions": { 1: "I panic at the death and make bad decisions", 2: "I try to score at the death but I play the wrong shots", 3: "I make ok decisions at the death most of the time", 4: "I read the death well and pick the right options", 5: "I thrive at the death — I always pick the right shot or delivery" },
    "Match Reading": { 1: "I don't really look at the scoreboard", 2: "I check the score but I don't change my game", 3: "I adjust my game based on the match situation", 4: "I read the game well and adapt my approach", 5: "I always know exactly where the game is and what's needed" },
    "Field Awareness": { 1: "I don't really notice where fielders are", 2: "I see the field but I forget to use it", 3: "I look at the field and try to find the gaps", 4: "I use the field well — I find gaps and avoid fielders", 5: "I read the field instantly and exploit every gap" },
    "Adaptability": { 1: "I only have one way to play", 2: "I try to change but I'm not good at it yet", 3: "I can adjust my game for different situations", 4: "I adapt quickly to different conditions and situations", 5: "I can play any way the game needs — I'm a complete chameleon" }
};

const C_IQ = {
    "Powerplay Awareness": { 1: "No phase awareness. Same approach overs 1-20.", 2: "Knows PP but can't adjust approach (bat or bowl).", 3: "Adjusts intent and risk for PP. Makes basic tactical choices.", 4: "Reads PP situation. Adjusts tempo, risk, field placement.", 5: "Elite PP reading. Instinctive risk management. Creates opportunities." },
    "Middle-Over Management": { 1: "No awareness of middle-phase dynamics.", 2: "Plays same way. High dots or high risk in middle overs.", 3: "Rotates, maintains SR 110-120 in middle. Builds platform.", 4: "Manipulates middle overs. Controls tempo. Sets up death.", 5: "Owns middle phase. Accelerates without risk. Creates pressure." },
    "Death-Over Decisions": { 1: "Poor decisions at death. Either blocks or slogs.", 2: "Attempts right shots but poor execution or shot selection.", 3: "Makes reasonable decisions. SR 120-140 at death.", 4: "Reads situation. Picks right option. SR 140+ at death.", 5: "Elite death decisions. Right shot every ball. Clutch performer." },
    "Match Reading": { 1: "No scoreboard awareness. Plays in a bubble.", 2: "Checks score but doesn't translate to approach change.", 3: "Adjusts aggression and risk based on match state.", 4: "Reads game deeply. Makes tactical adjustments proactively.", 5: "Elite game reader. Always knows what's needed. Leads others." },
    "Field Awareness": { 1: "Doesn't scan field. Hits to fielders regularly.", 2: "Sees field but can't consistently exploit gaps.", 3: "Reads field. Finds gaps >50% when rotating.", 4: "Uses field intelligently. Hits gaps. Avoids danger areas.", 5: "Elite field reading. Exploits every gap. Manipulates field changes." },
    "Adaptability": { 1: "One-dimensional. Cannot change approach.", 2: "Tries to adapt but reverts under pressure.", 3: "Adjusts for conditions, surface, match state.", 4: "Adapts quickly. Multiple gears. Reads what's needed.", 5: "Complete adaptability. Any format, any situation. Chameleon." }
};

// ─── MENTAL & CHARACTER ───
const P_MN = {
    "Courage Under Pressure": { 1: "I get really nervous and it's hard to focus", 2: "I feel pressure but I'm learning to deal with it", 3: "I can usually handle pressure and make ok decisions", 4: "I back myself in pressure moments and step up", 5: "I love the biggest moments — I perform best when it matters" },
    "Curiosity & Learning": { 1: "I don't really think about improving", 2: "I want to get better but I'm not sure how", 3: "I watch cricket and try to learn new things", 4: "I actively seek feedback and work on weaknesses", 5: "I'm obsessed with learning — I study the game constantly" },
    "Emotional Regulation": { 1: "I get angry or upset easily on the field", 2: "I sometimes lose my cool but I recover", 3: "I stay pretty calm most of the time", 4: "I control my emotions well even when things go wrong", 5: "I'm unshakeable — nothing throws me off my game" },
    "Competitive Drive": { 1: "I don't mind if I win or lose", 2: "I like winning but I don't push hard enough", 3: "I compete strongly in most situations", 4: "I hate losing and I compete hard every ball", 5: "I have an intense desire to win — I leave everything on the field" },
    "Communication & Leadership": { 1: "I'm quiet on the field and don't talk much", 2: "I try to communicate but only sometimes", 3: "I talk to teammates and encourage them", 4: "I'm a vocal leader — I lift the team when it counts", 5: "I lead by example and words — I make everyone better" },
    "Coachability": { 1: "I find it hard to take feedback", 2: "I listen to coaches but I don't always apply it", 3: "I take feedback on board and try to improve", 4: "I actively seek coaching and apply it quickly", 5: "I'm highly coachable — I absorb, apply, and come back for more" },
    "Resilience": { 1: "I give up when things go badly", 2: "I get down after failure but bounce back eventually", 3: "I recover from setbacks reasonably quickly", 4: "I bounce back fast and learn from failures", 5: "Setbacks motivate me — I come back stronger every time" }
};

const C_MN = {
    "Courage Under Pressure": { 1: "Visibly affected. Retreats. Body language collapses.", 2: "Moments of composure but makes reactive decisions.", 3: "Maintains discipline in moderate pressure. Recovers.", 4: "Seeks strike. Maintains process. Positive body language.", 5: "Wants decisive moments. Executes high-skill under max pressure. Match-winner." },
    "Curiosity & Learning": { 1: "Passive. Doesn't seek improvement. Goes through motions.", 2: "Receptive when coached but doesn't self-initiate.", 3: "Asks questions. Watches footage. Engages in review.", 4: "Actively seeks feedback. Studies opposition. Self-reflects.", 5: "Elite learner. Constant growth. Studies game deeply. Innovates." },
    "Emotional Regulation": { 1: "Loses composure frequently. Impacts teammates. Visible frustration.", 2: "Occasional outbursts. Can affect next ball focus.", 3: "Generally composed. Rare loss of control. Recovers quickly.", 4: "Strong control. Channels emotion positively. Rarely affected.", 5: "Elite composure. Uses emotion as fuel. Unbreakable focus." },
    "Competitive Drive": { 1: "Passive. No visible competitive intent.", 2: "Competes but intensity varies. Drops off when behind.", 3: "Consistent competitor. Fights in close games.", 4: "Intense competitor. Drives standards. Hates losing.", 5: "Elite competitor. Lifts intensity of entire group. Relentless." },
    "Communication & Leadership": { 1: "Silent. No presence on field. Withdrawn.", 2: "Occasional contribution. Not consistent.", 3: "Communicates position, encourages teammates.", 4: "Vocal leader. Directs. Lifts team in tough moments.", 5: "Captain material. Leads by example and word. Elevates group." },
    "Coachability": { 1: "Resistant to feedback. Doesn't implement changes.", 2: "Listens but slow to apply. Reverts to old habits.", 3: "Accepts feedback. Makes adjustments. Maintains changes.", 4: "Seeks feedback actively. Rapid implementation. Self-corrects.", 5: "Elite coachability. Absorbs, applies, iterates. Rapid skill transfer." },
    "Resilience": { 1: "Drops off after failure. Sulks. Affects performance.", 2: "Gets down but recovers within session.", 3: "Bounces back between innings/spells. Maintains standards.", 4: "Quick recovery. Uses failure as motivation. Stronger next up.", 5: "Thrives after setbacks. Failure drives improvement. Unbreakable." }
};

// ─── PHYSICAL & ATHLETIC (per role) ───
const P_PHYS = {
    "Explosive Power": { 1: "I'm not very powerful yet", 2: "I have some power but I can't use it consistently", 3: "I can generate good power when I need to", 4: "I'm strong and explosive in my game", 5: "My power is elite — I hit hard and move fast" },
    "Core Stability": { 1: "My core is weak and I lose balance easily", 2: "My core is ok but it lets me down sometimes", 3: "I have decent core strength and balance", 4: "My core is strong — it helps me stay balanced through everything", 5: "My core is rock solid — it powers everything I do" },
    "Agility & Running": { 1: "I'm slow between wickets and in the field", 2: "I'm ok but I could be quicker and sharper", 3: "I run well between wickets and move ok in the field", 4: "I'm quick and agile — I turn fast and run hard", 5: "My speed and agility are elite — I create runs and save them" },
    "Aerobic Fitness": { 1: "I get tired quickly during a game", 2: "I can last a while but I fade in long spells", 3: "My fitness is fine — I can get through a full game", 4: "I have good endurance and recover well between efforts", 5: "I'm extremely fit — I maintain intensity all day" },
    "Aerobic Recovery": { 1: "I take a long time to recover between overs", 2: "I recover slowly and it affects my next spell", 3: "I recover ok between overs and spells", 4: "I bounce back quickly — ready to go again fast", 5: "I recover instantly and never drop intensity" },
    "Upper Body Power": { 1: "My arms and shoulders are weak", 2: "I have some upper body strength but not enough", 3: "Good upper body power for hitting and throwing", 4: "Strong upper body — I hit hard and throw flat", 5: "Elite upper body power in all aspects of my game" },
    "Core Balance": { 1: "I fall over or lose balance easily", 2: "My balance is ok but wobbles under speed", 3: "I stay balanced most of the time", 4: "Great balance through contact and bowling action", 5: "My balance is elite — stable in every position" },
    "Core & Rotational Power": { 1: "I can't generate much rotational force", 2: "Some rotation but not enough for big spin", 3: "Good rotational power for bowling", 4: "Strong rotation that powers my spin and batting", 5: "Elite rotational power — weapon for spin and hitting" },
    "Shoulder Flexibility": { 1: "My shoulders are stiff and it limits me", 2: "Some flexibility but I need more range", 3: "Good shoulder range for bowling and fielding", 4: "Very flexible shoulders — helps my bowling action", 5: "Elite shoulder flexibility — full range in all actions" },
    "Shoulder Mobility": { 1: "My shoulder is tight and limits my action", 2: "Some mobility but it restricts pace/effort balls", 3: "Adequate mobility for my bowling action", 4: "Good mobility — rarely limits me even in long spells", 5: "Elite shoulder mobility — full range, zero restrictions" },
    "Balance & Landing": { 1: "I stumble on landing regularly", 2: "My landing is ok but I fall away sometimes", 3: "I land consistently and stay balanced through delivery", 4: "Excellent landing mechanics — stable and ready to field", 5: "Textbook landing every ball — balanced and braced" },
    "General Movement": { 1: "I'm not very athletic or coordinated", 2: "I move ok but I'm not quick or smooth", 3: "I move well around the field and in my skills", 4: "I'm athletic and move well in all situations", 5: "Elite mover — quick, coordinated, and explosive" },
    "Eccentric Quad Strength": { 1: "My front leg buckles when bowling or landing", 2: "Some quad strength but I lose power over a spell", 3: "Good leg strength — I absorb landing forces ok", 4: "Strong quads — my brace is solid all spell", 5: "Elite eccentric strength — powerful brace every delivery" },
    "Lateral Movement": { 1: "I struggle to move sideways quickly", 2: "I can move laterally but I'm slow and stiff", 3: "Good lateral movement for keeping and fielding", 4: "Quick and smooth moving side to side", 5: "Elite lateral agility — I cover huge range" },
    "Squat Endurance": { 1: "I can't stay low for long behind the stumps", 2: "I tire after a few overs in the squat", 3: "I can maintain my stance for most of a session", 4: "Strong squat endurance — comfortable all day", 5: "Elite endurance in the squat — never fatigues" },
    "Hand-Eye Coordination": { 1: "I sometimes misjudge the ball", 2: "My coordination is ok but I fumble under pressure", 3: "Good coordination — I catch and field cleanly", 4: "Very sharp hand-eye — I react quickly", 5: "Elite coordination — I see the ball incredibly early" },
    "Bowling Athleticism": { 1: "My bowling feels stiff and unathletic", 2: "Some athleticism but not consistent", 3: "I move well through my action", 4: "Athletic bowling action — explosive and smooth", 5: "Elite bowling athlete — power, speed, and control" }
};

const C_PHYS = {
    "Explosive Power": { 1: "No measurable explosive capacity. Slow acceleration.", 2: "Below-average power. Limited bat speed or pace.", 3: "Age-appropriate power. Adequate for current level.", 4: "Above-average power output. Translates to performance.", 5: "Elite power. Exceptional bat speed, bowling pace, or fielding range." },
    "Core Stability": { 1: "Core collapses under load. Affects all skills.", 2: "Some stability but breaks down under fatigue.", 3: "Adequate core. Maintains form through most activities.", 4: "Strong core. Stable through batting, bowling, fielding.", 5: "Elite stability. Rock-solid platform for all skills." },
    "Agility & Running": { 1: "Slow. Poor turns. No urgency between wickets.", 2: "Below average speed. Turns slowly.", 3: "Good running between wickets. Adequate fielding speed.", 4: "Quick. Sharp turns. Creates extra runs through speed.", 5: "Elite speed and agility. Exceptional in all running scenarios." },
    "Aerobic Fitness": { 1: "Fatigues within 2 overs bowling or 20 overs batting.", 2: "Manages short spells but drops off over session.", 3: "Completes full game without significant decline.", 4: "Maintains intensity through long sessions.", 5: "Elite endurance. No performance drop all day." },
    "Aerobic Recovery": { 1: "Extremely slow recovery. Multiple overs between efforts.", 2: "Slow recovery. Performance drops after effort.", 3: "Adequate recovery between overs/spells.", 4: "Quick recovery. Ready for next effort rapidly.", 5: "Elite recovery. Near-instant. No intensity drop." },
    "Upper Body Power": { 1: "Weak upper body. No bat speed or throw power.", 2: "Below average. Limited boundary-hitting or throwing range.", 3: "Adequate for competition level. Clean hitting and throwing.", 4: "Strong. Generates extra bat speed and throwing power.", 5: "Elite upper body. Exceptional power in all skills." },
    "Core Balance": { 1: "Falls over regularly. Unstable through contact.", 2: "Loses balance under speed or off-balance shots.", 3: "Balanced most of the time through skills.", 4: "Excellent balance. Stable through all shot types.", 5: "Elite balance. Stable in every position at all speeds." },
    "Core & Rotational Power": { 1: "Minimal rotation. Can't generate spin or power.", 2: "Some rotation but inconsistent.", 3: "Good rotational force for bowling and hitting.", 4: "Strong rotation. Translates to spin rate and bat speed.", 5: "Elite rotational power. Maximum spin and bat speed." },
    "Shoulder Flexibility": { 1: "Restricted range. Limits bowling action.", 2: "Adequate but tight. May limit high-arm delivery.", 3: "Good range for bowling and throwing.", 4: "Excellent flexibility. Full range in all actions.", 5: "Elite flexibility. Zero restriction in any movement." },
    "Shoulder Mobility": { 1: "Restricted. Limits action and effort.", 2: "Tight. Restricts pace on effort balls.", 3: "Adequate for bowling action.", 4: "Full mobility. Unrestricted through spell.", 5: "Elite. Complete range. Zero limitation." },
    "Balance & Landing": { 1: "Stumbles regularly. Falls away from action.", 2: "Inconsistent landing. Occasionally off-balance.", 3: "Lands consistently. Adequate brace and balance.", 4: "Excellent landing mechanics. Braced and balanced.", 5: "Textbook. Perfect landing every delivery." },
    "General Movement": { 1: "Uncoordinated. Poor body awareness.", 2: "Some coordination but limited athleticism.", 3: "Moves well. Adequate coordination.", 4: "Athletic. Coordinated in all game situations.", 5: "Elite mover. Exceptional coordination and fluency." },
    "Eccentric Quad Strength": { 1: "Front leg collapses. No brace capacity.", 2: "Partial brace. Loses power through spell.", 3: "Adequate quad strength for bowling workload.", 4: "Strong quads. Consistent brace across spell.", 5: "Elite eccentric strength. Powerful brace every ball." },
    "Lateral Movement": { 1: "Cannot move laterally with speed.", 2: "Slow lateral. Limited range behind stumps.", 3: "Adequate lateral movement for position.", 4: "Quick lateral movement. Covers good range.", 5: "Elite lateral agility. Exceptional range." },
    "Squat Endurance": { 1: "Cannot maintain squat beyond a few overs.", 2: "Tires after 10+ overs in the squat.", 3: "Maintains stance for session with adequate breaks.", 4: "Strong endurance. Comfortable through full day.", 5: "Elite squat endurance. No decline in performance." },
    "Hand-Eye Coordination": { 1: "Misjudges ball regularly. Poor tracking.", 2: "Adequate but drops under pressure.", 3: "Good coordination. Clean fielding and catching.", 4: "Sharp reactions. Quick tracking. Reliable.", 5: "Elite hand-eye. Exceptional tracking and reaction." },
    "Bowling Athleticism": { 1: "Stiff, unathletic action. Poor energy transfer.", 2: "Some athleticism but inconsistent.", 3: "Athletic enough for current level.", 4: "Athletic bowling action. Explosive and efficient.", 5: "Elite bowling athlete. Power, speed, control." }
};

// ─── PHASE EFFECTIVENESS ───
const P_PHASE = {
    "POWERPLAY (1-6)": { 1: "I struggle in the powerplay", 2: "I'm learning how to handle the powerplay", 3: "I'm ok in the powerplay — I contribute", 4: "I'm effective in the powerplay — I make an impact", 5: "The powerplay is where I'm most dangerous" },
    "MIDDLE (7-16)": { 1: "I find the middle overs hard to score or control", 2: "I go ok in the middle but nothing special", 3: "I contribute well in the middle overs", 4: "The middle overs are where I control the game", 5: "I dominate the middle phase" },
    "DEATH (17-20)": { 1: "I'm not effective at the death", 2: "I try to score or bowl at the death but it's tough", 3: "I handle the death overs ok", 4: "I'm effective at the death — I make a difference", 5: "I'm a death-overs specialist" }
};

const C_PHASE = {
    "POWERPLAY (1-6)": { 1: "Ineffective in PP. No impact with bat or ball.", 2: "Contributes minimally. Below match tempo.", 3: "Adequate PP performer. Meets basic expectations.", 4: "Effective. Makes impact. Sets tone or controls.", 5: "Elite PP performer. Game-changer in overs 1-6." },
    "MIDDLE (7-16)": { 1: "No impact in middle overs. Passengers.", 2: "Limited contribution. Below required tempo.", 3: "Steady contributor. Maintains team tempo.", 4: "Controls or accelerates middle phase. Key contributor.", 5: "Dominates middle overs. Sets platform or takes wickets." },
    "DEATH (17-20)": { 1: "Cannot be trusted at death. Liability.", 2: "Struggles under scoreboard pressure.", 3: "Adequate death performer. Holds own.", 4: "Effective finisher or death bowler. Makes a difference.", 5: "Elite death performer. Match-winner in crunch moments." }
};

// ═══ ATHLETIC FIELDING DEFINITIONS ═══
const C_FLD = {
    "Ground Fielding": { 1: "Poor technique. Misfields regularly. No presence in the field.", 2: "Basic ground fielding. Slow to ball. Lets easy runs through.", 3: "Reliable under moderate pressure. Clean pick-up and return.", 4: "Sharp ground fielding. Quick to ball, clean hands, saves runs.", 5: "Elite. Exceptional range, anticipation, and conversion to run-outs." },
    "Catching Reliability": { 1: "Drops regularly. Cannot be trusted in catching positions.", 2: "Takes straightforward catches but drops under pressure.", 3: "Reliable in standard positions. Takes most regulation chances.", 4: "Safe pair of hands. Rarely drops. Confident in pressure catches.", 5: "Elite catcher. Takes everything. Pulls off exceptional catches." },
    "Close / Sharp Catching": { 1: "Cannot be placed in close-catching positions.", 2: "Struggles with reflex catches. Slow reactions.", 3: "Adequate at slip/close catching. Takes some sharp chances.", 4: "Strong reflex catcher. Quick hands, soft reception.", 5: "Elite close catcher. Outstanding reflexes and anticipation." },
    "Throwing Accuracy & Speed": { 1: "Weak arm. Inaccurate throws. No threat to batters.", 2: "Below average arm. Occasional good throw.", 3: "Accurate from standard range. Hits stumps under moderate pressure.", 4: "Strong, accurate arm. Quick release. Creates run-out chances.", 5: "Elite arm. Flat, fast, accurate from any angle. Game-changing throws." },
    "Running Between Wickets": { 1: "Slow. Poor calling. Causes run-outs. No urgency.", 2: "Below average speed. Poor turning. Misses easy runs.", 3: "Good runner. Turns well. Backs up consistently.", 4: "Quick between wickets. Sharp turns. Creates pressure on fielders.", 5: "Elite runner. Exceptional speed, turning, and calling. Steals extra runs." },
};

// ═══ BUILD COMBINED DEFINITION OBJECTS ═══
export const PLAYER_DEFS = { ...P_BAT, ...P_PACE, ...P_SPIN, ...P_KEEP, ...P_IQ, ...P_MN, ...P_PHYS, ...P_PHASE };
export const COACH_DEFS = { ...C_BAT, ...C_PACE, ...C_SPIN, ...C_KEEP, ...C_IQ, ...C_MN, ...C_PHYS, ...C_PHASE, ...C_FLD };
