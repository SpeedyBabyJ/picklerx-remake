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

// Squat detection state
interface SquatState {
  isInSquat: boolean;
  lastSquatPhase: 'standing' | 'descending' | 'bottom' | 'ascending';
  kneeAngle: number;
  hipAngle: number;
  ankleAngle: number;
  confidence: number;
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
  const [isClient, setIsClient] = useState(false);
  const [squatState, setSquatState] = useState<SquatState>({
    isInSquat: false,
    lastSquatPhase: 'standing',
    kneeAngle: 180,
    hipAngle: 180,
    ankleAngle: 180,
    confidence: 0
  });

  // Ensure client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Log assessment phase for debugging
  useEffect(() => {
    console.log("🌀 Phase:", assessmentPhase);
  }, [assessmentPhase]);

  // Calculate joint angles from keypoints
  const calculateJointAngles = useCallback((keypoints: Keypoint[]) => {
    const findKeypoint = (name: string) => keypoints.find((kp: Keypoint) => kp.name === name);
    
    const leftAnkle = findKeypoint('left_ankle');
    const leftKnee = findKeypoint('left_knee');
    const leftHip = findKeypoint('left_hip');
    const leftShoulder = findKeypoint('left_shoulder');

    let kneeAngle = 180;
    let hipAngle = 180;
    let ankleAngle = 180;
    let confidence = 0;

    if (leftAnkle && leftKnee && leftHip && leftShoulder) {
      // Calculate knee angle
      const kneeToAnkle = Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x);
      const kneeToHip = Math.atan2(leftHip.y - leftKnee.y, leftHip.x - leftKnee.x);
      let angle = (kneeToHip - kneeToAnkle) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      if (angle > 180) angle = 360 - angle;
      kneeAngle = angle;

      // Calculate hip angle
      const hipToKnee = Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x);
      const hipToShoulder = Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x);
      angle = (hipToShoulder - hipToKnee) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      if (angle > 180) angle = 360 - angle;
      hipAngle = angle;

      // Calculate ankle angle
      const ankleToKnee = Math.atan2(leftKnee.y - leftAnkle.y, leftKnee.x - leftAnkle.x);
      angle = Math.abs(ankleToKnee * 180 / Math.PI);
      ankleAngle = angle;

      // Calculate average confidence
      const scores = [leftAnkle.score, leftKnee.score, leftHip.score, leftShoulder.score];
      confidence = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    return { kneeAngle, hipAngle, ankleAngle, confidence };
  }, []);

  // Analyze squat state
  const analyzeSquatState = useCallback((angles: { kneeAngle: number; hipAngle: number; ankleAngle: number; confidence: number }) => {
    const { kneeAngle, hipAngle, ankleAngle, confidence } = angles;
    
    let newPhase: 'standing' | 'descending' | 'bottom' | 'ascending' = 'standing';
    let isInSquat = false;

    // Determine squat phase based on angles
    if (confidence > 0.4) {
      if (kneeAngle > 120 && hipAngle > 150) {
        newPhase = 'standing';
      } else if (kneeAngle > 90 && kneeAngle <= 120) {
        newPhase = 'descending';
        isInSquat = true;
      } else if (kneeAngle <= 90) {
        newPhase = 'bottom';
        isInSquat = true;
      } else if (kneeAngle > 90 && kneeAngle <= 120 && squatState.lastSquatPhase === 'bottom') {
        newPhase = 'ascending';
        isInSquat = true;
      }
    }

    return { isInSquat, newPhase };
  }, [squatState.lastSquatPhase]);

  // Initialize TensorFlow.js and camera
  useEffect(() => {
    const loadDetector = async () => {
      try {
        if (!isClient) return;
        
        console.log('🔄 Loading TensorFlow.js...');
        const { tf, posedetection } = await safeImportTensorFlow();
        
        if (!tf || !posedetection) {
          console.error('❌ TensorFlow.js not available');
          return;
        }

        console.log('✅ TensorFlow.js loaded, creating detector...');
        const model = posedetection.SupportedModels.MoveNet;
        const detectorConfig = { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        const newDetector = await posedetection.createDetector(model, detectorConfig);
        setDetector(newDetector);
        console.log('✅ Pose detector created successfully');

        // Initialize camera
        console.log('🎥 Initializing camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraReady(true);
            console.log('✅ Camera stream initialized and playing');
          };
        }
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
      }
    };

    loadDetector();
  }, [isClient]);

  // Continuous pose detection loop
  useEffect(() => {
    let rafId: number;
    let frameCount = 0;

    const poseEstimationLoop = async () => {
      try {
        if (
          videoRef.current &&
          videoRef.current.readyState === 4 &&
          detector &&
          cameraReady &&
          isClient
        ) {
          frameCount++;
          
          // Estimate poses
          const poses = await detector.estimatePoses(videoRef.current);
          
          if (poses.length > 0 && poses[0].keypoints) {
            const keypoints = poses[0].keypoints;
            
            // Calculate angles and analyze squat
            const angles = calculateJointAngles(keypoints);
            const { isInSquat, newPhase } = analyzeSquatState(angles);
            
            // Update squat state
            setSquatState(prev => ({
              ...prev,
              isInSquat,
              lastSquatPhase: newPhase,
              ...angles
            }));

            // Update poses for overlay
            setPoses(poses);
            onPoseDetected?.(poses[0]);
            onCaptureFrame(keypoints);

            // Log every 30 frames (1 second at 30fps)
            if (frameCount % 30 === 0) {
              console.log('🧠 Pose Detection:', {
                frame: frameCount,
                keypoints: keypoints.length,
                confidence: angles.confidence.toFixed(2),
                kneeAngle: angles.kneeAngle.toFixed(1),
                hipAngle: angles.hipAngle.toFixed(1),
                ankleAngle: angles.ankleAngle.toFixed(1),
                squatPhase: newPhase,
                isInSquat
              });
            }

            // Check for squat completion
            if (newPhase === 'ascending' && squatState.lastSquatPhase === 'bottom') {
              console.log('🎯 Squat completed!');
              onSquatComplete();
            }
          } else {
            console.warn('⚠️ No poses detected or keypoints undefined');
          }
        }
      } catch (error) {
        console.error('❌ Pose detection error:', error);
      }
      
      // Continue the loop
      rafId = requestAnimationFrame(poseEstimationLoop);
    };

    // Start the loop
    if (detector && cameraReady && isClient) {
      console.log('🔄 Starting pose estimation loop...');
      poseEstimationLoop();
    }

    return () => {
      if (rafId) {
        console.log('🛑 Stopping pose estimation loop...');
        cancelAnimationFrame(rafId);
      }
    };
  }, [detector, cameraReady, isClient, calculateJointAngles, analyzeSquatState, onPoseDetected, onCaptureFrame, onSquatComplete, squatState.lastSquatPhase]);

  // Don't render until client-side
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
          transform: 'scaleX(-1)' // Mirror the video
        }} 
      />
      <PoseOverlay keypoints={poses[0]?.keypoints || []} />
      
      {/* Debug overlay */}
      {squatState.confidence > 0.4 && (
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
          <div>Knee: {squatState.kneeAngle.toFixed(1)}°</div>
          <div>Hip: {squatState.hipAngle.toFixed(1)}°</div>
          <div>Conf: {squatState.confidence.toFixed(2)}</div>
          <div>Phase: {squatState.lastSquatPhase}</div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
