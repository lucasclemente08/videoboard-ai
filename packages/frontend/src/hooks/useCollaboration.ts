import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface CursorData {
  userId: string;
  position: { x: number; y: number } | null;
  name: string;
  color: string;
}

interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

const SOCKET_URL = 'http://localhost:3001';

export function useCollaboration(projectId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { projectId, userName: `User-${socket.id?.slice(0, 4)}` });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('presence-update', (users: PresenceUser[]) => {
      setPresence(users);
    });

    socket.on('cursor-update', (data: CursorData) => {
      setCursors((prev) => {
        const next = new Map(prev);
        if (data.position === null) {
          next.delete(data.userId);
        } else {
          next.set(data.userId, data);
        }
        return next;
      });
    });

    // Scene sync handlers
    socket.on('scene-changed', ({ scene }: { scene: any }) => {
      (window as any).__remoteSceneUpdate?.(scene);
    });

    socket.on('scene-added', ({ scene }: { scene: any }) => {
      (window as any).__remoteSceneAdd?.(scene);
    });

    socket.on('scene-removed', ({ sceneId }: { sceneId: string }) => {
      (window as any).__remoteSceneRemove?.(sceneId);
    });

    socket.on('connection-added', ({ connection }: { connection: any }) => {
      (window as any).__remoteConnectionAdd?.(connection);
    });

    socket.on('connection-removed', ({ connectionId }: { connectionId: string }) => {
      (window as any).__remoteConnectionRemove?.(connectionId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  // Emit cursor position
  const emitCursor = (position: { x: number; y: number }) => {
    socketRef.current?.emit('cursor-move', { projectId, position });
  };

  // Emit scene changes
  const emitSceneUpdate = (scene: any) => {
    socketRef.current?.emit('scene-update', { projectId, scene });
  };

  const emitSceneCreated = (scene: any) => {
    socketRef.current?.emit('scene-created', { projectId, scene });
  };

  const emitSceneDeleted = (sceneId: string) => {
    socketRef.current?.emit('scene-deleted', { projectId, sceneId });
  };

  const emitConnectionCreated = (connection: any) => {
    socketRef.current?.emit('connection-created', { projectId, connection });
  };

  const emitConnectionDeleted = (connectionId: string) => {
    socketRef.current?.emit('connection-deleted', { projectId, connectionId });
  };

  return {
    cursors,
    presence,
    connected,
    emitCursor,
    emitSceneUpdate,
    emitSceneCreated,
    emitSceneDeleted,
    emitConnectionCreated,
    emitConnectionDeleted,
  };
}
