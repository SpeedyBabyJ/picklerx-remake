'use client';

import React, { useState, useEffect, useRef } from 'react';
import PoseOverlay from './PoseOverlay';
import ResultsScreen from './ResultsScreen';
import { calculateMetrics } from '../utils/metricsUtils';

const PHASES = {
  IDLE: 'idle',
  COUNTDOWN_FRONT: 'countdownFront',
  RECORD_FRONT: 'recordFront',
  TURN: 'turn',
  COUNTDOWN_SIDE: 'countdownSide',
  RECORD_SIDE: 'recordSide',
  RESULTS: 'results',
};

export default function ClientOnlyAssessment() {
  const [poseDetection, setPoseDetection] = useState<any>(null);
  const [detector, setDetector] = useState<any>(null);
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [countdown, setCountdown] = useState(3);
  const [keypoints, setKeypoints] = useState<any[]>([]);
  const [frontFrames, setFrontFrames] = useState<any[]>([]);
  const [sideFrames, setSideFrames] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const [squatCount, setSquatCount] = useState(0);
  const SQUAT_TARGET = 3;

  // Load pose detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@tensorflow-models/pose-detection').then(async (mod) => {
        setPoseDetection(mod);
        const detector = await mod.createDetector(mod.SupportedModels.MoveNet, {
          modelType: mod.movenet.modelType.SINGLEPOSE_LIGHTNING,
        });
        setDetector(detector);
      });
    }
  }, []);

  // Countdown logic
  useEffect(() => {
    if (phase === PHASES.COUNTDOWN_FRONT || phase === PHASES.COUNTDOWN_SIDE) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            setPhase(phase === PHASES.COUNTDOWN_FRONT ? PHASES.RECORD_FRONT : PHASES.RECORD_SIDE);
            return 3;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);

  // Pose detection and frame capture
  useEffect(() => {
    if (!detector || !videoRef.current) return;
    let lastSquatPhase = 'standing';
    let squatCounter = 0;
    let squatStartTime: number | null = null;

    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const poses = await detector.estimatePoses(videoRef.current);
        if (poses && poses[0] && poses[0].keypoints) {
          setKeypoints(poses[0].keypoints);
          // Only record during recording phases
          if (phase === PHASES.RECORD_FRONT || phase === PHASES.RECORD_SIDE) {
            // Save frame
            const frame = poses[0].keypoints.map((kp: any) => ({
              x: kp.x,
              y: kp.y,
              score: kp.score,
              name: kp.name,
            }));
            if (phase === PHASES.RECORD_FRONT) setFrontFrames((prev) => [...prev, frame]);
            if (phase === PHASES.RECORD_SIDE) setSideFrames((prev) => [...prev, frame]);

            // Squat detection (simple: knee y below hip y)
            const leftKnee = poses[0].keypoints.find((kp: any) => kp.name === 'left_knee');
            const rightKnee = poses[0].keypoints.find((kp: any) => kp.name === 'right_knee');
            const leftHip = poses[0].keypoints.find((kp: any) => kp.name === 'left_hip');
            const rightHip = poses[0].keypoints.find((kp: any) => kp.name === 'right_hip');
            const knees = [leftKnee, rightKnee].filter(Boolean);
            const hips = [leftHip, rightHip].filter(Boolean);
            if (knees.length && hips.length) {
              const avgKneeY = knees.reduce((sum, kp) => sum + kp.y, 0) / knees.length;
              const avgHipY = hips.reduce((sum, kp) => sum + kp.y, 0) / hips.length;
              if (avgKneeY > avgHipY + 30 && lastSquatPhase === 'standing') {
                squatCounter++;
                setSquatCount(squatCounter);
                lastSquatPhase = 'squat';
              } else if (avgKneeY < avgHipY && lastSquatPhase === 'squat') {
                lastSquatPhase = 'standing';
              }
              // End phase after SQUAT_TARGET squats
              if (squatCounter >= SQUAT_TARGET) {
                if (phase === PHASES.RECORD_FRONT) setPhase(PHASES.TURN);
                if (phase === PHASES.RECORD_SIDE) {
                  // Calculate results
                  const metrics = calculateMetrics(frontFrames, sideFrames);
                  setResults(metrics);
                  setPhase(PHASES.RESULTS);
                }
              }
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };
    detect();
    return () => cancelAnimationFrame(requestRef.current!);
  }, [detector, phase]);

  // Reset for retake
  const handleRetake = () => {
    setPhase(PHASES.IDLE);
    setFrontFrames([]);
    setSideFrames([]);
    setResults(null);
    setSquatCount(0);
  };

  // UI rendering
  return (
    <div style={{ position: 'relative', width: 640, height: 480 }}>
      {phase === PHASES.IDLE && (
        <button onClick={() => setPhase(PHASES.COUNTDOWN_FRONT)} style={{ position: 'absolute', zIndex: 2, left: 0, top: 0 }}>
          Start Assessment
        </button>
      )}
      {(phase === PHASES.COUNTDOWN_FRONT || phase === PHASES.COUNTDOWN_SIDE) && (
        <div style={{ position: 'absolute', zIndex: 2, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
          {countdown}
        </div>
      )}
      {phase === PHASES.TURN && (
        <div style={{ position: 'absolute', zIndex: 2, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexDirection: 'column' }}>
          <div>Turn to your right for the side view</div>
          <button onClick={() => setPhase(PHASES.COUNTDOWN_SIDE)} style={{ marginTop: 24, fontSize: 24 }}>Ready</button>
        </div>
      )}
      {phase !== PHASES.RESULTS && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            width={640}
            height={480}
            onLoadedMetadata={() => {
              videoRef.current?.play();
            }}
            style={{ position: 'absolute', top: 0, left: 0, width: 640, height: 480, transform: 'scaleX(-1)', zIndex: 1 }}
          />
          <PoseOverlay keypoints={keypoints} />
          {(phase === PHASES.RECORD_FRONT || phase === PHASES.RECORD_SIDE) && (
            <div style={{ position: 'absolute', zIndex: 2, right: 16, top: 16, background: 'rgba(0,0,0,0.6)', color: 'white', padding: 12, borderRadius: 8, fontSize: 20 }}>
              {phase === PHASES.RECORD_FRONT ? `Front View: Squats ${squatCount}/${SQUAT_TARGET}` : `Side View: Squats ${squatCount}/${SQUAT_TARGET}`}
            </div>
          )}
        </>
      )}
      {phase === PHASES.RESULTS && results && (
        <ResultsScreen results={results} onRetake={handleRetake} />
      )}
    </div>
  );
} 