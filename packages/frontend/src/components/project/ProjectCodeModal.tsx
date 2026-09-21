import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, FileText, Download, Upload, Copy, Check, Save,
  AlertCircle, CheckCircle2, X, Loader2, Sparkles, RefreshCw, FileCode
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useSceneStore } from '../../stores/useSceneStore';

interface ProjectCodeModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function ProjectCodeModal({ open, onClose, projectId }: ProjectCodeModalProps) {
  const { token } = useAuthStore();
  const { setCurrentProject } = useProjectStore();
  const { setScenes } = useSceneStore();

  const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [markdownContent, setMarkdownContent] = useState('');
  const [jsonContent, setJsonContent] = useState('');

  const [validationInfo, setValidationInfo] = useState<{ valid: boolean; message: string }>({
    valid: true,
    message: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project raw data on open
  useEffect(() => {
    if (!open || !projectId) return;

    setLoading(true);
    setStatusMessage(null);

    fetch(`/api/projects/${projectId}/raw`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setMarkdownContent(res.data.markdown || '');
          setJsonContent(JSON.stringify(res.data.json || {}, null, 2));
        }
      })
      .catch((err) => {
        console.error('Error fetching raw project:', err);
        setStatusMessage({ type: 'error', text: 'Error al cargar datos del proyecto' });
      })
      .finally(() => setLoading(false));
  }, [open, projectId, token]);

