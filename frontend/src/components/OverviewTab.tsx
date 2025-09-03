import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import './OverviewTab.css';

const OverviewTab: React.FC = () => {
  // System state management
  const [systemState, setSystemState] = useState<'RUNNING' | 'PAUSE'>('RUNNING');
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  // Statistics
  const [urlPrefixesCount, setUrlPrefixesCount] = useState(0);
  const [urlsCount, setUrlsCount] = useState(0);
  const [evaluationRunsCount, setEvaluationRunsCount] = useState(0);
  const [currentProductionConfig, setCurrentProductionConfig] = useState<string | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadSystemState();
    loadStatistics();
  }, []);

  const loadSystemState = async () => {
    try {
      const response = await apiClient.get<{ state: string; is_running: boolean }>('/api/system/state');
      console.log('API Response:', response);
      console.log('Setting system state to:', response.state);
      setSystemState(response.state as 'RUNNING' | 'PAUSE');
      setStateError(null);
    } catch (err: any) {
      console.error('Error loading system state:', err);
      setStateError(err.message || 'Failed to load system state');
    }
  };

  const loadStatistics = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);

      // Get URL prefixes count
      const urlPrefixes = await apiClient.get<any[]>('/api/urlprefix');
      const urlPrefixesCount = urlPrefixes.length;
      
      // Get total URLs count from the computed counts
      let urlsCount = 0;
      for (const prefix of urlPrefixes) {
        urlsCount += prefix.url_count;
      }
      
      // Get evaluation runs count
      const evaluationRuns = await apiClient.get<any[]>('/api/evaluation_runs');
      const evaluationRunsCount = evaluationRuns.length;
      
      // Get current production config
      const productionConfigResponse = await apiClient.get<{ production_config: string | null }>('/api/configs/production/current');
      const currentProductionConfig = productionConfigResponse.production_config;
      
      setUrlPrefixesCount(urlPrefixesCount);
      setUrlsCount(urlsCount);
      setEvaluationRunsCount(evaluationRunsCount);
      setCurrentProductionConfig(currentProductionConfig);
    } catch (err: any) {
      setStatsError(err.message || 'Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleToggleSystemState = async () => {
    const newState = systemState === 'RUNNING' ? 'PAUSE' : 'RUNNING';
    
    setIsLoadingState(true);
    setStateError(null);

    try {
      const response = await apiClient.put<{ message: string; state: string; is_running: boolean }>(`/api/system/state?state=${newState}`);
      setSystemState(response.state as 'RUNNING' | 'PAUSE');
      // Refresh statistics after state change
      await loadStatistics();
    } catch (err: any) {
      setStateError(err.message || 'Failed to update system state');
    } finally {
      setIsLoadingState(false);
    }
  };

  const handleSetSystemState = async (state: 'PAUSE' | 'RUNNING') => {
    setIsLoadingState(true);
    setStateError(null);

    try {
      const response = await apiClient.put<{ message: string; state: string; is_running: boolean }>(`/api/system/state?state=${state}`);
      setSystemState(response.state as 'RUNNING' | 'PAUSE');
      // Refresh statistics after state change
      await loadStatistics();
    } catch (err: any) {
      setStateError(err.message || 'Failed to update system state');
    } finally {
      setIsLoadingState(false);
    }
  };

  if (isLoadingStats) {
    return (
      <div className="overview-container">
        <h2>Overview</h2>
        <div className="loading">Loading system overview...</div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="overview-container">
        <h2>Overview</h2>
        <div className="error">
          Error loading overview: {statsError}
        </div>
      </div>
    );
  }

  console.log('Rendering with systemState:', systemState);
  
  return (
    <div className="overview-container">
      <h2>System Overview</h2>
      
      {/* System Status Section */}
      <div className="system-status-section">
        <h3>System Status</h3>
        <div className="status-controls">
          <div className="status-indicator">
            <span className={`status-dot ${systemState === 'RUNNING' ? 'running' : 'paused'}`}></span>
            <span className="status-text">
              {systemState}
            </span>
          </div>
          <div className="status-buttons">
            <button
              className={`btn ${systemState === 'RUNNING' ? 'btn-warning' : 'btn-success'}`}
              onClick={handleToggleSystemState}
              disabled={isLoadingState}
            >
              {isLoadingState ? 'Updating...' : (systemState === 'RUNNING' ? 'PAUSE SYSTEM' : 'START SYSTEM')}
            </button>
            <div className="direct-controls">
              <button
                className="btn btn-secondary"
                onClick={() => handleSetSystemState('PAUSE')}
                disabled={systemState === 'PAUSE'}
              >
                Force Pause
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleSetSystemState('RUNNING')}
                disabled={systemState === 'RUNNING'}
              >
                Force Run
              </button>
            </div>
          </div>
        </div>
        
        {stateError && (
          <div className="error" style={{ marginTop: '1rem' }}>
            <strong>Error:</strong> {stateError}
          </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="statistics-section">
        <h3>System Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{urlPrefixesCount}</div>
            <div className="stat-label">URL Prefixes</div>
            <div className="stat-description">Total number of URL prefixes with parser configurations</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{urlsCount}</div>
            <div className="stat-label">URLs</div>
            <div className="stat-description">Total number of indexed URLs</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{evaluationRunsCount}</div>
            <div className="stat-label">Evaluation Runs</div>
            <div className="stat-description">Total number of evaluation runs</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{currentProductionConfig || 'None'}</div>
            <div className="stat-label">Active Config</div>
            <div className="stat-description">Current production configuration</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
