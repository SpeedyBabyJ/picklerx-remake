export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

export type PoseFrame = Keypoint[];

export interface MetricsOutput {
  mobility: number;
  compensation: number;
  symmetry: number;
  injuryRisk: number | null;
  tier: "Elite" | "Pro" | "Amateur" | "Incomplete";
  flags: string[];
} 