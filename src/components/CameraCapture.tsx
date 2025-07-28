"use client";
import React, { useRef, useEffect, useState } from "react";
import { safeImportTensorFlow } from "../utils/tensorflow-safe";
import { Keypoint } from "../types";
import KalmanFilter from "../utils/KalmanFilter";
import PoseOverlay from "./PoseOverlay";

type AssessmentPhase =
  | "idle"
  | "countdown"
  | "recordFront"
  | "pause"
  | "recordSide"
  | "computing"
  | "complete";

interface CameraCaptureProps {
  onPoseDetected?: (pose: any) => void;
  assessmentPhase: AssessmentPhase;
  onSquatComplete: () => void;
  onCaptureFrame: (keypoints: any) => void;
}

const DETECTION_INTERVAL = 1000 / 20; // 20 FPS detection
const BOTTOM_DWELL_TIME = 250; // Must stay in bottom 30% for 250ms

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPoseDetected,
  assessmentPhase,
  onSquatComplete,
  onCaptureFrame,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [currentKeypoints, setCurrentKeypoints] = useState<Keypoint[]>([]);

  const repCount = useRef(0);
  const inBottomPosition = useRef(false);
  const bottomEnteredAt = useRef<number | null>(null);
  const lastDetectionTime = useRef(0);
  const kalmanFilters = useRef<{ [name: string]: KalmanFilter }>({});

  useEffect(() => setIsClient(true), []);

  /** 🎥 Initialize camera and pose detector */
  useEffect(() => {
    const init = async () => {
      if (!isClient) return;
      try {
        const { tf, posedetection } = await safeImportTensorFlow();
        if (!tf || !posedetection) return;

        const detectorConfig = {
          modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        };
        const newDetector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          detectorConfig
        );
        setDetector(newDetector);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: 1280, 
            height: 720, 
            facingMode: "user",
            frameRate: { max: 20 }
          },
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            const video = videoRef.current!;
            const canvas = canvasRef.current!;
            
            // Set canvas dimensions once
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Calculate scale factors
            const displayWidth = video.offsetWidth;
            const displayHeight = video.offsetHeight;
            setScaleX(displayWidth / video.videoWidth);
            setScaleY(displayHeight / video.videoHeight);
            
            video.play();
            setCameraReady(true);
          };
        }
      } catch (err) {
        console.error("❌ Camera/Detector init failed:", err);
      }
    };
    init();
  }, [isClient]);

  /** 🦵 Rep counting logic */
  const getAverageHipY = (keypoints: Keypoint[]) => {
    const leftHip = keypoints.find((k) => k.name === "left_hip")?.y ?? 0;
    const rightHip = keypoints.find((k) => k.name === "right_hip")?.y ?? 0;
    return (leftHip + rightHip) / 2;
  };

  /** 🔄 Apply Kalman filter for smoother keypoints */
  const applyKalmanFilter = (keypoints: Keypoint[]) =>
    keypoints.map((kp) => {
      if (!kalmanFilters.current[kp.name])
        kalmanFilters.current[kp.name] = new KalmanFilter();
      return {
        ...kp,
        x: kalmanFilters.current[kp.name].filter(kp.x),
        y: kalmanFilters.current[kp.name].filter(kp.y),
      };
    });

  /** 🔍 Pose detection loop */
  useEffect(() => {
    if (!detector || !cameraReady || !isClient) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;

    const detect = async () => {
      if (!video.readyState || video.readyState < 2) {
        requestAnimationFrame(detect);
        return;
      }

      const now = Date.now();
      if (now - lastDetectionTime.current >= DETECTION_INTERVAL) {
        lastDetectionTime.current = now;

        try {
          const poses = await detector.estimatePoses(video);
          if (poses[0]?.keypoints) {
            let keypoints = applyKalmanFilter(poses[0].keypoints);
            setCurrentKeypoints(keypoints);

            // REP LOGIC
            const hipY = getAverageHipY(keypoints);
            const canvasHeight = canvas.height;
            const REP_THRESHOLD_BOTTOM = canvasHeight * 0.7;
            const REP_THRESHOLD_TOP = canvasHeight * 0.4;
            
            const leftHip = keypoints.find(k => k.name === "left_hip");
            const rightHip = keypoints.find(k => k.name === "right_hip");
            const confidence = Math.min(leftHip?.score ?? 0, rightHip?.score ?? 0);

            if (hipY > REP_THRESHOLD_BOTTOM && confidence > 0.4) {
              if (!bottomEnteredAt.current) {
                bottomEnteredAt.current = now;
                inBottomPosition.current = true;
              }
            } else {
              bottomEnteredAt.current = null;
            }

            if (
              bottomEnteredAt.current &&
              now - bottomEnteredAt.current > BOTTOM_DWELL_TIME &&
              hipY < REP_THRESHOLD_TOP &&
              confidence > 0.4
            ) {
              repCount.current++;
              onSquatComplete();
              bottomEnteredAt.current = null;
              inBottomPosition.current = false;
            }

            // Console logging for debugging
            console.log({
              hipY: hipY.toFixed(1),
              repCount: repCount.current,
              inBottomPosition: inBottomPosition.current,
              confidence: confidence.toFixed(2),
              canvasHeight,
              bottom: REP_THRESHOLD_BOTTOM,
              top: REP_THRESHOLD_TOP,
              dwellTime: bottomEnteredAt.current ? now - bottomEnteredAt.current : 0
            });
          }
        } catch (error) {
          console.error("❌ Pose detection error:", error);
        }
      }

      requestAnimationFrame(detect);
    };

    detect();
  }, [detector, cameraReady, isClient, onSquatComplete]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "100vw" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", height: "auto", transform: "scaleX(-1)" }}
      />
      <PoseOverlay 
        keypoints={currentKeypoints} 
        videoRef={videoRef}
        scaleX={scaleX}
        scaleY={scaleY}
      />
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.6)",
          color: "#0f0",
          padding: "6px 10px",
          borderRadius: "4px",
          fontFamily: "monospace",
          fontSize: 14,
          zIndex: 10,
        }}
      >
        Reps: {repCount.current}
      </div>
    </div>
  );
};

export default CameraCapture;
