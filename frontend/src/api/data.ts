// Data API functions for URL prefixes, sample URLs, and related data

import { apiClient } from './client';
import type { 
  EvaluationRun, 
  URLPrefix, 
  URLPrefixWithUrls,
  EvaluationResult,
  URL
} from '../types/api';

export interface SystemOverview {
  urlPrefixesCount: number;
  urlsCount: number;
  evaluationsCount: number;
  systemState: string;
  isRunning: boolean;
}

export const dataApi = {
  /**
   * Get system overview statistics
   */
  async getSystemOverview(): Promise<SystemOverview> {
    try {
      // Get URL prefixes count with accurate URL counts
      const urlPrefixes = await apiClient.get<URLPrefixWithUrls[]>('/api/urlprefix');
      const urlPrefixesCount = urlPrefixes.length;
      
      // Get total URLs count from the computed counts
      let urlsCount = 0;
      for (const prefix of urlPrefixes) {
        urlsCount += prefix.url_count;
      }
      
      // Get evaluations count
      const evaluationRuns = await apiClient.get<EvaluationRun[]>('/api/evaluation_runs');
      const evaluationsCount = evaluationRuns.reduce((total, run) => total + run.results.length, 0);
      
      // Get system state
      const systemState = await apiClient.get<{ state: string; is_running: boolean }>('/api/system/state');
      
      return {
        urlPrefixesCount,
        urlsCount,
        evaluationsCount,
        systemState: systemState.state,
        isRunning: systemState.is_running,
      };
    } catch (error) {
      // Return default values if any API call fails
      return {
        urlPrefixesCount: 0,
        urlsCount: 0,
        evaluationsCount: 0,
        systemState: 'UNKNOWN',
        isRunning: false,
      };
    }
  },

  /**
   * Set system state (PAUSE/RUNNING)
   */
  async setSystemState(state: 'PAUSE' | 'RUNNING'): Promise<{ state: string; is_running: boolean }> {
    return apiClient.put<{ state: string; is_running: boolean }>('/api/system/state', state);
  },

  /**
   * Get all available domains from evaluation runs
   * This extracts domains from existing evaluation data
   */
  async getDomains(): Promise<string[]> {
    const runs = await apiClient.get<EvaluationRun[]>('/api/evaluation_runs');
    const domains = new Set<string>();
    
    runs.forEach(run => {
      run.results.forEach(result => {
        domains.add(result.domain);
      });
    });
    
    return Array.from(domains).sort();
  },

  /**
   * Get URL prefixes with their associated URLs
   * This uses the dedicated URLPrefix endpoint
   */
  async getUrlPrefixes(): Promise<URLPrefixWithUrls[]> {
    return apiClient.get<URLPrefixWithUrls[]>('/api/urlprefix');
  },

  /**
   * Get URLs for a specific domain/prefix
   */
  async getUrlsByPrefix(prefix: string): Promise<string[]> {
    try {
      const urlPrefixWithUrls = await apiClient.get<URLPrefixWithUrls>(`/api/urlprefix/${encodeURIComponent(prefix)}`);
      return urlPrefixWithUrls.all_urls;
    } catch (error) {
      // If the specific prefix is not found, return empty array
      return [];
    }
  },

  /**
   * Get a specific URLPrefix by its prefix ID
   */
  async getUrlPrefix(prefix: string): Promise<URLPrefix | null> {
    try {
      const urlPrefixWithUrls = await apiClient.get<URLPrefixWithUrls>(`/api/urlprefix/${encodeURIComponent(prefix)}`);
      return urlPrefixWithUrls.url_prefix;
    } catch (error) {
      // If the specific prefix is not found, return null
      return null;
    }
  },

  /**
   * Get a specific URLPrefix with all associated URLs
   */
  async getUrlPrefixWithUrls(prefix: string): Promise<URLPrefixWithUrls | null> {
    try {
      return await apiClient.get<URLPrefixWithUrls>(`/api/urlprefix/${encodeURIComponent(prefix)}`);
    } catch (error) {
      // If the specific prefix is not found, return null
      return null;
    }
  },

  /**
   * Get detailed information about a specific URL
   */
  async getUrlDetails(url: string): Promise<{
    url: string;
    domain: string;
    evaluationResults: EvaluationResult[];
    latestResult?: EvaluationResult;
    averageAccuracy: number;
    totalEvaluations: number;
    urlObject?: URL;
    hasStoredObject: boolean;
  } | null> {
    try {
      const response = await apiClient.get<{
        url: string;
        domain: string;
        evaluation_results: EvaluationResult[];
        latest_result?: EvaluationResult;
        average_accuracy: number;
        total_evaluations: number;
        url_object?: URL;
        has_stored_object: boolean;
      }>(`/api/urls/${encodeURIComponent(url)}/details`);
      
      return {
        url: response.url,
        domain: response.domain,
        evaluationResults: response.evaluation_results,
        latestResult: response.latest_result,
        averageAccuracy: response.average_accuracy,
        totalEvaluations: response.total_evaluations,
        urlObject: response.url_object,
        hasStoredObject: response.has_stored_object,
      };
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get evaluation results for a specific URL across all runs
   */
  async getUrlEvaluationHistory(url: string): Promise<EvaluationResult[]> {
    const runs = await apiClient.get<EvaluationRun[]>('/api/evaluation_runs');
    const results: EvaluationResult[] = [];
    
    runs.forEach(run => {
      run.results.forEach(result => {
        if (result.url === url) {
          results.push(result);
        }
      });
    });
    
    // Sort by datetime (most recent first)
    return results.sort((a, b) => {
      const runA = runs.find(run => run.results.includes(a));
      const runB = runs.find(run => run.results.includes(b));
      if (!runA || !runB) return 0;
      return new Date(runB.datetime_str).getTime() - new Date(runA.datetime_str).getTime();
    });
  },

  /**
   * Get statistics for a specific domain/prefix
   */
  async getPrefixStatistics(prefix: string): Promise<{
    prefix: string;
    totalUrls: number;
    totalEvaluations: number;
    averageAccuracy: number;
    configs: string[];
    lastEvaluated?: string;
  }> {
    const runs = await apiClient.get<EvaluationRun[]>('/api/evaluation_runs');
    const prefixResults: EvaluationResult[] = [];
    const configs = new Set<string>();
    
    runs.forEach(run => {
      run.results.forEach(result => {
        if (result.domain === prefix) {
          prefixResults.push(result);
          configs.add(result.config_name);
        }
      });
    });
    
    const urls = new Set(prefixResults.map(result => result.url));
    const averageAccuracy = prefixResults.length > 0
      ? prefixResults.reduce((sum, result) => sum + (1 - result.abs_levenshtein_distance_norm), 0) / prefixResults.length
      : 0;
    
    // Find the most recent evaluation for this prefix
    const latestRun = runs
      .filter(run => run.results.some(result => result.domain === prefix))
      .sort((a, b) => new Date(b.datetime_str).getTime() - new Date(a.datetime_str).getTime())[0];
    
    return {
      prefix,
      totalUrls: urls.size,
      totalEvaluations: prefixResults.length,
      averageAccuracy,
      configs: Array.from(configs).sort(),
      lastEvaluated: latestRun?.datetime_str,
    };
  },

  /**
   * Get a specific URL object
   */
  async getUrl(url: string): Promise<URL | null> {
    try {
      return await apiClient.get<URL>(`/api/urls/${encodeURIComponent(url)}`);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get all URLs that have been evaluated
   */
  async getAllEvaluatedUrls(): Promise<string[]> {
    return apiClient.get<string[]>('/api/urls/evaluated');
  },

  /**
   * Get all URL objects stored in the database
   */
  async getAllStoredUrls(): Promise<URL[]> {
    return apiClient.get<URL[]>('/api/urls');
  },

  /**
   * Search URLs by partial match
   */
  async searchUrls(query: string): Promise<{
    url: string;
    domain: string;
    accuracy?: number;
  }[]> {
    const runs = await apiClient.get<EvaluationRun[]>('/api/evaluation_runs');
    const results: { url: string; domain: string; accuracy?: number }[] = [];
    const urlMap = new Map<string, { domain: string; accuracies: number[] }>();
    
    runs.forEach(run => {
      run.results.forEach(result => {
        if (result.url.toLowerCase().includes(query.toLowerCase())) {
          if (!urlMap.has(result.url)) {
            urlMap.set(result.url, { domain: result.domain, accuracies: [] });
          }
          urlMap.get(result.url)!.accuracies.push(1 - result.abs_levenshtein_distance_norm);
        }
      });
    });
    
    urlMap.forEach((data, url) => {
      results.push({
        url,
        domain: data.domain,
        accuracy: data.accuracies.length > 0 
          ? data.accuracies.reduce((sum, acc) => sum + acc, 0) / data.accuracies.length 
          : undefined,
      });
    });
    
    return results.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
  },

  /**
   * Delete a URL prefix and all its associated URLs
   */
  async deleteUrlPrefix(prefix: string): Promise<{
    message: string;
    prefix: string;
    deleted_urls_count: number;
  }> {
    return apiClient.delete<{
      message: string;
      prefix: string;
      deleted_urls_count: number;
    }>(`/api/urlprefix/${encodeURIComponent(prefix)}`);
  },

  /**
   * Delete a specific URL
   */
  async deleteUrl(url: string): Promise<{
    message: string;
    url: string;
  }> {
    return apiClient.delete<{
      message: string;
      url: string;
    }>(`/api/urls/${encodeURIComponent(url)}`);
  },
};
