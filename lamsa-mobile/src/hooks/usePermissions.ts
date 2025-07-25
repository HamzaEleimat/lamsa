import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { 
  permissionManager, 
  PermissionType, 
  PermissionStatus, 
  PermissionResult,
  PermissionRequest,
} from '@services/permissions/PermissionManager';

interface UsePermissionOptions {
  autoCheck?: boolean;
  checkOnAppStateChange?: boolean;
}

interface UsePermissionReturn {
  status: PermissionStatus;
  canAskAgain: boolean;
  isChecking: boolean;
  isRequesting: boolean;
  error: Error | null;
  check: () => Promise<PermissionResult>;
  request: (options?: Partial<PermissionRequest>) => Promise<PermissionResult>;
  openSettings: () => void;
}

export function usePermission(
  type: PermissionType,
  options: UsePermissionOptions = {}
): UsePermissionReturn {
  const { autoCheck = true, checkOnAppStateChange = true } = options;
  
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const check = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const result = await permissionManager.check(type);
      setStatus(result.status);
      setCanAskAgain(result.canAskAgain);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, [type]);

  const request = useCallback(async (options?: Partial<PermissionRequest>) => {
    setIsRequesting(true);
    setError(null);
    
    try {
      const result = await permissionManager.request({
        type,
        ...options,
      });
      setStatus(result.status);
      setCanAskAgain(result.canAskAgain);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [type]);

  const openSettings = useCallback(() => {
    permissionManager.openSettings();
  }, []);

  // Auto check on mount
  useEffect(() => {
    if (autoCheck) {
      check();
    }
  }, [autoCheck, check]);

  // Check on app state change (when coming back from settings)
  useEffect(() => {
    if (!checkOnAppStateChange) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        check();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [checkOnAppStateChange, check]);

  return {
    status,
    canAskAgain,
    isChecking,
    isRequesting,
    error,
    check,
    request,
    openSettings,
  };
}

// Hook for multiple permissions
interface UseMultiplePermissionsReturn {
  permissions: Record<PermissionType, PermissionResult>;
  isChecking: boolean;
  isRequesting: boolean;
  error: Error | null;
  checkAll: () => Promise<Record<PermissionType, PermissionResult>>;
  requestAll: (options?: Record<PermissionType, Partial<PermissionRequest>>) => Promise<Record<PermissionType, PermissionResult>>;
  hasAll: boolean;
  hasAny: boolean;
  openSettings: () => void;
}

export function useMultiplePermissions(
  types: PermissionType[],
  options: UsePermissionOptions = {}
): UseMultiplePermissionsReturn {
  const { autoCheck = true, checkOnAppStateChange = true } = options;
  
  const [permissions, setPermissions] = useState<Record<PermissionType, PermissionResult>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkAll = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const results: Record<PermissionType, PermissionResult> = {};
      
      for (const type of types) {
        results[type] = await permissionManager.check(type);
      }
      
      setPermissions(results);
      return results;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, [types]);

  const requestAll = useCallback(async (
    options?: Record<PermissionType, Partial<PermissionRequest>>
  ) => {
    setIsRequesting(true);
    setError(null);
    
    try {
      const requests = types.map(type => ({
        type,
        ...(options?.[type] || {}),
      }));
      
      const results = await permissionManager.requestMultiple(requests);
      setPermissions(results);
      return results;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [types]);

  const openSettings = useCallback(() => {
    permissionManager.openSettings();
  }, []);

  // Calculate hasAll and hasAny
  const hasAll = Object.values(permissions).every(p => p.status === 'granted');
  const hasAny = Object.values(permissions).some(p => p.status === 'granted');

  // Auto check on mount
  useEffect(() => {
    if (autoCheck) {
      checkAll();
    }
  }, [autoCheck, checkAll]);

  // Check on app state change
  useEffect(() => {
    if (!checkOnAppStateChange) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkAll();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [checkOnAppStateChange, checkAll]);

  return {
    permissions,
    isChecking,
    isRequesting,
    error,
    checkAll,
    requestAll,
    hasAll,
    hasAny,
    openSettings,
  };
}