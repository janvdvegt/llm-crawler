import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';
import IframeViewer from '../IframeViewer';
import { useAllStoredUrls } from '../../hooks/useData';
import { dataApi } from '../../api/data';


const DataUrlView: React.FC = () => {
  const { url } = useParams<{ url: string }>();
  const navigate = useNavigate();
  
  const decodedUrl = url ? decodeURIComponent(url) : '';
  const { data: allStoredUrls } = useAllStoredUrls();
  
  // Get URL object from stored URLs
  const urlObject = allStoredUrls?.find(u => u.url === decodedUrl);
  const loading = !allStoredUrls;
  
  // Debug logging
  console.log('DataUrlView - URL param:', url);
  console.log('DataUrlView - Decoded URL:', decodedUrl);
  console.log('DataUrlView - URL object:', urlObject);
  console.log('DataUrlView - Loading:', loading);
  console.log('DataUrlView - All stored URLs:', allStoredUrls);

  // Delete state
  const [isDeletingUrl, setIsDeletingUrl] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleDeleteUrl = async () => {
    if (!window.confirm(`Are you sure you want to delete the URL "${decodedUrl}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingUrl(true);
    setDeleteError(null);

    try {
      const result = await dataApi.deleteUrl(decodedUrl);
      console.log('Delete result:', result);
      // Navigate back to the prefix view or data overview
      if (urlObject?.prefix) {
        navigate(`/data/prefix/${encodeURIComponent(urlObject.prefix)}`);
      } else {
        navigate('/data');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete URL');
    } finally {
      setIsDeletingUrl(false);
    }
  };

  // Clean names for breadcrumb
  const cleanUrlName = decodedUrl.split('/').pop() || decodedUrl;
  
  // Extract prefix from URL (full path structure)
  const extractPrefixFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      // Get the pathname and remove the last segment to get the prefix
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      if (pathParts.length > 0) {
        // Remove the last segment to get the prefix
        pathParts.pop();
        const prefixPath = pathParts.length > 0 ? '/' + pathParts.join('/') + '/' : '/';
        return `${urlObj.hostname}${prefixPath}`;
      }
      return `${urlObj.hostname}/`;
    } catch {
      // Fallback to domain extraction
      return url.split('/')[0] || url;
    }
  };
  
  // Create breadcrumb items based on available data
  const breadcrumbItems = [
    { label: 'Data', path: '/data' },
    ...(urlObject?.prefix ? [
      { 
        label: urlObject.prefix, 
        path: `/data/prefix/${encodeURIComponent(urlObject.prefix)}` 
      }
    ] : loading ? [
      { 
        label: 'Loading...', 
        path: '/data' 
      }
    ] : [
      { 
        label: extractPrefixFromUrl(decodedUrl), 
        path: `/data/prefix/${encodeURIComponent(extractPrefixFromUrl(decodedUrl))}` 
      }
    ]),
    { label: cleanUrlName, path: `/data/url/${url}`, isActive: true }
  ];

  if (loading) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Loading...</h2>
          <p style={{ color: '#000000' }}>Loading URL details...</p>
        </div>
      </div>
    );
  }

  if (!urlObject) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>URL Not Found</h2>
          <p style={{ color: '#000000' }}>The URL "{decodedUrl}" could not be found in stored URLs.</p>
          <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
            This URL may not have been stored yet, or there might be a mismatch in the URL format.
          </p>

          
          {/* Debug: Show available URLs */}
          {allStoredUrls && allStoredUrls.length > 0 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Stored URLs ({allStoredUrls.length}):</h4>
              <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                {allStoredUrls.slice(0, 10).map((urlObj, index) => (
                  <div key={index} style={{ 
                    padding: '0.25rem 0',
                    borderBottom: index < 9 ? '1px solid #e9ecef' : 'none'
                  }}>
                    {urlObj.url}
                  </div>
                ))}
                {allStoredUrls.length > 10 && (
                  <div style={{ padding: '0.25rem 0', fontStyle: 'italic' }}>
                    ... and {allStoredUrls.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Show URL preview anyway */}
          {decodedUrl && (
            <div style={{ marginTop: '2rem' }}>
              <IframeViewer 
                url={decodedUrl}
                title="URL Preview (No Evaluation Data)"
                height="400px"
              />
            </div>
          )}
          
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={() => navigate('/data')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              Back to Data
            </button>
            <button 
              onClick={() => navigate(`/data/prefix/${encodeURIComponent(extractPrefixFromUrl(decodedUrl))}`)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View Prefix
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#000000' }}>URL Details</h2>
        <p style={{ color: '#6c757d', margin: 0 }}>
          Detailed information about this specific URL
        </p>
      </div>



      {/* Parsed Content */}
      {urlObject?.parsed_content && (
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Parsed Content</h3>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '1rem',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.9rem',
            wordBreak: 'break-word',
            color: '#000000',
            fontFamily: 'monospace'
          }}>
            {urlObject.parsed_content.split(/\.\s+|\?\s+|\s{2,}/).map((part, index) => (
              <div key={index} style={{ marginBottom: '0.5rem' }}>
                {part}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* URL Preview */}
      {decodedUrl && (
        <IframeViewer 
          url={decodedUrl}
          title="URL Preview"
          height="400px"
          style={{ marginBottom: '2rem' }}
        />
      )}

      {/* Raw Content */}
      {urlObject?.raw_content && (
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Raw Content</h3>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '1rem',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.9rem',
            wordBreak: 'break-word',
            color: '#000000',
            fontFamily: 'monospace'
          }}>
            {urlObject.raw_content.split(/\.\s+|\?\s+|\s{2,}/).map((part, index) => (
              <div key={index} style={{ marginBottom: '0.5rem' }}>
                {part}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* URL Actions */}
      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>Actions</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Test URL
          </button>
          <button style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            View Logs
          </button>
          <button style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ffc107',
            color: '#212529',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Edit URL
          </button>
          <button 
            onClick={handleDeleteUrl}
            disabled={isDeletingUrl}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDeletingUrl ? 'not-allowed' : 'pointer',
              opacity: isDeletingUrl ? 0.6 : 1
            }}
          >
            {isDeletingUrl ? 'Deleting...' : 'Delete URL'}
          </button>
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
        <button 
          onClick={() => navigate(`/data/prefix/${encodeURIComponent(urlObject?.prefix || '')}`)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          View Prefix
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

export default DataUrlView;
