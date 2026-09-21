import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';
import { eventBus, AppEvents } from '../services/eventBus';

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
  cursor: CursorPosition | null;
}

type CursorPosition = { x: number; y: number };

const SOCKET_URL = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'https:' : 'http:'}//${window.location.hostname}:3001` : 'http://localhost:3001');

export function useCollaboration(projectId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem('vb_token');
    const { user } = useAuthStore.getState();
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const userName = user?.full_name || user?.email || `User-${socket.id?.slice(0, 4)}`;
      socket.emit('join-room', { projectId, userName });
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
      eventBus.emit(AppEvents.REMOTE_SCENE_UPDATE, scene);
    });

    socket.on('scene-added', ({ scene }: { scene: any }) => {
      eventBus.emit(AppEvents.REMOTE_SCENE_ADD, scene);
    });

    socket.on('scene-removed', ({ sceneId }: { sceneId: string }) => {
      eventBus.emit(AppEvents.REMOTE_SCENE_REMOVE, sceneId);
    });

    socket.on('connection-added', ({ connection }: { connection: any }) => {
      eventBus.emit(AppEvents.REMOTE_CONNECTION_ADD, connection);
    });

    socket.on('connection-removed', ({ connectionId }: { connectionId: string }) => {
      eventBus.emit(AppEvents.REMOTE_CONNECTION_REMOVE, connectionId);
    });

    // Listen to local mutations to broadcast over socket
    const unsub1 = eventBus.on(AppEvents.EMIT_SCENE_CREATED, (scene) => {
      socket.emit('scene-created', { projectId, scene });
    });
    const unsub2 = eventBus.on(AppEvents.EMIT_SCENE_UPDATE, (scene) => {
      socket.emit('scene-update', { projectId, scene });
    });
    const unsub3 = eventBus.on(AppEvents.EMIT_SCENE_DELETED, (sceneId) => {
      socket.emit('scene-deleted', { projectId, sceneId });
    });
    const unsub4 = eventBus.on(AppEvents.EMIT_CONNECTION_CREATED, (connection) => {
      socket.emit('connection-created', { projectId, connection });
    });
    const unsub5 = eventBus.on(AppEvents.EMIT_CONNECTION_DELETED, (connectionId) => {
      socket.emit('connection-deleted', { projectId, connectionId });
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
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
