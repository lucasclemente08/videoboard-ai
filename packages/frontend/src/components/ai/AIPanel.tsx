import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Loader2, RefreshCw, Zap, Film, ClipboardList } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSceneStore } from '../../stores/useSceneStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'streaming' | 'complete' | 'action';
  action?: { type: string; data: any };
}

export function AIPanel({ onClose }: { onClose: () => void }) {
  const { id: projectId } = useParams<{ id: string }>();
  const { selectedSceneId } = useSceneStore();
  const { token } = useAuthStore();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('openai');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Detect project generation intent: user describing an idea for a new project
    const generatePatterns = [
      /crea .*proyecto/i, /genera .*proyecto/i, /crea .*video/i, /genera .*video/i,
      /crea .*comercial/i, /genera .*comercial/i, /quiero .*video\b/i,
      /hac[ée] .*video/i, /hac[ée] .*proyecto/i, /hac[ée] .*comercial/i,
    ];
    const isGenerateRequest = generatePatterns.some(p => p.test(userMsg)) && projectId;

    if (isGenerateRequest) {
      setLoading(true);
      try {
        const res = await fetch('/api/ai/create-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ projectId, idea: userMsg }),
        });
        const json = await res.json();
        if (json.data) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ ${json.data.message}\n\n${json.data.scenes.map((s: any, i: number) => `${i + 1}. **${s.title}** (${s.estimated_duration_secs}s) — ${s.scene_type || 'escena'}`).join('\n')}\n\n♻️ Recargá la página para ver las escenas en el canvas.`,
            type: 'complete',
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${json.error?.message || 'Error al generar escenas'}`, type: 'complete' }]);
        }
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}`, type: 'complete' }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          message: userMsg,
          projectId,
          sceneId: selectedSceneId,
          history: messages.filter(m => m.type !== 'action').map(m => ({ role: m.role, content: m.content })),
          provider,
        }),
        signal: controller.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', type: 'streaming' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: assistantContent, type: 'streaming' };
          return copy;
        });
      }

      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: assistantContent, type: 'complete' };
        return copy;
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: ' + err.message, type: 'complete' }]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, projectId, selectedSceneId, provider, messages]);

  const cancelStream = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const quickActions = [
    { label: 'Generar proyecto', icon: Film, action: 'generate' as const, prompt: 'Crea un proyecto completo de video a partir de una idea.' },
    { label: 'Analizar ritmo', icon: Zap, action: 'analyze' as const, prompt: 'Analiza el ritmo y pacing de la escena seleccionada. Sugiere mejoras.' },
    { label: 'Optimizar para TikTok', icon: Sparkles, action: 'optimize' as const, prompt: 'tiktok' },
    { label: 'Generar shot list', icon: ClipboardList, action: 'chat' as const, prompt: 'Genera una shot list profesional para la escena seleccionada con tipos de plano, movimiento, y equipo sugerido.' },
  ];

  const handleQuickAction = async (action: typeof quickActions[0]) => {
    if (action.action === 'generate') {
      // Prompt for idea first, then create scenes
      setMessages(prev => [...prev, { role: 'assistant', content: '🎬 ¡Vamos a crear un proyecto! Describí tu idea en el chat y voy a generar las escenas automáticamente. Cuanto más detalle me des (tema, duración, tono, plataforma), mejor será el resultado.', type: 'complete' }]);
      return;
    }
    if (action.action === 'analyze' && selectedSceneId && projectId) {
      setLoading(true);
      try {
        const res = await fetch('/api/ai/analyze-scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ projectId, sceneId: selectedSceneId }),
        });
        const json = await res.json();
        setMessages(prev => [...prev,
          { role: 'user', content: 'Analizar el ritmo de la escena seleccionada' },
          { role: 'assistant', content: json.data || json.error?.message || 'Sin respuesta', type: 'complete' },
        ]);
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}`, type: 'complete' }]);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (action.action === 'optimize' && projectId) {
      setLoading(true);
      try {
        const res = await fetch('/api/ai/optimize-for-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ projectId, platform: action.prompt }),
        });
        const json = await res.json();
        setMessages(prev => [...prev,
          { role: 'user', content: `Optimizar para ${action.prompt === 'tiktok' ? 'TikTok' : action.prompt}` },
          { role: 'assistant', content: json.data || json.error?.message || 'Sin respuesta', type: 'complete' },
        ]);
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}`, type: 'complete' }]);
      } finally {
        setLoading(false);
      }
      return;
    }
    // Default: set input text for chat
    setInput(action.prompt);
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 bottom-0 w-[420px] bg-surface-raised/95 backdrop-blur-2xl border-l border-surface-edge shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-edge">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">VideoBoard AI</h3>
            <p className="text-2xs text-text-muted">Asistente inteligente</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-10 h-10 text-accent-blue mx-auto mb-3" />
            <p className="text-sm text-text-primary font-medium mb-1">¿En qué te ayudo?</p>
            <p className="text-xs text-text-muted">Preguntame sobre tu proyecto, escenas, guiones, ritmo, o pedime que genere contenido.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {quickActions.map((action, i) => (
                <button key={i}
                  onClick={() => handleQuickAction(action)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-surface border border-surface-edge hover:border-accent-blue/30 transition-all text-left group">
                  <action.icon className="w-3.5 h-3.5 text-accent-blue group-hover:text-accent-violet transition-colors shrink-0" />
                  <span className="text-2xs text-text-secondary group-hover:text-text-primary">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-accent-blue text-white text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-surface border border-surface-edge text-sm text-text-primary">
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.type === 'streaming' && (
                    <span className="inline-block w-2 h-4 bg-accent-blue animate-pulse rounded-sm ml-0.5 align-middle" />
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-edge">
        <div className="flex items-center gap-2 bg-surface border border-surface-edge rounded-2xl p-2 focus-within:border-accent-blue/50 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escribe un mensaje..."
            disabled={loading}
            className="flex-1 bg-transparent px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {loading ? (
            <button onClick={cancelStream} className="p-2 rounded-xl bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-all">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={sendMessage} disabled={!input.trim()}
              className="p-2 rounded-xl bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <select value={provider} onChange={e => setProvider(e.target.value)}
            className="px-2 py-1 rounded-lg bg-surface border border-surface-edge text-2xs text-text-muted focus:outline-none">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">Ollama</option>
          </select>
          <span className="text-2xs text-text-muted">Enter para enviar</span>
        </div>
      </div>
    </motion.div>
  );
}
