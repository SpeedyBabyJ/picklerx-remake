import React, { useState } from 'react';
import OverheadSquatAssessment from '../components/OverheadSquatAssessment';
import ResultsScreen from '../components/ResultsScreen';
import { BiomechanicsAnalysis } from '../utils/metricsUtils';

const Home = () => {
  const [currentView, setCurrentView] = useState<'assessment' | 'results'>('assessment');
  const [assessmentResults, setAssessmentResults] = useState<BiomechanicsAnalysis | null>(null);

  const handleAssessmentComplete = (results: BiomechanicsAnalysis) => {
    setAssessmentResults(results);
    setCurrentView('results');
  };

  const handleRetry = () => {
    setCurrentView('assessment');
    setAssessmentResults(null);
  };

  const handleHome = () => {
    setCurrentView('assessment');
    setAssessmentResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {currentView === 'assessment' ? (
        <OverheadSquatAssessment onAssessmentComplete={handleAssessmentComplete} />
      ) : (
        <ResultsScreen 
          results={assessmentResults!}
          onRetry={handleRetry}
          onHome={handleHome}
        />
      )}
    </div>
  );
};

export default Home;
