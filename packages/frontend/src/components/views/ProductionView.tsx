import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MapPin, 
  DollarSign, 
  Camera, 
  Plus, 
  User, 
  Sparkles, 
  Check, 
  X, 
  Building, 
  Film,
  Layers,
  FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import { useParams } from 'react-router-dom';
import { 
  useCharacters, useCreateCharacter,
  useLocations, useCreateLocation,
  useBudgetItems, useCreateBudgetItem
} from '../../api/hooks';

export function ProductionView() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'budget' | 'equipment'>('characters');

  const { data: characters = [] } = useCharacters(projectId!);
  const { data: locations = [] } = useLocations(projectId!);
  const { data: budgetItems = [] } = useBudgetItems(projectId!);

  const createCharacter = useCreateCharacter();
  const createLocation = useCreateLocation();
  const createBudgetItem = useCreateBudgetItem();

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
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-accent-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Añadir {activeTab === 'characters' ? 'Personaje' : activeTab === 'locations' ? 'Locación' : activeTab === 'budget' ? 'Gasto' : 'Equipo'}
        </button>
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
                  className="p-4 rounded-2xl border border-surface-edge bg-surface-raised hover:border-surface-hover transition-all flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-pink/15 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-accent-pink" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-text-primary truncate">{char.name}</h4>
                    <p className="text-2xs text-text-muted mt-0.5">Actor: {char.actor_name || 'Sin asignar'}</p>
                    {char.wardrobe && <p className="text-3xs text-text-secondary mt-1">Vestuario: {char.wardrobe}</p>}
                  </div>
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
                  className="p-4 rounded-2xl border border-surface-edge bg-surface-raised hover:border-surface-hover transition-all flex items-start gap-3"
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
                <div key={item.id} className="p-3.5 rounded-xl border border-surface-edge bg-surface-raised flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-orange/15 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-accent-orange" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">{item.description}</h4>
                      <span className="text-4xs text-text-muted uppercase">{item.category}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-text-primary">${(item.actual_cost || item.estimated_cost || 0).toLocaleString()}</span>
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
                <Camera className="w-4 h-4 text-accent-cyan" /> Equipamiento Técnico Principal
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-surface border border-surface-edge">
                  <span className="text-4xs text-text-muted font-bold block uppercase">Cámara Principal</span>
                  <span className="font-semibold text-text-primary">Sony A7S III / FX3</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-surface-edge">
                  <span className="text-4xs text-text-muted font-bold block uppercase">Lentes</span>
                  <span className="font-semibold text-text-primary">24-70mm f/2.8 GM II, 85mm f/1.4</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-surface-edge">
                  <span className="text-4xs text-text-muted font-bold block uppercase">Audio</span>
                  <span className="font-semibold text-text-primary">Sennheiser MKH410 + Rode Wireless GO II</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-surface-edge">
                  <span className="text-4xs text-text-muted font-bold block uppercase">Iluminación</span>
                  <span className="font-semibold text-text-primary">Aputure 300d II + Amaran F22c</span>
                </div>
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
                  Nuevo {activeTab === 'characters' ? 'Personaje' : activeTab === 'locations' ? 'Locación' : 'Gasto'}
                </h3>

                <div className="space-y-3 mb-6">
                  <input
                    type="text"
                    placeholder={activeTab === 'characters' ? 'Nombre del personaje' : activeTab === 'locations' ? 'Nombre de la locación' : 'Descripción del gasto'}
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
                      placeholder="Dirección o mapa"
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
    </div>
  );
}
