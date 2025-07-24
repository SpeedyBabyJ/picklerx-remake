import React, { useRef, useEffect, useState } from 'react';
import PoseOverlay from './PoseOverlay';
import { safeImportTensorFlow } from '../utils/tensorflow-safe';

type AssessmentPhase = 'idle' | 'countdown' | 'recordFront' | 'pause' | 'recordSide' | 'computing' | 'complete';

interface CameraCaptureProps {
  onPoseDetected?: (pose: any) => void;
  assessmentPhase: AssessmentPhase;
  onSquatComplete: () => void;
  onCaptureFrame: (keypoints: any) => void;
}

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

  // Log assessment phase for debugging
  useEffect(() => {
    console.log("🌀 Phase:", assessmentPhase);
  }, [assessmentPhase]);

  useEffect(() => {
    const init = async () => {
      try {
        // Only initialize TensorFlow.js in browser environment
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
          // Use safe TensorFlow.js import
          const { tf, posedetection } = await safeImportTensorFlow();
          
          if (!tf || !posedetection) {
            console.error('TensorFlow.js not available');
            return;
          }

          const model = posedetection.SupportedModels.MoveNet;
          const detectorConfig = { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
          const newDetector = await posedetection.createDetector(model, detectorConfig);
          setDetector(newDetector);
          console.log('✅ Pose detector loaded');

          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            (videoRef.current as HTMLVideoElement).srcObject = stream;
            (videoRef.current as HTMLVideoElement).onloadedmetadata = () => {
              (videoRef.current as HTMLVideoElement).play();
              setCameraReady(true);
              console.log('✅ Camera stream initialized');
            };
          }
        }
      } catch (error) {
        console.error('Failed to initialize TensorFlow.js:', error);
      }
    };

    init();
  }, []);

  useEffect(() => {
    let rafId: number;

    const detectPose = async () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        detector &&
        cameraReady
      ) {
        try {
          const poses = await detector.estimatePoses(videoRef.current);
          if (poses.length > 0) {
            setPoses(poses);
            onPoseDetected?.(poses[0]);
            onCaptureFrame(poses[0].keypoints);
            console.log('🧠 Keypoints:', poses[0].keypoints);
          }
        } catch (error) {
          console.error('Pose detection error:', error);
        }
      }
      rafId = requestAnimationFrame(detectPose);
    };

    detectPose();
    return () => cancelAnimationFrame(rafId);
  }, [cameraReady, detector, onPoseDetected, onCaptureFrame]);

  return (
    <div style={{ position: 'relative', width: 640, height: 480 }}>
      <video ref={videoRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0 }} />
      <PoseOverlay keypoints={poses[0]?.keypoints || []} />
    </div>
  );
};

export default CameraCapture;
