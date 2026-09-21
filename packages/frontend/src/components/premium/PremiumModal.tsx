import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Zap, Crown, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  open: boolean;
  onClose: () => void;
  currentToken: string | null;
}

export function PremiumModal({ open, onClose, currentToken }: Props) {
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState('');
  const { setToken, setUser, user } = useAuthStore();

  const handleActivate = async () => {
    setActivating(true);
    setError('');
    try {
      const res = await fetch('/api/premium/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ payment_method: 'card', amount: 499 }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      // Save new token with premium claim
      localStorage.setItem('vb_token', json.data.token);
      setToken(json.data.token);
      
      // Update user with premium status immediately (no page reload needed)
      if (user) {
        setUser({ ...user, isPremium: true });
      } else {
        // Fetch fresh profile
        const profileRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${json.data.token}` },
        });
        const profileJson = await profileRes.json();
        if (profileJson.data) setUser(profileJson.data);
      }

      setActivated(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || 'Error al activar premium');
    } finally {
      setActivating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-surface-raised border border-surface-edge rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-accent-amber/20 via-accent-blue/10 to-accent-amber/5 px-6 pt-8 pb-6 text-center">
              <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-overlay/50 transition-colors">
                <X className="w-4 h-4 text-text-muted" />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-amber to-accent-amber/80 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-accent-amber/20">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">VideoBoard Premium</h2>
              <p className="text-text-muted mt-1">Desbloqueá todo el poder de la IA</p>
            </div>

            {/* Pricing */}
            <div className="p-6 space-y-4">
              <div className="bg-surface-overlay rounded-xl p-4 border border-surface-edge">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">Creador Pro</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">$4.99</span>
                    <span className="text-xs text-text-muted">/mes</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    'Todas las funciones IA (chat, generar, analizar)',
                    'Storyboards ilimitados',
                    'Exportaciones premium (PDF, CSV)',
                    'Colaboración avanzada con historial',
                    'Prioridad de procesamiento',
                    'Soporte prioritario',
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-accent-green shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg p-3 text-xs text-accent-red">
                  {error}
                </div>
              )}

              {activated ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-accent-green/10 border border-accent-green/20 rounded-xl p-4 text-center"
                >
                  <Sparkles className="w-6 h-6 text-accent-green mx-auto mb-2" />
                  <p className="text-sm font-semibold text-accent-green">¡Premium activado!</p>
                  <p className="text-xs text-text-muted mt-1">Todas las funciones IA están desbloqueadas</p>
                </motion.div>
              ) : (
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-amber to-accent-amber/80 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-amber/20"
                >
                  {activating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Activando...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Activar Premium — $9.99/mes</>
                  )}
                </button>
              )}

              <p className="text-xs text-text-muted text-center">
                Cancelá cuando quieras. Sin compromiso anual.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
