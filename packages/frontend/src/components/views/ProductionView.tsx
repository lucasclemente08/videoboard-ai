import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  DollarSign, 
  Camera, 
  Plus, 
  User, 
  Trash2, 
  Building, 
  Film,
  Clapperboard,
  Play,
  Volume2,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { clsx } from 'clsx';
import { useParams } from 'react-router-dom';
import { 
  useCharacters, useCreateCharacter, useDeleteCharacter,
  useLocations, useCreateLocation, useDeleteLocation,
  useBudgetItems, useCreateBudgetItem, useDeleteBudgetItem,
  useScenes, useProject
} from '../../api/hooks';
import { SlateModal } from '../slate/SlateModal';

export function ProductionView() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'budget' | 'equipment' | 'slate'>('characters');
  const [slateOpen, setSlateOpen] = useState(false);

  const { data: project } = useProject(projectId!);
  const { data: scenes = [] } = useScenes(projectId!);
  const { data: characters = [] } = useCharacters(projectId!);
  const { data: locations = [] } = useLocations(projectId!);
  const { data: budgetItems = [] } = useBudgetItems(projectId!);

  const createCharacter = useCreateCharacter();
  const deleteCharacter = useDeleteCharacter();

  const createLocation = useCreateLocation();
  const deleteLocation = useDeleteLocation();

  const createBudgetItem = useCreateBudgetItem();
  const deleteBudgetItem = useDeleteBudgetItem();

  // Custom equipment state persisted to localStorage
  const [equipmentList, setEquipmentList] = useState<{ id: string; name: string; category: string }[]>([
    { id: '1', name: 'Sony A7S III / FX3', category: 'Cámara Principal' },
    { id: '2', name: '24-70mm f/2.8 GM II, 85mm f/1.4', category: 'Lentes' },
    { id: '3', name: 'Sennheiser MKH416 + Rode Wireless GO II', category: 'Audio' },
    { id: '4', name: 'Aputure 300d II + Amaran F22c', category: 'Iluminación' },
  ]);

  useEffect(() => {
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(`vb_equipment_${projectId}`);
      if (saved) setEquipmentList(JSON.parse(saved));
    } catch {}
  }, [projectId]);

  const saveEquipment = (list: typeof equipmentList) => {
    setEquipmentList(list);
    try {
      localStorage.setItem(`vb_equipment_${projectId}`, JSON.stringify(list));
    } catch {}
  };

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [actorName, setActorName] = useState('');
  const [address, setAddress] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState('Equipo');

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (activeTab === 'characters') {
      await createCharacter.mutateAsync({ project_id: projectId, name, actor_name: actorName || null });
    } else if (activeTab === 'locations') {
      await createLocation.mutateAsync({ project_id: projectId, name, address: address || null });
    } else if (activeTab === 'budget') {
      await createBudgetItem.mutateAsync({ 
        projectId: projectId!, 
        description: name, 
        category, 
        estimated_cost: parseInt(cost, 10) || 0,
        actual_cost: parseInt(cost, 10) || 0 
      });
    } else if (activeTab === 'equipment') {
      const updated = [...equipmentList, { id: Date.now().toString(), name, category: category || 'General' }];
      saveEquipment(updated);
    }
    setShowModal(false);
    setName('');
    setActorName('');
    setAddress('');
    setCost('');
  };

  const totalBudget = budgetItems.reduce((acc, item) => acc + (item.actual_cost || item.estimated_cost || 0), 0);

  return (
    <div className="h-full flex flex-col bg-surface text-text-primary overflow-hidden">
      {/* Top Bar Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-surface-edge bg-surface-raised/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-violet/15 flex items-center justify-center">
            <Film className="w-4 h-4 text-accent-violet" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-text-primary">
              Gestión de Producción
            </h2>
            <p className="text-4xs text-text-muted">Elenco, Locaciones, Presupuesto y Equipamiento</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-xl border border-surface-edge">
          {[
            { id: 'characters', label: 'Elenco', icon: Users },
            { id: 'locations', label: 'Locaciones', icon: MapPin },
            { id: 'budget', label: 'Presupuesto', icon: DollarSign },
            { id: 'equipment', label: 'Equipamiento', icon: Camera },
            { id: 'slate', label: 'Claqueta & Rodaje', icon: Clapperboard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === tab.id
                  ? (tab.id === 'slate' ? 'bg-red-600 text-white shadow-sm' : 'bg-accent-blue text-white shadow-sm')
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSlateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-600/25 transition-all shadow-sm"
            title="Abrir Claqueta Digital en Pantalla Completa"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Claqueta en Set</span>
          </button>

          {activeTab !== 'slate' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Añadir {activeTab === 'characters' ? 'Personaje' : activeTab === 'locations' ? 'Locación' : activeTab === 'budget' ? 'Gasto' : 'Equipo'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
        {activeTab === 'characters' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-primary">Elenco y Personajes ({characters.length})</h3>
                <p className="text-xs text-text-muted">Personajes de la historia y actores asignados</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {characters.map((char) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border border-surface-edge bg-surface-raised hover:border-surface-hover transition-all flex items-start gap-3 group relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-pink/15 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-accent-pink" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-text-primary truncate">{char.name}</h4>
                    <p className="text-2xs text-text-muted mt-0.5">Actor: {char.actor_name || 'Sin asignar'}</p>
                    {char.wardrobe && <p className="text-3xs text-text-secondary mt-1">Vestuario: {char.wardrobe}</p>}
                  </div>
                  <button
                    onClick={() => deleteCharacter.mutate(char.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-accent-red transition-all"
                    title="Eliminar personaje"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}

              {characters.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-surface-edge rounded-2xl">
                  <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-text-muted">No hay personajes registrados en este proyecto.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'locations' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-text-primary">Locaciones de Rodaje ({locations.length})</h3>
              <p className="text-xs text-text-muted">Set e instalaciones para las escenas del proyecto</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border border-surface-edge bg-surface-raised hover:border-surface-hover transition-all flex items-start gap-3 group relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-green/15 flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5 text-accent-green" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-text-primary truncate">{loc.name}</h4>
                    <p className="text-2xs text-text-muted mt-0.5">{loc.address || 'Dirección no especificada'}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-4xs font-bold bg-surface-edge text-text-secondary">
                      {loc.permits_required ? 'Requiere Permiso' : 'Sin permiso req.'}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteLocation.mutate(loc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-accent-red transition-all"
                    title="Eliminar locación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}

              {locations.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-surface-edge rounded-2xl">
                  <MapPin className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-text-muted">No hay locaciones guardadas para este proyecto.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="bg-surface-raised p-6 rounded-2xl border border-surface-edge flex items-center justify-between">
              <div>
                <span className="text-2xs font-bold text-text-muted uppercase tracking-wider block mb-1">Presupuesto Estimado Total</span>
                <span className="text-3xl font-extrabold text-accent-orange">${totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-accent-orange/10 text-accent-orange text-2xs font-bold border border-accent-orange/20">
                  {budgetItems.length} ítems registrados
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {budgetItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-surface-edge bg-surface-raised flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-orange/15 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-accent-orange" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">{item.description}</h4>
                      <span className="text-4xs text-text-muted uppercase">{item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-text-primary">${(item.actual_cost || item.estimated_cost || 0).toLocaleString()}</span>
                    <button
                      onClick={() => deleteBudgetItem.mutate({ projectId: projectId!, id: item.id })}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-accent-red transition-all"
                      title="Eliminar ítem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {budgetItems.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-surface-edge rounded-2xl">
                  <DollarSign className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-text-muted">No hay ítems de presupuesto agregados.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <div className="bg-surface-raised p-6 rounded-2xl border border-surface-edge">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4 text-accent-cyan" /> Equipamiento Técnico ({equipmentList.length})
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {equipmentList.map((eq) => (
                  <div key={eq.id} className="p-3.5 rounded-xl bg-surface border border-surface-edge flex items-center justify-between group">
                    <div>
                      <span className="text-4xs text-text-muted font-bold block uppercase">{eq.category}</span>
                      <span className="font-semibold text-text-primary">{eq.name}</span>
                    </div>
                    <button
                      onClick={() => saveEquipment(equipmentList.filter(item => item.id !== eq.id))}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-accent-red transition-all"
                      title="Eliminar equipo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'slate' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Clapperboard className="w-5 h-5 text-red-500" />
                  <span>Modo Rodaje en Set & Continuista</span>
                </h3>
                <p className="text-xs text-text-muted">
                  Herramienta de campo para tablet y móvil: claqueta sincronizada, código de tiempo y registro de tomas buenas (Circled takes) para el editor.
                </p>
              </div>
            </div>

            {/* Slate Hero Banner Card */}
            <div className="p-6 md:p-8 rounded-2xl border-2 border-red-500/20 bg-gradient-to-br from-red-950/20 via-surface-raised to-surface flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>SINCRONIZACIÓN PROFESIONAL</span>
                </div>
                <h4 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
                  Claqueta Digital Inteligente con Beep 1kHz y Destello
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Lleva tu iPad, tablet o laptop directamente al set. Marca cada toma, genera el tono de calibración de 1000 Hz para sincronizar grabadoras externas de sonido y clasifica tomas buenas (Circled), de respaldo (Hold) y descartadas (NG) en tiempo real.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-2xs text-text-muted pt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> Tono 1kHz Web Audio
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> Flash óptico 1-frame
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> Exportación CSV para DaVinci / Premiere
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center gap-3">
                <button
                  onClick={() => setSlateOpen(true)}
                  className="px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm tracking-wider flex items-center gap-3 shadow-xl hover:shadow-red-600/30 active:scale-95 transition-all"
                >
                  <Clapperboard className="w-5 h-5" />
                  <span>LANZAR CLAQUETA DE CAMPO</span>
                </button>
                <span className="text-3xs text-text-muted">Compatible con atajos de teclado (Espacio / R)</span>
              </div>
            </div>

            {/* Quick Overview of Scenes in Project */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-surface-edge bg-surface-raised space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-amber" />
                  <span>Plan de Rodaje por Escena ({scenes.length} escenas)</span>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {scenes.map((sc, i) => (
                    <div key={sc.id} className="p-2.5 rounded-xl bg-surface border border-surface-edge flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded bg-surface-hover flex items-center justify-center font-bold text-3xs text-text-muted">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-text-primary truncate">{sc.title}</span>
                      </div>
                      <span className="text-2xs text-text-muted font-mono">{sc.estimated_duration_secs || 5}s est.</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-surface-edge bg-surface-raised space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-blue" />
                  <span>Buenas Prácticas para el Set</span>
                </h4>
                <ul className="text-2xs text-text-secondary space-y-2 leading-relaxed">
                  <li>• <strong>Orientación:</strong> Coloca la tableta frente a la cámara principal antes de cantar la escena y toma.</li>
                  <li>• <strong>Sincronización:</strong> Mantén el volumen de la tableta al 100% para que el micrófono de caña (boom) capture con claridad el beep de 1kHz.</li>
                  <li>• <strong>Circled Takes:</strong> Marca inmediatamente las tomas que el director elija como buenas para que el reporte CSV guíe directamente al editor de montaje.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-md bg-surface border border-surface-edge rounded-2xl p-6 shadow-2xl">
                <h3 className="text-base font-bold mb-4">
                  Nuevo {activeTab === 'characters' ? 'Personaje' : activeTab === 'locations' ? 'Locación' : activeTab === 'budget' ? 'Gasto' : 'Equipo'}
                </h3>

                <div className="space-y-3 mb-6">
                  <input
                    type="text"
                    placeholder={activeTab === 'characters' ? 'Nombre del personaje' : activeTab === 'locations' ? 'Nombre de la locación' : activeTab === 'budget' ? 'Descripción del gasto' : 'Modelo / Nombre del equipo'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-edge bg-surface-raised text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                  />

                  {activeTab === 'characters' && (
                    <input
                      type="text"
                      placeholder="Nombre del Actor"
                      value={actorName}
                      onChange={(e) => setActorName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-edge bg-surface-raised text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  )}

                  {activeTab === 'locations' && (
                    <input
                      type="text"
                      placeholder="Dirección o set"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-edge bg-surface-raised text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  )}

                  {activeTab === 'budget' && (
                    <input
                      type="number"
                      placeholder="Costo Estimado ($)"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-edge bg-surface-raised text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  )}

                  {activeTab === 'equipment' && (
                    <input
                      type="text"
                      placeholder="Categoría (Cámara, Lentes, Audio, Iluminación...)"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-edge bg-surface-raised text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-text-muted hover:bg-surface-hover transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!name.trim()}
                    className="px-4 py-2 rounded-xl bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-all disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SlateModal
        open={slateOpen}
        onClose={() => setSlateOpen(false)}
        projectId={projectId!}
        projectTitle={project?.title}
        scenes={scenes}
      />
    </div>
  );
}
