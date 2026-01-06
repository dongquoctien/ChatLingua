import cron from 'node-cron';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { petEvents } from '../services/pet.service';

/**
 * Pet Status Scheduler
 * Runs periodic jobs to:
 * 1. Update pet stats based on time decay
 * 2. Process pet deaths (HP=0 for 24 hours)
 * 3. Track pets needing notifications
 */

interface PetForUpdate {
  id: number;
  userId: number;
  nickname: string | null;
  petTypeName: string;
  hp: number;
  happiness: number;
  hunger: number;
  energy: number;
  hpZeroSince: Date | null;
  lastFedAt: Date | null;
  lastPlayedAt: Date | null;
  lastInteractionAt: Date | null;
  isDead: boolean;
}

interface NotificationRecord {
  userId: number;
  petId: number;
  petName: string;
  type: 'hunger_high' | 'happiness_low' | 'hp_low' | 'dying' | 'died';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// Store notifications to be sent (can be consumed by WebSocket or push service)
const pendingNotifications: NotificationRecord[] = [];

/**
 * Calculate time-based stat decay
 */
function calculateDecay(lastInteraction: Date | null): {
  hungerIncrease: number;
  happinessDecrease: number;
  energyIncrease: number;
} {
  if (!lastInteraction) {
    return { hungerIncrease: 0, happinessDecrease: 0, energyIncrease: 0 };
  }

  const hoursSinceInteraction = (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60);

  // Decay rates per hour
  const HUNGER_RATE = 2;      // +2 hunger per hour
  const HAPPINESS_RATE = 1.5; // -1.5 happiness per hour
  const ENERGY_REGEN = 5;     // +5 energy per hour (regen when not playing)

  return {
    hungerIncrease: Math.floor(hoursSinceInteraction * HUNGER_RATE),
    happinessDecrease: Math.floor(hoursSinceInteraction * HAPPINESS_RATE),
    energyIncrease: Math.floor(hoursSinceInteraction * ENERGY_REGEN)
  };
}

/**
 * Calculate HP change based on current stats
 */
function calculateHpChange(hunger: number, happiness: number): number {
  let hpChange = 0;

  // High hunger damages HP
  if (hunger >= 90) {
    hpChange -= 5; // Starving: -5 HP/hour
  } else if (hunger >= 80) {
    hpChange -= 3; // Very hungry: -3 HP/hour
  } else if (hunger >= 70) {
    hpChange -= 1; // Hungry: -1 HP/hour
  }

  // Low happiness damages HP
  if (happiness <= 10) {
    hpChange -= 3; // Very sad: -3 HP/hour
  } else if (happiness <= 20) {
    hpChange -= 1; // Sad: -1 HP/hour
  }

  // Good stats regenerate HP
  if (hunger < 50 && happiness > 50) {
    hpChange += 2; // Healthy: +2 HP/hour
  }

  return hpChange;
}

/**
 * Main job: Update all active pets' stats
 */
async function updateAllPetStats(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    // Get only ACTIVE pets (non-dead, non-egg, and is_active = TRUE)
    // Only active pets should have their stats decay over time
    const [pets] = await connection.query<RowDataPacket[]>(`
      SELECT
        up.id,
        up.user_id as userId,
        up.nickname,
        pt.name as petTypeName,
        up.hp,
        up.happiness,
        up.hunger,
        up.energy,
        up.hp_zero_since as hpZeroSince,
        up.last_fed_at as lastFedAt,
        up.last_played_at as lastPlayedAt,
        up.last_interaction_at as lastInteractionAt,
        up.is_dead as isDead
      FROM user_pets up
      JOIN pet_types pt ON up.pet_type_id = pt.id
      WHERE up.is_dead = FALSE
        AND up.is_active = TRUE
        AND pt.is_egg = FALSE
    `);

    console.log(`[PetScheduler] Processing ${pets.length} active pets...`);

    for (const pet of pets as PetForUpdate[]) {
      await updateSinglePet(connection, pet);
    }

    console.log(`[PetScheduler] Completed processing pets. Notifications: ${pendingNotifications.length}`);

    // Emit notifications via WebSocket
    emitPendingNotifications();

  } catch (error) {
    console.error('[PetScheduler] Error updating pet stats:', error);
  } finally {
    connection.release();
  }
}

/**
 * Update a single pet's stats
 */
