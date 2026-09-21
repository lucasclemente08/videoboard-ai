import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Check, Zap, Crown, Loader2, ShieldCheck,
  CreditCard, ExternalLink, RefreshCw, AlertCircle, CheckCircle2,
  Calendar, Star
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { clsx } from 'clsx';

interface Props {
  open: boolean;
  onClose: () => void;
  currentToken: string | null;
}

export function PremiumModal({ open, onClose, currentToken }: Props) {
  const { setToken, setUser, user } = useAuthStore();
  const isPremium = user?.isPremium || false;

  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState('');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  // Fetch current subscription status when modal opens
  useEffect(() => {
    if (!open || !currentToken) return;
    fetch('/api/premium/status', {
      headers: { Authorization: `Bearer ${currentToken}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setSubscriptionData(json.data.subscription);
        }
      })
      .catch((e) => console.error('Error fetching subscription status:', e));
  }, [open, currentToken]);

  // Handle Checkout / Upgrade
  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create Checkout Session
      const res = await fetch('/api/premium/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ interval }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      const session = json.data;

      // 2. If real Stripe URL is returned, redirect user to Stripe Checkout
      if (session.url) {
        window.location.href = session.url;
        return;
      }

      // 3. If in test/simulation mode, confirm and activate instantly
      const verifyRes = await fetch('/api/premium/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ sessionId: session.sessionId, interval }),
      });
      const verifyJson = await verifyRes.json();
      if (verifyJson.error) throw new Error(verifyJson.error.message);

      // Save token and update user store immediately
      localStorage.setItem('vb_token', verifyJson.data.token);
      setToken(verifyJson.data.token);

      if (user) {
        setUser({ ...user, isPremium: true });
      }

      setActivated(true);
      setTimeout(() => {
        setActivated(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago con Stripe');
    } finally {
      setLoading(false);
    }
  };

  // Open Stripe Customer Portal
  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/premium/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const json = await res.json();
      if (json.data?.url) {
        window.location.href = json.data.url;
      } else {
        alert('Portal de cliente disponible cuando se configure Stripe con claves de producción.');
      }
    } catch (e: any) {
      setError(e.message || 'Error abriendo portal de facturación');
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Subscription
  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción a Creador Pro?')) return;
    setCancelling(true);
    setError('');
    try {
      const res = await fetch('/api/premium/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      localStorage.setItem('vb_token', json.data.token);
      setToken(json.data.token);
      if (user) {
        setUser({ ...user, isPremium: false });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la suscripción');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ duration: 0.16 }}
            className="bg-surface-raised border border-surface-edge rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Cinema Gold Gradient */}
            <div className="relative bg-gradient-to-br from-amber-500/25 via-amber-600/10 to-surface-raised px-6 pt-8 pb-6 text-center border-b border-surface-edge">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-overlay/60 text-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mx-auto mb-3 flex items-center justify-center shadow-xl shadow-amber-500/25 ring-4 ring-amber-400/20">
                <Crown className="w-7 h-7 text-black" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-2xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Membresía Creador Pro</span>
              </div>

              <h2 className="text-2xl font-black text-text-primary tracking-tight">
                {isPremium ? 'Tu Suscripción Creador Pro' : 'Eleva tu Narrativa Audiovisual'}
              </h2>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                {isPremium
                  ? 'Tienes acceso ilimitado a todas las funciones profesionales y herramientas de rodaje.'
                  : 'Storyboards ilimitados, animatic en tiempo real, claqueta digital y exportaciones sin marca de agua.'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {isPremium ? (
                /* ACTIVE SUBSCRIBER VIEW */
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-text-primary">Plan Creador Pro Activo</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-3xs font-bold uppercase">
                          Suscrito
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {subscriptionData?.expires_at
                          ? `Renovación: ${new Date(subscriptionData.expires_at).toLocaleDateString()}`
                          : 'Acceso completo desbloqueado sin restricciones'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleOpenPortal}
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-surface border border-surface-edge hover:bg-surface-hover text-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <CreditCard className="w-4 h-4 text-accent-blue" />
                      <span>Gestionar facturas y métodos de pago en Stripe</span>
                      <ExternalLink className="w-3.5 h-3.5 text-text-muted ml-1" />
                    </button>

                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full py-2.5 px-4 rounded-xl text-xs text-accent-red/70 hover:text-accent-red hover:bg-accent-red/5 transition-colors"
                    >
                      {cancelling ? 'Cancelando...' : 'Cancelar suscripción'}
                    </button>
                  </div>
                </div>
              ) : (
                /* UPGRADE & PRICING PLANS VIEW */
                <>
                  {/* Monthly vs Yearly Switch */}
                  <div className="bg-surface p-1 rounded-2xl border border-surface-edge grid grid-cols-2 gap-1 text-xs">
                    <button
                      onClick={() => setInterval('month')}
                      className={clsx(
                        'py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2',
                        interval === 'month'
                          ? 'bg-surface-raised text-text-primary shadow-sm border border-surface-edge'
                          : 'text-text-muted hover:text-text-primary'
                      )}
                    >
                      <span>Mensual</span>
                      <span className="text-amber-400 font-extrabold">$4.99/mo</span>
                    </button>

                    <button
                      onClick={() => setInterval('year')}
                      className={clsx(
                        'py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 relative',
                        interval === 'year'
                          ? 'bg-surface-raised text-text-primary shadow-sm border border-surface-edge'
                          : 'text-text-muted hover:text-text-primary'
                      )}
                    >
                      <span>Anual</span>
                      <span className="text-emerald-400 font-extrabold">$3.99/mo</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-3xs font-extrabold ml-1">
                        -20%
                      </span>
                    </button>
                  </div>

                  {/* Plan Details & Features */}
                  <div className="p-4 rounded-2xl bg-surface/60 border border-surface-edge space-y-3">
                    <div className="flex items-baseline justify-between pb-2 border-b border-surface-edge">
                      <div>
                        <span className="text-sm font-bold text-text-primary block">
                          {interval === 'year' ? 'Creador Pro Anual' : 'Creador Pro Mensual'}
                        </span>
                        <span className="text-3xs text-text-muted">
                          {interval === 'year' ? 'Facturado como $47.88 / año' : 'Sin permanencia, cancela cuando quieras'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-text-primary">
                          {interval === 'year' ? '$3.99' : '$4.99'}
                        </span>
                        <span className="text-xs text-text-muted ml-1">/mes</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-text-secondary pt-1">
                      {[
                        'Proyectos & Escenas Ilimitadas',
                        'Exportación limpia (Sin marcas de agua)',
                        'Reproductor Animatic con Voiceover TTS',
                        'Claqueta Digital con Beep 1kHz en Set',
                        'Generación de Guiones con IA',
                        'Historial de Versiones y Restauración',
                      ].map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Activation Success Feedback */}
                  {activated ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center text-emerald-400"
                    >
                      <Sparkles className="w-6 h-6 mx-auto mb-1 text-amber-400" />
                      <p className="text-sm font-bold">¡Bienvenido a Creador Pro!</p>
                      <p className="text-2xs text-text-muted mt-0.5">
                        Todas las funciones profesionales ya están desbloqueadas en tu cuenta.
                      </p>
                    </motion.div>
                  ) : (
                    /* Checkout Button */
                    <button
                      onClick={handleCheckout}
                      disabled={loading}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-sm tracking-wide shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Conectando con Stripe Checkout...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-current text-black" />
                          <span>
                            Suscribirme a Creador Pro — {interval === 'year' ? '$47.88 / año' : '$4.99 / mes'}
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Trust Badges & Supported Methods */}
                  <div className="pt-1 flex flex-col items-center gap-2 text-center">
                    <div className="flex items-center gap-3 text-3xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent-green" /> Pagos 100% seguros con Stripe
                      </span>
                      <span>•</span>
                      <span>Tarjetas de Crédito / Débito</span>
                      <span>•</span>
                      <span>Apple Pay / Google Pay</span>
                    </div>
                    <p className="text-4xs text-text-muted">
                      Garantía de satisfacción. Puedes cancelar tu suscripción con 1 clic en cualquier momento sin costo adicional.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