  // Real-time validation
  useEffect(() => {
    if (activeTab === 'json') {
      try {
        if (!jsonContent.trim()) {
          setValidationInfo({ valid: false, message: 'El JSON está vacío' });
          return;
        }
        const parsed = JSON.parse(jsonContent);
        if (!parsed.project || !parsed.project.title) {
          setValidationInfo({ valid: false, message: 'Falta campo obligatorio "project.title"' });
        } else {
          const scCount = Array.isArray(parsed.scenes) ? parsed.scenes.length : 0;
          let shCount = 0;
          if (Array.isArray(parsed.scenes)) {
            parsed.scenes.forEach((s: any) => {
              if (Array.isArray(s.shots)) shCount += s.shots.length;
            });
          }
          setValidationInfo({
            valid: true,
            message: `JSON Válido: ${scCount} escenas, ${shCount} planos detectados`,
          });
        }
      } catch (err: any) {
        setValidationInfo({ valid: false, message: `Error de sintaxis JSON: ${err.message}` });
      }
    } else {
      // Markdown validation
      if (!markdownContent.trim()) {
        setValidationInfo({ valid: false, message: 'El documento Markdown está vacío' });
        return;
      }
      const sceneMatches = markdownContent.match(/^##\s+.+$/gm) || [];
      const shotMatches = markdownContent.match(/^###\s+.+$/gm) || [];
      setValidationInfo({
        valid: true,
        message: `Markdown estructurado: ${sceneMatches.length} escenas, ${shotMatches.length} planos detectados`,
      });
    }
  }, [activeTab, jsonContent, markdownContent]);

  // Save changes back to project
  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);

    const payload = {
      format: activeTab,
      content: activeTab === 'json' ? jsonContent : markdownContent,
    };

    try {
      const res = await fetch(`/api/projects/${projectId}/raw`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.error) {
        setStatusMessage({ type: 'error', text: json.error.message || 'Error al guardar cambios' });
      } else if (json.data) {
        setCurrentProject(json.data.project);
        setScenes(json.data.scenes);
        setJsonContent(JSON.stringify(json.data.json, null, 2));
        setMarkdownContent(json.data.markdown);
        setStatusMessage({
          type: 'success',
          text: `¡Proyecto actualizado con éxito! (${json.data.scenes.length} escenas sincronizadas)`,
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error de red al guardar el proyecto' });
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S or Cmd+S
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    const textToCopy = activeTab === 'json' ? jsonContent : markdownContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download file (.json or .md)
  const handleDownload = () => {
    const isJson = activeTab === 'json';
    const text = isJson ? jsonContent : markdownContent;
    const blob = new Blob([text], {
      type: isJson ? 'application/json' : 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isJson ? `proyecto_${projectId}.json` : `proyecto_${projectId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // File Upload (.json or .md)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        setActiveTab('json');
        setJsonContent(content);
      } else {
        setActiveTab('markdown');
        setMarkdownContent(content);
      }
      setStatusMessage({
        type: 'success',
        text: `Archivo "${file.name}" cargado. Revisa y pulsa "Guardar y Aplicar".`,
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto-format JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
    } catch {
      // Ignore if invalid
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6" onKeyDown={handleKeyDown}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl h-[88vh] bg-surface-raised border border-surface-edge rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-surface-edge bg-surface/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Editor de Código del Proyecto (JSON & Markdown)</span>
                  <span className="px-2 py-0.5 rounded-full text-3xs font-mono bg-accent-blue/15 text-accent-blue">
                    Bidireccional
                  </span>
                </h3>
                <p className="text-2xs text-text-muted">
                  Modifica la estructura completa del proyecto, escenas y planos directamente en código o texto.
                </p>
              </div>
            </div>

            {/* Action Buttons in Header */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,.md,.markdown,.txt"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-surface border border-surface-edge hover:bg-surface-hover text-text-primary text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                title="Cargar archivo .json o .md desde tu ordenador"
              >
                <Upload className="w-3.5 h-3.5 text-text-muted" />
                <span className="hidden sm:inline">Cargar Archivo</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-surface border border-surface-edge hover:bg-surface-hover text-text-primary text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                title="Descargar archivo en formato actual"
              >
                <Download className="w-3.5 h-3.5 text-text-muted" />
                <span className="hidden sm:inline">Descargar</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-surface border border-surface-edge hover:bg-surface-hover text-text-primary text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
                <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-header / Format Switcher & Tools */}
          <div className="px-6 py-2.5 bg-surface/30 border-b border-surface-edge flex flex-wrap items-center justify-between gap-3">
            {/* Format Tabs */}
            <div className="flex items-center bg-surface p-1 rounded-xl border border-surface-edge">
              <button
                onClick={() => setActiveTab('markdown')}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  activeTab === 'markdown'
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Markdown (.md) Guion</span>
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  activeTab === 'json'
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Estructura JSON</span>
              </button>
            </div>

            {/* Validation and Pretty Print Indicator */}
            <div className="flex items-center gap-3">
              {activeTab === 'json' && (
                <button
                  onClick={handleFormatJson}
                  className="text-2xs text-accent-blue hover:underline font-medium"
                >
                  Formatear JSON
                </button>
              )}

              <div
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium',
                  validationInfo.valid
                    ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                    : 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                )}
              >
                {validationInfo.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate max-w-xs">{validationInfo.message}</span>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative overflow-hidden bg-[#0c0d10]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted gap-3 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
                <span>Cargando contenido del proyecto...</span>
              </div>
            ) : (
              <textarea
                value={activeTab === 'json' ? jsonContent : markdownContent}
                onChange={(e) => {
                  if (activeTab === 'json') setJsonContent(e.target.value);
                  else setMarkdownContent(e.target.value);
                }}
                spellCheck={false}
                placeholder={
                  activeTab === 'json'
                    ? '{\n  "project": { "title": "..." },\n  "scenes": [...]\n}'
                    : '# Título del Proyecto\n\n## Escena 1: Master Shot\n- **Objetivo:** ...'
                }
                className="w-full h-full p-6 bg-transparent text-text-primary font-mono text-xs leading-relaxed resize-none focus:outline-none scrollbar-thin scrollbar-thumb-surface-edge"
              />
            )}
          </div>

          {/* Status Alert Bar */}
          {statusMessage && (
            <div
              className={clsx(
                'px-6 py-2 text-xs flex items-center gap-2 border-t',
                statusMessage.type === 'success'
                  ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                  : 'bg-accent-red/10 text-accent-red border-accent-red/20'
              )}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Footer Bar */}
          <div className="px-6 py-3.5 bg-surface/60 border-t border-surface-edge flex items-center justify-between">
            <span className="text-2xs text-text-muted">
              Presiona <kbd className="px-1.5 py-0.5 rounded bg-surface border border-surface-edge font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-surface border border-surface-edge font-mono">S</kbd> para guardar los cambios rápidamente.
            </span>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !validationInfo.valid}
                className="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando y sincronizando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar y Aplicar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
