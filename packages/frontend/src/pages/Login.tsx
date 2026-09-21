import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Film, Mail, Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken, setUser } = useAuthStore();

  // Show error from URL params (e.g. session expired)
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: 'any' }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setToken(json.data.token);
      setUser(json.data.user);
      setSuccess('¡Bienvenido!');
      setTimeout(() => navigate('/'), 600);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@videoboard.ai' }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setToken(json.data.token);
      setUser(json.data.user);
      setSuccess('Modo demo activado');
      setTimeout(() => navigate('/'), 600);
    } catch {
      // Fallback: local demo
      localStorage.setItem('vb_token', 'demo-token');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-amber/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue via-accent-amber to-accent-amber mx-auto mb-4 flex items-center justify-center shadow-lg shadow-accent-blue/20">
            <Film className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VideoBoard AI</h1>
          <p className="text-text-muted mt-1 text-sm">Preproducción audiovisual colaborativa</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface-raised border border-surface-edge rounded-2xl p-8 shadow-2xl"
        >
          <h2 className="text-lg font-semibold text-white mb-1">Iniciar sesión</h2>
          <p className="text-sm text-text-muted mb-6">Ingresá tu email para empezar</p>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
                <span className="text-xs text-accent-red">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-start gap-2"
              >
                <CheckCircle className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                <span className="text-xs text-accent-green">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="tu@email.com"
                  className="w-full bg-surface-overlay border border-surface-edge rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue transition-all"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={!email.trim() || loading}
              whileHover={email.trim() && !loading ? { scale: 1.01 } : {}}
              whileTap={email.trim() && !loading ? { scale: 0.99 } : {}}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-amber text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</>
              ) : (
                'Comenzar'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-edge" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-surface-raised text-text-muted">o</span>
            </div>
          </div>

          {/* Demo button */}
          <motion.button
            onClick={handleDemoLogin}
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl border border-surface-edge text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Entrar en modo demo
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-text-muted/50 mt-6"
        >
          Modo desarrollo — cualquier email funciona
        </motion.p>
      </motion.div>
    </div>
  );
}
