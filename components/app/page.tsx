'use client';

import React from 'react';
import OverheadSquatAssessment from '../src/components/OverheadSquatAssessment';

export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <h1>PickleRX Overhead Squat Assessment</h1>
      <OverheadSquatAssessment onAssessmentComplete={(result) => console.log(result)} />
    </main>
  );
} 