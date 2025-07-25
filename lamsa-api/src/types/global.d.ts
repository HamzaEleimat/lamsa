/**
 * Global type augmentations for monitoring services
 */

declare global {
  namespace NodeJS {
    interface Global {
      newrelic?: {
        recordCustomEvent: (eventType: string, attributes: Record<string, any>) => void;
        noticeError: (error: Error, customAttributes?: Record<string, any>) => void;
        startSegment: (name: string, handler: () => any) => any;
        [key: string]: any;
      };
    }
  }
  
  // For newer TypeScript versions that use globalThis
  var newrelic: {
    recordCustomEvent: (eventType: string, attributes: Record<string, any>) => void;
    noticeError: (error: Error, customAttributes?: Record<string, any>) => void;
    startSegment: (name: string, handler: () => any) => any;
    [key: string]: any;
  } | undefined;
}

export {};