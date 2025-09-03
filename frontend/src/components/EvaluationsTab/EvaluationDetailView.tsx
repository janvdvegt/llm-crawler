import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';
import { useEvaluationContext } from '../../contexts/EvaluationContext';
import { evaluationApi } from '../../api/evaluation';
import type { EvaluationRun } from '../../types/api';

const EvaluationDetailView: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const { evaluationRuns, loading, error, refresh } = useEvaluationContext();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Find the evaluation run by ID
  const evaluationRun = evaluationRuns?.find(run => run.id === evaluationId);

  // Transform the real evaluation data to match the component structure
  const transformEvaluationData = (run: EvaluationRun) => {
    const results = run.results;
    
    // Get unique configs and domains
    const configs = [...new Set(results.map(r => r.config_name))];
    const domains = [...new Set(results.map(r => r.domain))];
    
    // Calculate average accuracy (1 - normalized levenshtein distance)
    const averageAccuracy = results.length > 0 
      ? results.reduce((sum, result) => sum + (1 - result.abs_levenshtein_distance_norm), 0) / results.length
      : 0;
    
    // Calculate per-config scores
    const configScores = configs.map(config => {
      const configResults = results.filter(r => r.config_name === config);
      const configAccuracy = configResults.length > 0
        ? configResults.reduce((sum, result) => sum + (1 - result.abs_levenshtein_distance_norm), 0) / configResults.length
        : 0;
      return { name: config, score: configAccuracy, testCases: configResults.length };
    });
    
    // Find the best config
    const bestConfig = configScores.length > 0 
      ? configScores.reduce((best, current) => 
          current.score > best.score ? current : best
        )
      : { name: 'N/A', score: 0, testCases: 0 };

    // Calculate per-domain scores
    const domainScores = domains.map(domain => {
      const domainResults = results.filter(r => r.domain === domain);
      const domainConfigs: { [key: string]: number } = {};
      
      configs.forEach(config => {
        const configDomainResults = domainResults.filter(r => r.config_name === config);
        const configDomainAccuracy = configDomainResults.length > 0
          ? configDomainResults.reduce((sum, result) => sum + (1 - result.abs_levenshtein_distance_norm), 0) / configDomainResults.length
          : 0;
        domainConfigs[config] = configDomainAccuracy;
      });
      
      return { name: domain, configs: domainConfigs };
    });

    // Transform test cases
    const testCases = results.map((result, index) => {
      const testCaseScores: { [key: string]: number } = {};
      configs.forEach(config => {
        const configResult = results.find(r => r.url === result.url && r.config_name === config);
        testCaseScores[config] = configResult ? (1 - configResult.abs_levenshtein_distance_norm) : 0;
      });
      
      return {
        id: `tc-${index + 1}`,
        url: result.url,
        domain: result.domain,
        scores: testCaseScores
      };
    });

    return {
      id: run.id,
      timestamp: run.datetime_str,
      bestConfig: bestConfig.name,
      score: averageAccuracy,
      configs: configScores,
      domains: domainScores,
      testCases
    };
  };

  const evaluation = evaluationRun ? transformEvaluationData(evaluationRun) : null;

  const handleTestCaseClick = (testCaseId: string) => {
    navigate(`testcase/${testCaseId}`);
  };

  const handleDeleteEvaluation = async () => {
    if (!evaluationId || !evaluationRun) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete this evaluation run?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      await evaluationApi.deleteEvaluationRun(evaluationId);
      
      // Refresh the evaluation context to update the list
      await refresh();
      
      // Navigate back to evaluations list
      navigate('/evaluations');
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      alert('Failed to delete evaluation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return '#28a745';
    if (score >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  const breadcrumbItems = [
    { label: 'Evaluations', path: '/evaluations' },
    { label: evaluationId || 'Evaluation', path: `evaluation/${evaluationId}`, isActive: true }
  ];

  // Show loading state
  if (loading) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Loading Evaluation</h2>
          <p>Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Error Loading Evaluation</h2>
          <p>Error: {error}</p>
          <button 
            onClick={() => navigate('/evaluations')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Evaluations
          </button>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Evaluation Not Found</h2>
          <p>The evaluation "{evaluationId}" could not be found.</p>
          <button 
            onClick={() => navigate('/evaluations')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Evaluations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#000000' }}>Evaluation: {evaluation.timestamp}</h2>
        <p style={{ color: '#6c757d', margin: 0 }}>
          Best Config: <strong>{evaluation.bestConfig}</strong> • Overall Score: <strong style={{ color: getScoreColor(evaluation.score) }}>{formatScore(evaluation.score)}</strong>
        </p>
      </div>

      {/* Per-Config Scores Table */}
      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#000000' }}>Per-Config Scores</h3>
        <div style={{
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: '600', color: '#000000' }}>Config</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: '600', color: '#000000' }}>Score</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: '600', color: '#000000' }}>Test Cases</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: '600', color: '#000000' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.configs.map((config, index) => (
                <tr key={config.name} style={{ borderBottom: index < evaluation.configs.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500', color: '#000000' }}>{config.name}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: getScoreColor(config.score) }}>
                    {formatScore(config.score)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{config.testCases}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      backgroundColor: config.name === evaluation.bestConfig ? '#d4edda' : '#e2e3e5',
                      color: config.name === evaluation.bestConfig ? '#155724' : '#6c757d'
                    }}>
                      {config.name === evaluation.bestConfig ? 'Best' : 'Standard'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Domain Scores Table */}
      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#000000' }}>Per-Domain Scores</h3>
        <div style={{
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: '600', color: '#000000' }}>Domain</th>
                {evaluation.configs.map(config => (
                  <th key={config.name} style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: '600', color: '#000000' }}>
                    {config.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evaluation.domains.map((domain, index) => (
                <tr key={domain.name} style={{ borderBottom: index < evaluation.domains.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500', color: '#000000' }}>{domain.name}</td>
                  {evaluation.configs.map(config => (
                    <td key={config.name} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: getScoreColor(domain.configs[config.name as keyof typeof domain.configs]) }}>
                      {formatScore(domain.configs[config.name as keyof typeof domain.configs])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Cases List */}
      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#000000' }}>Test Cases</h3>
        <div style={{ 
          maxHeight: '50vh', 
          overflowY: 'auto',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}>
          {evaluation.testCases.map((testCase, index) => (
            <div 
              key={testCase.id} 
              style={{
                padding: '1rem',
                borderBottom: index < evaluation.testCases.length - 1 ? '1px solid #e9ecef' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              onClick={() => handleTestCaseClick(testCase.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.9rem',
                    color: '#495057',
                    wordBreak: 'break-all',
                    lineHeight: '1.4',
                    marginBottom: '0.5rem'
                  }}>
                    {testCase.url}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#6c757d'
                  }}>
                    Domain: {testCase.domain} • ID: {testCase.id}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex',
                  gap: '0.5rem',
                  marginLeft: '1rem'
                }}>
                  {evaluation.configs.map(config => (
                    <div key={config.name} style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: getScoreColor(testCase.scores[config.name as keyof typeof testCase.scores])
                      }}>
                        {formatScore(testCase.scores[config.name as keyof typeof testCase.scores])}
                      </div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: '#6c757d'
                      }}>
                        {config.name.replace('.yaml', '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => navigate('/evaluations')}
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
          Back to Evaluations
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
          Export Results
        </button>
        <button 
          onClick={handleDeleteEvaluation}
          disabled={isDeleting}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            opacity: isDeleting ? 0.6 : 1
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete Evaluation'}
        </button>
      </div>
    </div>
  );
};

export default EvaluationDetailView;
