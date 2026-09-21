import { io } from 'socket.io-client';

const URL = 'http://localhost:3001';
const ROOM_ID = 'test-collab-room-2026';

console.log('🚀 Starting Real-Time Collaboration Test Script...');

async function run() {
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

  // Client A listens for presence updates
  clientA.on('presence-update', (presence) => {
    presenceUpdateCount++;
    console.log(`👥 Client A received presence-update (total users in room: ${presence.length}):`, 
      presence.map((u: any) => u.name).join(', ')
    );
  });

  // Client B listens for cursor updates from Client A
  clientB.on('cursor-update', (data) => {
    cursorUpdateCount++;
    console.log(`🖱️ Client B received cursor-update from ${data.name || data.userId}:`, data.position);
  });

  // Client B listens for scene updates from Client A
  clientB.on('scene-changed', (data) => {
    sceneUpdateCount++;
    console.log(`🎬 Client B received scene-changed from user ${data.userId}:`, data.scene);
  });

  // Let's perform actions after a short delay
  setTimeout(() => {
    console.log('✍️ Client A moving cursor...');
    clientA.emit('cursor-move', { projectId: ROOM_ID, position: { x: 150, y: 350 } });
  }, 1000);

  setTimeout(() => {
    console.log('✍️ Client A updating a scene...');
    clientA.emit('scene-update', { projectId: ROOM_ID, scene: { id: 'scene-1', title: 'Escena 1 (Editada por Alice)', position_x: 200 } });
  }, 2000);

  // Stop after testing
  setTimeout(() => {
    console.log('\n--- Test results verification ---');
    console.log(`Presence updates received: ${presenceUpdateCount}`);
    console.log(`Cursor updates received: ${cursorUpdateCount}`);
    console.log(`Scene updates received: ${sceneUpdateCount}`);

    if (presenceUpdateCount >= 2 && cursorUpdateCount >= 1 && sceneUpdateCount >= 1) {
      console.log('\n✅ ALL COLLABORATION REAL-TIME TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('\n❌ SOME REAL-TIME COLLABORATION MESSAGES WERE MISSING!');
      process.exit(1);
    }
  }, 4000);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
