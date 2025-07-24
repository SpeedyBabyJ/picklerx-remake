'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CameraCapture from './CameraCapture';
import { calculateMetrics } from '../utils/metricsUtils';
import type { MetricsOutput } from '../utils/metricsUtils';
import type { PoseFrame } from '../utils/metricsUtils';
import { Keypoint } from '../types';

interface OverheadSquatAssessmentProps {
  onAssessmentComplete: (results: MetricsOutput) => void;
}

type AssessmentPhase = 'idle' | 'countdown' | 'recordFront' | 'pause' | 'recordSide' | 'computing' | 'complete';

const OverheadSquatAssessment: React.FC<OverheadSquatAssessmentProps> = ({
  onAssessmentComplete
}) => {
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [frontFrames, setFrontFrames] = useState<PoseFrame[]>([]);
  const [sideFrames, setSideFrames] = useState<PoseFrame[]>([]);
  const [squatCount, setSquatCount] = useState(0);
  const [currentView, setCurrentView] = useState<'front' | 'side'>('front');
  const [results, setResults] = useState<MetricsOutput | null>(null);
  const [poseDetection, setPoseDetection] = useState<any>(null);

  // Remove any import or dynamic import of '@tensorflow-models/pose-detection'

  const handleCaptureFrame = useCallback((keypoints: any[], phase: 'descent' | 'bottom' | 'ascent', view: 'front' | 'side') => {
    // Ensure all keypoints have required fields for PoseFrame
    const poseFrame = keypoints.map(kp => ({
      x: kp.x ?? 0,
      y: kp.y ?? 0,
      score: kp.score ?? 0,
      name: kp.name ?? ''
    }));
    if (view === 'front') {
      setFrontFrames(prev => [...prev, poseFrame]);
    } else {
      setSideFrames(prev => [...prev, poseFrame]);
    }
  }, []);

  const startAssessment = () => {
    setCurrentPhase('countdown');
    setCountdown(3);
    setFrontFrames([]);
    setSideFrames([]);
    setSquatCount(0);
    setCurrentView('front');
    setResults(null);
  };

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCurrentPhase(currentView === 'front' ? 'recordFront' : 'recordSide');
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeFrontRecording = () => {
    setCurrentPhase('pause');
    setTimeout(() => {
      setCurrentView('side');
      setCurrentPhase('countdown');
      setCountdown(3);
    }, 2000);
  };

  const completeSideRecording = () => {
    setCurrentPhase('computing');
    
    // Calculate metrics from averaged frames
    const analysis = calculateMetrics(frontFrames, sideFrames);
    setResults(analysis);

    // Console logging for live demo
    console.log("🚀 Final Assessment JSON Output:", analysis);
    if (analysis.flags && analysis.flags.length > 0) {
      console.log("🚩 Flags detected:", analysis.flags);
    } else {
      console.log("✅ No compensations detected. Great squat!");
    }
    
    setTimeout(() => {
      setCurrentPhase('complete');
      onAssessmentComplete(analysis);
    }, 1000);
  };

  useEffect(() => {
    if (currentPhase === 'countdown') {
      startCountdown();
    }
  }, [currentPhase, currentView]);

  // Auto-detect squat completion (3 squats)
  useEffect(() => {
    if ((currentPhase === 'recordFront' || currentPhase === 'recordSide') && squatCount >= 3) {
      if (currentView === 'front') {
        completeFrontRecording();
      } else {
        completeSideRecording();
      }
    }
  }, [squatCount, currentPhase, currentView]);

  // Remove any import or dynamic import of '@tensorflow-models/pose-detection'

  if (!poseDetection) return <div>Loading Pose Detection...</div>;

  const getPhaseColor = (phase: AssessmentPhase) => {
    switch (phase) {
      case 'idle': return 'bg-gray-500';
      case 'countdown': return 'bg-yellow-500';
      case 'recordFront': return 'bg-blue-500';
      case 'pause': return 'bg-orange-500';
      case 'recordSide': return 'bg-green-500';
      case 'computing': return 'bg-purple-500';
      case 'complete': return 'bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  const getPhaseMessage = (phase: AssessmentPhase) => {
    switch (phase) {
      case 'idle': return 'Ready to Start';
      case 'countdown': return `Get Ready... ${countdown}`;
      case 'recordFront': return `Recording Front View (${squatCount}/3 squats)`;
      case 'pause': return 'Pause - Turn to Your Right Side';
      case 'recordSide': return `Recording Side View (${squatCount}/3 squats)`;
      case 'computing': return 'Analyzing Movement...';
      case 'complete': return 'Assessment Complete!';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Overhead Squat Assessment
        </h1>
        <p className="text-blue-200 text-lg">
          Professional Biomechanics Analysis
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Camera View */}
          <div className="relative">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-blue-500/20">
              {currentPhase !== 'idle' && (
                <CameraCapture 
                  assessmentPhase={currentPhase}
                  onSquatComplete={() => setSquatCount(prev => prev + 1)}
                  onCaptureFrame={(keypoints) => {
                    // Calculate knee angle from keypoints
                    const findKeypoint = (name: string) => keypoints.find((kp: Keypoint) => kp.name === name);
                    const leftAnkle = findKeypoint('left_ankle');
                    const leftKnee = findKeypoint('left_knee');
                    const leftHip = findKeypoint('left_hip');

                    let kneeAngle = 180;
                    if (leftAnkle && leftKnee && leftHip) {
                      const angle1 = Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x);
                      const angle2 = Math.atan2(leftHip.y - leftKnee.y, leftHip.x - leftKnee.x);
                      let angle = (angle2 - angle1) * 180 / Math.PI;
                      if (angle < 0) angle += 360;
                      if (angle > 180) angle = 360 - angle;
                      kneeAngle = angle;
                    }

                    // Determine phase based on knee angle
                    let phase: 'descent' | 'bottom' | 'ascent' = 'bottom';
                    if (kneeAngle > 110) phase = 'descent';
                    if (kneeAngle < 90) phase = 'ascent';
                    
                    const view = currentView;
                    handleCaptureFrame(keypoints, phase, view);
                  }}
                />
              )}
              
              {/* Countdown Overlay */}
              {currentPhase === 'countdown' && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl font-bold text-white mb-4 animate-pulse">
                      {countdown}
                    </div>
                    <div className="text-xl text-white/80">
                      {currentView === 'front' ? 'Front View Recording' : 'Side View Recording'}
                    </div>
                  </div>
                </div>
              )}

              {/* Phase Indicator */}
              {currentPhase !== 'countdown' && (
                <div className="absolute top-4 left-4 right-4">
                  <div className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${getPhaseColor(currentPhase)}`}>
                    {getPhaseMessage(currentPhase)}
                  </div>
                </div>
              )}

              {/* Pause Instructions */}
              {currentPhase === 'pause' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
                    <div className="text-3xl font-bold text-white mb-4">
                      Turn to Your Right Side
                    </div>
                    <div className="text-lg text-white/80 mb-6">
                      Position yourself so your side profile is visible to the camera
                    </div>
                    <div className="text-sm text-white/60">
                      Keep your arms overhead and maintain the same distance from camera
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            
            {/* Phase Status */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold mb-4">Assessment Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Front View Frames:</span>
                  <span className="font-mono text-blue-400">{frontFrames.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Side View Frames:</span>
                  <span className="font-mono text-blue-400">{sideFrames.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Squat Count:</span>
                  <span className="font-mono text-green-400">{squatCount}/3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Frames:</span>
                  <span className="font-mono text-blue-400">{frontFrames.length + sideFrames.length}</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold mb-4">Instructions</h3>
              <div className="space-y-3 text-sm">
                <p>1. Stand 6-8 feet from camera</p>
                <p>2. Hold arms overhead throughout movement</p>
                <p>3. Perform 3 slow, controlled squats</p>
                <p>4. Maintain natural movement pattern</p>
                <p>5. Turn right for side view recording</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {currentPhase === 'idle' && (
                <button
                  onClick={startAssessment}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Start Assessment
                </button>
              )}

              {currentPhase === 'recordFront' && (
                <button
                  onClick={completeFrontRecording}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Complete Front Recording
                </button>
              )}

              {currentPhase === 'recordSide' && (
                <button
                  onClick={completeSideRecording}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Complete Assessment
                </button>
              )}

              {currentPhase === 'computing' && (
                <div className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold text-lg text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                  Analyzing Movement Patterns...
                </div>
              )}
            </div>

            {/* Progress Indicators */}
            {(currentPhase === 'recordFront' || currentPhase === 'recordSide') && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4">Recording Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Descent Phase:</span>
                    <span className="text-green-400">✓ Capturing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bottom Position:</span>
                    <span className="text-green-400">✓ Capturing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ascent Phase:</span>
                    <span className="text-green-400">✓ Capturing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Squat Count:</span>
                    <span className="text-blue-400">{squatCount}/3</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverheadSquatAssessment; 