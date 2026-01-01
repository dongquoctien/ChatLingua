import { Server as SocketIOServer } from 'socket.io';
import { statusService } from '../../services/status.service.js';
import type { AuthenticatedSocket } from '../index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  StatusType,
  ActivityType,
} from '../../types/chat.types.js';

export function registerStatusHandlers(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: AuthenticatedSocket
): void {
  // ============================================================
  // Update Status
  // ============================================================
  socket.on('status:update', async (data) => {
    try {
      const { statusType, statusText } = data;

      const updatedStatus = await statusService.updateStatus(socket.userId, {
        statusType: statusType as StatusType,
        statusText,
      });

      // Broadcast status change to all users
      socket.broadcast.emit('user:status_changed', {
        userId: socket.userId,
        status: updatedStatus.statusType,
        statusText: updatedStatus.statusText || undefined,
      });

      console.log(`[Status] User ${socket.userId} changed status to ${statusType}`);

    } catch (error) {
      console.error('[Status] Error updating status:', error);
    }
  });

  // ============================================================
  // Update Activity
  // ============================================================
  socket.on('activity:update', async (data) => {
    try {
      const { activity, metadata } = data;

      await statusService.updateActivity(
        socket.userId,
        activity as ActivityType,
        metadata
      );

      // Broadcast activity change to all users
      socket.broadcast.emit('user:activity_changed', {
        userId: socket.userId,
        activity: activity as ActivityType,
        metadata,
      });

      console.log(`[Status] User ${socket.userId} activity: ${activity}`);

    } catch (error) {
      console.error('[Status] Error updating activity:', error);
    }
  });

  // ============================================================
  // Get User Status (on demand)
  // ============================================================
  socket.on('status:get', async (data, callback) => {
    try {
      const { userId } = data;

      const status = await statusService.getUserStatus(userId);

      if (callback && typeof callback === 'function') {
        callback({
          userId: status.userId,
          status: status.statusType,
          statusText: status.statusText || undefined,
          isOnline: status.isOnline,
          lastSeenAt: status.lastSeenAt || undefined,
          activity: status.currentActivity,
        });
      }

    } catch (error) {
      console.error('[Status] Error getting user status:', error);
      if (callback && typeof callback === 'function') {
        callback(null);
      }
    }
  });

  // ============================================================
  // Get Online Users
  // ============================================================
  socket.on('status:get_online', async (callback) => {
    try {
      const onlineUsers = await statusService.getOnlineUsers(socket.userId);

      if (callback && typeof callback === 'function') {
        callback(onlineUsers.map(user => ({
          userId: user.userId,
          username: user.username,
          displayName: user.displayName || undefined,
          avatar: user.avatar || undefined,
          status: user.statusType,
          activity: user.currentActivity,
        })));
      }

    } catch (error) {
      console.error('[Status] Error getting online users:', error);
      if (callback && typeof callback === 'function') {
        callback([]);
      }
    }
  });

  // ============================================================
  // Update Privacy Settings
  // ============================================================
  socket.on('privacy:update', async (data) => {
    try {
      const { showOnlineStatus, allowMessagesFrom } = data;

      await statusService.updatePrivacySettings(socket.userId, {
        showOnlineStatus,
        allowMessagesFrom,
      });

      console.log(`[Status] User ${socket.userId} updated privacy settings`);

    } catch (error) {
      console.error('[Status] Error updating privacy settings:', error);
    }
  });

  // ============================================================
  // Get Online Users List (users:online event)
  // ============================================================
  socket.on('users:online', async () => {
    try {
      const onlineUsers = await statusService.getOnlineUsers(socket.userId);

      // Emit back to the requesting socket only
      socket.emit('users:online:list', onlineUsers);

      console.log(`[Status] Sent ${onlineUsers.length} online users to user ${socket.userId}`);

    } catch (error) {
      console.error('[Status] Error getting online users list:', error);
      socket.emit('users:online:list', []);
    }
  });
}
