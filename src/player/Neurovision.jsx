// ═══ PLAYER: NEUROVISION ═══
// Static reference content from Shah Neurovision Sports Training partnership.
// Week 0: 5–7 minute Cricket Neural Warm-Up. Players read and follow the steps.

import React from 'react';
import { B, F, sCard, getDkWrap } from '../data/theme';

const NV_TEAL = '#3FCFC2';

const Header = () => (
    <div style={{
        background: '#000', borderRadius: 14, padding: '20px 18px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 14, color: B.w,
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
    }}>
        <img
            src="/neurovision-logo.png"
            alt="Shah Neurovision Sports Training"
            style={{ height: 56, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.6, color: NV_TEAL, fontFamily: F, textTransform: 'uppercase' }}>
                Partnership
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: F, marginTop: 2 }}>
                Neurovision Training
            </div>
            <div style={{ fontSize: 10, fontFamily: F, opacity: 0.75, marginTop: 2 }}>
                Vision · Brain · Performance
            </div>
        </div>
    </div>
);

const WeekBanner = ({ weekLabel, title, subtitle }) => (
    <div style={{
        background: `linear-gradient(135deg, ${B.nvD} 0%, ${B.bl} 100%)`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: B.w,
    }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, fontFamily: F, opacity: 0.8, textTransform: 'uppercase' }}>
            {weekLabel}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, fontFamily: F, marginTop: 4 }}>{title}</div>
        <div style={{ fontSize: 11, fontFamily: F, opacity: 0.9, marginTop: 4 }}>{subtitle}</div>
    </div>
);

const OrderStrip = () => (
    <div style={{
        background: B.w, border: `1px solid ${B.g200}`, borderRadius: 10,
        padding: '10px 12px', marginBottom: 16,
    }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: B.g400, fontFamily: F, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
            Order
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: B.nvD, fontFamily: F, lineHeight: 1.5 }}>
            Monocular → Horizontal → Vertical Predictive → VOR → Soft/Hard Focus + Visualization
        </div>
    </div>
);

const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: B.g600, fontFamily: F, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 }}>
        {children}
    </div>
);

const Bullet = ({ children, indent = 0 }) => (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, color: B.nv, fontFamily: F, lineHeight: 1.55, marginBottom: 4, marginLeft: indent }}>
        <span style={{ color: NV_TEAL, fontWeight: 800, flexShrink: 0 }}>•</span>
        <div>{children}</div>
    </div>
);

const Para = ({ children, style }) => (
    <div style={{ fontSize: 13, color: B.nv, fontFamily: F, lineHeight: 1.55, marginBottom: 6, ...style }}>
        {children}
    </div>
);

