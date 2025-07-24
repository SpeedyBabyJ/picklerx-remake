'use client';

import React, { useRef, useEffect } from 'react';
import { Keypoint } from '../types';

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
  ["right_knee", "right_ankle"],
];

interface PoseOverlayProps {
  keypoints: Keypoint[];
}

export default function PoseOverlay({ keypoints }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to scale keypoints if normalized
  const scaleKeypoints = (kp: Keypoint, canvas: HTMLCanvasElement) => {
    // Check if coordinates are normalized (0-1) or pixel coordinates
    if (kp.x <= 1 && kp.y <= 1) {
      return {
        x: kp.x * canvas.width,
        y: kp.y * canvas.height,
      };
    }
    return { x: kp.x, y: kp.y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !keypoints || keypoints.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter keypoints with good confidence
    const validKeypoints = keypoints.filter(kp => kp.score > 0.4);
    
    if (validKeypoints.length === 0) {
      console.log('⚠️ No keypoints with confidence > 0.4');
      return;
    }

    console.log(`🎯 Drawing ${validKeypoints.length} keypoints with confidence > 0.4`);

    // Draw skeleton lines
    SKELETON_CONNECTIONS.forEach(([p1, p2]) => {
      const kp1 = validKeypoints.find((k: Keypoint) => k.name === p1);
      const kp2 = validKeypoints.find((k: Keypoint) => k.name === p2);
      
      if (kp1 && kp2 && kp1.score > 0.4 && kp2.score > 0.4) {
        const pt1 = scaleKeypoints(kp1, canvas);
        const pt2 = scaleKeypoints(kp2, canvas);
        
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Draw keypoints
    validKeypoints.forEach((kp) => {
      if (kp.score > 0.4) {
        const { x, y } = scaleKeypoints(kp, canvas);
        
        // Draw keypoint circle
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'lime';
        ctx.fill();
        
        // Draw confidence indicator
        const confidence = Math.round(kp.score * 100);
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`${confidence}%`, x + 8, y - 8);
      }
    });

    // Log drawing stats
    console.log(`✅ Drew ${validKeypoints.length} keypoints and skeleton connections`);
  }, [keypoints]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
} 