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
      Sentry?: {
        withScope: (callback: (scope: any) => void) => void;
        captureException: (error: Error) => void;
        init: (options: any) => void;
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

  var Sentry: {
    withScope: (callback: (scope: any) => void) => void;
    captureException: (error: Error) => void;
    init: (options: any) => void;
    [key: string]: any;
  } | undefined;
}

export {};