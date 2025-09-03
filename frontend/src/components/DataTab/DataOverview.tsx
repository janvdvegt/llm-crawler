import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigs } from '../../hooks/useConfig';
import { useUrlPrefixes } from '../../hooks/useData';
import { dataApi } from '../../api/data';

const DataOverview: React.FC = () => {
  const navigate = useNavigate();
  const { data: configs, loading: configsLoading, error: configsError } = useConfigs();
  const { data: urlPrefixes, loading: prefixesLoading, error: prefixesError } = useUrlPrefixes();

  // Delete state
  const [deletingPrefix, setDeletingPrefix] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleConfigClick = (configName: string) => {
    const encodedConfigName = encodeURIComponent(configName);
    navigate(`/data/config/${encodedConfigName}`);
  };

  const handleDeletePrefix = async (prefix: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation
    
    if (!window.confirm(`Are you sure you want to delete the URL prefix "${prefix}" and all its associated URLs? This action cannot be undone.`)) {
      return;
    }

    setDeletingPrefix(prefix);
    setDeleteError(null);

    try {
      const result = await dataApi.deleteUrlPrefix(prefix);
      console.log('Delete result:', result);
      // Refresh the page to update the list
      window.location.reload();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete URL prefix');
    } finally {
      setDeletingPrefix(null);
    }
  };

  if (configsLoading || prefixesLoading) {
    return (
      <div>
        <h2 style={{ color: '#000000' }}>Data</h2>
        <p style={{ color: '#000000' }}>Loading data...</p>
      </div>
    );
  }

  if (configsError || prefixesError) {
    return (
      <div>
        <h2 style={{ color: '#000000' }}>Data</h2>
        <p style={{ color: '#000000' }}>Error loading data: {configsError?.message || prefixesError?.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: '#000000' }}>Data</h2>
      <p style={{ color: '#000000' }}>Manage and view your parser configurations and settings.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem', 
        marginTop: '2rem',
        height: '500px'
      }}>
        {/* Left Column - All Configs */}
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>All Configs</h3>
          <div style={{ 
            height: '400px', 
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            {configs?.map((config, index) => (
              <div 
                key={config.config_name} 
                style={{
                  padding: '0.75rem',
                  borderBottom: index < (configs?.length || 0) - 1 ? '1px solid #e9ecef' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: config.is_production ? '#e8f5e8' : 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = config.is_production ? '#d4edda' : '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = config.is_production ? '#e8f5e8' : 'white'}
                onClick={() => handleConfigClick(config.config_name)}
              >
                <div style={{ 
                  fontWeight: '500', 
                  color: config.is_production ? '#155724' : '#007bff',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}>
                  {config.config_name}
                  {config.is_production && (
                    <span style={{ 
                      marginLeft: '0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem'
                    }}>
                      PRODUCTION
                    </span>
                  )}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#6c757d',
                  marginTop: '0.25rem'
                }}>
                  {config.reasoning_level} • {config.openai_model}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - URL Prefixes */}
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>URL Prefixes</h3>
          <div style={{ 
            height: '400px', 
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            {urlPrefixes?.map((item, index) => (
              <div 
                key={item.url_prefix.prefix} 
                style={{
                  padding: '0.75rem',
                  borderBottom: index < (urlPrefixes?.length || 0) - 1 ? '1px solid #e9ecef' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                onClick={() => {
                  const encodedPrefix = encodeURIComponent(item.url_prefix.prefix);
                  navigate(`/data/prefix/${encodedPrefix}`);
                }}
              >
                <div style={{ 
                  fontWeight: '500', 
                  color: '#007bff',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all',
                  paddingRight: '60px' // Make room for delete button
                }}>
                  {item.url_prefix.prefix}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#6c757d',
                  marginTop: '0.25rem'
                }}>
                  {item.url_count} URLs
                </div>
                <button
                  onClick={(e) => handleDeletePrefix(item.url_prefix.prefix, e)}
                  disabled={deletingPrefix === item.url_prefix.prefix}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: deletingPrefix === item.url_prefix.prefix ? 'not-allowed' : 'pointer',
                    fontSize: '0.7rem',
                    opacity: deletingPrefix === item.url_prefix.prefix ? 0.6 : 1
                  }}
                >
                  {deletingPrefix === item.url_prefix.prefix ? '...' : '×'}
                </button>
              </div>
            ))}
            {(!urlPrefixes || urlPrefixes.length === 0) && (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                No URL prefixes found
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '1rem'
        }}>
          Create New Config
        </button>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Import Config
        </button>
      </div>

      {deleteError && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {deleteError}
        </div>
      )}
    </div>
  );
};

export default DataOverview;
