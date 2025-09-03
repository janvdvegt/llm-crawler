// React hooks for config-related API calls

import { useCallback } from 'react';
import { useApi } from './useApi';
import { configApi } from '../api/config';

/**
 * Hook to fetch all configs
 */
export function useConfigs() {
  const apiCall = useCallback(() => configApi.getConfigs(), []);
  return useApi(apiCall, []);
}

/**
 * Hook to fetch a specific config by name
 */
export function useConfig(configName: string) {
  const apiCall = useCallback(() => configApi.getConfig(configName), [configName]);
  return useApi(apiCall, [configName]);
}

/**
 * Hook to fetch the current production config
 */
export function useCurrentProductionConfig() {
  const apiCall = useCallback(() => configApi.getCurrentProductionConfig(), []);
  return useApi(apiCall, []);
}

/**
 * Hook to set the production config
 */
export function useSetProductionConfig() {
  return useCallback(async (configName: string) => {
    return configApi.setProductionConfig(configName);
  }, []);
}
