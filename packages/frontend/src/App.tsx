import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Home from './pages/Home';
import Login from './pages/Login';
import { ProjectView } from './pages/ProjectView';
import { useAuthStore } from './stores/useAuthStore';
import { motion } from 'framer-motion';
import { Film, Loader2 } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated, setUser, setToken } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setChecked(true); return; }

    fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setUser(json.data);
          // If token doesn't have premium but user is premium, trigger refresh
          if (json.data.isPremium && !isAuthenticated) {
            // Will be caught on next render
          }
        } else if (json.error?.code === 'UNAUTHORIZED') {
          setToken(null);
          setError('Sesión expirada');
        }
        setChecked(true);
      })
      .catch(() => {
        setChecked(true);
      });
  }, [token, setUser, setToken, isAuthenticated]);

  // Loading state with animation
  if (!checked) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-amber mx-auto mb-4 flex items-center justify-center"
          >
            <Film className="w-6 h-6 text-white" />
          </motion.div>
          <p className="text-sm text-text-muted">Cargando...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={error ? `/login?error=${encodeURIComponent(error)}` : '/login'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route path="/" element={<Home />} />
        <Route path="/project/:id" element={<ProjectView />} />
      </Route>
    </Routes>
  );
}
