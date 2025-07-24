'use client';
import React, { useState, useEffect } from 'react';
import ClientOnlyAssessment from '../../src/components/ClientOnlyAssessment';

export const dynamic = 'force-dynamic';

export default function AssessmentPage() {
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client side to prevent SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything until client-side to prevent flag evaluation during SSR
  if (!isClient) {
    return (
      <main style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#0B1C2D',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Loading Assessment...</h1>
          <p style={{ fontSize: '16px', opacity: 0.8 }}>Initializing camera and pose detection</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <ClientOnlyAssessment />
    </main>
  );
} 