import http from 'http';
import { createApp } from './app';
import { createCollaborationServer } from './services/collaboration';
import { io } from 'socket.io-client';

const PORT = 3099;
const URL = `http://localhost:${PORT}`;
const ROOM_ID = 'test-collab-room-2026';

console.log('🚀 Starting Self-Contained Real-Time Collaboration Test Script...');

const app = createApp();
const server = http.createServer(app);
createCollaborationServer(server);

server.listen(PORT, async () => {
  console.log(`📡 Test Server listening on ${URL}`);
  const clientA = io(URL, { transports: ['websocket'] });
  const clientB = io(URL, { transports: ['websocket'] });

  let presenceUpdateCount = 0;
  let cursorUpdateCount = 0;
  let sceneUpdateCount = 0;

  clientA.on('connect', () => {
    console.log('✅ Client A connected to Server');
    clientA.emit('join-room', { projectId: ROOM_ID, userName: 'User Alice' });
  });

  clientB.on('connect', () => {
    console.log('✅ Client B connected to Server');
    clientB.emit('join-room', { projectId: ROOM_ID, userName: 'User Bob' });
  });

  clientA.on('presence-update', (presence) => {
    presenceUpdateCount++;
    console.log(`👥 Client A received presence-update (${presence.length} users):`, 
      presence.map((u: any) => u.name).join(', ')
    );
  });

  clientB.on('cursor-update', (data) => {
    cursorUpdateCount++;
    console.log(`🖱️ Client B received cursor-update:`, data.position);
  });

  clientB.on('scene-changed', (data) => {
    sceneUpdateCount++;
    console.log(`🎬 Client B received scene-changed:`, data.scene);
  });

  setTimeout(() => {
    console.log('✍️ Client A moving cursor...');
    clientA.emit('cursor-move', { projectId: ROOM_ID, position: { x: 150, y: 350 } });
  }, 1000);

  setTimeout(() => {
    console.log('✍️ Client A updating a scene...');
    clientA.emit('scene-update', { projectId: ROOM_ID, scene: { id: 'scene-1', title: 'Escena 1 (Editada por Alice)', position_x: 200 } });
  }, 2000);

  setTimeout(() => {
    console.log('\n--- Test results verification ---');
    console.log(`Presence updates: ${presenceUpdateCount}`);
    console.log(`Cursor updates: ${cursorUpdateCount}`);
    console.log(`Scene updates: ${sceneUpdateCount}`);

    clientA.disconnect();
    clientB.disconnect();
    server.close(() => {
      if (presenceUpdateCount >= 2 && cursorUpdateCount >= 1 && sceneUpdateCount >= 1) {
        console.log('\n✅ ALL COLLABORATION REAL-TIME TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
      } else {
        console.error('\n❌ SOME REAL-TIME COLLABORATION MESSAGES WERE MISSING!');
        process.exit(1);
      }
    });
  }, 3500);
});
