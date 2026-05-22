import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import FirstAdminPage from './pages/FirstAdminPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import ReportsPage from './pages/ReportsPage';
import ActivityPage from './pages/ActivityPage';
import api from './api/axios';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => {
  const [needsAdmin, setNeedsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We try to login with any credentials or just check if any user exists
    // Actually we don't have a check-admin route. 
    // We can just try to hit /auth/first-admin with empty data to see if it says "Admin already exists".
    // Or add a simple check in App logic. For now let's assume login page handles it if no admin exists?
    // Wait, let's just make it possible to go to /setup.
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<FirstAdminPage />} />
      <Route path="/register" element={<LoginPage />} />
      
      <Route path="/*" element={
        <ProtectedRoute>
          <SocketProvider>
            <DashboardPage />
          </SocketProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
