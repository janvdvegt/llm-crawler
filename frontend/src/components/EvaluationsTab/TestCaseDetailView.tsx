import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';
import UnifiedDiffText from '../UnifiedDiff';
import IframeViewer from '../IframeViewer';
import { useEvaluationContext } from '../../contexts/EvaluationContext';
import type { EvaluationRun, EvaluationResult } from '../../types/api';

const TestCaseDetailView: React.FC = () => {
  const { testCaseId, evaluationId } = useParams<{ testCaseId: string; evaluationId: string }>();
  const navigate = useNavigate();
  const { evaluationRuns, loading, error } = useEvaluationContext();
  
  // Find the evaluation run and test case data
  const evaluationRun = evaluationRuns?.find(run => run.id === evaluationId);
  const testCaseIndex = testCaseId ? parseInt(testCaseId.replace('tc-', '')) - 1 : -1;
  const testCaseResult = evaluationRun?.results[testCaseIndex];

  // Transform the real test case data to match the component structure
  const transformTestCaseData = (result: EvaluationResult, run: EvaluationRun) => {
    const allResults = run.results;
    const configs = [...new Set(allResults.map(r => r.config_name))];
    
    // Get all results for this specific URL
    const urlResults = allResults.filter(r => r.url === result.url);
    
    // Create config data for this test case
    const configData: { [key: string]: { name: string; score: number; generatedResponse: string } } = {};
    
    configs.forEach(config => {
      const configResult = urlResults.find(r => r.config_name === config);
      if (configResult) {
        configData[config] = {
          name: config,
          score: 1 - configResult.abs_levenshtein_distance_norm, // Convert distance to accuracy
          generatedResponse: configResult.parsed_content
        };
      }
    });

    return {
      id: testCaseId || 'unknown',
      url: result.url,
      domain: result.domain,
      groundTruth: result.expected_content,
      configs: configData
    };
  };

  const testCase = testCaseResult && evaluationRun ? transformTestCaseData(testCaseResult, evaluationRun) : null;

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
    { label: evaluationId || 'Evaluation', path: evaluationId ? `/evaluations/evaluation/${evaluationId}` : '/evaluations' },
    { label: testCase?.url || 'Test Case', path: `/evaluations/evaluation/${evaluationId}/testcase/${testCaseId}`, isActive: true }
  ];

  // Show loading state
  if (loading) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Loading Test Case</h2>
          <p>Loading test case data...</p>
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
          <h2 style={{ color: '#000000' }}>Error Loading Test Case</h2>
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

  if (!testCase) {
    return (
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#000000' }}>Test Case Not Found</h2>
          <p>The test case "{testCaseId}" could not be found.</p>
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
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#000000' }}>Test Case: {testCase.id}</h2>
        <p style={{ color: '#6c757d', margin: 0 }}>
          Domain: <strong>{testCase.domain}</strong> • URL: <strong>{testCase.url}</strong>
        </p>
      </div>

      {/* Embedded URL Component */}
      <IframeViewer 
        url={testCase.url}
        title="Embedded URL Preview"
        height="400px"
        style={{ marginBottom: '2rem' }}
      />

      {/* UnifiedDiff Components for Each Config */}
      <div style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#000000' }}>Configuration Comparisons</h3>
        <p style={{ color: '#6c757d', margin: '0 0 1.5rem 0' }}>
          Compare ground truth vs generated responses for each configuration
        </p>
        
        {Object.values(testCase.configs).map((config, index) => (
          <div key={config.name} style={{ marginBottom: index < Object.values(testCase.configs).length - 1 ? '2rem' : '0' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#000000' }}>{config.name}</h4>
                <div style={{ fontSize: '0.8rem', color: '#000000' }}>
                  Configuration: {config.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: getScoreColor(config.score)
                }}>
                  {formatScore(config.score)}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#6c757d'
                }}>
                  Score
                </div>
              </div>
            </div>
            
            <UnifiedDiffText 
              truth={testCase.groundTruth}
              generated={config.generatedResponse}
              granularity="word"
              showLegend={true}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => navigate(`/evaluations/evaluation/${evaluationId}`)}
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
          Back to Evaluation
        </button>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Export Test Case
        </button>
      </div>
    </div>
  );
};

export default TestCaseDetailView;
