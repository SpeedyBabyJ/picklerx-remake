// Safe TensorFlow.js wrapper to prevent flag evaluation during SSR

let tf: any = null;
let posedetection: any = null;
let tfjsBackendWebgl: any = null;

export const safeImportTensorFlow = async () => {
  try {
    // Only import in browser environment
    if (typeof window === 'undefined') {
      console.warn('TensorFlow.js cannot be imported during SSR');
      return { tf: null, posedetection: null };
    }

    // Check if already imported
    if (tf && posedetection) {
      return { tf, posedetection };
    }

    // Dynamic imports with error handling
    const [tfModule, posedetectionModule, backendModule] = await Promise.all([
      import('@tensorflow/tfjs').catch(() => null),
      import('@tensorflow-models/pose-detection').catch(() => null),
      import('@tensorflow/tfjs-backend-webgl').catch(() => null),
    ]);

    if (!tfModule || !posedetectionModule) {
      throw new Error('Failed to import TensorFlow.js modules');
    }

    tf = tfModule;
    posedetection = posedetectionModule;
    tfjsBackendWebgl = backendModule;

    // Initialize TensorFlow.js safely
    await tf.ready();

    return { tf, posedetection };
  } catch (error) {
    console.error('Failed to import TensorFlow.js:', error);
    return { tf: null, posedetection: null };
  }
};

export const isTensorFlowAvailable = (): boolean => {
  return tf !== null && posedetection !== null;
};

export const getTensorFlow = () => ({ tf, posedetection }); 