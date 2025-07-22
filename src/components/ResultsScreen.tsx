'use client';

import React from 'react';

const LOGO_URL = '/picklerx-logo.jpg';
const FONT_FAMILY = 'system-ui, sans-serif';
const BRAND_DARK = '#040C1A';
const TIER_COLORS: Record<string, string> = {
  Elite: '#A4F45E',
  Pro: '#4AB5F1',
  Amateur: '#F7D84B',
  Novice: '#F44C4C',
};
const SCORE_BOX = {
  backgroundColor: '#C7FF69',
  borderRadius: '12px',
  padding: '10px 16px',
  fontSize: '28px',
  fontWeight: 700,
  color: '#040C1A',
  minWidth: 90,
  textAlign: 'center' as const,
  margin: '0 8px',
};

const EXERCISES = {
  'Knee Valgus': {
    strengthen: ['Clamshells', 'Monster Walks', 'Single-leg Glute Bridge'],
    foam: ['IT Band Roll', 'Quad Roll'],
    stretch: ['Hip Flexor Stretch', 'Figure-4 Stretch'],
  },
  'Trunk Lean': {
    strengthen: ['Dead Bug', 'Bird Dog', 'Plank'],
    foam: ['Thoracic Roll', 'Lat Roll'],
    stretch: ['Cat-Cow', 'Child’s Pose'],
  },
  'Heel Lift': {
    strengthen: ['Calf Raises', 'Tibialis Raises', 'Single-leg Balance'],
    foam: ['Calf Roll', 'Plantar Fascia Roll'],
    stretch: ['Standing Calf Stretch', 'Downward Dog'],
  },
  'Asymmetry': {
    strengthen: ['Single-leg Squat', 'Step-ups', 'Lateral Band Walk'],
    foam: ['Glute Roll', 'Hamstring Roll'],
    stretch: ['Hamstring Stretch', 'Adductor Stretch'],
  },
  'Arms Drop': {
    strengthen: ['Wall Angels', 'Face Pulls', 'Y-T-W Raises'],
    foam: ['Lat Roll', 'Upper Back Roll'],
    stretch: ['Doorway Stretch', 'Child’s Pose'],
  },
};

interface ResultsScreenProps {
  results: {
    mobility: number;
    stability?: number;
    activation?: number;
    symmetry: number;
    posture?: number;
    compensation?: number;
    injuryRisk: number | null;
    tier: 'Elite' | 'Pro' | 'Amateur' | 'Novice' | string;
    flags: string[];
  };
  onRetake: () => void;
}

function getAllExercises(flags: string[]) {
  const strengthen = new Set<string>();
  const foam = new Set<string>();
  const stretch = new Set<string>();
  flags.forEach((flag: string) => {
    const ex = EXERCISES[flag as keyof typeof EXERCISES];
    if (ex) {
      ex.strengthen.forEach((s: string) => strengthen.add(s));
      ex.foam.forEach((f: string) => foam.add(f));
      ex.stretch.forEach((st: string) => stretch.add(st));
    }
  });
  return {
    strengthen: Array.from(strengthen),
    foam: Array.from(foam),
    stretch: Array.from(stretch),
  };
}

const JOINTS = [
  { name: 'left_ankle', x: 45, y: 220 },
  { name: 'right_ankle', x: 75, y: 220 },
  { name: 'left_knee', x: 45, y: 170 },
  { name: 'right_knee', x: 75, y: 170 },
  { name: 'left_hip', x: 45, y: 120 },
  { name: 'right_hip', x: 75, y: 120 },
  { name: 'left_shoulder', x: 30, y: 70 },
  { name: 'right_shoulder', x: 90, y: 70 },
];

function getJointColor(flagTiers: Record<string, string>, joint: string) {
  // Map joint to flag, then to tier color
  // For demo, color by highest risk flag present
  if (!flagTiers || !joint) return TIER_COLORS.Elite;
  if (flagTiers[joint] === 'Novice') return TIER_COLORS.Novice;
  if (flagTiers[joint] === 'Amateur') return TIER_COLORS.Amateur;
  if (flagTiers[joint] === 'Pro') return TIER_COLORS.Pro;
  return TIER_COLORS.Elite;
}

