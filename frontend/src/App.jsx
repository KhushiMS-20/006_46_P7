import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/LoginPage';
import MainDashboard from './pages/MainDashboard';
import ReportSubmissionPage from './pages/ReportSubmissionPage';
import UserDashboard from './pages/UserDashboard';
import HandlerDashboard from './pages/HandlerDashboard';
import RoutingManagementDashboard from './pages/RoutingManagementDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ReportsListPage from './pages/ReportsListPage';
import ReportDetailsPage from './pages/ReportDetailsPage';
import SettingsPage from './pages/SettingsPage';

// Protected layout wrapper
const DashboardLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // If not logged in, redirect to login
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar 
        onToggleSidebar={() => setIsMobileOpen(prev => !prev)} 
        isSidebarCollapsed={isCollapsed} 
      />

      <div className="flex-1 flex">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(prev => !prev)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-4rem)] bg-slate-900/40">
          <Routes>
            <Route path="/" element={<MainDashboard />} />
            <Route path="/submit-report" element={<ReportSubmissionPage />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/handler-dashboard" element={<HandlerDashboard />} />
            <Route path="/routing-management" element={<RoutingManagementDashboard />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/reports" element={<ReportsListPage />} />
            <Route path="/reports/:id" element={<ReportDetailsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<DashboardLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
