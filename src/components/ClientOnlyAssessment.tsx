'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ClientOnlyAssessment() {
  const [poseDetection, setPoseDetection] = useState<any>(null);
  const [detector, setDetector] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    if (!detector || !videoRef.current) return;

    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const poses = await detector.estimatePoses(videoRef.current);
        console.log('Poses:', poses); // replace this with draw logic
      }
      requestAnimationFrame(detect);
    };

    detect();
  }, [detector]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="640"
        height="480"
        onLoadedMetadata={() => {
          videoRef.current?.play();
        }}
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
} 