import React from 'react';

const OperationsTab: React.FC = () => {
  // Grafana dashboard configuration
  const grafanaUrl = 'http://localhost:3000';
  const dashboardUid = 'f08806fb-5a9b-4c47-8072-4d3be8d6e14d';
  const embedUrl = `${grafanaUrl}/d/${dashboardUid}?orgId=1&theme=light&kiosk&refresh=5s`;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '80vh',
      minHeight: '800px'
    }}>
      <div style={{ 
        padding: '1rem 0', 
        borderBottom: '1px solid #e1e5e9',
        marginBottom: '1rem'
      }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#000000' }}>Operations Dashboard</h2>
        <p style={{ margin: '0', color: '#000000' }}>Monitor system operations, metrics, and performance in real-time.</p>
      </div>
      
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        minHeight: '600px'
      }}>
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          title="Grafana Operations Dashboard"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default OperationsTab;
