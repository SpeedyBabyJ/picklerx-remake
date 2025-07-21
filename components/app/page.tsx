'use client';

import React from 'react';

export default function Home() {
  return (
    <main style={{ 
      padding: 40,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1c2d 0%, #1e3a8a 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: 48, marginBottom: 20 }}>🏓 PickleRX</h1>
      <div style={{ fontSize: 32, marginBottom: 10 }}>✅ App Router Working!</div>
      <div style={{ fontSize: 18, opacity: 0.8, marginTop: 20 }}>
        Biomechanics Assessment Platform
      </div>
      <div style={{ fontSize: 16, opacity: 0.6, marginTop: 10 }}>
        Real-time pose detection • Professional analysis • Injury prevention
      </div>
      <div style={{ fontSize: 14, opacity: 0.4, marginTop: 20 }}>
        Vercel deployment test successful
      </div>
    </main>
  );
} 