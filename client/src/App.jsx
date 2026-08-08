import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import AuthPage from './components/AuthPage.jsx';
import AppShell from './components/AppShell.jsx';
import LandingPage from './pages/LandingPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import FocusPage from './pages/FocusPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function LoadingScreen() {
  return (
    <div className="route-loading">
      <div className="route-loading-mark">⏱</div>
      <p>Opening TaskFlow…</p>
    </div>
  );
}

function VisitTracker() {
  useEffect(() => {
    // React Strict Mode intentionally runs effects twice in development. Count
    // one browser session, not two development renders or every route click.
    const sessionKey = 'taskflow_visit_recorded_this_session';
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    const key = 'taskflow_anonymous_visitor_id';
    let visitorId = localStorage.getItem(key);
    if (!visitorId) {
      visitorId = globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `${Date.now()}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, visitorId);
    }
    api.trackVisit(visitorId).catch(() => {
      // Analytics should never interrupt the experience if the API is offline.
    });
  }, []);

  return null;
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/app" replace /> : children;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/app" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VisitTracker />
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><AuthPage mode="signup" /></PublicOnly>} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/app" element={<OverviewPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
