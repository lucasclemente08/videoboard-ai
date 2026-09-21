import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Sun, Layers, Bookmark, Check, Save, RotateCcw,
  Sparkles, Eye, Sliders, ChevronDown, Trash2, Plus, Box, Info
} from 'lucide-react';
import type { Shot } from '@videoboard/shared';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  shot: Shot;
  onUpdate: (data: Partial<Shot>) => void;
}

export interface PresetItem {
  id: string;
  name: string;
  description: string;
  category: string;
  is_system?: boolean;
  camera_setup: {
    camera_model?: string;
    sensor?: string;
    lens?: string;
    aperture?: string;
    focal_length?: string;
    fps?: number;
    shutter_speed?: string;
    iso?: number;
    color_profile?: string;
    nd_filter?: string;
    aspect_ratio?: string;
  };
  lighting_setup: {
    scheme_name?: string;
    mood?: string;
    key_light?: {
      name: string;
      type: string;
      position: string;
      color_temp: string;
      intensity: number;
      modifier?: string;
    };
    fill_light?: {
      name: string;
      type: string;
      position: string;
      color_temp: string;
      intensity: number;
      modifier?: string;
    };
    back_light?: {
      name: string;
      type: string;
      position: string;
      color_temp: string;
      intensity: number;
      modifier?: string;
    };
    background_light?: {
      name: string;
      type: string;
      position: string;
      color_temp: string;
      intensity: number;
    };
    diagram?: {
      key_angle: number;
      fill_angle: number;
      back_angle: number;
      subject_pos?: { x: number; y: number };
      camera_angle?: number;
    };
  };
}

const CAMERA_MODELS = [
  'Sony FX3', 'Sony A7S III', 'Sony FX6',
  'Blackmagic Pocket 6K', 'Blackmagic URSA Mini Pro',
  'RED Komodo 6K', 'RED V-Raptor',
  'ARRI Alexa Mini LF', 'Canon C70',
  'Panasonic Lumix GH6 / S5II',
  'iPhone 16 Pro (Apple ProRes Log)',
];

