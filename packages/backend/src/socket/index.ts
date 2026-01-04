import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { statusService } from '../services/status.service.js';
import { registerChatHandlers } from './handlers/chat.handlers.js';
import { registerStatusHandlers } from './handlers/status.handlers.js';
import { registerTypingHandlers } from './handlers/typing.handlers.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/chat.types.js';

// Extend Socket type with our custom data
export interface AuthenticatedSocket extends Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
> {
  userId: number;
  username: string;
  email: string;
}

// Store for the Socket.IO server instance
let ioInstance: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
> | null = null;

export function getIO(): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
> | null {
  return ioInstance;
}

export async function initializeSocket(httpServer: HTTPServer): Promise<SocketIOServer> {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
  });

  // Store instance
  ioInstance = io;

  // Clean up stale online statuses from previous server run
  // This handles the case where server crashed/restarted while users were connected
  try {
    const cleaned = await statusService.cleanupStaleOnlineUsers();
    if (cleaned > 0) {
      console.log(`[Socket] Cleaned up ${cleaned} stale online users from previous session`);
    }
  } catch (error) {
    console.error('[Socket] Error cleaning up stale online users:', error);
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, jwtConfig.secret) as {
        userId: number;
        username: string;
        email: string;
      };

      // Attach user data to socket
      (socket as AuthenticatedSocket).userId = decoded.userId;
      (socket as AuthenticatedSocket).username = decoded.username;
      (socket as AuthenticatedSocket).email = decoded.email;

      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      socket.data.email = decoded.email;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid or expired token'));
    }
  });

  // Connection handler
  io.on('connection', async (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    console.log(`[Socket] User ${authSocket.userId} (${authSocket.username}) connected`);

    // Join personal room for direct messages
    authSocket.join(`user:${authSocket.userId}`);

    try {
      // Check if user was stuck as online (stale state from server restart/crash)
      const wasStale = await statusService.wasStaleOnline(authSocket.userId);

      // Update online status in database
      await statusService.setOnline(authSocket.userId, authSocket.id);

      // Get user's actual status from DB (may have custom status like 'busy', 'studying')
      const userStatus = await statusService.getUserStatus(authSocket.userId);

      // If user was stale online, broadcast offline first to clear stale state on other clients
      // This ensures other users' UI is updated correctly
      if (wasStale) {
        console.log(`[Socket] User ${authSocket.userId} was stale online, broadcasting offline first`);
        authSocket.broadcast.emit('user:offline', {
          userId: authSocket.userId,
          lastSeen: new Date().toISOString(),
        });
      }

      // Broadcast online status to all other users with actual status type
      authSocket.broadcast.emit('user:online', {
        userId: authSocket.userId,
        status: userStatus.statusType,
      });

      // Register event handlers
      registerChatHandlers(io, authSocket);
      registerStatusHandlers(io, authSocket);
      registerTypingHandlers(io, authSocket);

    } catch (error) {
      console.error(`[Socket] Error on connection for user ${authSocket.userId}:`, error);
    }

    // Disconnect handler
    authSocket.on('disconnect', async (reason) => {
      console.log(`[Socket] User ${authSocket.userId} disconnected: ${reason}`);

      try {
        // Pass socket.id to setOffline - it will only mark user offline if this
        // socket_id matches the current one in DB. This prevents race conditions
        // when user refreshes (F5) - new socket connects before old disconnects.
        const wasActuallySetOffline = await statusService.setOffline(authSocket.userId, authSocket.id);

        // Only broadcast offline if the user is actually offline
        // (not if they already reconnected with a new socket)
        if (wasActuallySetOffline) {
          authSocket.broadcast.emit('user:offline', {
            userId: authSocket.userId,
            lastSeen: new Date().toISOString(),
          });
          console.log(`[Socket] User ${authSocket.userId} is now offline`);
        } else {
          console.log(`[Socket] User ${authSocket.userId} has already reconnected, not broadcasting offline`);
        }
      } catch (error) {
        console.error(`[Socket] Error on disconnect for user ${authSocket.userId}:`, error);
      }
    });

    // Error handler
    authSocket.on('error', (error) => {
      console.error(`[Socket] Error for user ${authSocket.userId}:`, error);
    });
  });

  console.log('[Socket] Socket.IO server initialized');

  return io;
}

// Helper function to emit to a specific user
export function emitToUser<K extends keyof ServerToClientEvents>(
  userId: number,
  event: K,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): void {
  if (ioInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ioInstance.to(`user:${userId}`) as any).emit(event, ...args);
  }
}

// Helper function to broadcast to all users except one
export function broadcastExcept<K extends keyof ServerToClientEvents>(
  excludeUserId: number,
  event: K,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): void {
  if (ioInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ioInstance.except(`user:${excludeUserId}`) as any).emit(event, ...args);
  }
}

// Helper function to check if a user has any active socket connections
export async function hasActiveConnection(userId: number): Promise<boolean> {
  if (!ioInstance) return false;

  const room = `user:${userId}`;
  const sockets = await ioInstance.in(room).fetchSockets();
  return sockets.length > 0;
}

// Helper function to get count of active sockets for a user
export async function getActiveConnectionCount(userId: number): Promise<number> {
  if (!ioInstance) return 0;

  const room = `user:${userId}`;
  const sockets = await ioInstance.in(room).fetchSockets();
  return sockets.length;
}
