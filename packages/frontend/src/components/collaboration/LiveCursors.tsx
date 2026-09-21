import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorData {
  userId: string;
  position: { x: number; y: number } | null;
  name: string;
  color: string;
}

export function LiveCursors({ cursors }: { cursors: Map<string, CursorData> }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {Array.from(cursors.entries()).map(([id, data]) => {
          if (!data.position) return null;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
              className="absolute"
              style={{
                left: data.position.x,
                top: data.position.y,
              }}
            >
              {/* Cursor arrow */}
              <svg width="16" height="16" viewBox="0 0 16 16" className="drop-shadow-md">
                <path d="M1 1l5 14 2-5 5-2z" fill={data.color} stroke="white" strokeWidth="0.5" />
              </svg>

              {/* Name tag */}
              <div
                className="absolute left-3 -top-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap shadow-md"
                style={{ backgroundColor: data.color, color: '#fff' }}
              >
                {data.name}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
