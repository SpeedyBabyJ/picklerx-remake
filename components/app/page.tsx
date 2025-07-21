'use client';

import React from 'react';
import OverheadSquatAssessment from '../src/components/OverheadSquatAssessment';

export default function Home() {
  return (
    <main style={{ 
      padding: 20,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1c2d 0%, #1e3a8a 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: 48, 
        textAlign: 'center', 
        marginBottom: 20,
        background: 'linear-gradient(45deg, #60a5fa, #a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        🏓 PickleRX
      </h1>
      <OverheadSquatAssessment onAssessmentComplete={(result) => console.log(result)} />
    </main>
  );
} 