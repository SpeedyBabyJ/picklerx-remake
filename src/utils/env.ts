// Safe environment utility to prevent flag evaluation errors during SSR

export const safeGetBool = (key: string): boolean => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Check if env object exists and has getBool method
    if (typeof (globalThis as any).env?.getBool === 'function') {
      return (globalThis as any).env.getBool(key);
    }
    
    // Fallback to process.env for Next.js public env vars
    if (typeof process !== 'undefined' && process.env) {
      const envKey = `NEXT_PUBLIC_${key.toUpperCase()}`;
      return process.env[envKey] === 'true';
    }
    
    return false;
  } catch {
    return false;
  }
};

export const safeGetString = (key: string): string => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return '';
    }
    
    // Check if env object exists and has get method
    if (typeof (globalThis as any).env?.get === 'function') {
      return (globalThis as any).env.get(key) || '';
    }
    
    // Fallback to process.env for Next.js public env vars
    if (typeof process !== 'undefined' && process.env) {
      const envKey = `NEXT_PUBLIC_${key.toUpperCase()}`;
      return process.env[envKey] || '';
    }
    
    return '';
  } catch {
    return '';
  }
};

export const isDebugMode = (): boolean => {
  return safeGetBool('DEBUG');
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
}; 