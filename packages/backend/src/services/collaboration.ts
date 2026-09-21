import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

interface CursorPosition {
  x: number;
  y: number;
}

interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor: CursorPosition | null;
  lastSeen: number;
}

const USER_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export function createCollaborationServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
  });

  // Store presence per room
  const rooms = new Map<string, Map<string, UserPresence>>();

  io.on('connection', (socket: Socket) => {
    console.log(`🔗 User connected: ${socket.id}`);

    // Join project room
    socket.on('join-room', ({ projectId, userName }: { projectId: string; userName: string }) => {
      socket.join(projectId);
      socket.data.projectId = projectId;
      socket.data.userName = userName || 'Anónimo';
      socket.data.userColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

      // Track presence
      if (!rooms.has(projectId)) rooms.set(projectId, new Map());
      const room = rooms.get(projectId)!;
      room.set(socket.id, {
        id: socket.id,
        name: socket.data.userName,
        color: socket.data.userColor,
        cursor: null,
        lastSeen: Date.now(),
      });

      // Broadcast updated presence
      const presence = Array.from(room.values());
      io.to(projectId).emit('presence-update', presence);
      console.log(`👤 ${socket.data.userName} joined room ${projectId} (${presence.length} users)`);
    });

    // Cursor move
    socket.on('cursor-move', ({ projectId, position }: { projectId: string; position: CursorPosition }) => {
      const room = rooms.get(projectId);
      if (!room) return;
      const user = room.get(socket.id);
      if (user) {
        user.cursor = position;
        user.lastSeen = Date.now();
      }
      socket.to(projectId).emit('cursor-update', {
        userId: socket.id,
        position,
        name: socket.data.userName,
        color: socket.data.userColor,
      });
    });

    // Scene changes
    socket.on('scene-update', ({ projectId, scene }: { projectId: string; scene: any }) => {
      socket.to(projectId).emit('scene-changed', { scene, userId: socket.id });
    });

    socket.on('scene-created', ({ projectId, scene }: { projectId: string; scene: any }) => {
      socket.to(projectId).emit('scene-added', { scene, userId: socket.id });
    });

    socket.on('scene-deleted', ({ projectId, sceneId }: { projectId: string; sceneId: string }) => {
      socket.to(projectId).emit('scene-removed', { sceneId, userId: socket.id });
    });

    // Connection changes
    socket.on('connection-created', ({ projectId, connection }: { projectId: string; connection: any }) => {
      socket.to(projectId).emit('connection-added', { connection, userId: socket.id });
    });

    socket.on('connection-deleted', ({ projectId, connectionId }: { projectId: string; connectionId: string }) => {
      socket.to(projectId).emit('connection-removed', { connectionId, userId: socket.id });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const projectId = socket.data.projectId;
      if (projectId && rooms.has(projectId)) {
        const room = rooms.get(projectId)!;
        room.delete(socket.id);
        const presence = Array.from(room.values());
        io.to(projectId).emit('presence-update', presence);
        io.to(projectId).emit('cursor-update', { userId: socket.id, position: null });
        console.log(`👋 ${socket.data.userName} left room ${projectId} (${presence.length} users)`);
      }
    });
  });

  return io;
}
