// React hooks for API data fetching with loading states and error handling

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiResponse } from '../types/api';
import { ApiError } from '../api/client';

/**
 * Generic hook for API calls with loading and error states
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): ApiResponse<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const apiCallRef = useRef(apiCall);

  // Update the ref when apiCall or dependencies change
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall, ...dependencies]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const result = await apiCallRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, error, loading };
}

/**
 * Hook for API calls that can be manually triggered
 */
export function useApiCallback<T>(
  apiCall: () => Promise<T>
): {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  execute: () => Promise<void>;
  reset: () => void;
} {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi<T>(
  apiCall: (page: number, limit: number) => Promise<{ data: T[]; total: number; page: number; limit: number }>,
  initialPage: number = 1,
  initialLimit: number = 10
): {
  data: T[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: ApiError | undefined;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  refresh: () => void;
} {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const result = await apiCall(page, limit);
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [apiCall, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPageState(1); // Reset to first page when changing limit
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, page, limit, loading, error, setPage, setLimit, refresh };
}

/**
 * Hook for real-time data updates (polling)
 */
export function usePollingApi<T>(
  apiCall: () => Promise<T>,
  interval: number = 5000,
  dependencies: any[] = []
): ApiResponse<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(undefined);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [...dependencies]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling
    const intervalId = setInterval(fetchData, interval);

    return () => clearInterval(intervalId);
  }, [fetchData, interval]);

  return { data, error, loading };
}
