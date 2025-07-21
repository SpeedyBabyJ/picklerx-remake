import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import { drawKeypoints, drawSkeleton } from '../utils/drawUtils';
import KalmanFilter from '../utils/KalmanFilter';

interface CameraCaptureProps {
  assessmentPhase: string;
  onCaptureFrame: (keypoints: posedetection.Keypoint[]) => void;
  onSquatComplete?: () => void;
}

// Persistent Kalman filters for each joint (don't reset between frames)
const smoothingFilters: { [key: number]: KalmanFilter } = {};
const poseHistory: posedetection.Keypoint[][] = [];
const maxHistory = 30;

// Initialize Kalman filters for all joints
const initializeFilters = () => {
  const jointNames = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
  ];
  
  jointNames.forEach((_, index) => {
    if (!smoothingFilters[index]) {
      smoothingFilters[index] = new KalmanFilter({ R: 0.01, Q: 3 });
    }
  });
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ assessmentPhase, onCaptureFrame, onSquatComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<posedetection.PoseDetector | null>(null);
  const [lastKneeAngle, setLastKneeAngle] = useState(180);
  const [squatPhase, setSquatPhase] = useState<'standing' | 'descent' | 'bottom' | 'ascent'>('standing');
  const [squatStartTime, setSquatStartTime] = useState<number | null>(null);
  const [completedSquats, setCompletedSquats] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('🔧 Initializing TensorFlow.js backend...');
        await tf.setBackend('webgl');
        console.log('✅ TensorFlow.js backend initialized');
        
        console.log('🔧 Loading MoveNet model...');
        const model = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        console.log('✅ MoveNet model loaded');
        setDetector(model);

        console.log('🔧 Requesting camera permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        });
        console.log('✅ Camera permissions granted');
        
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          console.log('✅ Video stream connected');
        }
        
        // Initialize Kalman filters
        initializeFilters();
        console.log('✅ Kalman filters initialized');
      } catch (error) {
        console.error('❌ Camera initialization error:', error);
      }
    };
    init();
  }, []);

  const smoothKeypoints = (keypoints: posedetection.Keypoint[]): posedetection.Keypoint[] => {
    return keypoints.map((kp, i) => {
      // Ensure Kalman filter exists (should be initialized in initializeFilters)
      if (!smoothingFilters[i]) {
        console.warn(`Kalman filter for joint ${i} not initialized, creating fallback`);
        smoothingFilters[i] = new KalmanFilter({ R: 0.01, Q: 3 });
      }
      return {
        x: smoothingFilters[i].filter(kp.x),
        y: smoothingFilters[i].filter(kp.y),
        score: kp.score || 0,
        name: kp.name
      };
    });
  };

  const calculateKneeAngle = (keypoints: posedetection.Keypoint[]): number => {
    const findKeypoint = (name: string) => keypoints.find(kp => kp.name === name);
    
    // Use both left and right sides for better accuracy
    const leftAnkle = findKeypoint('left_ankle');
    const leftKnee = findKeypoint('left_knee');
    const leftHip = findKeypoint('left_hip');
    
    const rightAnkle = findKeypoint('right_ankle');
    const rightKnee = findKeypoint('right_knee');
    const rightHip = findKeypoint('right_hip');

    // Calculate angles for both sides
    let leftAngle = 180;
    let rightAngle = 180;

    if (leftAnkle && leftKnee && leftHip) {
      const angle1 = Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x);
      const angle2 = Math.atan2(leftHip.y - leftKnee.y, leftHip.x - leftKnee.x);
      let angle = (angle2 - angle1) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      if (angle > 180) angle = 360 - angle;
      leftAngle = angle;
    }

    if (rightAnkle && rightKnee && rightHip) {
      const angle1 = Math.atan2(rightAnkle.y - rightKnee.y, rightAnkle.x - rightKnee.x);
      const angle2 = Math.atan2(rightHip.y - rightKnee.y, rightHip.x - rightKnee.x);
      let angle = (angle2 - angle1) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      if (angle > 180) angle = 360 - angle;
      rightAngle = angle;
    }

    // Return average of both sides, or the better detected side
    if (leftAngle !== 180 && rightAngle !== 180) {
      return (leftAngle + rightAngle) / 2;
    } else if (leftAngle !== 180) {
      return leftAngle;
    } else if (rightAngle !== 180) {
      return rightAngle;
    }
    
    return 180;
  };

  const isInCriticalRange = (kneeAngle: number, phase: string): boolean => {
    // Critical range: bottom third of squat (eccentric, isometric, concentric phases)
    // Focus on knee angles 75-120 degrees for the most important biomechanical data
    return kneeAngle >=75 && kneeAngle <= 120 && phase !== 'standing';
  };

  const determineSquatPhase = useCallback((kneeAngle: number): 'standing' | 'descent' | 'bottom' | 'ascent' => {
    const angleChange = kneeAngle - lastKneeAngle;
    
    if (kneeAngle > 150) return 'standing';
    if (kneeAngle < 85) return 'bottom';
    if (angleChange > 2) return 'descent';
    if (angleChange < -2) return 'ascent';
    
    return squatPhase;
  }, [lastKneeAngle, squatPhase]);

  useEffect(() => {
    if (!detector || !canvasRef.current) return;
    const render = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const poses = await detector.estimatePoses(videoRef.current);
          if (poses.length > 0) {
            const smoothed = smoothKeypoints(poses[0].keypoints);
            const kneeAngle = calculateKneeAngle(smoothed);
            const newPhase = determineSquatPhase(kneeAngle);
            
            setLastKneeAngle(kneeAngle);
            setSquatPhase(newPhase);

            // Detect squat completion
            if (newPhase === 'descent' && squatPhase === 'standing') {
              setSquatStartTime(Date.now());
            } else if (newPhase === 'standing' && squatPhase === 'ascent') {
              if (squatStartTime && (Date.now() - squatStartTime) > 1000) { // Minimum 1 second squat
                setCompletedSquats(prev => prev + 1);
                if (onSquatComplete) {
                  onSquatComplete();
                }
              }
              setSquatStartTime(null);
            }

            // Update pose history
            poseHistory.push(smoothed);
            if (poseHistory.length > maxHistory) poseHistory.shift();

            // Draw overlay every frame for smooth visualization
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                drawKeypoints(smoothed, ctx);
                drawSkeleton(smoothed, ctx);
                console.log('🎨 Drawing skeleton overlay with', smoothed.length, 'keypoints');
              }
            }

            // Only sample frames during critical phases and recording phases
            const isRecording = ["recordFront", "recordSide"].includes(assessmentPhase);
            const isCriticalPhase = isInCriticalRange(kneeAngle, newPhase);
            
            if (isRecording && isCriticalPhase && poseHistory.length > 10) {
              onCaptureFrame(smoothed);
            }
          } else {
            console.log('⚠️ No poses detected in frame');
          }
        } catch (error) {
          console.error('❌ Pose detection error:', error);
        }
      } else {
        console.log('⚠️ Video not ready, readyState:', videoRef.current?.readyState);
      }
      requestAnimationFrame(render);
    };
    render();
  }, [detector, assessmentPhase, onCaptureFrame, lastKneeAngle, squatPhase, determineSquatPhase]);

  return (
    <div className="relative w-full h-full">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="absolute top-0 left-0 w-full h-full object-cover rounded-2xl" 
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas 
        ref={canvasRef} 
        width={640} 
        height={480} 
        className="absolute top-0 left-0 w-full h-full rounded-2xl" 
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {/* Enhanced Phase Indicator */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl text-white text-lg font-semibold text-center">
          {squatPhase.charAt(0).toUpperCase() + squatPhase.slice(1)}: {Math.round(lastKneeAngle)}°
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
