import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as compressionModule from 'compression';
import path from 'path';

const compression = (compressionModule as any).default || compressionModule;
import { createServer } from 'http';
import cron from 'node-cron';
import routes from './routes/index.js';
import { initializeSocket } from './socket/index.js';
import { initPetScheduler } from './jobs/pet-scheduler.js';
import pool from './config/database.js';
import type { ResultSetHeader } from 'mysql2';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO (async to clean up stale online users on startup)
initializeSocket(httpServer).catch(err => {
  console.error('Failed to initialize Socket.IO:', err);
  process.exit(1);
});

// Disable ETag to prevent 304 caching issues
app.set('etag', false);

// Middleware
app.use(compression()); // Enable gzip compression for all responses

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json());

// Serve static media files with optimized caching
// Audio files - 7 days cache
app.use('/audio', express.static(path.join(process.cwd(), 'public/audio'), {
  maxAge: '7d',
  immutable: true,
  etag: true,
}));

// Image files - 30 days cache
app.use('/images', express.static(path.join(process.cwd(), 'public/images'), {
  maxAge: '30d',
  immutable: true,
  etag: true,
}));

// Video files - 7 days cache
app.use('/videos', express.static(path.join(process.cwd(), 'public/videos'), {
  maxAge: '7d',
  immutable: true,
  etag: true,
}));

// Serve other static files from public folder (TTS audio files, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with HTTP server (for Socket.IO)
httpServer.listen(PORT, () => {
  console.log(`ChatLingua Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API base: http://localhost:${PORT}/api`);
  console.log(`Socket.IO: ws://localhost:${PORT}`);

  // Initialize pet scheduler after server starts
  initPetScheduler();

  // Cleanup inconsistent online status every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Fix users who are marked online but have no socket connection
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE user_status
         SET is_online = FALSE, status_type = 'offline', last_seen_at = COALESCE(last_seen_at, NOW())
         WHERE socket_id IS NULL AND (is_online = TRUE OR status_type = 'online')`
      );
      if (result.affectedRows > 0) {
        console.log(`[StatusCleanup] Fixed ${result.affectedRows} inconsistent user status`);
      }
    } catch (error) {
      console.error('[StatusCleanup] Error:', error);
    }
  });
  console.log('[StatusCleanup] Scheduled job initialized (every 5 minutes)');
});

export default app;
