'use client';

import React from 'react';

const LOGO_URL = '/file.svg'; // Update if needed
const BRAND_GREEN = '#8CD211';
const BRAND_DARK = '#0B1C2D';
const BRAND_YELLOW = '#FFD600';
const BRAND_BLUE = '#00B2FF';
const BRAND_RED = '#FF3B30';
const BRAND_FONT = 'system-ui, sans-serif';

const TIER_COLORS: Record<string, string> = {
  Elite: BRAND_GREEN,
  Pro: BRAND_BLUE,
  Amateur: BRAND_YELLOW,
  Novice: BRAND_RED,
};

const RISK_LIBRARY: Record<string, string> = {
  'Knee Valgus': 'Work on hip external rotator strength and knee tracking.',
  'Trunk Lean': 'Focus on ankle mobility and core stability.',
  'Heel Lift': 'Improve ankle dorsiflexion with calf stretches.',
  'Asymmetry': 'Perform unilateral strengthening exercises.',
  'Arms Drop': 'Incorporate thoracic mobility and lat stretches.',
};

const EXERCISES: Record<string, { strengthen: string[]; foam: string[]; stretch: string[] }> = {
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

function getTierColor(tier: string) {
  return TIER_COLORS[tier] || 'white';
}

function getMetricColor(score: number) {
  if (score >= 85) return BRAND_GREEN;
  if (score >= 70) return BRAND_BLUE;
  if (score >= 50) return BRAND_YELLOW;
  return BRAND_RED;
}

function getBodyMapRiskCircles(flags: string[]) {
  // Map risk flags to body map joint positions and colors
  // Example: left_shoulder, right_shoulder, left_knee, right_knee, left_ankle, right_ankle
  const jointMap: Record<string, { x: number; y: number; color: string }> = {
    'Knee Valgus': { x: 45, y: 170, color: BRAND_RED },
    'Trunk Lean': { x: 60, y: 70, color: BRAND_YELLOW },
    'Heel Lift': { x: 45, y: 220, color: BRAND_YELLOW },
    'Asymmetry': { x: 75, y: 120, color: BRAND_YELLOW },
    'Arms Drop': { x: 30, y: 70, color: BRAND_YELLOW },
  };
  return flags.map((flag, idx) => {
    const joint = jointMap[flag];
    if (!joint) return null;
    return <circle key={flag} cx={joint.x} cy={joint.y} r="12" fill={joint.color} stroke="#fff" strokeWidth="3" />;
  });
}

function getAllExercises(flags: string[]) {
  const strengthen = new Set<string>();
  const foam = new Set<string>();
  const stretch = new Set<string>();
  flags.forEach(flag => {
    const ex = EXERCISES[flag];
    if (ex) {
      ex.strengthen.forEach(s => strengthen.add(s));
      ex.foam.forEach(f => foam.add(f));
      ex.stretch.forEach(st => stretch.add(st));
    }
  });
  return {
    strengthen: Array.from(strengthen),
    foam: Array.from(foam),
    stretch: Array.from(stretch),
  };
}

export default function ResultsScreen({ results, onRetake }: any) {
  const exercises = getAllExercises(results.flags);
  return (
    <div style={{ minHeight: '100vh', background: BRAND_DARK, color: 'white', fontFamily: BRAND_FONT, padding: 0, margin: 0 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0 8px 0' }}>
        <img src={LOGO_URL} alt="PickleRX Logo" style={{ height: 56, marginRight: 18 }} />
        <span style={{ color: 'white', fontWeight: 800, fontSize: 40, letterSpacing: 2 }}>PickleRX</span>
      </div>
      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>Movement Assessment</div>
      {/* Performance Tier */}
      <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: getTierColor(results.tier), marginBottom: 24 }}>{results.tier}</div>
      {/* Scores */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32 }}>
        <div style={{ background: '#16213A', borderRadius: 16, padding: '24px 32px', textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Mobility</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: getMetricColor(results.mobility) }}>{results.mobility}</div>
        </div>
        <div style={{ background: '#16213A', borderRadius: 16, padding: '24px 32px', textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Symmetry</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: getMetricColor(results.symmetry) }}>{results.symmetry}</div>
        </div>
        <div style={{ background: '#16213A', borderRadius: 16, padding: '24px 32px', textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Activation</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: getMetricColor(results.compensation) }}>{results.compensation}</div>
        </div>
        <div style={{ background: '#16213A', borderRadius: 16, padding: '24px 32px', textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Injury Risk</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: getMetricColor(results.injuryRisk ?? 0) }}>{results.injuryRisk ?? 0}</div>
        </div>
      </div>
      {/* Body Map */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <svg width="180" height="340" viewBox="0 0 120 260">
          {/* Head */}
          <circle cx="60" cy="30" r="18" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          {/* Shoulders */}
          <circle cx="30" cy="70" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          <circle cx="90" cy="70" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          {/* Hips */}
          <circle cx="45" cy="120" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          <circle cx="75" cy="120" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          {/* Knees */}
          <circle cx="45" cy="170" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          <circle cx="75" cy="170" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          {/* Ankles */}
          <circle cx="45" cy="220" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          <circle cx="75" cy="220" r="10" fill="#facc15" stroke="#fff" strokeWidth="2" />
          {/* Body lines */}
          <line x1="60" y1="48" x2="60" y2="120" stroke="#fff" strokeWidth="4" /> {/* Head to hips */}
          <line x1="30" y1="70" x2="90" y2="70" stroke="#fff" strokeWidth="4" /> {/* Shoulders */}
          <line x1="45" y1="120" x2="45" y2="220" stroke="#fff" strokeWidth="4" /> {/* Left leg */}
          <line x1="75" y1="120" x2="75" y2="220" stroke="#fff" strokeWidth="4" /> {/* Right leg */}
          {/* Risk Circles */}
          {getBodyMapRiskCircles(results.flags)}
        </svg>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24, fontSize: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: BRAND_GREEN, marginRight: 8 }}></span>Elite</div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: BRAND_BLUE, marginRight: 8 }}></span>Pro</div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: BRAND_YELLOW, marginRight: 8 }}></span>Amateur</div>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: BRAND_RED, marginRight: 8 }}></span>Novice</div>
      </div>
      {/* Analysis */}
      <div style={{ maxWidth: 600, margin: '0 auto 24px auto', background: '#16213A', borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: BRAND_GREEN }}>Front View Analysis</div>
        <ul style={{ fontSize: 18, marginBottom: 0, color: 'white', paddingLeft: 24 }}>
          {results.flags.length > 0 ? (
            results.flags.map((flag: string, idx: number) => (
              <li key={idx}>{flag}</li>
            ))
          ) : (
            <li>No significant compensations detected.</li>
          )}
        </ul>
      </div>
      {/* Exercise Recommendations */}
      <div style={{ maxWidth: 600, margin: '0 auto 24px auto', background: '#16213A', borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: BRAND_GREEN }}>Recommended Exercises</div>
        <div style={{ fontSize: 18, marginBottom: 8, color: 'white' }}><b>Strengthening:</b> {exercises.strengthen.join(', ') || 'Maintain your current training, your squat looks solid!'}</div>
        <div style={{ fontSize: 18, marginBottom: 8, color: 'white' }}><b>Foam Rolling:</b> {exercises.foam.join(', ') || '-'}</div>
        <div style={{ fontSize: 18, color: 'white' }}><b>Stretching:</b> {exercises.stretch.join(', ') || '-'}</div>
      </div>
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <button onClick={onRetake} style={{ background: BRAND_GREEN, color: BRAND_DARK, fontWeight: 700, fontSize: 22, padding: '16px 48px', border: 'none', borderRadius: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', letterSpacing: 1 }}>Retake Assessment</button>
      </div>
    </div>
  );
} 