import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Info, FileText, Mic, Target, Heart, Camera, Sparkles, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useSceneStore } from '../../stores/useSceneStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUpdateScene } from '../../api/hooks';
import { ScriptEditor } from './ScriptEditor';
import { NarrationPanel } from './NarrationPanel';
import { HookPanel } from './HookPanel';
import { StorytellingPanel } from './StorytellingPanel';
import { ShotListPanel } from '../shot/ShotList';
import type { Scene } from '@videoboard/shared';

const tabs = [
  { id: 'info', icon: Info, label: 'Info' },
  { id: 'script', icon: FileText, label: 'Guion' },
  { id: 'narration', icon: Mic, label: 'Narración' },
  { id: 'hook', icon: Target, label: 'Hook' },
  { id: 'story', icon: Heart, label: 'Story' },
  { id: 'shots', icon: Camera, label: 'Tomas' },
  { id: 'ai', icon: Sparkles, label: 'IA' },
];

const sceneTypes = [
  'intro', 'development', 'example', 'tutorial',
  'comparison', 'conclusion', 'cta', 'outro',
];

const emotions = ['inspiring', 'urgent', 'funny', 'epic', 'serious', 'technical'];

const colors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

export function SceneEditor() {
  const { scenes, selectedSceneId } = useSceneStore();
  const { rightPanelTab, setRightPanelTab, toggleRightPanel } = useUIStore();
  const updateScene = useUpdateScene();
  const scene = scenes.find((s) => s.id === selectedSceneId);

  if (!scene) return null;

  const handleUpdate = (data: Partial<Scene>) => {
    updateScene.mutate({ id: scene.id, ...data });
  };

  const renderTabContent = () => {
    switch (rightPanelTab) {
      case 'info':
        return <InfoTab scene={scene} onUpdate={handleUpdate} />;
      case 'script':
        return <ScriptEditor scene={scene} onUpdate={handleUpdate} />;
      case 'narration':
        return <NarrationPanel scene={scene} onUpdate={handleUpdate} />;
      case 'hook':
        return <HookPanel scene={scene} onUpdate={handleUpdate} />;
      case 'story':
        return <StorytellingPanel scene={scene} onUpdate={handleUpdate} />;
      case 'shots':
        return <ShotListPanel sceneId={scene.id} />;
      case 'ai':
        return <AITab scene={scene} />;
      default:
        return <InfoTab scene={scene} onUpdate={handleUpdate} />;
    }
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full bg-surface-raised border-l border-surface-edge flex flex-col shrink-0 overflow-hidden"
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 pt-2 pb-0 border-b border-surface-edge">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanelTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-2 rounded-t-lg text-xs font-medium transition-all border-b-2 -mb-[1px]',
                rightPanelTab === tab.id
                  ? 'text-accent-blue border-accent-blue'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={toggleRightPanel} className="p-1 rounded-lg hover:bg-surface-hover">
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </motion.aside>
  );
}

function InfoTab({ scene, onUpdate }: { scene: Scene; onUpdate: (data: Partial<Scene>) => void }) {
  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Título</label>
        <input
          type="text"
          value={scene.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Descripción</label>
        <textarea
          value={scene.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all resize-none"
        />
      </div>

      {/* Objective */}
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Objetivo</label>
        <input
          type="text"
          value={scene.objective || ''}
          onChange={(e) => onUpdate({ objective: e.target.value })}
          className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
        />
      </div>

      {/* Duration + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Duración (seg)</label>
          <input
            type="number"
            value={scene.estimated_duration_secs}
            onChange={(e) => onUpdate({ estimated_duration_secs: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          />
        </div>
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Prioridad</label>
          <select
            value={scene.priority}
            onChange={(e) => onUpdate({ priority: e.target.value as any })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
      </div>

      {/* Scene Type */}
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Tipo de escena</label>
        <div className="flex flex-wrap gap-1.5">
          {sceneTypes.map((type) => (
            <button
              key={type}
              onClick={() => onUpdate({ scene_type: scene.scene_type === type ? null : type })}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-all',
                scene.scene_type === type
                  ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                  : 'bg-surface text-text-muted border border-surface-edge hover:border-surface-hover'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Emotion */}
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Emoción</label>
        <div className="flex flex-wrap gap-1.5">
          {emotions.map((emotion) => (
            <button
              key={emotion}
              onClick={() => onUpdate({ emotion: scene.emotion === emotion ? null : emotion as any })}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-all',
                scene.emotion === emotion
                  ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                  : 'bg-surface text-text-muted border border-surface-edge hover:border-surface-hover'
              )}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Color</label>
        <div className="flex gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color: color as any })}
              className={clsx(
                'w-7 h-7 rounded-lg transition-all',
                scene.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-surface-raised scale-110'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AITab({ scene }: { scene: Scene }) {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuthStore();
  const { id: projectId } = useParams<{ id: string }>();

  const analyzeScene = async () => {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch(`/api/ai/analyze-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId, sceneId: scene.id }),
      });
      const json = await res.json();
      if (json.data) setResult(json.data);
      else if (json.error) setResult(`❌ ${json.error.message}`);
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const optimizeForPlatform = async (platform: string) => {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch(`/api/ai/optimize-for-platform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId, platform }),
      });
      const json = await res.json();
      if (json.data) setResult(json.data);
      else if (json.error) setResult(`❌ ${json.error.message}`);
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/10">
        <p className="text-xs text-text-secondary leading-relaxed">
          La IA analizará esta escena y te dará sugerencias sobre ritmo, hooks, CTA, storytelling, música y más.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={analyzeScene}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Analizar escena actual
        </button>
        <button
          onClick={() => optimizeForPlatform('tiktok')}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-surface border border-surface-edge text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50 transition-colors"
        >
          TikTok
        </button>
        <button
          onClick={() => optimizeForPlatform('youtube')}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-surface border border-surface-edge text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50 transition-colors"
        >
          YouTube
        </button>
        <button
          onClick={() => optimizeForPlatform('instagram')}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-surface border border-surface-edge text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50 transition-colors"
        >
          Instagram
        </button>
      </div>

      {result && (
        <div className="p-4 rounded-xl bg-surface border border-surface-edge">
          <div className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{result}</div>
        </div>
      )}
    </div>
  );
}
