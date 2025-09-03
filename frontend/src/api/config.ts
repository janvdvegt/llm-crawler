// Config API functions

import { apiClient } from './client';
import type { Config } from '../types/api';

export const configApi = {
  /**
   * Get all available configs
   */
  async getConfigs(): Promise<Config[]> {
    return apiClient.get<Config[]>('/api/configs');
  },

  /**
   * Get a specific config by name
   */
  async getConfig(configName: string): Promise<Config> {
    return apiClient.get<Config>(`/api/configs/${encodeURIComponent(configName)}`);
  },

  /**
   * Get the current production config
   */
  async getCurrentProductionConfig(): Promise<{ production_config: string }> {
    return apiClient.get<{ production_config: string }>('/api/configs/production/current');
  },

  /**
   * Set the production config
   */
  async setProductionConfig(configName: string): Promise<{ message: string; production_config: string }> {
    return apiClient.put<{ message: string; production_config: string }>(`/api/configs/production/${encodeURIComponent(configName)}`);
  },
};
