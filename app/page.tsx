export const dynamic = "force-dynamic";
'use client';
import React from 'react';
import OverheadSquatAssessment from '../src/components/OverheadSquatAssessment';

export default function Home() {
  return (
    <main>
      <OverheadSquatAssessment onAssessmentComplete={() => {}} />
    </main>
  );
} 