import React, { useRef, useEffect, useState } from 'react';
import PoseOverlay from './PoseOverlay';
import { safeImportTensorFlow } from '../utils/tensorflow-safe';
import { Keypoint } from '../types';
import KalmanFilter from '../utils/KalmanFilter';

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
  const [detector, setDetector] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [poses, setPoses] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const repCount = useRef(0);
  const inBottomPosition = useRef(false);
  const lastDetectionTime = useRef(0);
  const kalmanFilters = useRef<{ [name: string]: KalmanFilter }>({});

  // Ensure client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Rep detection and pose loop
  useEffect(() => {
    let rafId: number;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
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

    const detectPose = async () => {
      try {
        if (
          videoRef.current &&
          videoRef.current.readyState === 4 &&
          detector &&
          cameraReady &&
          isClient
        ) {
          // Sync canvas to video size
          if (!canvas) {
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d');
          }
          const video = videoRef.current;
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
            setPoses([{ ...poses[0], keypoints }]);
            onPoseDetected?.({ ...poses[0], keypoints });
            onCaptureFrame(keypoints);

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
              console.log(`✅ Rep ${repCount.current}`);
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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video 
        ref={videoRef} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
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
        <div>Reps: {repCount.current}</div>
      </div>
    </div>
  );
};

export default CameraCapture;