const ExerciseCard = ({ number, title, duration, children }) => (
    <div style={{ ...sCard, padding: 18, marginBottom: 14, borderLeft: `4px solid ${NV_TEAL}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%', background: NV_TEAL, color: '#000',
                fontSize: 15, fontWeight: 800, fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                {number}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: B.nvD, fontFamily: F, lineHeight: 1.25 }}>{title}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F, marginTop: 3, letterSpacing: 0.4, textTransform: 'uppercase' }}>{duration}</div>
            </div>
        </div>
        {children}
    </div>
);

const Closing = () => (
    <div style={{
        background: `${NV_TEAL}15`, border: `1px solid ${NV_TEAL}`, borderRadius: 12,
        padding: 16, marginTop: 4, marginBottom: 24,
    }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, lineHeight: 1.55, fontStyle: 'italic' }}>
            "When your breathing is calm, the game feels slower. Cricket is not just about reacting. It's about seeing it early. Science works as long as you use it, consistently!"
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: B.g600, fontFamily: F, marginTop: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            — Dr. Shah
        </div>
    </div>
);

export default function Neurovision() {
    return (
        <div style={{ padding: 16, ...getDkWrap() }}>
            <Header />

            <WeekBanner
                weekLabel="Week 0"
                title="Cricket Neural Warm-Up"
                subtitle="5–7 minutes · Do this before every batting session"
            />

            <OrderStrip />

            <ExerciseCard number="1" title="Monocular Eye Stretches" duration="60 seconds total">
                <SectionLabel>How</SectionLabel>
                <Bullet>Cover left eye.</Bullet>
                <Bullet>With right eye trace:</Bullet>
                <Bullet indent={20}>Top left → top right</Bullet>
                <Bullet indent={20}>Middle left → middle right</Bullet>
                <Bullet indent={20}>Bottom left → bottom right</Bullet>
                <Bullet>Smooth. No jerking.</Bullet>
                <Bullet>Switch eyes.</Bullet>

                <SectionLabel>How this helps your batting</SectionLabel>
                <Para>This wakes up each eye by itself. In cricket, both eyes must work together to see the seam and the bounce clearly. If one eye is lazy, the ball can look blurry or late.</Para>
                <Para>This drill helps you:</Para>
                <Bullet>See the ball clearer</Bullet>
                <Bullet>Track the seam better</Bullet>
                <Bullet>Start your swing at the right time</Bullet>
                <Para style={{ marginTop: 6 }}>It tells your brain, "Get ready. The ball is coming."</Para>
            </ExerciseCard>

            <ExerciseCard number="2" title="Horizontal Saccades (Neutral Stance)" duration="45 seconds">
                <SectionLabel>How</SectionLabel>
                <Bullet>Stand upright.</Bullet>
                <Bullet>Pick two targets shoulder-width apart.</Bullet>
                <Bullet>Snap eyes left → right → left.</Bullet>
                <Bullet>20–30 reps.</Bullet>
                <Bullet>Head stays still.</Bullet>

                <SectionLabel>How this helps your batting</SectionLabel>
                <Para>This makes your eyes move fast side to side. In cricket, bowlers change angles. Fielders move. The ball can drift. Your eyes must move fast without your head turning.</Para>
                <Para>This helps you:</Para>
                <Bullet>See line early</Bullet>
                <Bullet>Adjust to angle</Bullet>
                <Bullet>Reset quickly after each ball</Bullet>
                <Para style={{ marginTop: 6 }}>Fast eyes mean faster reads.</Para>
            </ExerciseCard>

            <ExerciseCard number="3" title="Vertical Predictive Saccades (Batting Stance)" duration="90 seconds">
                <SectionLabel>Setup</SectionLabel>
                <Bullet>Full batting stance.</Bullet>
                <Bullet>Left thumb at eye height.</Bullet>

                <SectionLabel>Sequence</SectionLabel>
                <Bullet>1. Look at thumb.</Bullet>
                <Bullet>2. Snap eyes to far bounce spot.</Bullet>
                <Bullet>3. Back to thumb.</Bullet>
                <Bullet>4. Move closer each time (5 spots total).</Bullet>
                <Bullet>5. Finish with thumb → first far spot × 10 reps.</Bullet>

                <SectionLabel>How this helps your batting</SectionLabel>
                <Para>In cricket, length is up and down. Short ball. Full ball. Yorker. Your eyes must read where the ball will bounce before it gets there.</Para>
                <Para>This drill trains your brain to guess the bounce faster. That means:</Para>
                <Bullet>Better footwork</Bullet>
                <Bullet>Less rushing</Bullet>
                <Bullet>Cleaner contact</Bullet>
                <Para style={{ marginTop: 6 }}>You're teaching your brain to see the bounce early.</Para>
            </ExerciseCard>

            <ExerciseCard number="4" title="VOR in Batting Stance" duration="45 seconds">
                <SectionLabel>How</SectionLabel>
                <Bullet>Thumb at arm's length.</Bullet>
                <Bullet>Eyes locked on thumb.</Bullet>
                <Bullet>Move head left/right 15 seconds.</Bullet>
                <Bullet>Then up/down 15 seconds.</Bullet>

                <SectionLabel>How this helps your batting</SectionLabel>
                <Para>When you load and move, your head moves a little. If your eyes can't stay steady, the ball looks shaky. This drill helps your eyes stay clear while your head moves.</Para>
                <Para>That means:</Para>
                <Bullet>Better timing</Bullet>
                <Bullet>More solid contact</Bullet>
                <Bullet>Less guessing</Bullet>
                <Para style={{ marginTop: 6 }}>Clear eyes = better swings.</Para>
            </ExerciseCard>

            <ExerciseCard number="5" title="Soft Focus → Hard Focus + Visualization" duration="60–90 seconds">
                <SectionLabel>Step 1 — Soft Focus</SectionLabel>
                <Para>See the whole bowler. Don't stare.</Para>

                <SectionLabel>Step 2 — Hard Focus</SectionLabel>
                <Para>When you imagine release, snap sharp to the ball.</Para>

                <SectionLabel>Step 3 — Visualize</SectionLabel>
                <Bullet>See the seam.</Bullet>
                <Bullet>See the bounce.</Bullet>
                <Bullet>See your bat hit it clean.</Bullet>
                <Para style={{ marginTop: 6 }}>Breathe slow and calm.</Para>

                <SectionLabel>How this helps your batting</SectionLabel>
                <Para>Good batters don't stare too early. They stay relaxed and wide. Then they sharpen at the right time.</Para>
                <Para>Soft eyes help you:</Para>
                <Bullet>Stay calm</Bullet>
                <Bullet>See more</Bullet>
                <Bullet>Not panic</Bullet>
                <Para style={{ marginTop: 6 }}>Hard focus helps you:</Para>
                <Bullet>Time the ball</Bullet>
                <Bullet>Hit clean</Bullet>
                <Bullet>Make better choices</Bullet>
            </ExerciseCard>

            <Closing />
        </div>
    );
}
