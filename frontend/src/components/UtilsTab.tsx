import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const UtilsTab: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ message: string; deleted_count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL Queue form state
  const [urlsText, setUrlsText] = useState('');
  const [isAddingUrlsToQueue, setIsAddingUrlsToQueue] = useState(false);
  const [urlQueueResult, setUrlQueueResult] = useState<{ message: string; urls_added: number; urls_failed: number } | null>(null);
  const [urlQueueError, setUrlQueueError] = useState<string | null>(null);

  // System state management
  const [systemState, setSystemState] = useState<'RUNNING' | 'PAUSE'>('RUNNING');
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  // Load initial system state
  useEffect(() => {
    loadSystemState();
  }, []);

  const loadSystemState = async () => {
    try {
      const response = await apiClient.get<{ state: string; is_running: boolean }>('/api/system/state');
      setSystemState(response.state as 'RUNNING' | 'PAUSE');
      setStateError(null);
    } catch (err: any) {
      setStateError(err.message || 'Failed to load system state');
    }
  };

  const toggleSystemState = async () => {
    const newState = systemState === 'RUNNING' ? 'PAUSE' : 'RUNNING';
    
    setIsLoadingState(true);
    setStateError(null);

    try {
      const response = await apiClient.put<{ message: string; state: string; is_running: boolean }>(`/api/system/state?state=${newState}`);
      setSystemState(response.state as 'RUNNING' | 'PAUSE');
    } catch (err: any) {
      setStateError(err.message || 'Failed to update system state');
    } finally {
      setIsLoadingState(false);
    }
  };

  const handleDeleteEvaluationRuns = async () => {
    if (!confirm('Are you sure you want to delete ALL evaluation runs? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setDeleteResult(null);

    try {
      const result = await apiClient.delete<{ message: string; deleted_count: number }>('/api/evaluation_runs');
      setDeleteResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to delete evaluation runs');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddUrlsToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urlsText.trim()) {
      setUrlQueueError('Please enter at least one URL');
      return;
    }

    setIsAddingUrlsToQueue(true);
    setUrlQueueError(null);
    setUrlQueueResult(null);

    try {
      // Split URLs by newlines and filter out empty lines
      const urls = urlsText.split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      if (urls.length === 0) {
        setUrlQueueError('Please enter at least one valid URL');
        return;
      }

      let urlsAdded = 0;
      let urlsFailed = 0;
      const errors: string[] = [];

      // Process each URL individually
      for (const url of urls) {
        try {
          await apiClient.post<{ message: string; url: string }>('/api/urlqueueitem/queue', {
            url: url
          });
          urlsAdded++;
        } catch (err: any) {
          urlsFailed++;
          errors.push(`${url}: ${err.message || 'Failed to add to queue'}`);
        }
      }

      setUrlQueueResult({
        message: `Successfully added ${urlsAdded} URLs to queue${urlsFailed > 0 ? `, ${urlsFailed} failed` : ''}`,
        urls_added: urlsAdded,
        urls_failed: urlsFailed
      });

      // Clear form on success
      setUrlsText('');

      // Show detailed errors if any failed
      if (urlsFailed > 0) {
        setUrlQueueError(`Some URLs failed to be added:\n${errors.join('\n')}`);
      }

    } catch (err: any) {
      setUrlQueueError(err.message || 'Failed to add URLs to queue');
    } finally {
      setIsAddingUrlsToQueue(false);
    }
  };

  return (
    <div>
      <h2>Utils</h2>
      <p>Utility functions for managing your system data.</p>
      
      <div style={{ marginTop: '2rem' }}>
        {/* Add URLs to Queue Section */}
        <div style={{ 
          padding: '1.5rem', 
          border: '1px solid #e1e5e9', 
          borderRadius: '8px',
          marginBottom: '1.5rem',
          backgroundColor: '#fff'
        }}>
          <h3 style={{ marginTop: 0, color: '#28a745' }}>Add URLs to Queue</h3>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
            Add URLs to the processing queue. Enter one URL per line. Each URL will be processed individually.
          </p>
          
          <form onSubmit={handleAddUrlsToQueue} style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="urlsText" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                URLs (one per line):
              </label>
              <textarea
                id="urlsText"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                required
                rows={8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <button 
              type="submit"
              disabled={isAddingUrlsToQueue}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isAddingUrlsToQueue ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isAddingUrlsToQueue ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.2s ease'
              }}
            >
              {isAddingUrlsToQueue ? 'Adding URLs...' : 'Add URLs to Queue'}
            </button>
          </form>

          {urlQueueResult && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '6px',
              color: '#155724'
            }}>
              <strong>Success!</strong> {urlQueueResult.message}
            </div>
          )}

          {urlQueueError && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              color: '#721c24',
              whiteSpace: 'pre-line'
            }}>
              <strong>Error:</strong> {urlQueueError}
            </div>
          )}
        </div>

        {/* Delete Evaluation Runs Section */}
        <div style={{ 
          padding: '1.5rem', 
          border: '1px solid #e1e5e9', 
          borderRadius: '8px',
          marginBottom: '1.5rem',
          backgroundColor: '#fff'
        }}>
          <h3 style={{ marginTop: 0, color: '#dc3545' }}>Delete All Evaluation Runs</h3>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
            This will permanently delete all evaluation runs from the database. This action cannot be undone.
          </p>
          
          <button 
            onClick={handleDeleteEvaluationRuns}
            disabled={isDeleting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isDeleting ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete All Evaluation Runs'}
          </button>

          {deleteResult && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '6px',
              color: '#155724'
            }}>
              <strong>Success!</strong> {deleteResult.message}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              color: '#721c24'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* System State Management Section */}
        <div style={{ 
          padding: '1.5rem', 
          border: '1px solid #e1e5e9', 
          borderRadius: '8px',
          marginBottom: '1.5rem',
          backgroundColor: '#fff'
        }}>
          <h3 style={{ marginTop: 0, color: '#6c757d' }}>System State</h3>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
            Toggle the system between RUNNING and PAUSE states. When paused, workers will stop processing new items from the queue.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ marginRight: '1rem', fontWeight: '500' }}>Current State:</span>
            <span style={{ 
              fontWeight: 'bold', 
              color: systemState === 'RUNNING' ? '#28a745' : '#dc3545',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              backgroundColor: systemState === 'RUNNING' ? '#d4edda' : '#f8d7da',
              border: `1px solid ${systemState === 'RUNNING' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {systemState}
            </span>
          </div>

          <button 
            onClick={toggleSystemState}
            disabled={isLoadingState}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoadingState ? '#6c757d' : (systemState === 'RUNNING' ? '#dc3545' : '#28a745'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoadingState ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
          >
            {isLoadingState ? 'Updating...' : (systemState === 'RUNNING' ? 'Pause System' : 'Resume System')}
          </button>

          {stateError && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              color: '#721c24'
            }}>
              <strong>Error:</strong> {stateError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UtilsTab;
