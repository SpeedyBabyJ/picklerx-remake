'use client';
import React from 'react';

const LOGO_URL = '/picklerx-logo.jpg';
const BRAND_GREEN = '#8CD211';
const BRAND_DARK = '#0B1C2D';
const BRAND_FONT = 'system-ui, sans-serif';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: BRAND_DARK, color: 'white', fontFamily: BRAND_FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0, margin: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <img src={LOGO_URL} alt="PickleRX Logo" style={{ height: 80, marginRight: 24 }} />
        <span style={{ color: 'white', fontWeight: 900, fontSize: 56, letterSpacing: 2 }}>Pickle<span style={{ color: BRAND_GREEN }}>RX</span></span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, letterSpacing: 1, textAlign: 'center' }}>
        Biomechanics, Performance, and Recovery Platform
      </div>
      <div style={{ fontSize: 20, color: '#b0e0a8', marginBottom: 48, textAlign: 'center', maxWidth: 600 }}>
        Your personalized pickleball prescription for movement, injury prevention, and peak performance.
      </div>
      <a href="/assessment" style={{ background: BRAND_GREEN, color: BRAND_DARK, fontWeight: 800, fontSize: 28, padding: '22px 64px', borderRadius: 18, textDecoration: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', letterSpacing: 1, transition: 'background 0.2s', display: 'inline-block' }}>
        Start My Movement Assessment
      </a>
    </div>
  );
} 