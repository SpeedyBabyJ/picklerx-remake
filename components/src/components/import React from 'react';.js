import React from 'react';

const ResultsScreen = ({ results, onRetake }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#0b1c2d] text-white p-8">
      <h1 className="text-4xl mb-6">Assessment Results</h1>
      <div className="grid grid-cols-2 gap-6">
        <div>Stability: {results.stability}</div>
        <div>Movement: {results.movement}</div>
        <div>Activation: {results.activation}</div>
        <div>Posture: {results.posture}</div>
        <div>Symmetry: {results.symmetry}</div>
        <div>Injury Risk: {results.injuryRisk} ({results.tier})</div>
      </div>
      <div className="mt-6">
        <p>Flags: {results.flags.join(", ")}</p>
      </div>
      <div className="flex gap-4 mt-8">
        <button onClick={onRetake} className="px-5 py-3 bg-green-600 rounded-xl">Retake</button>
        <button onClick={() => window.location.href = '/'} className="px-5 py-3 bg-white text-[#0b1c2d] rounded-xl">Home</button>
      </div>
    </div>
  );
};

export default ResultsScreen;
