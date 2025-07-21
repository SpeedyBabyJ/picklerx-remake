'use client';

import React, { useRef, useEffect } from 'react';

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
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
      style={{ position: 'absolute', top: 0, left: 0, transform: 'scaleX(-1)' }}
    />
  );
} 