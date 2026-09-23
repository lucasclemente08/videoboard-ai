import { createServer } from 'http';
import { env } from './config/env';
import { createApp } from './app';
import { createCollaborationServer } from './services/collaboration';

const app = createApp();
const httpServer = createServer(app);

// Attach Socket.IO for real-time collaboration
createCollaborationServer(httpServer);

if (env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'videoboard-dev-secret-change-in-production') {
    console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET must be set to a secure, random string in production.');
    process.exit(1);
  }
} else if (!process.env.JWT_SECRET) {
  console.warn('⚠️  Security Notice: Running with default development JWT_SECRET. Set JWT_SECRET in .env for production.');
}

httpServer.listen(env.PORT, () => {
  console.log(`🎬 VideoBoard AI API running on http://localhost:${env.PORT}`);
  console.log(`   WebSocket colaborativo activo`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});