async function updateSinglePet(connection: any, pet: PetForUpdate): Promise<void> {
  const petName = pet.nickname || pet.petTypeName;

  // Calculate decay based on last interaction
  const decay = calculateDecay(pet.lastInteractionAt);

  // Calculate new stats
  let newHunger = Math.min(100, Math.max(0, pet.hunger + decay.hungerIncrease));
  let newHappiness = Math.min(100, Math.max(0, pet.happiness - decay.happinessDecrease));
  let newEnergy = Math.min(100, Math.max(0, pet.energy + decay.energyIncrease));

  // Calculate HP change based on new stats
  const hpChange = calculateHpChange(newHunger, newHappiness);
  let newHp = Math.min(100, Math.max(0, pet.hp + hpChange));

  // Update pet stats in database
  await connection.query(`
    UPDATE user_pets SET
      hunger = ?,
      happiness = ?,
      energy = ?,
      hp = ?
    WHERE id = ?
  `, [newHunger, newHappiness, newEnergy, newHp, pet.id]);

  // Handle HP zero tracking and death
  if (newHp === 0) {
    if (!pet.hpZeroSince) {
      // HP just reached 0, start death timer
      await connection.query(
        'UPDATE user_pets SET hp_zero_since = NOW() WHERE id = ? AND hp_zero_since IS NULL',
        [pet.id]
      );

      pendingNotifications.push({
        userId: pet.userId,
        petId: pet.id,
        petName,
        type: 'dying',
        urgency: 'critical',
        message: `${petName} is dying! HP has reached 0. You have 24 hours to save them!`
      });
    } else {
      // Check if 24 hours have passed
      const hoursSinceZero = (Date.now() - new Date(pet.hpZeroSince).getTime()) / (1000 * 60 * 60);

      if (hoursSinceZero >= 24) {
        // Pet dies
        await connection.query(`
          UPDATE user_pets SET
            is_dead = TRUE,
            died_at = NOW(),
            is_active = FALSE
          WHERE id = ?
        `, [pet.id]);

        pendingNotifications.push({
          userId: pet.userId,
          petId: pet.id,
          petName,
          type: 'died',
          urgency: 'critical',
          message: `${petName} has passed away. They will be remembered fondly.`
        });

        // Emit death event
        petEvents.emit('pet:died', { userId: pet.userId, petId: pet.id, petName });

        console.log(`[PetScheduler] Pet ${pet.id} (${petName}) has died.`);
      } else if (hoursSinceZero >= 18) {
        pendingNotifications.push({
          userId: pet.userId,
          petId: pet.id,
          petName,
          type: 'dying',
          urgency: 'critical',
          message: `URGENT: ${petName} only has ${Math.floor(24 - hoursSinceZero)} hours left!`
        });
      } else if (hoursSinceZero >= 12) {
        pendingNotifications.push({
          userId: pet.userId,
          petId: pet.id,
          petName,
          type: 'dying',
          urgency: 'high',
          message: `${petName} is in critical condition! ${Math.floor(24 - hoursSinceZero)} hours remaining.`
        });
      }
    }
  } else if (pet.hpZeroSince) {
    // HP recovered, clear death timer
    await connection.query(
      'UPDATE user_pets SET hp_zero_since = NULL WHERE id = ?',
      [pet.id]
    );
  }

  // Generate other notifications based on stats
  if (newHp > 0) {
    if (newHunger >= 80) {
      pendingNotifications.push({
        userId: pet.userId,
        petId: pet.id,
        petName,
        type: 'hunger_high',
        urgency: newHunger >= 90 ? 'high' : 'medium',
        message: `${petName} is ${newHunger >= 90 ? 'starving' : 'very hungry'}! Feed them soon.`
      });
    }

    if (newHappiness <= 20) {
      pendingNotifications.push({
        userId: pet.userId,
        petId: pet.id,
        petName,
        type: 'happiness_low',
        urgency: newHappiness <= 10 ? 'high' : 'medium',
        message: `${petName} is ${newHappiness <= 10 ? 'very sad' : 'feeling down'}. Play with them!`
      });
    }

    if (newHp <= 30 && newHp > 0) {
      pendingNotifications.push({
        userId: pet.userId,
        petId: pet.id,
        petName,
        type: 'hp_low',
        urgency: newHp <= 15 ? 'high' : 'medium',
        message: `${petName}'s health is ${newHp <= 15 ? 'critical' : 'low'}! HP: ${newHp}`
      });
    }
  }
}

/**
 * Emit pending notifications via WebSocket events
 */
function emitPendingNotifications(): void {
  // Group notifications by user
  const byUser = new Map<number, NotificationRecord[]>();

  for (const notification of pendingNotifications) {
    if (!byUser.has(notification.userId)) {
      byUser.set(notification.userId, []);
    }
    byUser.get(notification.userId)!.push(notification);
  }

  // Emit to each user
  for (const [userId, notifications] of byUser) {
    // Filter to only most urgent per pet
    const uniqueByPet = new Map<number, NotificationRecord>();
    for (const n of notifications) {
      const existing = uniqueByPet.get(n.petId);
      if (!existing || getUrgencyLevel(n.urgency) > getUrgencyLevel(existing.urgency)) {
        uniqueByPet.set(n.petId, n);
      }
    }

    const finalNotifications = Array.from(uniqueByPet.values());
    if (finalNotifications.length > 0) {
      petEvents.emit('pet:notifications', { userId, notifications: finalNotifications });
    }
  }

  // Clear pending notifications
  pendingNotifications.length = 0;
}

function getUrgencyLevel(urgency: string): number {
  switch (urgency) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

/**
 * Job: Reset daily tasks at midnight
 */
async function resetDailyTasks(): Promise<void> {
  try {
    // Daily tasks are date-based, so no reset needed
    // Just log for monitoring
    console.log('[PetScheduler] Daily task reset check completed.');
  } catch (error) {
    console.error('[PetScheduler] Error in daily task reset:', error);
  }
}

/**
 * Initialize all scheduled jobs
 */
export function initPetScheduler(): void {
  console.log('[PetScheduler] Initializing pet status scheduler...');

  // Run pet status update every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[PetScheduler] Running scheduled pet status update...');
    await updateAllPetStats();
  });

  // Run daily task reset at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[PetScheduler] Running daily task reset...');
    await resetDailyTasks();
  });

  // Run immediate update on startup (after 10 seconds delay)
  setTimeout(async () => {
    console.log('[PetScheduler] Running initial pet status update...');
    await updateAllPetStats();
  }, 10000);

  console.log('[PetScheduler] Scheduler initialized. Jobs:');
  console.log('  - Pet status update: every 30 minutes');
  console.log('  - Daily task reset: midnight');
}

/**
 * Manual trigger for testing
 */
export async function triggerPetStatusUpdate(): Promise<{ processed: number; notifications: number }> {
  const beforeNotifications = pendingNotifications.length;
  await updateAllPetStats();
  return {
    processed: 0, // Could track this if needed
    notifications: pendingNotifications.length - beforeNotifications
  };
}

export { pendingNotifications, NotificationRecord };
