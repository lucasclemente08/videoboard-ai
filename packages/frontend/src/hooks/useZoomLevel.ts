import { useStore } from 'reactflow';

// Only re-render when zoom crosses semantic thresholds (0.4, 0.7)
export function useZoomLevel(): number {
  const zoom = useStore((s) => {
    const z = s.transform[2];
    if (z < 0.4) return 0.3;  // compact
    if (z < 0.7) return 0.5;  // normal
    return 0.9;               // full
  });
  return zoom;
}
