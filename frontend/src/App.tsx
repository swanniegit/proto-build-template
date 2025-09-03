import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './blocks/providers/AuthProvider';
import Navigation from './blocks/controllers/Navigation';
import HomePage from './components/HomePage';
import AdvancedWorkspace from './components/AdvancedWorkspace';
import PrototypeBuilder from './components/PrototypeBuilder';
import AgentTemplateEditor from './components/AgentTemplateEditor';
import ResultsHistory from './components/ResultsHistory';
import Settings from './components/Settings';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace" element={<AdvancedWorkspace />} />
          <Route path="/prototype" element={<PrototypeBuilder />} />
          <Route path="/templates" element={<AgentTemplateEditor />} />
          <Route path="/results" element={<ResultsHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
