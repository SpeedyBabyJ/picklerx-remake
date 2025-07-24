import { Keypoint, PoseFrame, MetricsOutput } from '../types';

export type { Keypoint, PoseFrame, MetricsOutput };

const riskLibrary = {
  "Knee Valgus": { threshold: 10, explanation: "Weak hip external rotators, knees tracking inward." },
  "Trunk Lean": { threshold: 20, explanation: "Limited ankle mobility or core control, forward torso." },
  "Arms Drop": { threshold: 25, explanation: "Tight lats or limited t-spine mobility, arms drop forward." },
  "Asymmetry": { threshold: 5, explanation: "Side dominance or past injury compensation." },
  "Heel Lift": { threshold: 12, explanation: "Limited dorsiflexion, heel rising off ground." }
};

export const calculateMetrics = (frontFrames: PoseFrame[], sideFrames: PoseFrame[]): MetricsOutput => {
  if (frontFrames.length < 10 || sideFrames.length < 10) {
    return {
      mobility: 0,
      compensation: 0,
      symmetry: 0,
      injuryRisk: null,
      tier: "Incomplete",
      flags: []
    };
  }

  let totalMobility = 0;
  let totalCompensation = 0;
  let totalSymmetry = 0;
  const compensationCounts: Record<string, number> = {};

  const combinedFrames = [...frontFrames, ...sideFrames];

  combinedFrames.forEach(frame => {
    const kneeDiff = calculateLeftRightAngleDifference(frame, "left_knee", "right_knee");
    const hipDiff = calculateLeftRightAngleDifference(frame, "left_hip", "right_hip");
    const shoulderDiff = calculateLeftRightAngleDifference(frame, "left_shoulder", "right_shoulder");

    // Sum for symmetry
    totalSymmetry += (Math.abs(kneeDiff) + Math.abs(hipDiff) + Math.abs(shoulderDiff)) / 3;

    // Check compensations
    if (Math.abs(kneeDiff) > riskLibrary["Asymmetry"].threshold) incrementFlag(compensationCounts, "Asymmetry");

    const trunkAngle = calculateTrunkLean(frame);
    if (trunkAngle > riskLibrary["Trunk Lean"].threshold) incrementFlag(compensationCounts, "Trunk Lean");

    const armsDropAngle = calculateArmsDrop(frame);
    if (armsDropAngle > riskLibrary["Arms Drop"].threshold) incrementFlag(compensationCounts, "Arms Drop");

    if (detectKneeValgus(frame, riskLibrary["Knee Valgus"].threshold)) incrementFlag(compensationCounts, "Knee Valgus");
    if (detectHeelLift(frame, riskLibrary["Heel Lift"].threshold)) incrementFlag(compensationCounts, "Heel Lift");

    // Basic aggregation for general mobility & compensation
    totalMobility += 100 - trunkAngle;  // simplistic sample scoring
    totalCompensation += Object.keys(compensationCounts).length * 5;
  });

  const numFrames = combinedFrames.length;

  const mobilityScore = Math.max(0, Math.min(100, totalMobility / numFrames));
  const compensationScore = Math.max(0, 100 - (totalCompensation / numFrames));
  const symmetryScore = Math.max(0, 100 - (totalSymmetry / numFrames));

  // Determine flags by dominant compensations
  const flags = Object.keys(compensationCounts).filter(key => compensationCounts[key] > 1);

  const injuryRisk = flags.length;
  const tier = calculateRiskTier(injuryRisk);

  return {
    mobility: Math.round(mobilityScore),
    compensation: Math.round(compensationScore),
    symmetry: Math.round(symmetryScore),
    injuryRisk,
    tier,
    flags
  };
};

export const calculateRiskTier = (injuryRisk: number | null): "Elite" | "Pro" | "Amateur" | "Incomplete" => {
  if (injuryRisk === null) return "Incomplete";
  if (injuryRisk <= 1) return "Elite";
  if (injuryRisk <= 3) return "Pro";
  return "Amateur";
};

const incrementFlag = (counts: Record<string, number>, flag: string) => {
  counts[flag] = (counts[flag] || 0) + 1;
};

// Example simple joint diff — for real app use proper angle calcs
const calculateLeftRightAngleDifference = (frame: PoseFrame, left: string, right: string): number => {
  const leftPoint = frame.find((kp: Keypoint) => kp.name === left);
  const rightPoint = frame.find((kp: Keypoint) => kp.name === right);
  if (!leftPoint || !rightPoint) return 0;
  return Math.abs(leftPoint.y - rightPoint.y);
};

const calculateTrunkLean = (frame: PoseFrame): number => {
  const shoulder = frame.find((kp: Keypoint) => kp.name === 'left_shoulder') || frame.find((kp: Keypoint) => kp.name === 'right_shoulder');
  const hip = frame.find((kp: Keypoint) => kp.name === 'left_hip') || frame.find((kp: Keypoint) => kp.name === 'right_hip');
  if (!shoulder || !hip) return 0;
  const angle = Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x) * (180 / Math.PI);
  return Math.abs(angle);
};

const calculateArmsDrop = (frame: PoseFrame): number => {
  const shoulder = frame.find((kp: Keypoint) => kp.name === 'left_shoulder') || frame.find((kp: Keypoint) => kp.name === 'right_shoulder');
  const wrist = frame.find((kp: Keypoint) => kp.name === 'left_wrist') || frame.find((kp: Keypoint) => kp.name === 'right_wrist');
  if (!shoulder || !wrist) return 0;
  const angle = Math.atan2(shoulder.y - wrist.y, shoulder.x - wrist.x) * (180 / Math.PI);
  return Math.abs(angle);
};

const detectKneeValgus = (frame: PoseFrame, threshold: number): boolean => {
  const knee = frame.find((kp: Keypoint) => kp.name === 'left_knee') || frame.find((kp: Keypoint) => kp.name === 'right_knee');
  const ankle = frame.find((kp: Keypoint) => kp.name === 'left_ankle') || frame.find((kp: Keypoint) => kp.name === 'right_ankle');
  const hip = frame.find((kp: Keypoint) => kp.name === 'left_hip') || frame.find((kp: Keypoint) => kp.name === 'right_hip');
  if (!knee || !ankle || !hip) return false;

  const upperAngle = Math.atan2(hip.y - knee.y, hip.x - knee.x);
  const lowerAngle = Math.atan2(ankle.y - knee.y, ankle.x - knee.x);
  let valgusAngle = (upperAngle - lowerAngle) * (180 / Math.PI);
  if (valgusAngle < 0) valgusAngle += 360;
  if (valgusAngle > 180) valgusAngle = 360 - valgusAngle;

  return valgusAngle > threshold;
};

const detectHeelLift = (frame: PoseFrame, threshold: number): boolean => {
  const ankle = frame.find((kp: Keypoint) => kp.name === 'left_ankle') || frame.find((kp: Keypoint) => kp.name === 'right_ankle');
  if (!ankle) return false;
  return ankle.y < threshold;
}; 