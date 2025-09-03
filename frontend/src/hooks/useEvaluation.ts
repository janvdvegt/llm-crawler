// React hooks for evaluation-related API calls

import { useCallback } from 'react';
import { useApi } from './useApi';
import { evaluationApi } from '../api/evaluation';

/**
 * Hook to fetch all evaluation runs
 */
export function useEvaluationRuns() {
  const apiCall = useCallback(() => evaluationApi.getEvaluationRuns(), []);
  return useApi(apiCall, []);
}

/**
 * Hook to fetch a specific evaluation run by ID
 */
export function useEvaluationRun(id: string) {
  const apiCall = useCallback(() => evaluationApi.getEvaluationRun(id), [id]);
  return useApi(apiCall, [id]);
}

/**
 * Hook to fetch evaluation runs for a specific domain
 */
export function useEvaluationRunsByDomain(domain: string) {
  const apiCall = useCallback(() => evaluationApi.getEvaluationResultsByDomain(domain), [domain]);
  return useApi(apiCall, [domain]);
}

/**
 * Hook to fetch evaluation runs for a specific config
 */
export function useEvaluationRunsByConfig(configName: string) {
  const apiCall = useCallback(() => evaluationApi.getEvaluationResultsByConfig(configName), [configName]);
  return useApi(apiCall, [configName]);
}

/**
 * Hook to fetch evaluation runs for a specific URL
 */
export function useEvaluationRunsByUrl(url: string) {
  const apiCall = useCallback(() => evaluationApi.getEvaluationResultsByUrl(url), [url]);
  return useApi(apiCall, [url]);
}

/**
 * Hook to fetch evaluation statistics
 */
export function useEvaluationStatistics() {
  const apiCall = useCallback(() => evaluationApi.getEvaluationStatistics(), []);
  return useApi(apiCall, []);
}

/**
 * Hook to fetch the latest evaluation run
 */
export function useLatestEvaluationRun() {
  const apiCall = useCallback(() => evaluationApi.getLatestEvaluationRun(), []);
  return useApi(apiCall, []);
}
