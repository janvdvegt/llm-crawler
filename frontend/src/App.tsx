
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import OverviewTab from "./components/OverviewTab";
import DataTab from "./components/DataTab";
import OperationsTab from "./components/OperationsTab";
import EvaluationsTab from "./components/EvaluationsTab";
import UtilsTab from "./components/UtilsTab";
import { EvaluationProvider } from "./contexts/EvaluationContext";

type TabType = 'overview' | 'data' | 'operations' | 'evaluations' | 'utils';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active tab from current route
  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path.startsWith('/data')) return 'data';
    if (path.startsWith('/operations')) return 'operations';
    if (path.startsWith('/evaluations')) return 'evaluations';
    if (path.startsWith('/utils')) return 'utils';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', path: '/' },
    { id: 'data' as TabType, label: 'Data', path: '/data' },
    { id: 'operations' as TabType, label: 'Operations', path: '/operations' },
    { id: 'evaluations' as TabType, label: 'Evaluations', path: '/evaluations' },
    { id: 'utils' as TabType, label: 'Utils', path: '/utils' },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    navigate(tab.path);
  };

  return (
    <div style={{ 
      width: '100%',
      minHeight: '100vh',
      fontFamily: "system-ui",
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e1e5e9',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#000000' }}>Application Dashboard</h1>
      </div>
      
      {/* Tab Navigation */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #e1e5e9',
        display: 'flex',
        padding: '0 2rem',
        boxSizing: 'border-box'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            style={{
              flex: 1,
              padding: '1rem 2rem',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6c757d',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s ease',
              fontSize: '1rem',
              minHeight: '60px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.color = '#495057';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6c757d';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        padding: '2rem',
        backgroundColor: '#f8f9fa',
        overflow: 'auto',
        boxSizing: 'border-box'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '2rem',
          minHeight: 'fit-content'
        }}>
          <Routes>
            <Route path="/" element={<OverviewTab />} />
            <Route path="/data/*" element={<DataTab />} />
            <Route path="/operations" element={<OperationsTab />} />
            <Route path="/evaluations/*" element={<EvaluationsTab />} />
            <Route path="/utils" element={<UtilsTab />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <EvaluationProvider>
        <AppContent />
      </EvaluationProvider>
    </Router>
  );
}

export default App;
