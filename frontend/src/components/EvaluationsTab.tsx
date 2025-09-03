import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EvaluationsOverview from './EvaluationsTab/EvaluationsOverview';
import EvaluationDetailView from './EvaluationsTab/EvaluationDetailView';
import TestCaseDetailView from './EvaluationsTab/TestCaseDetailView';

const EvaluationsTab: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<EvaluationsOverview />} />
      <Route path="/evaluation/:evaluationId" element={<EvaluationDetailView />} />
      <Route path="/evaluation/:evaluationId/testcase/:testCaseId" element={<TestCaseDetailView />} />
    </Routes>
  );
};

export default EvaluationsTab;
