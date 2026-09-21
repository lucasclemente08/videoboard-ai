import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';

interface LoginResponse {
  data: { token: string; user: any };
}

async function loginApi(body: { email: string; password: string }): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Error al iniciar sesión');
  }
  return res.json();
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'welcome'>('email');
  const { setToken, setUser } = useAuthStore();

  const login = useMutation({
    mutationFn: loginApi,
    onSuccess: (res) => {
      setToken(res.data.token);
      setUser(res.data.user);
      setStep('welcome');
      localStorage.setItem('vb_token', res.data.token);
      // Refresh after brief welcome
      setTimeout(() => window.location.reload(), 1500);
    },
  });

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-amber mx-auto mb-6 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido!</h2>
          <p className="text-text-muted">Redirigiendo al proyecto...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-amber mx-auto mb-4 flex items-center justify-center">
            <Film className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VideoBoard AI</h1>
          <p className="text-text-muted mt-1">Preproducción audiovisual colaborativa</p>
        </div>

        {/* Login card */}
        <div className="bg-surface-raised border border-surface-edge rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Iniciar sesión</h2>
          <p className="text-sm text-text-muted mb-6">Ingresá tu email para empezar</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) login.mutate({ email, password: 'any' });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-surface-overlay border border-surface-edge rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:border-accent-blue transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!email || login.isPending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-amber text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {login.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</>
              ) : (
                'Comenzar'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-edge">
            <p className="text-xs text-text-muted text-center">
              Al continuar aceptás los{' '}
              <span className="text-accent-blue cursor-pointer hover:underline">Términos</span> y{' '}
              <span className="text-accent-blue cursor-pointer hover:underline">Privacidad</span>
            </p>
          </div>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-text-muted/50 mt-6">
          Modo desarrollo — cualquier email funciona. Sin contraseña requerida.
        </p>
      </motion.div>
    </div>
  );
}
