'use client';

import React, { useState, useEffect, useRef } from 'react';
import CameraCapture from './CameraCapture';
import PoseOverlay from './PoseOverlay';
import ResultsScreen from './ResultsScreen';
import { calculateMetrics } from '../utils/metricsUtils';

const PHASES = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  RECORD_FRONT: 'recordFront',
  PAUSE: 'pause',
  RECORD_SIDE: 'recordSide',
  COMPUTING: 'computing',
  COMPLETE: 'complete',
} as const;

const LOGO_URL = '/picklerx-logo.jpg';
const BRAND_GREEN = '#8CD211';
const BRAND_DARK = '#0B1C2D';
const BRAND_FONT = 'system-ui, sans-serif';
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

export default function ClientOnlyAssessment() {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'recordFront' | 'pause' | 'recordSide' | 'computing' | 'complete'>(PHASES.IDLE);
  const [countdown, setCountdown] = useState(3);
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [keypoints, setKeypoints] = useState<any[]>([]);
  const [squatCount, setSquatCount] = useState(0);
  const [results, setResults] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();
  const [frontFrames, setFrontFrames] = useState<any[]>([]);
  const [sideFrames, setSideFrames] = useState<any[]>([]);
  const SQUAT_TARGET = 3;

  // Camera initialization: request camera when assessment starts
  useEffect(() => {
    if (phase !== PHASES.IDLE && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().then(() => {
              console.log("🎥 Camera initialized:", videoRef.current?.srcObject);
            });
          }
        })
        .catch((err) => {
          console.error('Camera error:', err);
        });
    }
  }, [phase]);

  // Countdown logic
  useEffect(() => {
    if (phase === PHASES.COUNTDOWN) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            setRecordingStarted(true);
            setPhase(PHASES.RECORD_FRONT);
            console.log('🟢 Recording started');
            return 3;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);

  // Debug logs for readiness
  useEffect(() => {
    console.log('🎥 video loaded?', videoRef.current?.readyState);
    console.log('🔁 Detection Started:', recordingStarted);
  }, [videoRef.current, recordingStarted]);

  // Reset for retake
  const handleRetake = () => {
    setPhase(PHASES.IDLE);
    setFrontFrames([]);
    setSideFrames([]);
    setResults(null);
    setSquatCount(0);
    setRecordingStarted(false);
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
          <button onClick={() => setPhase(PHASES.COUNTDOWN)} style={{ position: 'absolute', zIndex: 2, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: BRAND_GREEN, color: BRAND_DARK, fontWeight: 700, fontSize: 28, padding: '18px 48px', border: 'none', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer', letterSpacing: 1 }}>Start Assessment</button>
        )}
        {phase === PHASES.COUNTDOWN && (
          <div style={{ position: 'absolute', zIndex: 2, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', color: BRAND_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 96, fontWeight: 800, letterSpacing: 2, borderRadius: 20, textShadow: '0 2px 8px #000' }}>
            {countdown}
          </div>
        )}
        {phase === PHASES.PAUSE && (
          <div style={{ position: 'absolute', zIndex: 2, left: 0, top: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexDirection: 'column', borderRadius: 20, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 36, marginBottom: 16, color: BRAND_GREEN }}>Turn to your right for the side view</div>
            <button onClick={() => setPhase(PHASES.COUNTDOWN)} style={{ marginTop: 24, fontSize: 24, background: BRAND_GREEN, color: BRAND_DARK, fontWeight: 700, padding: '12px 36px', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>Ready</button>
          </div>
        )}
        {phase === PHASES.RECORD_FRONT && recordingStarted && (
          <>
            <CameraCapture
              assessmentPhase={phase}
              onSquatComplete={() => {
                if (squatCount >= SQUAT_TARGET) {
                  setPhase(PHASES.PAUSE);
                }
              }}
              onCaptureFrame={(keypoints) => {
                setKeypoints(keypoints);
                // Add squat detection logic here if needed
              }}
              onPoseDetected={(pose) => {
                setKeypoints(pose.keypoints);
              }}
            />
            <div style={{ position: 'absolute', zIndex: 2, right: 24, top: 24, background: 'rgba(12,20,40,0.85)', color: BRAND_GREEN, padding: '16px 32px', borderRadius: 12, fontSize: 24, fontWeight: 700, letterSpacing: 1, boxShadow: '0 2px 8px #000' }}>
              Front View: Squats {squatCount}/{SQUAT_TARGET}
            </div>
          </>
        )}
        {phase === PHASES.RECORD_SIDE && recordingStarted && (
          <>
            <CameraCapture
              assessmentPhase={phase}
              onSquatComplete={() => {
                if (squatCount >= SQUAT_TARGET) {
                  // Calculate results
                  const metrics = calculateMetrics(frontFrames, sideFrames);
                  setResults(metrics);
                  setPhase(PHASES.COMPLETE);
                }
              }}
              onCaptureFrame={(keypoints) => {
                setKeypoints(keypoints);
                // Add squat detection logic here if needed
              }}
              onPoseDetected={(pose) => {
                setKeypoints(pose.keypoints);
              }}
            />
            <div style={{ position: 'absolute', zIndex: 2, right: 24, top: 24, background: 'rgba(12,20,40,0.85)', color: BRAND_GREEN, padding: '16px 32px', borderRadius: 12, fontSize: 24, fontWeight: 700, letterSpacing: 1, boxShadow: '0 2px 8px #000' }}>
              Side View: Squats {squatCount}/{SQUAT_TARGET}
            </div>
          </>
        )}
        {phase === PHASES.COMPLETE && results && (
          <ResultsScreen results={results} onRetake={handleRetake} />
        )}
      </div>
    </div>
  );
} 