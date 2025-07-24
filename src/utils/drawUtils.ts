import { Keypoint } from '../types';

export const drawKeypoints = (keypoints: Keypoint[], ctx: CanvasRenderingContext2D) => {
  // Filter keypoints with good confidence
  const validKeypoints = keypoints.filter(point => (point.score ?? 0) > 0.4);
  
  validKeypoints.forEach((point: Keypoint) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#10B981';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 5;
    ctx.fill();
    
    // Draw confidence percentage
    const confidence = Math.round((point.score ?? 0) * 100);
    ctx.fillStyle = 'white';
    ctx.font = '10px monospace';
    ctx.fillText(`${confidence}%`, point.x + 8, point.y - 8);
  });
};

export const drawSkeleton = (keypoints: Keypoint[], ctx: CanvasRenderingContext2D) => {
  const adjacentKeyPoints = [
    [0, 1], [1, 3], [0, 2], [2, 4], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]
  ];
  
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#10B981';
  ctx.shadowColor = '#10B981';
  ctx.shadowBlur = 5;

  adjacentKeyPoints.forEach(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    
    // Only draw if both keypoints have good confidence
    if ((kp1?.score ?? 0) > 0.4 && (kp2?.score ?? 0) > 0.4) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  });
};

// Calculate joint angles from keypoints
export const calculateJointAngles = (keypoints: Keypoint[]) => {
  const findKeypoint = (name: string) => keypoints.find((kp: Keypoint) => kp.name === name);
  
  const leftAnkle = findKeypoint('left_ankle');
  const leftKnee = findKeypoint('left_knee');
  const leftHip = findKeypoint('left_hip');
  const leftShoulder = findKeypoint('left_shoulder');

  let ankleFlexion = 0;
  let kneeFlexion = 0;
  let hipFlexion = 0;
  let shoulderFlexion = 0;
  let elbowFlexion = 0;
  let wristFlexion = 0;

  if (leftAnkle && leftKnee && leftHip && leftShoulder) {
    // Calculate knee angle
    const kneeToAnkle = Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x);
    const kneeToHip = Math.atan2(leftHip.y - leftKnee.y, leftHip.x - leftKnee.x);
    let angle = (kneeToHip - kneeToAnkle) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    if (angle > 180) angle = 360 - angle;
    kneeFlexion = angle;

    // Calculate hip angle
    const hipToKnee = Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x);
    const hipToShoulder = Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x);
    angle = (hipToShoulder - hipToKnee) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    if (angle > 180) angle = 360 - angle;
    hipFlexion = angle;

    // Calculate ankle angle
    const ankleToKnee = Math.atan2(leftKnee.y - leftAnkle.y, leftKnee.x - leftAnkle.x);
    ankleFlexion = Math.abs(ankleToKnee * 180 / Math.PI);
  }

  return {
    ankleFlexion,
    kneeFlexion,
    hipFlexion,
    shoulderFlexion,
    elbowFlexion,
    wristFlexion
  };
};

// Analyze squat form based on joint angles
export const analyzeSquatForm = (angles: any, currentPhase: string) => {
  const { kneeFlexion, hipFlexion, ankleFlexion } = angles;
  
  let phase = 'setup';
  let depth = 0;
  let form = 0;
  let stability = 0;

  // Determine squat phase based on knee angle
  if (kneeFlexion > 120) {
    phase = 'standing';
    depth = 0;
  } else if (kneeFlexion > 90) {
    phase = 'descending';
    depth = Math.max(0, (120 - kneeFlexion) / 30 * 100);
  } else if (kneeFlexion <= 90) {
    phase = 'bottom';
    depth = 100;
  }

  // Calculate form score based on joint alignment
  const kneeScore = Math.max(0, 100 - Math.abs(kneeFlexion - 90) * 2);
  const hipScore = Math.max(0, 100 - Math.abs(hipFlexion - 45) * 2);
  form = (kneeScore + hipScore) / 2;

  // Calculate stability (simplified)
  stability = 85; // Placeholder

  return {
    phase,
    depth,
    form,
    stability
  };
};

// Draw pose with angles
export const drawPose = (ctx: CanvasRenderingContext2D, pose: any, canvasWidth: number, canvasHeight: number) => {
  if (!pose || !pose.keypoints) return;
  
  const keypoints = pose.keypoints;
  drawKeypoints(keypoints, ctx);
  drawSkeleton(keypoints, ctx);
};

// Draw angle measurements
export const drawAngles = (ctx: CanvasRenderingContext2D, pose: any, canvasWidth: number, canvasHeight: number) => {
  if (!pose || !pose.keypoints) return;
  
  const angles = calculateJointAngles(pose.keypoints);
  const form = analyzeSquatForm(angles, 'current');
  
  // Draw angle text
  ctx.fillStyle = 'white';
  ctx.font = '14px monospace';
  ctx.fillText(`Knee: ${angles.kneeFlexion.toFixed(1)}°`, 10, 20);
  ctx.fillText(`Hip: ${angles.hipFlexion.toFixed(1)}°`, 10, 40);
  ctx.fillText(`Depth: ${form.depth.toFixed(0)}%`, 10, 60);
  ctx.fillText(`Form: ${form.form.toFixed(0)}%`, 10, 80);
}; 