export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name:
    | "nose"
    | "left_eye"
    | "right_eye"
    | "left_ear"
    | "right_ear"
    | "left_shoulder"
    | "right_shoulder"
    | "left_elbow"
    | "right_elbow"
    | "left_wrist"
    | "right_wrist"
    | "left_hip"
    | "right_hip"
    | "left_knee"
    | "right_knee"
    | "left_ankle"
    | "right_ankle";
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