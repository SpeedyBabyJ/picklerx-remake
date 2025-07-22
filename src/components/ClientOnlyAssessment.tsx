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

const LOGO_URL = '/picklerx-logo.jpg'; // Updated path for PickleRX logo
const BRAND_GREEN = '#8CD211';
const BRAND_DARK = '#0B1C2D';
const BRAND_FONT = 'system-ui, sans-serif';

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

  // Camera initialization: request camera when assessment starts
  useEffect(() => {
    if (phase !== PHASES.IDLE && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error('Camera error:', err);
        });
    }
  }, [phase]);

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
    <div style={{ position: 'relative', width: 640, height: 540, background: BRAND_DARK, fontFamily: BRAND_FONT, borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', margin: '40px auto', overflow: 'hidden' }}>
      {/* Logo and header (always visible) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0 8px 0', background: 'transparent' }}>
        <img src={LOGO_URL} alt="PickleRX Logo" style={{ height: 48, marginRight: 16 }} />
        <span style={{ color: 'white', fontWeight: 700, fontSize: 32, letterSpacing: 2 }}>PickleRX Assessment</span>
      </div>
      {/* Main content */}
      <div style={{ position: 'relative', width: 640, height: 480 }}>
        {phase === PHASES.IDLE && (
          <button onClick={() => setPhase(PHASES.COUNTDOWN_FRONT)} style={{ position: 'absolute', zIndex: 2, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: BRAND_GREEN, color: BRAND_DARK, fontWeight: 700, fontSize: 28, padding: '18px 48px', border: 'none', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer', letterSpacing: 1 }}>Start Assessment</button>
        )}
        {(phase === PHASES.COUNTDOWN_FRONT || phase === PHASES.COUNTDOWN_SIDE) && (
          <div style={{ position: 'absolute', zIndex: 2, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', color: BRAND_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 96, fontWeight: 800, letterSpacing: 2, borderRadius: 20, textShadow: '0 2px 8px #000' }}>
            {countdown}
          </div>
        )}
        {phase === PHASES.TURN && (
          <div style={{ position: 'absolute', zIndex: 2, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexDirection: 'column', borderRadius: 20, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 36, marginBottom: 16, color: BRAND_GREEN }}>Turn to your right for the side view</div>
            <button onClick={() => setPhase(PHASES.COUNTDOWN_SIDE)} style={{ marginTop: 24, fontSize: 24, background: BRAND_GREEN, color: BRAND_DARK, fontWeight: 700, padding: '12px 36px', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>Ready</button>
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
              style={{ position: 'absolute', top: 0, left: 0, width: 640, height: 480, transform: 'scaleX(-1)', zIndex: 1, borderRadius: 20, boxShadow: '0 2px 8px #000' }}
            />
            <PoseOverlay keypoints={keypoints} />
            {(phase === PHASES.RECORD_FRONT || phase === PHASES.RECORD_SIDE) && (
              <div style={{ position: 'absolute', zIndex: 2, right: 24, top: 24, background: 'rgba(12,20,40,0.85)', color: BRAND_GREEN, padding: '16px 32px', borderRadius: 12, fontSize: 24, fontWeight: 700, letterSpacing: 1, boxShadow: '0 2px 8px #000' }}>
                {phase === PHASES.RECORD_FRONT ? `Front View: Squats ${squatCount}/${SQUAT_TARGET}` : `Side View: Squats ${squatCount}/${SQUAT_TARGET}`}
              </div>
            )}
          </>
        )}
        {phase === PHASES.RESULTS && results && (
          <ResultsScreen results={results} onRetake={handleRetake} />
        )}
      </div>
    </div>
  );
} 