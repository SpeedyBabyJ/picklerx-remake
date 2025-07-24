import React, { useRef, useEffect, useState, useCallback } from 'react';
import PoseOverlay from './PoseOverlay';
import { safeImportTensorFlow } from '../utils/tensorflow-safe';
import { Keypoint } from '../types';

type AssessmentPhase = 'idle' | 'countdown' | 'recordFront' | 'pause' | 'recordSide' | 'computing' | 'complete';

interface CameraCaptureProps {
  onPoseDetected?: (pose: any) => void;
  assessmentPhase: AssessmentPhase;
  onSquatComplete: () => void;
  onCaptureFrame: (keypoints: any) => void;
}

const getAngle = (a: Keypoint, b: Keypoint, c: Keypoint) => {
  // Calculate angle at joint B using 3 points
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  let angle = Math.acos(dot / (magAB * magCB));
  return (angle * 180) / Math.PI;
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onPoseDetected, 
  assessmentPhase, 
  onSquatComplete, 
  onCaptureFrame 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [detector, setDetector] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [poses, setPoses] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const frameCountRef = useRef(0);
  const repInProgress = useRef(false);
  const startHoldTime = useRef<number | null>(null);
  const squatCount = useRef(0);

  // Ensure client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Log assessment phase for debugging
  useEffect(() => {
    console.log("🌀 Phase:", assessmentPhase);
  }, [assessmentPhase]);

  // Initialize TensorFlow.js and camera
  useEffect(() => {
    const loadDetector = async () => {
      try {
        if (!isClient) return;
        const { tf, posedetection } = await safeImportTensorFlow();
        if (!tf || !posedetection) {
          console.error('❌ TensorFlow.js not available');
          return;
        }
        const model = posedetection.SupportedModels.MoveNet;
        const detectorConfig = { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        const newDetector = await posedetection.createDetector(model, detectorConfig);
        setDetector(newDetector);
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'user' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraReady(true);
          };
        }
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
      }
    };
    loadDetector();
  }, [isClient]);

  // Continuous pose detection loop with rep detection
  useEffect(() => {
    let rafId: number;
    const poseEstimationLoop = async () => {
      try {
        if (
          videoRef.current &&
          videoRef.current.readyState === 4 &&
          detector &&
          cameraReady &&
          isClient
        ) {
          frameCountRef.current++;
          const processFrame = frameCountRef.current % 3 === 0; // Process every 3rd frame
          const poses = await detector.estimatePoses(videoRef.current);
          if (poses.length > 0 && poses[0].keypoints) {
            const keypoints: Keypoint[] = poses[0].keypoints;
            setPoses(poses);
            onPoseDetected?.(poses[0]);
            onCaptureFrame(keypoints);

            // Rep detection logic
            const findKeypoint = (name: string) => keypoints.find((kp: Keypoint) => kp.name === name);
            const leftAnkle = findKeypoint('left_ankle');
            const leftKnee = findKeypoint('left_knee');
            const leftHip = findKeypoint('left_hip');
            const confidences = [leftAnkle, leftKnee, leftHip].map(kp => kp?.score ?? 0);
            const minConfidence = Math.min(...confidences);
            let kneeAngle = 180;
            if (leftAnkle && leftKnee && leftHip) {
              kneeAngle = getAngle(leftHip, leftKnee, leftAnkle);
            }

            // Only process rep logic every 3rd frame
            if (processFrame && leftAnkle && leftKnee && leftHip && minConfidence > 0.4) {
              // Rep start: knee angle below 75°
              if (!repInProgress.current && kneeAngle <= 75) {
                startHoldTime.current = Date.now();
                repInProgress.current = true;
                console.log('⬇️ Rep started, holding at bottom...');
              }
              // Rep hold: knee angle stays below 75°
              if (repInProgress.current && kneeAngle <= 75) {
                if (startHoldTime.current && Date.now() - startHoldTime.current >= 300) {
                  squatCount.current += 1;
                  repInProgress.current = false;
                  startHoldTime.current = null;
                  onSquatComplete();
                  console.log('✔️ Rep Counted:', squatCount.current);
                }
              }
              // Rep reset: knee angle rises above 120°
              if (kneeAngle > 120) {
                repInProgress.current = false;
                startHoldTime.current = null;
              }
            }

            // Logging
            if (frameCountRef.current % 15 === 0) {
              console.log({
                frame: frameCountRef.current,
                kneeAngle: kneeAngle.toFixed(1),
                repInProgress: repInProgress.current,
                minConfidence: minConfidence.toFixed(2),
                squatCount: squatCount.current
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Pose detection error:', error);
      }
      rafId = requestAnimationFrame(poseEstimationLoop);
    };
    if (detector && cameraReady && isClient) {
      poseEstimationLoop();
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [detector, cameraReady, isClient, onPoseDetected, onCaptureFrame, onSquatComplete]);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ position: 'relative', width: 640, height: 480 }}>
      <video 
        ref={videoRef} 
        width={640} 
        height={480} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0,
          transform: 'scaleX(-1)'
        }} 
      />
      <PoseOverlay keypoints={poses[0]?.keypoints || []} videoRef={videoRef} />
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.7)',
        color: 'lime',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <div>Reps: {squatCount.current}</div>
      </div>
    </div>
  );
};

export default CameraCapture;