const APERTURES = ['f/1.2', 'f/1.4', 'f/1.8', 'f/2.0', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0'];
const ISOS = [100, 200, 400, 640, 800, 1250, 1600, 3200, 6400, 12800];
const SHUTTER_SPEEDS = ['1/24 (360°)', '1/48 (180° Cine)', '1/50', '1/60', '1/120', '1/250'];
const COLOR_PROFILES = [
  'S-Log3 / S-Gamut3.Cine (Sony)',
  'BRAW Film Gen 5 (Blackmagic)',
  'ARRI LogC4 / LogC3',
  'REDCODE RAW IPP2',
  'Canon C-Log3',
  'Apple Log (iPhone)',
  'Rec.709 / Standard 8-bit',
  'HLG / HDR',
];
const ND_FILTERS = ['Ninguno', 'ND 0.3 (1 stop)', 'ND 0.6 (2 stops)', 'ND 0.9 (3 stops)', 'ND 1.2 (4 stops)', 'Variable ND 2-5 stops'];

export function CameraLightingEditor({ shot, onUpdate }: Props) {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'camera' | 'lighting' | 'diagram'>('camera');
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [appliedPresetName, setAppliedPresetName] = useState<string | null>(null);

  // Initialize camera & lighting setups from shot or defaults
  const cameraSetup = (shot as any).camera_setup || {
    camera_model: 'Sony FX3',
    sensor: 'Full Frame',
    lens: shot.lens || '35mm',
    aperture: 'f/2.0',
    focal_length: shot.lens || '35mm',
    fps: shot.fps || 24,
    shutter_speed: '1/48 (180° Cine)',
    iso: 800,
    color_profile: 'S-Log3 / S-Gamut3.Cine (Sony)',
    nd_filter: 'ND 0.6 (2 stops)',
    aspect_ratio: '16:9',
  };

  const lightingSetup = (shot as any).lighting_setup || {
    scheme_name: '3-Point Lighting Estándar',
    mood: 'Natural cinematográfico',
    key_light: {
      name: 'Key Light (Principal)',
      type: 'Aputure 600d + Softbox Dome',
      position: 'Frontal lateral (45° der)',
      color_temp: '5600K Daylight',
      intensity: 75,
      modifier: 'Grid / Nido de abeja',
    },
    fill_light: {
      name: 'Fill Light (Relleno)',
      type: 'Rebote Blanco Pasivo 1x1m',
      position: 'Frontal lateral (45° izq)',
      color_temp: '5600K',
      intensity: 35,
      modifier: 'Seda difusora',
    },
    back_light: {
      name: 'Back Light (Contra / Hair)',
      type: 'Tubo LED Amaran T2c',
      position: 'Posterior 135° izq',
      color_temp: '4500K Neutro',
      intensity: 40,
      modifier: 'Viseras',
    },
    background_light: {
      name: 'Luz ambiental / Prácticas',
      type: 'Lámpara decorativa cálida',
      position: 'Fondo desenfocado',
      color_temp: '2700K Tungsteno',
      intensity: 30,
    },
    diagram: {
      key_angle: 315,
      fill_angle: 45,
      back_angle: 150,
      subject_pos: { x: 50, y: 50 },
      camera_angle: 0,
    },
  };

  // Fetch presets
  useEffect(() => {
    setLoadingPresets(true);
    fetch('/api/presets/camera-lighting', {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setPresets(json.data);
      })
      .catch((err) => console.error('Error fetching presets:', err))
      .finally(() => setLoadingPresets(false));
  }, [token]);

  const updateCameraField = (field: string, value: any) => {
    const updated = { ...cameraSetup, [field]: value };
    onUpdate({ camera_setup: updated } as any);
  };

  const updateLightingField = (section: string, field: string, value: any) => {
    const updatedSection = { ...(lightingSetup[section] || {}), [field]: value };
    const updated = { ...lightingSetup, [section]: updatedSection };
    onUpdate({ lighting_setup: updated } as any);
  };

  const applyPreset = (preset: PresetItem) => {
    onUpdate({
      lens: preset.camera_setup.lens || shot.lens,
      fps: preset.camera_setup.fps || shot.fps,
      camera_setup: preset.camera_setup,
      lighting_setup: preset.lighting_setup,
    } as any);
    setAppliedPresetName(preset.name);
    setTimeout(() => setAppliedPresetName(null), 2500);
  };

  const handleSaveCustomPreset = async () => {
    if (!newPresetName.trim()) return;
    try {
      const res = await fetch('/api/presets/camera-lighting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newPresetName.trim(),
          description: newPresetDesc.trim() || 'Preset guardado por el usuario',
          category: 'custom',
          camera_setup: cameraSetup,
          lighting_setup: lightingSetup,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setPresets((prev) => [...prev, json.data]);
        setShowSavePresetModal(false);
        setNewPresetName('');
        setNewPresetDesc('');
        setAppliedPresetName(`Guardado: ${json.data.name}`);
        setTimeout(() => setAppliedPresetName(null), 2500);
      }
    } catch (err) {
      console.error('Error saving preset:', err);
    }
  };

  const handleDeleteCustomPreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/presets/camera-lighting/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      setPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting preset:', err);
    }
  };

  return (
    <div className="bg-surface-overlay/80 border border-surface-edge rounded-xl p-3 space-y-3 mt-2">
      {/* Header bar with tabs & Presets Dropdown */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-surface-edge">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-semibold transition-all ${
              activeTab === 'camera'
                ? 'bg-accent-blue text-white shadow-sm'
                : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Cámara & Óptica
          </button>
          <button
            onClick={() => setActiveTab('lighting')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-semibold transition-all ${
              activeTab === 'lighting'
                ? 'bg-accent-amber text-black shadow-sm'
                : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Iluminación
          </button>
          <button
            onClick={() => setActiveTab('diagram')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-semibold transition-all ${
              activeTab === 'diagram'
                ? 'bg-accent-violet text-white shadow-sm'
                : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Diagrama Cenital 2D
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSavePresetModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface border border-surface-edge hover:border-accent-blue/40 text-2xs text-text-secondary hover:text-text-primary transition-all"
            title="Guardar configuración actual como Preset"
          >
            <Bookmark className="w-3 h-3 text-accent-blue" /> Guardar Preset
          </button>
        </div>
      </div>

      {/* Preset Fast Switcher */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent-amber" /> Presets Rápidos de la Industria:
          </span>
          {appliedPresetName && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-accent-green font-bold flex items-center gap-1 text-[10px]"
            >
              <Check className="w-3 h-3" /> {appliedPresetName}
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-surface-edge hover:border-accent-blue/50 text-[10px] text-text-secondary hover:text-white shrink-0 transition-all group"
            >
              <span>{p.name}</span>
              {!p.is_system && (
                <span
                  onClick={(e) => handleDeleteCustomPreset(p.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-accent-red p-0.5 ml-1 transition-opacity"
                  title="Eliminar preset"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: CAMERA & LENS CONTROLS */}
      {activeTab === 'camera' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5 pt-1"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-text-muted mb-1">Cuerpo de Cámara</label>
              <select
                value={cameraSetup.camera_model}
                onChange={(e) => updateCameraField('camera_model', e.target.value)}
                className="w-full px-2 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {CAMERA_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-text-muted mb-1">Perfil de Color / Espacio</label>
              <select
                value={cameraSetup.color_profile}
                onChange={(e) => updateCameraField('color_profile', e.target.value)}
                className="w-full px-2 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {COLOR_PROFILES.map((cp) => (
                  <option key={cp} value={cp}>{cp}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-text-muted mb-1">Apertura</label>
              <select
                value={cameraSetup.aperture}
                onChange={(e) => updateCameraField('aperture', e.target.value)}
                className="w-full px-2 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {APERTURES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-text-muted mb-1">ISO Base</label>
              <select
                value={cameraSetup.iso}
                onChange={(e) => updateCameraField('iso', parseInt(e.target.value))}
                className="w-full px-2 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {ISOS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-text-muted mb-1">Obturador</label>
              <select
                value={cameraSetup.shutter_speed}
                onChange={(e) => updateCameraField('shutter_speed', e.target.value)}
                className="w-full px-2 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {SHUTTER_SPEEDS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-text-muted mb-1">Filtro ND</label>
              <select
                value={cameraSetup.nd_filter}
                onChange={(e) => updateCameraField('nd_filter', e.target.value)}
                className="w-full px-2 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {ND_FILTERS.map((nd) => (
                  <option key={nd} value={nd}>{nd}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: LIGHTING CONTROLS */}
      {activeTab === 'lighting' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 pt-1"
        >
          {/* Key Light */}
          <div className="p-2.5 rounded-lg bg-surface border border-surface-edge space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent-amber flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" /> Luz Principal (Key Light)
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                {lightingSetup.key_light?.intensity || 75}% Potencia
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={lightingSetup.key_light?.type || ''}
                onChange={(e) => updateLightingField('key_light', 'type', e.target.value)}
                placeholder="Ej: Aputure 600d + Octabox 150cm"
                className="px-2 py-1 bg-surface-raised border border-surface-edge rounded text-2xs text-text-primary focus:outline-none"
              />
              <input
                type="text"
                value={lightingSetup.key_light?.color_temp || ''}
                onChange={(e) => updateLightingField('key_light', 'color_temp', e.target.value)}
                placeholder="Temp: 5600K / 3200K / RGB"
                className="px-2 py-1 bg-surface-raised border border-surface-edge rounded text-2xs text-text-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Fill Light */}
          <div className="p-2.5 rounded-lg bg-surface border border-surface-edge space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent-blue flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Luz de Relleno (Fill Light)
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                {lightingSetup.fill_light?.intensity || 35}% Potencia
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={lightingSetup.fill_light?.type || ''}
                onChange={(e) => updateLightingField('fill_light', 'type', e.target.value)}
                placeholder="Ej: Rebote Blanco / Panel LED 300c"
                className="px-2 py-1 bg-surface-raised border border-surface-edge rounded text-2xs text-text-primary focus:outline-none"
              />
              <input
                type="text"
                value={lightingSetup.fill_light?.color_temp || ''}
                onChange={(e) => updateLightingField('fill_light', 'color_temp', e.target.value)}
                placeholder="Temp: 5600K / Ratio 1:2"
                className="px-2 py-1 bg-surface-raised border border-surface-edge rounded text-2xs text-text-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Back / Rim Light */}
          <div className="p-2.5 rounded-lg bg-surface border border-surface-edge space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent-violet flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Luz de Contra / Recorte (Rim Light)
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                {lightingSetup.back_light?.intensity || 40}% Potencia
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={lightingSetup.back_light?.type || ''}
                onChange={(e) => updateLightingField('back_light', 'type', e.target.value)}
                placeholder="Ej: Tubo LED Amaran T2c / Kicker"
                className="px-2 py-1 bg-surface-raised border border-surface-edge rounded text-2xs text-text-primary focus:outline-none"
              />
              <input
                type="text"
                value={lightingSetup.back_light?.color_temp || ''}
                onChange={(e) => updateLightingField('back_light', 'color_temp', e.target.value)}
                placeholder="Temp: 4500K / Neón Magenta"
                className="px-2 py-1 bg-surface-raised border border-surface-edge rounded text-2xs text-text-primary focus:outline-none"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: 2D OVERHEAD LIGHTING STAGE SIMULATOR */}
      {activeTab === 'diagram' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 pt-1"
        >
          <div className="relative w-full h-[230px] rounded-xl bg-[#090a0f] border border-surface-edge overflow-hidden flex items-center justify-center p-2 shadow-inner">
            {/* Grid Floor */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            {/* SVG Interactive Overhead Diagram */}
            <svg viewBox="0 0 300 220" className="w-full h-full">
              <defs>
                {/* Key Light Beam Gradient */}
                <radialGradient id="keyGlow" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                {/* Fill Light Beam Gradient */}
                <radialGradient id="fillGlow" cx="100%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
                {/* Back Light Beam Gradient */}
                <radialGradient id="backGlow" cx="50%" cy="100%" r="100%">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Light Cones */}
              <polygon points="50,40 150,110 90,140" fill="url(#keyGlow)" />
              <polygon points="250,50 150,110 210,140" fill="url(#fillGlow)" />
              <polygon points="150,10 130,95 170,95" fill="url(#backGlow)" />

              {/* Subject / Actor in center */}
              <g transform="translate(150, 110)">
                <circle r="18" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                {/* Nose / Facing direction pointing towards camera (bottom) */}
                <path d="M-4,14 L0,22 L4,14 Z" fill="#94a3b8" />
                {/* Shoulders */}
                <ellipse cx="0" cy="0" rx="14" ry="7" fill="#334155" />
                <circle cx="0" cy="0" r="8" fill="#e2e8f0" />
                <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">Sujeto / Actor</text>
              </g>

              {/* Camera at bottom */}
              <g transform="translate(150, 195)">
                {/* Field of View Lines */}
                <line x1="0" y1="-10" x2="-60" y2="-80" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                <line x1="0" y1="-10" x2="60" y2="-80" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                {/* Camera Body */}
                <rect x="-14" y="-10" width="28" height="18" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="0" cy="-1" r="5" fill="#0c4a6e" />
                <text x="0" y="19" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                  {cameraSetup.camera_model?.split(' ')[0] || 'CÁMARA'} ({cameraSetup.lens || '35mm'})
                </text>
              </g>

              {/* Key Light (Left / Top) */}
              <g transform="translate(50, 45)">
                <circle r="12" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
                <path d="M-5,-5 L5,5 M-5,5 L5,-5" stroke="#fef3c7" strokeWidth="1.5" />
                <text x="0" y="-16" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">KEY LIGHT</text>
                <text x="0" y="22" textAnchor="middle" fill="#d97706" fontSize="7">{lightingSetup.key_light?.color_temp || '5600K'}</text>
              </g>

              {/* Fill Light (Right / Top) */}
              <g transform="translate(250, 50)">
                <circle r="12" fill="#075985" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="0" cy="0" r="5" fill="#bae6fd" />
                <text x="0" y="-16" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">FILL LIGHT</text>
                <text x="0" y="22" textAnchor="middle" fill="#0284c7" fontSize="7">{lightingSetup.fill_light?.intensity || 35}%</text>
              </g>

              {/* Back Light / Hair Light (Center Top) */}
              <g transform="translate(150, 20)">
                <rect x="-16" y="-6" width="32" height="12" rx="2" fill="#581c87" stroke="#c084fc" strokeWidth="1.5" />
                <text x="0" y="-10" textAnchor="middle" fill="#c084fc" fontSize="8" fontWeight="bold">RIM / HAIR</text>
              </g>
            </svg>
          </div>

          <div className="p-2 bg-surface rounded-lg border border-surface-edge text-[11px] text-text-secondary flex items-start gap-2">
            <Info className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
            <p>
              <strong>Guía técnica para el rodaje:</strong> El diagrama cenital muestra la disposición de la luz principal ({lightingSetup.key_light?.name}), el relleno pasivo y la contra para dar tridimensionalidad al encuadre con lente {cameraSetup.lens}.
            </p>
          </div>
        </motion.div>
      )}

      {/* Save Custom Preset Modal */}
      <AnimatePresence>
        {showSavePresetModal && (
          <div
            onClick={() => setShowSavePresetModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-raised border border-surface-edge rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl"
            >
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-accent-blue" /> Guardar Preset de Cámara & Luz
              </h4>
              <p className="text-xs text-text-muted">
                Guarda los parámetros de esta toma para aplicarlos instantáneamente en cualquier otra escena.
              </p>

              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Nombre del Preset</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Ej: Mi Setup Podcast / Comercial 50mm"
                  className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Descripción corta (opcional)</label>
                <input
                  type="text"
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  placeholder="Ej: Para planos medios con poca profundidad de campo"
                  className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-edge">
                <button
                  onClick={() => setShowSavePresetModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCustomPreset}
                  disabled={!newPresetName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue-hover disabled:opacity-40 transition-all"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar Preset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
