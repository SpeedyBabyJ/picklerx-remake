"use client";
import React, { useRef, useEffect, useState } from "react";
import { safeImportTensorFlow } from "../utils/tensorflow-safe";
import { Keypoint } from "../types";
import KalmanFilter from "../utils/KalmanFilter";

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

const DETECTION_INTERVAL = 1000 / 12; // Pose detection at 12 FPS
const BOTTOM_DWELL_TIME = 250; // Must stay in bottom 30% for 250ms to count as bottom

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
          video: { width: 1280, height: 720, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play();
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

  /** 🖌️ Draw skeleton overlay */
  const drawSkeleton = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width, 0); // Flip horizontally
    ctx.scale(-1, 1);

    const pairs: [string, string][] = [
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

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;

    pairs.forEach(([a, b]) => {
      const kp1 = keypoints.find((k) => k.name === a && k.score > 0.4);
      const kp2 = keypoints.find((k) => k.name === b && k.score > 0.4);
      if (kp1 && kp2) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    });

    keypoints.forEach((kp) => {
      if (kp.score > 0.4) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "lime";
        ctx.fill();
      }
    });

    ctx.restore();
  };

  /** 🔍 Pose detection loop */
  useEffect(() => {
    if (!detector || !cameraReady || !isClient) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const detect = async () => {
      if (!video.readyState || video.readyState < 2) {
        requestAnimationFrame(detect);
        return;
      }

      // Match canvas size to actual video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const now = Date.now();
      if (now - lastDetectionTime.current >= DETECTION_INTERVAL) {
        lastDetectionTime.current = now;

        const poses = await detector.estimatePoses(video);
        if (poses[0]?.keypoints) {
          let keypoints = applyKalmanFilter(poses[0].keypoints);
          drawSkeleton(keypoints, ctx, canvas);

          // REP LOGIC
          const hipY = getAverageHipY(keypoints);
          const bottom = canvas.height * 0.7;
          const top = canvas.height * 0.4;

          if (hipY > bottom) {
            if (!bottomEnteredAt.current) bottomEnteredAt.current = now;
          } else {
            bottomEnteredAt.current = null;
          }

          if (
            bottomEnteredAt.current &&
            now - bottomEnteredAt.current > BOTTOM_DWELL_TIME &&
            hipY < top
          ) {
            repCount.current++;
            onSquatComplete();
            bottomEnteredAt.current = null;
          }
        }
      }

      requestAnimationFrame(detect);
    };

    detect();
  }, [detector, cameraReady, isClient]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "100vw" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", height: "auto", transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0 }}
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
        }}
      >
        Reps: {repCount.current}
      </div>
    </div>
  );
};

export default CameraCapture;
