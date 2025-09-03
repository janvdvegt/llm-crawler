// Evaluation API functions

import { apiClient } from './client';
import type { EvaluationRun } from '../types/api';

export const evaluationApi = {
  /**
   * Get all evaluation runs
   */
  async getEvaluationRuns(): Promise<EvaluationRun[]> {
    return apiClient.get<EvaluationRun[]>('/api/evaluation_runs');
  },

  /**
   * Get a specific evaluation run by ID
   */
  async getEvaluationRun(id: string): Promise<EvaluationRun> {
    return apiClient.get<EvaluationRun>(`/api/evaluation_runs/${encodeURIComponent(id)}`);
  },

  /**
   * Get evaluation results for a specific domain
   */
  async getEvaluationResultsByDomain(domain: string): Promise<EvaluationRun[]> {
    const runs = await this.getEvaluationRuns();
    return runs.filter(run => 
      run.results.some(result => result.domain === domain)
    );
  },

  /**
   * Get evaluation results for a specific config
   */
  async getEvaluationResultsByConfig(configName: string): Promise<EvaluationRun[]> {
    const runs = await this.getEvaluationRuns();
    return runs.filter(run => 
      run.results.some(result => result.config_name === configName)
    );
  },

  /**
   * Get evaluation results for a specific URL
   */
  async getEvaluationResultsByUrl(url: string): Promise<EvaluationRun[]> {
    const runs = await this.getEvaluationRuns();
    return runs.filter(run => 
      run.results.some(result => result.url === url)
    );
  },

  /**
   * Get aggregated statistics for all evaluation runs
   */
  async getEvaluationStatistics(): Promise<{
    totalRuns: number;
    totalResults: number;
    averageAccuracy: number;
    domains: string[];
    configs: string[];
  }> {
    const runs = await this.getEvaluationRuns();
    const allResults = runs.flatMap(run => run.results);
    
    const domains = [...new Set(allResults.map(result => result.domain))];
    const configs = [...new Set(allResults.map(result => result.config_name))];
    
    const averageAccuracy = allResults.length > 0 
      ? allResults.reduce((sum, result) => sum + (1 - result.abs_levenshtein_distance_norm), 0) / allResults.length
      : 0;

    return {
      totalRuns: runs.length,
      totalResults: allResults.length,
      averageAccuracy,
      domains,
      configs,
    };
  },

  /**
   * Get the latest evaluation run
   */
  async getLatestEvaluationRun(): Promise<EvaluationRun | null> {
    const runs = await this.getEvaluationRuns();
    if (runs.length === 0) return null;
    
    // Sort by datetime_str (assuming ISO format) and return the latest
    return runs.sort((a, b) => 
      new Date(b.datetime_str).getTime() - new Date(a.datetime_str).getTime()
    )[0];
  },

  /**
   * Delete a specific evaluation run by ID
   */
  async deleteEvaluationRun(id: string): Promise<{ message: string; deleted_id: string }> {
    return apiClient.delete<{ message: string; deleted_id: string }>(`/api/evaluation_runs/${encodeURIComponent(id)}`);
  },
};
