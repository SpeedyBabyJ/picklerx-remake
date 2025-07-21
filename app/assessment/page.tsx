'use client';
import React from 'react';
import ClientOnlyAssessment from '../../src/components/ClientOnlyAssessment';

export const dynamic = 'force-dynamic';

export default function AssessmentPage() {
  return (
    <main>
      <ClientOnlyAssessment />
    </main>
  );
} 