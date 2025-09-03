import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { evaluationApi } from '../api/evaluation';
import type { EvaluationRun } from '../types/api';

interface EvaluationStatistics {
  totalRuns: number;
  totalResults: number;
  averageAccuracy: number;
  domains: string[];
  configs: string[];
}

interface EvaluationContextType {
  evaluationRuns: EvaluationRun[] | undefined;
  statistics: EvaluationStatistics | undefined;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EvaluationContext = createContext<EvaluationContextType | undefined>(undefined);

interface EvaluationProviderProps {
  children: ReactNode;
}

export function EvaluationProvider({ children }: EvaluationProviderProps) {
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[] | undefined>(undefined);
  const [statistics, setStatistics] = useState<EvaluationStatistics | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both evaluation runs and statistics in parallel
      const [runs, stats] = await Promise.all([
        evaluationApi.getEvaluationRuns(),
        evaluationApi.getEvaluationStatistics()
      ]);
      
      setEvaluationRuns(runs);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evaluation data');
      console.error('Error fetching evaluation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchAllData();
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const value: EvaluationContextType = {
    evaluationRuns,
    statistics,
    loading,
    error,
    refresh
  };

  return (
    <EvaluationContext.Provider value={value}>
      {children}
    </EvaluationContext.Provider>
  );
}

export function useEvaluationContext() {
  const context = useContext(EvaluationContext);
  if (context === undefined) {
    throw new Error('useEvaluationContext must be used within an EvaluationProvider');
  }
  return context;
}
