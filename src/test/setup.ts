import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  setBackend: vi.fn(),
  ready: vi.fn(),
}));

// Mock pose detection
vi.mock('@tensorflow-models/pose-detection', () => ({
  createDetector: vi.fn(() => ({
    estimatePoses: vi.fn(() => []),
  })),
  SupportedModels: {
    MoveNet: 'MoveNet',
  },
  movenet: {
    modelType: {
      SINGLEPOSE_LIGHTNING: 'SINGLEPOSE_LIGHTNING',
    },
  },
}));

// Mock media devices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({})),
  },
  writable: true,
});

// Mock canvas context with minimal implementation
const mockCanvasContext = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  canvas: {} as HTMLCanvasElement,
  globalAlpha: 1,
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  font: '10px sans-serif',
  shadowBlur: 0,
  shadowColor: '#000000',
};

// Mock getContext method
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvasContext),
  writable: true,
}); 