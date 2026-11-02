import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { AppProvider } from './contexts/AppContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import AgendaPage from './pages/AgendaPage.jsx';
import FocusPage from './pages/FocusPage.jsx';
import MathPage from './pages/MathPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';

function UnauthorizedRedirect({ target = '/dashboard', message }) {
  const location = useLocation();
  useEffect(() => {
    if (message) {
      toast.error(message, { id: `unauth-${location.pathname}` });
    }
  }, [message, location.pathname]);
  return <Navigate to={target} replace />;
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <UnauthorizedRedirect
        target="/dashboard"
        message="Acesso negado: você não possui permissão para acessar esta área."
      />
    );
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function RootRedirect() {
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><RootRedirect /></ProtectedRoute>} />
      {/* Área do Estudante: acessível a alunos, professores e administradores */}
      <Route element={<ProtectedRoute roles={['aluno', 'professor', 'admin']}><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/math" element={<MathPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      {/* Painel Docente e Administrativo: restrito a professores autorizados e administradores */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={['professor', 'admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 500,
              },
            }}
          />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
