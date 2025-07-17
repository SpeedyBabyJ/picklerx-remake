import React, { useState } from 'react';
import CameraCapture from './CameraCapture';
import ResultsScreen from './ResultsScreen';

const OverheadSquatAssessment = () => {
  const [assessmentPhase, setAssessmentPhase] = useState("notStarted");
  const [frontScores, setFrontScores] = useState([]);
  const [sideScores, setSideScores] = useState([]);
  const [finalResults, setFinalResults] = useState(null);

  const [countdown, setCountdown] = useState(3);

  const startCountdown = (nextPhase) => {
    setCountdown(3);
    setAssessmentPhase("countdown");
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(timer);
          setAssessmentPhase(nextPhase);
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onCaptureMetrics = (pose) => {
    if (assessmentPhase === "recordFront") setFrontScores(prev => [...prev, pose]);
    if (assessmentPhase === "recordSide") setSideScores(prev => [...prev, pose]);
  };

  const completeAssessment = () => {
    // average or apply your risk calculation logic here
    const results = {
      stability: 85,
      movement: 78,
      activation: 90,
      posture: 73,
      symmetry: 80,
      injuryRisk: 2,
      tier: "Pro",
      flags: ["Trunk Lean", "Knee Valgus"]
    };
    setFinalResults(results);
    setAssessmentPhase("done");
  };

  if (assessmentPhase === "done") return <ResultsScreen results={finalResults} onRetake={() => window.location.reload()} />;

  return (
    <div className="w-full h-full relative">
      {["notStarted", "countdown", "recordFront", "pauseRotateSide", "recordSide"].includes(assessmentPhase) && (
        <CameraCapture assessmentPhase={assessmentPhase} onCaptureMetrics={onCaptureMetrics} />
      )}

      {assessmentPhase === "notStarted" && (
        <button className="absolute inset-x-0 bottom-8 mx-auto px-6 py-3 bg-green-600 text-white rounded-xl" 
          onClick={() => startCountdown("recordFront")}>Start Assessment</button>
      )}

      {assessmentPhase === "countdown" && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-6xl text-white">
          {countdown}
        </div>
      )}

      {assessmentPhase === "recordFront" && frontScores.length > 30 && (
        <div className="absolute bottom-8 w-full text-center">
          <button className="px-5 py-3 bg-blue-600 text-white rounded-xl"
            onClick={() => setAssessmentPhase("pauseRotateSide")}>Done Front View</button>
        </div>
      )}

      {assessmentPhase === "pauseRotateSide" && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white">
          <p className="text-2xl mb-4">Rotate to side view</p>
          <button className="px-5 py-3 bg-green-600 rounded-xl"
            onClick={() => startCountdown("recordSide")}>Start Side</button>
        </div>
      )}

      {assessmentPhase === "recordSide" && sideScores.length > 30 && (
        <div className="absolute bottom-8 w-full text-center">
          <button className="px-5 py-3 bg-green-600 text-white rounded-xl"
            onClick={() => completeAssessment()}>Complete Assessment</button>
        </div>
      )}
    </div>
  );
};

export default OverheadSquatAssessment;
