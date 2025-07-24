import React, { useRef, useEffect, useState } from 'react';
import { safeImportTensorFlow } from '../utils/tensorflow-safe';
import { Keypoint } from '../types';
import KalmanFilter from '../utils/KalmanFilter';

// --- Styles ---
const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100vw',
  aspectRatio: '16/9',
  height: 'auto',
  overflow: 'hidden',
  background: 'black',
};
const videoCanvasStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  maxWidth: '100vw',
  objectFit: 'contain',
  position: 'absolute',
  top: 0,
  left: 0,
};

// --- Component ---
type AssessmentPhase = 'idle' | 'countdown' | 'recordFront' | 'pause' | 'recordSide' | 'computing' | 'complete';

interface CameraCaptureProps {
  onPoseDetected?: (pose: any) => void;
  assessmentPhase: AssessmentPhase;
  onSquatComplete: () => void;
  onCaptureFrame: (keypoints: any) => void;
}

const DETECTION_INTERVAL = 1000 / 12; // 12 FPS

const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onPoseDetected, 
  assessmentPhase, 
  onSquatComplete, 
  onCaptureFrame 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const repCount = useRef(0);
  const inBottomPosition = useRef(false);
  const lastDetectionTime = useRef(0);
  const kalmanFilters = useRef<{ [name: string]: KalmanFilter }>({});

  useEffect(() => { setIsClient(true); }, []);

  // Camera and detector setup
  useEffect(() => {
    const loadDetector = async () => {
      try {
        if (!isClient) return;
        const { tf, posedetection } = await safeImportTensorFlow();
        if (!tf || !posedetection) return;
        const model = posedetection.SupportedModels.MoveNet;
        const detectorConfig = { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        const newDetector = await posedetection.createDetector(model, detectorConfig);
        setDetector(newDetector);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            const video = videoRef.current!;
            const canvas = canvasRef.current!;
            video.width = video.videoWidth;
            video.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.play();
            setCameraReady(true);
          };
        }
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
      }
    };
    loadDetector();
  }, [isClient]);

  // Rep detection and pose loop
  useEffect(() => {
    let rafId: number;
    let REP_THRESHOLD_BOTTOM = 0;
    let REP_THRESHOLD_TOP = 0;

    const getAverageHipY = (keypoints: Keypoint[]) => {
      const leftHip = keypoints.find(kp => kp.name === 'left_hip')?.y ?? 0;
      const rightHip = keypoints.find(kp => kp.name === 'right_hip')?.y ?? 0;
      return (leftHip + rightHip) / 2;
    };
    const applyKalmanFilter = (keypoints: Keypoint[]): Keypoint[] => {
      return keypoints.map(kp => {
        if (!kalmanFilters.current[kp.name]) {
          kalmanFilters.current[kp.name] = new KalmanFilter();
        }
        return {
          ...kp,
          x: kalmanFilters.current[kp.name].filter(kp.x),
          y: kalmanFilters.current[kp.name].filter(kp.y),
        };
      });
    };
    const drawSkeleton = (keypoints: Keypoint[], ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      if (!keypoints || keypoints.length < 10) {
        console.warn('No keypoints detected');
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      // Draw lines and points (same as PoseOverlay)
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
      SKELETON_CONNECTIONS.forEach(([p1, p2]) => {
        const kp1 = keypoints.find((k: Keypoint) => k.name === p1);
        const kp2 = keypoints.find((k: Keypoint) => k.name === p2);
        if (kp1 && kp2 && kp1.score > 0.4 && kp2.score > 0.4) {
          ctx.beginPath();
          ctx.moveTo(kp1.x, kp1.y);
          ctx.lineTo(kp2.x, kp2.y);
          ctx.strokeStyle = 'lime';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });
      keypoints.forEach((kp) => {
        if (kp.score > 0.4) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'lime';
          ctx.fill();
        }
      });
      ctx.restore();
    };
    const detectPose = async () => {
      try {
        if (
          videoRef.current &&
          videoRef.current.readyState === 4 &&
          detector &&
          cameraReady &&
          isClient &&
          canvasRef.current
        ) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          video.width = video.videoWidth;
          video.height = video.videoHeight;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          REP_THRESHOLD_BOTTOM = canvas.height * 0.7;
          REP_THRESHOLD_TOP = canvas.height * 0.4;
          const now = Date.now();
          if (now - lastDetectionTime.current < DETECTION_INTERVAL) {
            rafId = requestAnimationFrame(detectPose);
            return;
          }
          lastDetectionTime.current = now;
          const poses = await detector.estimatePoses(video);
          if (poses.length > 0 && poses[0].keypoints) {
            let keypoints: Keypoint[] = poses[0].keypoints;
            keypoints = applyKalmanFilter(keypoints);
            drawSkeleton(keypoints, canvas.getContext('2d')!, canvas);
            // Rep detection
            const hipY = getAverageHipY(keypoints);
            const leftHip = keypoints.find(kp => kp.name === 'left_hip');
            const rightHip = keypoints.find(kp => kp.name === 'right_hip');
            const minConfidence = Math.min(leftHip?.score ?? 0, rightHip?.score ?? 0);
            if (!inBottomPosition.current && hipY > REP_THRESHOLD_BOTTOM && minConfidence > 0.4) {
              inBottomPosition.current = true;
            }
            if (inBottomPosition.current && hipY < REP_THRESHOLD_TOP && minConfidence > 0.4) {
              repCount.current++;
              inBottomPosition.current = false;
              onSquatComplete();
            }
            // Logging
            if (repCount.current % 1 === 0) {
              console.log({
                hipY: hipY.toFixed(1),
                inBottomPosition: inBottomPosition.current,
                repCount: repCount.current,
                minConfidence: minConfidence.toFixed(2),
                canvasH: canvas.height,
                bottom: REP_THRESHOLD_BOTTOM,
                top: REP_THRESHOLD_TOP
              });
            }
          }
        }
      } catch (error) {
        console.error('❌ Pose detection error:', error);
      }
      rafId = requestAnimationFrame(detectPose);
    };
    if (detector && cameraReady && isClient) {
      detectPose();
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [detector, cameraReady, isClient, onPoseDetected, onCaptureFrame, onSquatComplete]);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div style={containerStyle}>
      <video ref={videoRef} autoPlay muted playsInline style={videoCanvasStyle} />
      <canvas ref={canvasRef} style={videoCanvasStyle} />
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.7)',
        color: 'lime',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10
      }}>
        <div>Reps: {repCount.current}</div>
      </div>
    </div>
  );
};

export default CameraCapture;
