import { useParams } from 'react-router-dom';
import { useProject, useScenes, useConnections } from '../api/hooks';
import { useSceneStore } from '../stores/useSceneStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useUIStore } from '../stores/useUIStore';
import { InfiniteCanvas } from '../components/canvas/InfiniteCanvas';
import { SceneEditor } from '../components/scene/SceneEditor';
import { Timeline } from '../components/timeline/Timeline';
import { NarrativeView } from '../components/views/NarrativeView';
import { EmotionMap } from '../components/views/EmotionMap';
import { AttentionMap } from '../components/views/AttentionMap';
import { KanbanView } from '../components/views/KanbanView';
import { Dashboard } from '../components/views/Dashboard';
import { CalendarView } from '../components/views/CalendarView';
import { ProductionView } from '../components/views/ProductionView';
import { ChecklistView } from '../components/views/ChecklistView';
import { AIPanel } from '../components/ai/AIPanel';
import { useAIStore } from '../stores/useAIStore';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id!);
  const { data: scenes } = useScenes(id!);
  const { data: connections } = useConnections(id!);
  const { setScenes, setConnections, selectedSceneId, selectScene } = useSceneStore();
  const { setCurrentProject } = useProjectStore();
  const { viewMode, rightPanelOpen, setRightPanelTab } = useUIStore();
  const { aiPanelOpen, closeAIPanel } = useAIStore();

  useEffect(() => {
    if (project) setCurrentProject(project as any);
  }, [project, setCurrentProject]);

  useEffect(() => {
    if (scenes) setScenes(scenes);
  }, [scenes, setScenes]);

  useEffect(() => {
    if (connections) setConnections(connections);
  }, [connections, setConnections]);

  const renderView = () => {
    switch (viewMode) {
      case 'canvas':
        return <InfiniteCanvas projectId={id!} />;
      case 'timeline':
        return <Timeline />;
      case 'calendar':
        return <CalendarView />;
      case 'production':
        return <ProductionView />;
      case 'checklist':
        return <ChecklistView />;
      case 'narrative':
        return <NarrativeView />;
      case 'emotion':
        return <EmotionMap />;
      case 'attention':
        return <AttentionMap />;
      case 'kanban':
        return <KanbanView />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return <InfiniteCanvas projectId={id!} />;
    }
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        {renderView()}
      </div>
      {selectedSceneId && rightPanelOpen && (
        <SceneEditor />
      )}
      <AnimatePresence>
        {aiPanelOpen && <AIPanel onClose={closeAIPanel} />}
      </AnimatePresence>
    </div>
  );
}
