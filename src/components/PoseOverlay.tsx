'use client';

import React, { useRef, useEffect } from 'react';
import { drawPose, drawAngles } from '../utils/drawUtils';

interface PoseOverlayProps {
  poses: any[]; // Changed from poseDetection.Pose[]
  videoElement: HTMLVideoElement | null;
  showSkeleton: boolean;
  showAngles: boolean;
  showLandmarks: boolean;
}

const PoseOverlay: React.FC<PoseOverlayProps> = ({
  poses,
  videoElement,
  showSkeleton,
  showAngles,
  showLandmarks
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !videoElement || poses.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pose for each detected person
    poses.forEach((pose) => {
      if (showSkeleton) {
        drawPose(ctx, pose, canvas.width, canvas.height);
      }
      
      if (showAngles) {
        drawAngles(ctx, pose, canvas.width, canvas.height);
      }
      
      if (showLandmarks) {
        drawLandmarks(ctx, pose, canvas.width, canvas.height);
      }
    });
  }, [poses, videoElement, showSkeleton, showAngles, showLandmarks]);

  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    pose: any, // Changed from poseDetection.Pose
    canvasWidth: number,
    canvasHeight: number
  ) => {
    pose.keypoints.forEach((keypoint: any) => { // Changed from poseDetection.Pose
      if (keypoint.score && keypoint.score > 0.3) {
        const x = keypoint.x * canvasWidth;
        const y = keypoint.y * canvasHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        
        // Draw keypoint name
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(keypoint.name || '', x + 5, y - 5);
      }
    });
  };

  if (!videoElement) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{
        width: videoElement.offsetWidth,
        height: videoElement.offsetHeight
      }}
    />
  );
};

export default PoseOverlay; 