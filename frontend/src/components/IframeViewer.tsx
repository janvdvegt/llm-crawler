import React, { useState, useEffect, useRef } from 'react';

interface IframeViewerProps {
  url: string;
  title?: string;
  height?: string;
  showControls?: boolean;
  showProxyOption?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const IframeViewer: React.FC<IframeViewerProps> = ({
  url,
  title,
  height = '400px',
  showControls = true,
  showProxyOption = true,
  className,
  style
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [useProxy, setUseProxy] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  const retryIframe = () => {
    setIframeError(false);
    setIframeLoading(true);
  };

  // Detect if we're running on localhost
  useEffect(() => {
    const hostname = window.location.hostname;
    setIsLocalhost(hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost'));
  }, []);

  // Set up timeout to detect iframe blocking
  useEffect(() => {
    if (iframeLoading && url) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a 10-second timeout to detect iframe blocking
      timeoutRef.current = window.setTimeout(() => {
        if (iframeLoading) {
          setIframeLoading(false);
          setIframeError(true);
        }
      }, 10000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [iframeLoading, url, useProxy]);

  const openUrlInNewTab = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getProxyUrl = (url: string) => {
    // Use a CORS proxy for localhost development
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  };

  const getIframeSrc = () => {
    if (!url) return '';
    
    if (isLocalhost && useProxy && showProxyOption) {
      return getProxyUrl(url);
    }
    
    return url;
  };

  return (
    <div 
      className={className}
      style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        ...style
      }}
    >
      {showControls && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: '0', color: '#000000' }}>
            {title || 'Embedded URL Preview'}
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {isLocalhost && showProxyOption && (
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '0.9rem',
                color: '#6c757d',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => {
                    setUseProxy(e.target.checked);
                    setIframeError(false);
                    setIframeLoading(true);
                  }}
                  style={{ margin: 0 }}
                />
                Use CORS Proxy
              </label>
            )}
            <button 
              onClick={openUrlInNewTab}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Open in New Tab
            </button>
          </div>
        </div>
      )}
      
      {isLocalhost && showProxyOption && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#856404'
        }}>
          <strong>Development Mode:</strong> You're running on localhost. If iframe embedding fails, try the "Use CORS Proxy" option above to bypass cross-origin restrictions.
        </div>
      )}
      
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: 'white',
        position: 'relative',
        minHeight: height,
        maxHeight: '60vh',
        overflow: 'hidden'
      }}>
        {iframeLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            zIndex: 1
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <div style={{ color: '#6c757d' }}>Loading URL content...</div>
            </div>
          </div>
        )}
        
        {iframeError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            zIndex: 1,
            padding: '2rem'
          }}>
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚫</div>
              <div style={{ color: '#dc3545', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '500' }}>
                Cannot embed this URL
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                This website blocks embedding in iframes for security reasons (X-Frame-Options or CSP policy).
                {isLocalhost && showProxyOption && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #bbdefb' }}>
                    <strong>Localhost Development Tip:</strong> Try enabling the "Use CORS Proxy" option above to bypass iframe restrictions during development.
                  </div>
                )}
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#6c757d', 
                wordBreak: 'break-all', 
                marginBottom: '1.5rem',
                padding: '0.75rem',
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}>
                {url}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={openUrlInNewTab}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Open in New Tab
                </button>
                <button 
                  onClick={retryIframe}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Try Again
                </button>
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#6c757d', 
                marginTop: '1rem',
                fontStyle: 'italic'
              }}>
                Tip: Many websites prevent iframe embedding. Use "Open in New Tab" to view the full content.
              </div>
            </div>
          </div>
        )}
        
        <iframe
          src={getIframeSrc()}
          style={{
            width: '100%',
            height: height,
            border: 'none',
            borderRadius: '4px',
            display: iframeLoading || iframeError ? 'none' : 'block'
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={`Embedded content from ${url}`}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
};

export default IframeViewer;
