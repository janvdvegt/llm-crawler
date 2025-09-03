// React hooks for data-related API calls

import React from 'react';
import { useApi, useApiCallback } from './useApi';
import { dataApi } from '../api/data';

/**
 * Hook for system overview data
 */
export function useOverview() {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const overview = useApi(() => dataApi.getSystemOverview(), [refreshTrigger]);
  
  const toggleSystemState = useApiCallback(async () => {
    if (!overview.data) return;
    
    const newState = overview.data.isRunning ? 'PAUSE' : 'RUNNING';
    const result = await dataApi.setSystemState(newState);
    // Trigger a refresh after state change
    setRefreshTrigger(prev => prev + 1);
    return result;
  });

  const setSystemState = async (state: 'PAUSE' | 'RUNNING') => {
    const result = await dataApi.setSystemState(state);
    // Trigger a refresh after state change
    setRefreshTrigger(prev => prev + 1);
    return result;
  };

  return {
    overview,
    toggleSystemState,
    setSystemState,
  };
}

/**
 * Hook to fetch all available domains
 */
export function useDomains() {
  return useApi(() => dataApi.getDomains());
}

/**
 * Hook to fetch all URL prefixes with their associated URLs
 */
export function useUrlPrefixes() {
  return useApi(() => dataApi.getUrlPrefixes());
}

/**
 * Hook to fetch URLs for a specific prefix/domain
 */
export function useUrlsByPrefix(prefix: string) {
  return useApi(
    () => dataApi.getUrlsByPrefix(prefix),
    [prefix]
  );
}

/**
 * Hook to fetch a specific URLPrefix by its prefix ID
 */
export function useUrlPrefix(prefix: string) {
  return useApi(
    () => dataApi.getUrlPrefix(prefix),
    [prefix]
  );
}

/**
 * Hook to fetch a specific URLPrefix with all associated URLs
 */
export function useUrlPrefixWithUrls(prefix: string) {
  return useApi(
    () => dataApi.getUrlPrefixWithUrls(prefix),
    [prefix]
  );
}

/**
 * Hook to fetch detailed information about a specific URL
 */
export function useUrlDetails(url: string) {
  return useApi(
    () => dataApi.getUrlDetails(url),
    [url]
  );
}

/**
 * Hook to fetch evaluation history for a specific URL
 */
export function useUrlEvaluationHistory(url: string) {
  return useApi(
    () => dataApi.getUrlEvaluationHistory(url),
    [url]
  );
}

/**
 * Hook to fetch statistics for a specific prefix/domain
 */
export function usePrefixStatistics(prefix: string) {
  return useApi(
    () => dataApi.getPrefixStatistics(prefix),
    [prefix]
  );
}

/**
 * Hook to get all evaluated URLs
 */
export function useAllEvaluatedUrls() {
  return useApi(() => dataApi.getAllEvaluatedUrls());
}

/**
 * Hook to get all stored URL objects
 */
export function useAllStoredUrls() {
  return useApi(() => dataApi.getAllStoredUrls());
}

/**
 * Hook to search URLs by query
 */
export function useUrlSearch(query: string) {
  return useApi(
    () => dataApi.searchUrls(query),
    [query]
  );
}
