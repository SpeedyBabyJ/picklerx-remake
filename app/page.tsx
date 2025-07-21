'use client';
import React from 'react';
import ClientOnlyAssessment from '../src/components/ClientOnlyAssessment';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
      <ClientOnlyAssessment />
    </main>
  );
} 