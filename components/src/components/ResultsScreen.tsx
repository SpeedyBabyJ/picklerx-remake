'use client';

import React from 'react';

interface ResultsScreenProps {
  results: {
    mobility: number;
    symmetry: number;
    compensation: number;
    injuryRisk: number | null;
    tier: "Elite" | "Pro" | "Amateur" | "Incomplete";
    flags: string[];
  };
  onRetake: () => void;
}

const RISK_LIBRARY: Record<string, string> = {
  "Knee Valgus": "Work on hip external rotator strength and knee tracking.",
  "Trunk Lean": "Focus on ankle mobility and core stability.",
  "Heel Lift": "Improve ankle dorsiflexion with calf stretches.",
  "Asymmetry": "Perform unilateral strengthening exercises.",
  "Arms Drop": "Incorporate thoracic mobility and lat stretches."
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case "Elite": return "text-green-500";
    case "Pro": return "text-blue-500";
    case "Amateur": return "text-yellow-400";
    default: return "text-white";
  }
};

const getMetricColor = (score: number) => {
  if (score >= 85) return "text-green-500";
  if (score >= 70) return "text-blue-500";
  if (score >= 50) return "text-yellow-400";
  return "text-red-500";
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ results, onRetake }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1c2d] text-white font-sans p-6">
      {/* Header */}
      <h1 className="text-4xl font-bold uppercase tracking-wide mb-2">Movement Assessment</h1>
      <div className={`text-3xl font-bold uppercase mb-6 ${getTierColor(results.tier)}`}>{results.tier}</div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-8 text-center mb-8">
        <div>
          <div className={`text-5xl font-bold ${getMetricColor(results.mobility)}`}>{results.mobility}</div>
          <div className="mt-2 text-lg uppercase tracking-wide">Mobility</div>
        </div>
        <div>
          <div className={`text-5xl font-bold ${getMetricColor(results.symmetry)}`}>{results.symmetry}</div>
          <div className="mt-2 text-lg uppercase tracking-wide">Symmetry</div>
        </div>
        <div>
          <div className={`text-5xl font-bold ${getMetricColor(results.compensation)}`}>{results.compensation}</div>
          <div className="mt-2 text-lg uppercase tracking-wide">Compensation</div>
        </div>
      </div>

      {/* SVG Human Figure with Color-coded Joints */}
      <div className="mb-8">
        <svg width="120" height="260" viewBox="0 0 120 260">
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
        </svg>
        <div className="flex justify-center space-x-4 mt-2 text-sm">
          <div className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-1"></span>Elite</div>
          <div className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-blue-500 mr-1"></span>Pro</div>
          <div className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-yellow-400 mr-1"></span>Amateur</div>
        </div>
      </div>

      {/* Squat Analysis */}
      <div className="w-full max-w-xl mt-2">
        <h2 className="text-2xl font-semibold mb-4 uppercase tracking-wide">Squat Analysis</h2>
        <ul className="list-disc list-inside space-y-2 text-lg">
          {results.flags.length > 0 ? (
            results.flags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))
          ) : (
            <li>No significant compensations detected.</li>
          )}
        </ul>
      </div>

      {/* Corrective Exercises */}
      <div className="w-full max-w-xl mt-4">
        <h2 className="text-xl font-semibold mb-2">Recommended Corrective Exercises</h2>
        <p className="text-base text-white/90">
          {results.flags.length > 0 ?
            results.flags.map(flag => RISK_LIBRARY[flag] || null).filter(Boolean).join(" ")
            : "Maintain your current training, your squat looks solid!"
          }
        </p>
      </div>

      <button
        onClick={onRetake}
        className="mt-8 px-6 py-3 bg-green-600 rounded-xl text-xl font-semibold hover:bg-green-700 transition">
        Retake Assessment
      </button>
    </div>
  );
};

export default ResultsScreen; 