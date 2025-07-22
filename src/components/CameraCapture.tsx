import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import PoseOverlay from './PoseOverlay';

interface CameraCaptureProps {
  onPoseDetected?: (pose: any) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onPoseDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [detector, setDetector] = useState<posedetection.PoseDetector | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [poses, setPoses] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      await tf.ready();
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
        const poses = await detector.estimatePoses(videoRef.current);
        if (poses.length > 0) {
          setPoses(poses);
          onPoseDetected?.(poses[0]);
          console.log('🧠 Keypoints:', poses[0].keypoints);
        }
      }
      rafId = requestAnimationFrame(detectPose);
    };

    detectPose();
    return () => cancelAnimationFrame(rafId);
  }, [cameraReady, detector, onPoseDetected]);

  return (
    <div style={{ position: 'relative', width: 640, height: 480 }}>
      <video ref={videoRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0 }} />
      <PoseOverlay keypoints={poses[0]?.keypoints || []} />
    </div>
  );
};

export default CameraCapture;
