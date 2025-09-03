import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DataOverviewWithApi from './DataTab/DataOverviewWithApi';
import DataPrefixView from './DataTab/DataPrefixView';
import DataUrlView from './DataTab/DataUrlView';
import ConfigDetailView from './DataTab/ConfigDetailView';

const DataTab: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<DataOverviewWithApi />} />
      <Route path="/prefix/:prefix" element={<DataPrefixView />} />
      <Route path="/url/:url" element={<DataUrlView />} />
      <Route path="/config/:configName" element={<ConfigDetailView />} />
    </Routes>
  );
};

export default DataTab;
