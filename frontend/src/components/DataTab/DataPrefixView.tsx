import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';
import { useUrlPrefixWithUrls } from '../../hooks/useData';
import { dataApi } from '../../api/data';
import type { ParserConfig } from '../../types/api';

const DataPrefixView: React.FC = () => {
  const { prefix } = useParams<{ prefix: string }>();
  const navigate = useNavigate();
  
  const decodedPrefix = prefix ? decodeURIComponent(prefix) : '';
  const { data: urlPrefixWithUrls, loading, error } = useUrlPrefixWithUrls(decodedPrefix);
  
  // Extract data from the wrapper
  const urls = urlPrefixWithUrls?.all_urls || [];
  const urlPrefix = urlPrefixWithUrls?.url_prefix;

  // Delete state
  const [isDeletingPrefix, setIsDeletingPrefix] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleUrlClick = (url: string) => {
    const encodedUrl = encodeURIComponent(url);
    navigate(`/data/url/${encodedUrl}`);
  };

  const handleDeletePrefix = async () => {
    if (!window.confirm(`Are you sure you want to delete the URL prefix "${decodedPrefix}" and all ${urls.length} associated URLs? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingPrefix(true);
    setDeleteError(null);

    try {
      const result = await dataApi.deleteUrlPrefix(decodedPrefix);
      console.log('Delete result:', result);
      // Navigate back to data overview after successful deletion
      navigate('/data');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete URL prefix');
    } finally {
      setIsDeletingPrefix(false);
    }
  };

  // Clean prefix name by removing http/https
  const cleanPrefixName = decodedPrefix.replace(/^https?:\/\//, '');
  
  const breadcrumbItems = [
    { label: 'Data', path: '/data' },
    { label: cleanPrefixName, path: `/data/prefix/${prefix}`, isActive: true }
  ];

  if (loading) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Loading...</h2>
          <p style={{ color: '#000000' }}>Loading URLs for prefix "{decodedPrefix}"...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Error</h2>
          <p style={{ color: '#000000' }}>Error loading URLs: {error.message}</p>
          <button 
            onClick={() => navigate('/data')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Data
          </button>
        </div>
      </div>
    );
  }

  if (!urls || urls.length === 0) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>No URLs Found</h2>
          <p style={{ color: '#000000' }}>No URLs found for prefix "{decodedPrefix}".</p>
          <button 
            onClick={() => navigate('/data')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Data
          </button>
        </div>
      </div>
    );
  }

  const renderParserConfig = (parserConfig: ParserConfig) => {
    const { parameters } = parserConfig;
    
    // Debug logging
    console.log('Parser Config:', parserConfig);
    console.log('Parameters:', parameters);
    console.log('Keep selectors:', parameters.keep);
    
    return (
      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Parser Configuration</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Root Selectors */}
          {parameters.root && parameters.root.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#6c757d', fontSize: '0.9rem' }}>Root Selectors</h4>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                color: '#495057'
              }}>
                {parameters.root.map((selector, index) => (
                  <div key={index} style={{ marginBottom: index < parameters.root.length - 1 ? '0.25rem' : 0 }}>
                    {selector}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keep Selectors */}
          {parameters.keep && parameters.keep.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#6c757d', fontSize: '0.9rem' }}>Keep Selectors</h4>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                color: '#495057'
              }}>
                {parameters.keep.map((selector, index) => (
                  <div key={index} style={{ marginBottom: index < parameters.keep.length - 1 ? '0.25rem' : 0 }}>
                    {selector}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop Selectors */}
          {parameters.drop && parameters.drop.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#6c757d', fontSize: '0.9rem' }}>Drop Selectors</h4>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                color: '#495057'
              }}>
                {parameters.drop.map((selector, index) => (
                  <div key={index} style={{ marginBottom: index < parameters.drop.length - 1 ? '0.25rem' : 0 }}>
                    {selector}
                  </div>
                ))}
              </div>
            </div>
          )}



        </div>

        {/* Show message if no selectors are configured */}
        {(!parameters.root || parameters.root.length === 0) && 
         (!parameters.keep || parameters.keep.length === 0) && 
         (!parameters.drop || parameters.drop.length === 0) && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '4px',
            color: '#856404'
          }}>
            <strong>No selectors configured:</strong> This parser configuration doesn't have any root, keep, or drop selectors defined.
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6c757d' }}>
          <strong>Parser ID:</strong> {parserConfig.id}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#000000' }}>URL Prefix: {decodedPrefix}</h2>
        <p style={{ color: '#6c757d', margin: 0 }}>
          Viewing all URLs under this prefix ({urls.length} URLs found)
        </p>
      </div>

      {/* Parser Configuration Section */}
      {urlPrefix?.parser_config && renderParserConfig(urlPrefix.parser_config)}

      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>URLs in this Prefix</h3>
        <div style={{ 
          height: '400px', 
          overflowY: 'auto',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}>
          {urls.map((url: string, index: number) => (
            <div 
              key={url} 
              style={{
                padding: '0.75rem',
                borderBottom: index < urls.length - 1 ? '1px solid #e9ecef' : 'none',
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
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => navigate('/data')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          Back to Data
        </button>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '1rem'
        }}>
          Manage Prefix
        </button>
        <button 
          onClick={handleDeletePrefix}
          disabled={isDeletingPrefix}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isDeletingPrefix ? 'not-allowed' : 'pointer',
            opacity: isDeletingPrefix ? 0.6 : 1
          }}
        >
          {isDeletingPrefix ? 'Deleting...' : 'Delete Prefix'}
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

export default DataPrefixView;
