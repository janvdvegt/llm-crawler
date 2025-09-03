import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConfig, useSetProductionConfig } from '../../hooks/useConfig';

const ConfigDetailView: React.FC = () => {
  const { configName } = useParams<{ configName: string }>();
  const navigate = useNavigate();
  const { data: config, loading, error } = useConfig(configName || '');
  const setProductionConfig = useSetProductionConfig();

  const handleSetProduction = async () => {
    if (configName) {
      try {
        await setProductionConfig(configName);
        // Optionally show a success message or refresh the data
        window.location.reload(); // Simple refresh for now
      } catch (error) {
        console.error('Failed to set production config:', error);
      }
    }
  };

  const handleBack = () => {
    navigate('/data');
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ color: '#000' }}>Config Details</h2>
        <p style={{ color: '#000' }}>Loading config...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div>
        <h2 style={{ color: '#000' }}>Config Details</h2>
        <p style={{ color: '#000' }}>Error loading config: {error?.message || 'Config not found'}</p>
        <button onClick={handleBack} style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '1rem'
        }}>
          Back to Configs
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={handleBack} style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '1rem'
        }}>
          ← Back to Configs
        </button>
        {!config.is_production && (
          <button onClick={handleSetProduction} style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Set as Production
          </button>
        )}
        {config.is_production && (
          <span style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            ✓ PRODUCTION CONFIG
          </span>
        )}
      </div>

      <h2 style={{ color: '#000' }}>Config: {config.config_name}</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem', 
        marginTop: '2rem'
      }}>
        {/* Left Column - Basic Info */}
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#000' }}>Basic Information</h3>
          <div style={{ lineHeight: '1.6' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#000' }}>Config Name:</strong>
              <div style={{ color: '#495057', marginTop: '0.25rem' }}>{config.config_name}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#000' }}>OpenAI Model:</strong>
              <div style={{ color: '#495057', marginTop: '0.25rem' }}>{config.openai_model}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#000' }}>Reasoning Level:</strong>
              <div style={{ color: '#495057', marginTop: '0.25rem' }}>{config.reasoning_level}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#000' }}>Production Status:</strong>
              <div style={{ 
                color: config.is_production ? '#28a745' : '#6c757d', 
                marginTop: '0.25rem',
                fontWeight: '600'
              }}>
                {config.is_production ? 'Active Production Config' : 'Development Config'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Prompts */}
        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#000' }}>Prompts</h3>
          <div style={{ lineHeight: '1.6' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#000' }}>Instructions Prompt:</strong>
              <div style={{ 
                color: '#495057', 
                marginTop: '0.25rem',
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #dee2e6',
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {config.instructions_prompt}
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#000' }}>Input Prompt Template:</strong>
              <div style={{ 
                color: '#495057', 
                marginTop: '0.25rem',
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #dee2e6',
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {config.input_prompt_template}
              </div>
            </div>
            {config.error_prompt && (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#000' }}>Error Prompt:</strong>
                <div style={{ 
                  color: '#495057', 
                  marginTop: '0.25rem',
                  backgroundColor: 'white',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6',
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {config.error_prompt}
                </div>
              </div>
            )}
            {config.reflection_prompt && (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#000' }}>Reflection Prompt:</strong>
                <div style={{ 
                  color: '#495057', 
                  marginTop: '0.25rem',
                  backgroundColor: 'white',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6',
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {config.reflection_prompt}
                </div>
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
          Edit Config
        </button>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '1rem'
        }}>
          Delete Config
        </button>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Export Config
        </button>
      </div>
    </div>
  );
};

export default ConfigDetailView;
