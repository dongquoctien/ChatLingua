import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index.js';
import { petService, petEvents } from '../../services/pet.service.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../../types/chat.types.js';

type IO = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

// Setup event forwarding from petService to Socket.IO
let eventForwardingSetup = false;

function setupPetEventForwarding(io: IO): void {
  if (eventForwardingSetup) return;
  eventForwardingSetup = true;

  // Forward pet events to Socket.IO rooms
  petEvents.on('pet:updated', ({ userId, pet, state }) => {
    io.to(`user:${userId}`).emit('pet:state' as any, { pet, state });
  });

  petEvents.on('pet:adopted', ({ userId, pet }) => {
    io.to(`user:${userId}`).emit('pet:adopted' as any, { pet });
  });

  petEvents.on('pet:switched', ({ userId, pet }) => {
    io.to(`user:${userId}`).emit('pet:switched' as any, { pet });
  });

  petEvents.on('pet:xp', ({ userId, pet, xpGained }) => {
    io.to(`user:${userId}`).emit('pet:xp' as any, { pet, xpGained });
  });

  petEvents.on('pet:needs_attention', ({ userId }) => {
    io.to(`user:${userId}`).emit('pet:needs_attention' as any, {
      message: 'Your pet needs attention!'
    });
  });

  petEvents.on('pet:evolved', ({ userId, petId, newPetType }) => {
    io.to(`user:${userId}`).emit('pet:evolved' as any, { petId, newPetType });
  });

  petEvents.on('pet:died', ({ userId, petId, petName }) => {
    io.to(`user:${userId}`).emit('pet:died' as any, { petId, petName });
  });

  petEvents.on('pet:revived', ({ userId, pet }) => {
    io.to(`user:${userId}`).emit('pet:revived' as any, { pet });
  });

  petEvents.on('pet:notifications', ({ userId, notifications }) => {
    io.to(`user:${userId}`).emit('pet:notifications' as any, { notifications });
  });

  console.log('[Socket] Pet event forwarding initialized');
}

export function registerPetHandlers(io: IO, socket: AuthenticatedSocket): void {
  // Setup event forwarding (only once)
  setupPetEventForwarding(io);

  // Handle get pet state request
  socket.on('pet:get_state' as any, async () => {
    try {
      const pet = await petService.getActivePet(socket.userId);
      if (pet) {
        const state = await petService.getPetState(socket.userId);
        socket.emit('pet:state' as any, { pet, state });
      } else {
        socket.emit('pet:state' as any, { pet: null, state: null });
      }
    } catch (error) {
      console.error(`[Socket] Error getting pet state for user ${socket.userId}:`, error);
      socket.emit('pet:error' as any, { message: 'Failed to get pet state' });
    }
  });

  // Handle quick pet interaction (requires heart item)
  socket.on('pet:quick_pet' as any, async (data: { itemId: number }) => {
    try {
      if (!data?.itemId) {
        socket.emit('pet:error' as any, { message: 'Item ID is required' });
        return;
      }
      const result = await petService.petThePet(socket.userId, data.itemId);
      socket.emit('pet:interaction' as any, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pet';
      console.error(`[Socket] Error petting for user ${socket.userId}:`, error);
      socket.emit('pet:error' as any, { message });
    }
  });

  // Handle quick feed (requires food item)
  socket.on('pet:quick_feed' as any, async (data: { itemId: number }) => {
    try {
      if (!data?.itemId) {
        socket.emit('pet:error' as any, { message: 'Item ID is required' });
        return;
      }
      const result = await petService.feedPet(socket.userId, data.itemId);
      socket.emit('pet:interaction' as any, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to feed pet';
      console.error(`[Socket] Error feeding pet for user ${socket.userId}:`, error);
      socket.emit('pet:error' as any, { message });
    }
  });

  // Handle quick play (requires toy item)
  socket.on('pet:quick_play' as any, async (data: { itemId: number }) => {
    try {
      if (!data?.itemId) {
        socket.emit('pet:error' as any, { message: 'Item ID is required' });
        return;
      }
      const result = await petService.playWithPet(socket.userId, data.itemId);
      socket.emit('pet:interaction' as any, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to play with pet';
      console.error(`[Socket] Error playing with pet for user ${socket.userId}:`, error);
      socket.emit('pet:error' as any, { message });
    }
  });
}
