'use client';

import React, { useRef, useEffect } from 'react';
import { Keypoint } from '../types';

const SKELETON_CONNECTIONS: [string, string][] = [
  ["left_eye", "right_eye"],
  ["left_eye", "left_ear"],
  ["right_eye", "right_ear"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

interface PoseOverlayProps {
  keypoints: Keypoint[];
  videoRef?: React.RefObject<HTMLVideoElement>;
  scaleX?: number;
  scaleY?: number;
  videoWidth?: number;
  videoHeight?: number;
}

export default function PoseOverlay({
  keypoints,
  videoRef,
  scaleX = 1,
  scaleY = 1,
  videoWidth = 1280,
  videoHeight = 720,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scaleKeypoints = (kp: Keypoint) => ({
    x: kp.x * videoWidth * scaleX,
    y: kp.y * videoHeight * scaleY,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef?.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
  }, [videoRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !keypoints.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    // Draw skeleton lines - always draw, use gray for low confidence
    SKELETON_CONNECTIONS.forEach(([p1, p2]) => {
      const kp1 = keypoints.find((k) => k.name === p1);
      const kp2 = keypoints.find((k) => k.name === p2);

      if (kp1 && kp2) {
        const pt1 = scaleKeypoints(kp1);
        const pt2 = scaleKeypoints(kp2);

        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = kp1.score >= 0.4 && kp2.score >= 0.4 ? 'lime' : 'gray';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Draw keypoints - always draw all keypoints
    keypoints.forEach((kp) => {
      const { x, y } = scaleKeypoints(kp);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = kp.score >= 0.4 ? 'lime' : 'gray';
      ctx.fill();
    });

    ctx.restore();
  }, [keypoints, scaleX, scaleY, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
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