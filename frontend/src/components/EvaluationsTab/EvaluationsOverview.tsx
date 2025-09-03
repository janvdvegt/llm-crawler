import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluationContext } from '../../contexts/EvaluationContext';
import type { EvaluationRun } from '../../types/api';

const EvaluationsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { evaluationRuns, statistics, loading, error, refresh } = useEvaluationContext();

  const handleEvaluationClick = (evaluationId: string) => {
    navigate(`evaluation/${evaluationId}`);
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#28a745';
    if (score >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  // Transform EvaluationRun data to match the component's expected structure
  const transformEvaluationRun = (run: EvaluationRun) => {
    const results = run.results;
    const totalTestCases = results.length;
    
    // Get unique configs and domains
    const configs = [...new Set(results.map(r => r.config_name))];
    const domains = [...new Set(results.map(r => r.domain))];
    
    // Calculate average accuracy (1 - normalized levenshtein distance)
    const averageAccuracy = results.length > 0 
      ? results.reduce((sum, result) => sum + (1 - result.abs_levenshtein_distance_norm), 0) / results.length
      : 0;
    
    // Find the best config (highest accuracy)
    const configScores = configs.map(config => {
      const configResults = results.filter(r => r.config_name === config);
      const configAccuracy = configResults.length > 0
        ? configResults.reduce((sum, result) => sum + (1 - result.abs_levenshtein_distance_norm), 0) / configResults.length
        : 0;
      return { config, accuracy: configAccuracy };
    });
    
    const bestConfig = configScores.length > 0 
      ? configScores.reduce((best, current) => 
          current.accuracy > best.accuracy ? current : best
        )
      : { config: 'N/A', accuracy: 0 };

    return {
      id: run.id,
      timestamp: run.datetime_str,
      bestConfig: bestConfig.config,
      score: averageAccuracy,
      totalTestCases,
      configs,
      domains
    };
  };

  // Show loading state
  if (loading) {
    return (
      <div>
        <h2>Evaluations</h2>
        <p>Loading evaluation data...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div>
        <h2>Evaluations</h2>
        <p>Error loading evaluation data: {error}</p>
      </div>
    );
  }

  // Transform the evaluation runs data
  const evaluations = evaluationRuns ? evaluationRuns.map(transformEvaluationRun) : [];

  return (
    <div>
      <h2>Evaluations</h2>
      <p>Run and review evaluation results for your models and systems.</p>
      
      {/* Statistics Overview */}
      {statistics && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Total Runs</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
              {statistics.totalRuns}
            </div>
          </div>
          <div style={{
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Total Results</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {statistics.totalResults}
            </div>
          </div>
          <div style={{
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Avg Accuracy</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
              {(statistics.averageAccuracy * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Domains</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>
              {statistics.domains.length}
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: 0, color: '#495057' }}>Recent Evaluations</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={refresh}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh Data
            </button>
            <button style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Run New Evaluation
            </button>
          </div>
        </div>

        <div style={{
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ 
            maxHeight: '60vh', 
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            {evaluations.length > 0 ? (
              evaluations.map((evaluation, index) => (
                <div 
                  key={evaluation.id} 
                  style={{
                    padding: '1rem',
                    borderBottom: index < evaluations.length - 1 ? '1px solid #e9ecef' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  onClick={() => handleEvaluationClick(evaluation.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '500', 
                        color: '#007bff',
                        fontSize: '1rem',
                        marginBottom: '0.5rem'
                      }}>
                        {new Date(evaluation.timestamp).toLocaleString()}
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: '#6c757d',
                        marginBottom: '0.25rem'
                      }}>
                        Best Config: <strong style={{ color: '#495057' }}>{evaluation.bestConfig}</strong>
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#6c757d'
                      }}>
                        {evaluation.totalTestCases} test cases • {evaluation.configs.length} configs • {evaluation.domains.length} domains
                      </div>
                    </div>
                    <div style={{ 
                      textAlign: 'right',
                      marginLeft: '1rem'
                    }}>
                      <div style={{ 
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: getScoreColor(evaluation.score)
                      }}>
                        {formatScore(evaluation.score)}
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#6c757d'
                      }}>
                        Overall Score
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                color: '#6c757d' 
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>No Evaluations Found</h3>
                <p style={{ margin: 0 }}>No evaluation runs have been performed yet.</p>
                <p style={{ margin: '0.5rem 0 0 0' }}>Click "Run New Evaluation" to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '1rem'
        }}>
          Export Results
        </button>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          View All Evaluations
        </button>
      </div>
    </div>
  );
};

export default EvaluationsOverview;
