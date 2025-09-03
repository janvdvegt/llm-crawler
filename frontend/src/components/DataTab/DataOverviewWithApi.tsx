import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUrlPrefixes, useConfigs } from '../../hooks';

const DataOverviewWithApi: React.FC = () => {
  const navigate = useNavigate();
  const { data: urlPrefixes, loading: prefixesLoading, error: prefixesError } = useUrlPrefixes();
  const { data: configs, loading: configsLoading, error: configsError } = useConfigs();

  const handleConfigClick = (configName: string) => {
    const encodedConfigName = encodeURIComponent(configName);
    navigate(`/data/config/${encodedConfigName}`);
  };

  const handlePrefixClick = (prefix: string) => {
    const encodedPrefix = encodeURIComponent(prefix);
    navigate(`/data/prefix/${encodedPrefix}`);
  };

  const handleUrlClick = (url: string) => {
    const encodedUrl = encodeURIComponent(url);
    navigate(`/data/url/${encodedUrl}`);
  };

  if (prefixesLoading || configsLoading) {
    return (
      <div>
        <h2 style={{ color: '#000000' }}>Data</h2>
        <p style={{ color: '#000000' }}>Loading data...</p>
      </div>
    );
  }

  if (prefixesError || configsError) {
    return (
      <div>
        <h2 style={{ color: '#000000' }}>Data</h2>
        <p style={{ color: '#000000' }}>Error loading data: {prefixesError?.toString() || configsError?.toString()}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: '#000000' }}>Data</h2>
      <p style={{ color: '#000000' }}>Manage and view your data sources, datasets, and data processing pipelines.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '2rem', 
        marginTop: '2rem',
        height: '500px'
      }}>
        {/* Left Column - URL Prefixes */}
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
            {urlPrefixes && urlPrefixes.length > 0 ? (
              urlPrefixes.map((item, index) => (
                <div 
                  key={index} 
                  style={{
                    padding: '0.75rem',
                    borderBottom: index < urlPrefixes.length - 1 ? '1px solid #e9ecef' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  onClick={() => handlePrefixClick(item.url_prefix.prefix)}
                >
                  <div style={{ 
                    fontWeight: '500', 
                    color: '#007bff',
                    fontSize: '0.9rem',
                    wordBreak: 'break-all'
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
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6c757d' 
              }}>
                No URL prefixes found
              </div>
            )}
          </div>
        </div>

        {/* Right Column - URLs */}
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>URLs</h3>
          <div style={{ 
            height: '400px', 
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            {urlPrefixes && urlPrefixes.length > 0 ? (
              urlPrefixes.flatMap((item, itemIndex) => 
                item.all_urls.map((url, urlIndex) => (
                  <div 
                    key={`${itemIndex}-${urlIndex}`} 
                    style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #e9ecef',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    onClick={() => handleUrlClick(url)}
                  >
                    <div style={{ 
                      fontSize: '0.9rem',
                      color: '#495057',
                      wordBreak: 'break-all',
                      lineHeight: '1.4'
                    }}>
                      {url}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6c757d',
                      marginTop: '0.25rem'
                    }}>
                      {item.url_prefix.prefix}
                    </div>
                  </div>
                ))
              )
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6c757d' 
              }}>
                No URLs found
              </div>
            )}
          </div>
        </div>

        {/* Third Column - Configs */}
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Configs</h3>
          <div style={{ 
            height: '400px', 
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            {configs && configs.length > 0 ? (
              // Sort configs: production config first, then alphabetically
              [...configs].sort((a, b) => {
                if (a.is_production && !b.is_production) return -1;
                if (!a.is_production && b.is_production) return 1;
                return a.config_name.localeCompare(b.config_name);
              }).map((config, index) => (
                <div 
                  key={index} 
                  style={{
                    padding: '0.75rem',
                    borderBottom: index < configs.length - 1 ? '1px solid #e9ecef' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    backgroundColor: config.is_production ? '#d4edda' : 'white',
                    borderLeft: config.is_production ? '4px solid #28a745' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = config.is_production ? '#c3e6cb' : '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = config.is_production ? '#d4edda' : 'white'}
                  onClick={() => handleConfigClick(config.config_name)}
                >
                  <div style={{ 
                    fontWeight: '500', 
                    color: config.is_production ? '#155724' : '#007bff',
                    fontSize: '0.9rem',
                    wordBreak: 'break-all'
                  }}>
                    {config.config_name}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: config.is_production ? '#155724' : '#6c757d',
                    marginTop: '0.25rem',
                    fontWeight: config.is_production ? '600' : '400'
                  }}>
                    {config.is_production ? '✓ Production Config' : 'Development Config'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6c757d' 
              }}>
                No configs found
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
          Import Data
        </button>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Export Data
        </button>
      </div>
    </div>
  );
};

export default DataOverviewWithApi;
