import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import { drawKeypoints, drawSkeleton } from '../src/utils/drawUtils';
import KalmanFilter from '../src/utils/KalmanFilter';

const smoothingFilters = {};
const poseHistory = [];
const maxHistory = 30;

const CameraCapture = ({ assessmentPhase, onCaptureMetrics }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);

  useEffect(() => {
    const init = async () => {
      await tf.setBackend('webgl');
      const model = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      setDetector(model);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    };
    init();
  }, []);

  const smoothKeypoints = (keypoints) => {
    return keypoints.map((kp, i) => {
      if (!smoothingFilters[i]) smoothingFilters[i] = new KalmanFilter();
      return {
        x: smoothingFilters[i].filter(kp.x),
        y: smoothingFilters[i].filter(kp.y),
        score: kp.score
      };
    });
  };

  const isCriticalRange = (pose) => {
    // Example: knee < 90 deg, or low velocity
    // Use poseHistory to calculate angle or velocity here
    // Simplified: just checks if we have enough samples
    return poseHistory.length > 10;
  };

  useEffect(() => {
    if (!detector) return;

    const ctx = canvasRef.current.getContext('2d');

    const render = async () => {
      if (videoRef.current.readyState === 4) {
        const poses = await detector.estimatePoses(videoRef.current);
        if (poses.length > 0) {
          const smoothed = smoothKeypoints(poses[0].keypoints);
          poseHistory.push(smoothed);
          if (poseHistory.length > maxHistory) poseHistory.shift();

          // Draw overlay
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          drawKeypoints(smoothed, ctx);
          drawSkeleton(smoothed, ctx);

          // Only calculate heavy metrics if in phase and inside critical range
          if (["recordFront", "recordSide"].includes(assessmentPhase) && isCriticalRange(smoothed)) {
            onCaptureMetrics(smoothed);
          }
        }
      }
      requestAnimationFrame(render);
    };
    render();
  }, [detector, assessmentPhase, onCaptureMetrics]);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} width={640} height={480} className="absolute top-0 left-0" />
    </div>
  );
};

export default CameraCapture;
