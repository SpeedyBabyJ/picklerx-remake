import { describe, it, expect } from 'vitest';
import { 
  average, 
  max, 
  min, 
  rangeOfMotion, 
  calculateJointAngles,
  calculateRiskTier,
  generateFlagsAndRecommendations
} from '../utils/metricsUtils';

describe('metricsUtils', () => {
  describe('average', () => {
    it('calculates average correctly', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3);
      expect(average([10, 20, 30])).toBe(20);
      expect(average([])).toBe(0);
    });
  });

  describe('max', () => {
    it('finds maximum value', () => {
      expect(max([1, 5, 3, 9, 2])).toBe(9);
      expect(max([-1, -5, -3])).toBe(-1);
      expect(max([])).toBe(0);
    });
  });

  describe('min', () => {
    it('finds minimum value', () => {
      expect(min([1, 5, 3, 9, 2])).toBe(1);
      expect(min([-1, -5, -3])).toBe(-5);
      expect(min([])).toBe(0);
    });
  });

  describe('rangeOfMotion', () => {
    it('calculates range correctly', () => {
      expect(rangeOfMotion([10, 20, 30, 40])).toBe(30);
      expect(rangeOfMotion([100, 90, 110, 95])).toBe(20);
      expect(rangeOfMotion([])).toBe(0);
    });
  });

  describe('calculateRiskTier', () => {
    it('classifies risk tiers correctly', () => {
      expect(calculateRiskTier(20)).toBe('low');
      expect(calculateRiskTier(45)).toBe('moderate');
      expect(calculateRiskTier(70)).toBe('high');
    });
  });

  describe('generateFlagsAndRecommendations', () => {
    it('generates flags for high knee valgus', () => {
      const analysis = {
        mobility: { ankleDorsiflexion: 20, kneeFlexion: 100, hipFlexion: 90, shoulderFlexion: 80, overall: 75 },
        compensation: { kneeValgus: 15, trunkLean: 10, heelLift: 5, asymmetry: 8, overall: 45 },
        symmetry: { leftRightBalance: 85, shoulderLevel: 90, hipLevel: 88, overall: 88 },
        injuryRisk: { kneeStress: 30, lowBackStress: 25, ankleStress: 15, overall: 35 },
        tier: 'moderate' as const,
        flags: [],
        recommendations: []
      };

      const result = generateFlagsAndRecommendations(analysis);
      expect(result.flags).toContain('Knee Valgus');
      expect(result.recommendations).toContain('Strengthen glute medius and practice proper knee tracking');
    });

    it('generates flags for high trunk lean', () => {
      const analysis = {
        mobility: { ankleDorsiflexion: 20, kneeFlexion: 100, hipFlexion: 90, shoulderFlexion: 80, overall: 75 },
        compensation: { kneeValgus: 5, trunkLean: 25, heelLift: 5, asymmetry: 8, overall: 45 },
        symmetry: { leftRightBalance: 85, shoulderLevel: 90, hipLevel: 88, overall: 88 },
        injuryRisk: { kneeStress: 30, lowBackStress: 25, ankleStress: 15, overall: 35 },
        tier: 'moderate' as const,
        flags: [],
        recommendations: []
      };

      const result = generateFlagsAndRecommendations(analysis);
      expect(result.flags).toContain('Trunk Lean');
      expect(result.recommendations).toContain('Maintain upright posture and engage core muscles');
    });

    it('does not generate flags for normal values', () => {
      const analysis = {
        mobility: { ankleDorsiflexion: 20, kneeFlexion: 100, hipFlexion: 90, shoulderFlexion: 80, overall: 75 },
        compensation: { kneeValgus: 5, trunkLean: 10, heelLift: 5, asymmetry: 8, overall: 45 },
        symmetry: { leftRightBalance: 95, shoulderLevel: 90, hipLevel: 88, overall: 91 },
        injuryRisk: { kneeStress: 20, lowBackStress: 15, ankleStress: 10, overall: 25 },
        tier: 'low' as const,
        flags: [],
        recommendations: []
      };

      const result = generateFlagsAndRecommendations(analysis);
      expect(result.flags).not.toContain('Knee Valgus');
      expect(result.flags).not.toContain('Trunk Lean');
    });
  });
}); 