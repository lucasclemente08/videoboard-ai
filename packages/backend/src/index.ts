import { createServer } from 'http';
import { env } from './config/env';
import { createApp } from './app';
import { createCollaborationServer } from './services/collaboration';

const app = createApp();
const httpServer = createServer(app);

// Attach Socket.IO for real-time collaboration
createCollaborationServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`🎬 VideoBoard AI API running on http://localhost:${env.PORT}`);
  console.log(`   WebSocket colaborativo activo`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});