export default function ResultsScreen({ results, onRetake }: ResultsScreenProps) {
  // For demo, assign all flagged joints to Amateur (yellow), others to Elite (green)
  const flagTiers: Record<string, string> = {};
  (results.flags || []).forEach(flag => {
    if (flag === 'Knee Valgus') {
      flagTiers['left_knee' as string] = 'Amateur';
      flagTiers['right_knee' as string] = 'Amateur';
    }
    if (flag === 'Heel Lift') {
      flagTiers['left_ankle' as string] = 'Amateur';
      flagTiers['right_ankle' as string] = 'Amateur';
    }
    if (flag === 'Asymmetry') {
      flagTiers['left_hip' as string] = 'Amateur';
      flagTiers['right_hip' as string] = 'Amateur';
    }
    if (flag === 'Arms Drop') {
      flagTiers['left_shoulder' as string] = 'Novice';
      flagTiers['right_shoulder' as string] = 'Novice';
    }
    if (flag === 'Trunk Lean') {
      flagTiers['left_shoulder' as string] = 'Amateur';
      flagTiers['right_shoulder' as string] = 'Amateur';
    }
  });
  const exercises = getAllExercises(results.flags || []);
  return (
    <div style={{ minHeight: '100vh', background: BRAND_DARK, color: 'white', fontFamily: FONT_FAMILY, padding: 0, margin: 0 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0 8px 0' }}>
        <img src={LOGO_URL} alt="PickleRX Logo" style={{ height: 56, marginRight: 18 }} />
        <span style={{ color: 'white', fontWeight: 800, fontSize: 40, letterSpacing: 2 }}>PickleRX</span>
      </div>
      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>Movement Assessment</div>
      {/* Performance Tier */}
      <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: TIER_COLORS[results.tier as keyof typeof TIER_COLORS] || '#fff', marginBottom: 24 }}>{results.tier}</div>
      {/* Scores Grid */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 32 }}>
        <div style={SCORE_BOX}><div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 2 }}>Mobility</div>{results.mobility}</div>
        <div style={SCORE_BOX}><div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 2 }}>Stability</div>{results.stability ?? '--'}</div>
        <div style={SCORE_BOX}><div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 2 }}>Activation</div>{results.activation ?? results.compensation ?? '--'}</div>
        <div style={SCORE_BOX}><div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 2 }}>Symmetry</div>{results.symmetry}</div>
        <div style={SCORE_BOX}><div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 2 }}>Posture</div>{results.posture ?? '--'}</div>
        <div style={SCORE_BOX}><div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginBottom: 2 }}>Injury Risk</div>{results.injuryRisk ?? 0}</div>
      </div>
      {/* Silhouette with Joint Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <svg width="180" height="340" viewBox="0 0 120 260">
          {/* Head */}
          <circle cx="60" cy="30" r="18" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          {/* Shoulders */}
          <circle cx="30" cy="70" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          <circle cx="90" cy="70" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          {/* Hips */}
          <circle cx="45" cy="120" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          <circle cx="75" cy="120" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          {/* Knees */}
          <circle cx="45" cy="170" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          <circle cx="75" cy="170" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          {/* Ankles */}
          <circle cx="45" cy="220" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          <circle cx="75" cy="220" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          {/* Body lines */}
          <line x1="60" y1="48" x2="60" y2="120" stroke="#fff" strokeWidth="4" /> {/* Head to hips */}
          <line x1="30" y1="70" x2="90" y2="70" stroke="#fff" strokeWidth="4" /> {/* Shoulders */}
          <line x1="45" y1="120" x2="45" y2="220" stroke="#fff" strokeWidth="4" /> {/* Left leg */}
          <line x1="75" y1="120" x2="75" y2="220" stroke="#fff" strokeWidth="4" /> {/* Right leg */}
          {/* Joint Dots */}
          {JOINTS.map(joint => (
            <circle key={joint.name} cx={joint.x} cy={joint.y} r="10" fill={getJointColor(flagTiers, joint.name)} stroke="#fff" strokeWidth="3" />
          ))}
        </svg>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24, fontSize: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: TIER_COLORS.Elite, marginRight: 8 }}></span>Elite</div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: TIER_COLORS.Pro, marginRight: 8 }}></span>Pro</div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: TIER_COLORS.Amateur, marginRight: 8 }}></span>Amateur</div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: TIER_COLORS.Novice, marginRight: 8 }}></span>Novice</div>
      </div>
      {/* Analysis */}
      <div style={{ maxWidth: 600, margin: '0 auto 24px auto', background: '#16213A', borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: TIER_COLORS.Amateur }}>Front View Analysis</div>
        <ul style={{ fontSize: 18, marginBottom: 0, color: 'white', paddingLeft: 24 }}>
          {results.flags.length > 0 ? (
            results.flags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))
          ) : (
            <li>No significant compensations detected.</li>
          )}
        </ul>
      </div>
      {/* Exercise Recommendations */}
      <div style={{ maxWidth: 600, margin: '0 auto 24px auto', background: '#16213A', borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: TIER_COLORS.Elite }}>Recommended Exercises</div>
        <div style={{ fontSize: 18, marginBottom: 8, color: 'white' }}><b>Strengthening:</b> {exercises.strengthen.join(', ') || 'Maintain your current training, your squat looks solid!'}</div>
        <div style={{ fontSize: 18, marginBottom: 8, color: 'white' }}><b>Soft Tissue:</b> {exercises.foam.join(', ') || '-'}</div>
        <div style={{ fontSize: 18, color: 'white' }}><b>Stretching:</b> {exercises.stretch.join(', ') || '-'}</div>
      </div>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <button onClick={onRetake} style={{ background: TIER_COLORS.Elite, color: BRAND_DARK, fontWeight: 700, fontSize: 22, padding: '16px 48px', border: 'none', borderRadius: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', letterSpacing: 1 }}>Retake Assessment</button>
      </div>
    </div>
  );
} 