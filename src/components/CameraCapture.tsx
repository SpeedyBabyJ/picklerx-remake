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
  const [videoWidth, setVideoWidth] = useState(1280);
  const [videoHeight, setVideoHeight] = useState(720);
  const [backend, setBackend] = useState<string>("");
  const [tfReady, setTfReady] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);

  const repCount = useRef(0);
  const inBottomPosition = useRef(false);
  const bottomEnteredAt = useRef<number | null>(null);
  const lastDetectionTime = useRef(0);
  const kalmanFilters = useRef<{ [name: string]: KalmanFilter }>({});
  const frameCount = useRef(0);
  const poseCount = useRef(0);

  useEffect(() => {
    console.log("🌐 Client-side rendering started");
    setIsClient(true);
  }, []);

  /** 🎥 Initialize camera and pose detector */
  useEffect(() => {
    const init = async () => {
      if (!isClient) {
        console.log("⏳ Waiting for client-side initialization...");
        return;
      }

      try {
        console.log("📦 Importing TensorFlow...");
        const { tf, posedetection } = await safeImportTensorFlow();
        if (!tf || !posedetection) {
          console.error("❌ TensorFlow or PoseDetection failed to load");
          return;
        }

        console.log("⚡ Waiting for TensorFlow...");
        await tf.ready();
        setTfReady(true);
        console.log("✅ TensorFlow ready");

        try {
          await tf.setBackend("webgl");
          setBackend("webgl");
          console.log("✅ WebGL backend set");
        } catch {
          await tf.setBackend("wasm");
          setBackend("wasm");
          console.warn("⚠️ WebGL unavailable, using WASM backend");
        }

        console.log("🤖 Creating pose detector...");
        const detectorConfig = {
          modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        };
        const newDetector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          detectorConfig
        );
        setDetector(newDetector);
        setDetectorReady(true);
        console.log("✅ Detector created");

        console.log("📹 Requesting camera access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user", 
            width: 1280, 
            height: 720, 
            frameRate: { max: 20 } 
          },
        });
        console.log("✅ Camera stream granted");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = () => {
            const video = videoRef.current!;
            const canvas = canvasRef.current!;
            
            console.log("📐 Metadata loaded", {
              width: video.videoWidth,
              height: video.videoHeight,
            });

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            setVideoWidth(video.videoWidth);
            setVideoHeight(video.videoHeight);

            const displayWidth = video.offsetWidth || video.videoWidth;
            const displayHeight = video.offsetHeight || video.videoHeight;
            setScaleX(displayWidth / video.videoWidth);
            setScaleY(displayHeight / video.videoHeight);
          };

          videoRef.current.onloadeddata = async () => {
            try {
              console.log(" Video data loaded, starting playback...");
              await videoRef.current?.play();
              console.log("▶️ Video playback started");
              setCameraReady(true);
              console.log("✅ Camera ready:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
            } catch (err) {
              console.error("❌ Failed to start video", err);
            }
          };
        }
      } catch (err) {
        console.error("❌ Initialization error", err);
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
  const applyKalmanFilter = (keypoints: Keypoint[]) => {
    console.log("🔄 Applying Kalman filter to", keypoints.length, "keypoints");
    return keypoints.map((kp) => {
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

  /** 📏 Normalize keypoints to 0-1 space */
  const normalizeKeypoints = (keypoints: Keypoint[]): Keypoint[] => {
    console.log("📏 Normalizing", keypoints.length, "keypoints to 0-1 space");
    return keypoints.map((kp) => ({
      ...kp,
      x: kp.x / videoWidth,
      y: kp.y / videoHeight,
    }));
  };

  /** 🔍 Pose detection loop */
  useEffect(() => {
    if (!detector || !cameraReady || !isClient) {
      console.log("⏳ Waiting for detector & camera:", { 
        detector: !!detector, 
        cameraReady, 
        isClient,
        tfReady,
        detectorReady
      });
      return;
    }

    console.log(" Starting detection loop...");
    const detect = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        console.log("⏳ Video not ready, waiting...", {
          videoRef: !!videoRef.current,
          readyState: videoRef.current?.readyState
        });
        requestAnimationFrame(detect);
        return;
      }

      const now = Date.now();
      if (now - lastDetectionTime.current >= DETECTION_INTERVAL) {
        lastDetectionTime.current = now;
        frameCount.current++;

        try {
          console.log(`🎬 Frame #${frameCount.current} - Estimating poses...`);
          const poses = await detector.estimatePoses(videoRef.current);
          
          if (poses[0]?.keypoints) {
            poseCount.current++;
            let keypoints = applyKalmanFilter(poses[0].keypoints);
            
            // Normalize keypoints to 0-1 space before saving state
            const normalizedKeypoints = normalizeKeypoints(keypoints);
            setCurrentKeypoints(normalizedKeypoints);

            // Log keypoint confidence details
            const confidenceDetails = keypoints.map(k => ({ name: k.name, conf: k.score.toFixed(2) }));
            console.log(`📊 Frame #${frameCount.current} - Keypoints:`, confidenceDetails);
            
            const avgConfidence = keypoints.reduce((sum, kp) => sum + kp.score, 0) / keypoints.length;
            console.log(`📈 Frame #${frameCount.current} - Average confidence: ${avgConfidence.toFixed(3)}`);

            // REP LOGIC
            const hipY = getAverageHipY(keypoints);
            const REP_THRESHOLD_BOTTOM = videoHeight * 0.7;
            const REP_THRESHOLD_TOP = videoHeight * 0.4;

            const leftHip = keypoints.find((kp) => kp.name === "left_hip");
            const rightHip = keypoints.find((kp) => kp.name === "right_hip");
            const confidence = Math.min(leftHip?.score ?? 0, rightHip?.score ?? 0);

            if (hipY > REP_THRESHOLD_BOTTOM && confidence > 0.4) {
              if (!bottomEnteredAt.current) {
                bottomEnteredAt.current = now;
                inBottomPosition.current = true;
                console.log(`🦵 Frame #${frameCount.current} - Entered bottom position`);
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
              console.log(`🎉 Frame #${frameCount.current} - REP COMPLETED! Total: ${repCount.current}`);
            }

            // Console logging for debugging
            console.log({
              frame: frameCount.current,
              hipY: hipY.toFixed(1),
              repCount: repCount.current,
              inBottomPosition: inBottomPosition.current,
              confidence: confidence.toFixed(2),
              videoWidth,
              videoHeight,
              dwellTime: bottomEnteredAt.current ? now - bottomEnteredAt.current : 0
            });
          } else {
            console.log(`⚠️ Frame #${frameCount.current} - No poses detected`);
          }
        } catch (err) {
          console.error(`❌ Frame #${frameCount.current} - Pose detection error`, err);
        }
      }

      requestAnimationFrame(detect);
    };

    detect();
  }, [detector, cameraReady, isClient, onSquatComplete, videoWidth, videoHeight]);

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
        videoWidth={videoWidth}
        videoHeight={videoHeight}
      />
      
      {/* Debug Overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.8)",
          color: "#0f0",
          padding: "10px",
          borderRadius: "6px",
          fontFamily: "monospace",
          fontSize: 12,
          zIndex: 10,
          minWidth: "200px",
        }}
      >
        <div> Frame: {frameCount.current}</div>
        <div>🎯 Poses: {poseCount.current}</div>
        <div>🏋️ Reps: {repCount.current}</div>
        <div>⚙️ Backend: {backend}</div>
        <div> TF: {tfReady ? "✅" : "⏳"}</div>
        <div>🎥 Camera: {cameraReady ? "✅" : "⏳"}</div>
        <div>🔍 Detector: {detectorReady ? "✅" : "⏳"}</div>
        <div>📊 Keypoints: {currentKeypoints.length}</div>
        {currentKeypoints.length > 0 && (
          <div>📈 Avg Conf: {(currentKeypoints.reduce((sum, kp) => sum + kp.score, 0) / currentKeypoints.length).toFixed(2)}</div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
