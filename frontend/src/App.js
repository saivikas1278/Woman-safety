import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import SocketManager from './components/Socket/SocketManager';

// Pages
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import Dashboard from './pages/Dashboard/Dashboard';
// ...existing code...
import DevicesPage from './pages/Devices/DevicesPage';
import ContactsPage from './pages/Contacts/ContactsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import EmergencyPage from './pages/Emergency/EmergencyPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProfilePage from './pages/Profile/ProfilePage';
import NotFoundPage from './pages/NotFound/NotFoundPage';

// Services
import { authService } from './services/authService';
import { setAuthenticated, loginStart, loginFailure } from './store/slices/authSlice';

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  // Temporarily disable global loading to fix infinite loading issue
  // const { loading: { global: globalLoading } } = useSelector((state) => state.ui);
  const globalLoading = false;

  useEffect(() => {
    // Check if user is authenticated on app load
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        dispatch(loginStart()); // Set loading to true
        try {
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Authentication timeout')), 10000);
          });
          
          const response = await Promise.race([
            authService.verifyToken(),
            timeoutPromise
          ]);
          
          if (response.valid) {
            dispatch(setAuthenticated(true));
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            dispatch(setAuthenticated(false));
          }
        } catch (error) {
          console.error('Auth check error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          dispatch(loginFailure('Authentication failed'));
        }
      } else {
        dispatch(setAuthenticated(false));
      }
    };

    checkAuth();
  }, [dispatch]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  const isPublicRoute = ['/', '/login', '/signup', '/forgot-password'].includes(location.pathname);

  return (
    <>
      {/* Socket connection manager - only for authenticated users */}
      {isAuthenticated && <SocketManager />}
      
      {/* Global loading overlay */}
      {globalLoading && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bgcolor="rgba(255, 255, 255, 0.8)"
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex={9999}
        >
          <CircularProgress size={60} />
        </Box>
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />
        <Route 
          path="/signup" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />
          } 
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
// ...existing code...
          element={
            <ProtectedRoute>
              <Layout>
// ...existing code...
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <Layout>
                <DevicesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <Layout>
                <ContactsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency"
          element={
            <ProtectedRoute>
              <EmergencyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute adminOnly>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback routes */}
        <Route 
          path="*" 
          element={
            isPublicRoute ? <NotFoundPage /> : (
              <Layout>
                <NotFoundPage />
              </Layout>
            )
          } 
        />
      </Routes>
    </>
  );
}

export default App;
