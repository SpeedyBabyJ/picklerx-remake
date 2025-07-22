'use client';

import React, { useRef, useEffect } from 'react';

const SKELETON_CONNECTIONS = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"]
];

interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

interface PoseOverlayProps {
  keypoints: Keypoint[];
}

export default function PoseOverlay({ keypoints }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !keypoints) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw skeleton lines
    SKELETON_CONNECTIONS.forEach(([p1, p2]) => {
      const kp1 = keypoints.find(k => k.name === p1);
      const kp2 = keypoints.find(k => k.name === p2);
      if (kp1 && kp2 && kp1.score > 0.4 && kp2.score > 0.4) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = 'rgba(0,255,0,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw keypoints
    keypoints.forEach((kp) => {
      if (kp.score > 0.4) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'lime';
        ctx.fill();
      }
    });
  }, [keypoints]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 2, transform: 'scaleX(-1)' }}
    />
  );
} 