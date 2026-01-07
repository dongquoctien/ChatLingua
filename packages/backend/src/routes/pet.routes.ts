import { Router, Response } from 'express';
import { petService } from '../services/pet.service.js';
import { authMiddleware, AuthRequest, getValidatedUserId } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== Pet Types ====================

// GET /api/pets/types - Get all available pet types
router.get('/types', async (req: AuthRequest, res: Response) => {
  try {
    const types = await petService.getPetTypes();
    res.json(types);
  } catch (error) {
    console.error('Error getting pet types:', error);
    res.status(500).json({ error: 'Failed to get pet types' });
  }
});

// GET /api/pets/types/:slug - Get pet type by slug
router.get('/types/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const petType = await petService.getPetTypeBySlug(req.params.slug);
    if (!petType) {
      res.status(404).json({ error: 'Pet type not found' });
      return;
    }
    res.json(petType);
  } catch (error) {
    console.error('Error getting pet type:', error);
    res.status(500).json({ error: 'Failed to get pet type' });
  }
});

// ==================== User Pets ====================

// GET /api/pets/my-pets - Get all user's pets
router.get('/my-pets', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const pets = await petService.getUserPets(userId);
    res.json(pets);
  } catch (error) {
    console.error('Error getting user pets:', error);
    const message = error instanceof Error ? error.message : 'Failed to get pets';
    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else {
      res.status(500).json({ error: 'Failed to get pets' });
    }
  }
});

// GET /api/pets/active - Get user's active pet with state
router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const pet = await petService.getActivePet(userId);
    if (!pet) {
      res.json(null);
      return;
    }
    const state = await petService.getPetState(userId);
    res.json({ pet, state });
  } catch (error) {
    console.error('Error getting active pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to get active pet';
    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else {
      res.status(500).json({ error: 'Failed to get active pet' });
    }
  }
});

// POST /api/pets/adopt - Adopt a new pet (DEPRECATED - use /purchase or /claim instead)
router.post('/adopt', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const { petTypeId, nickname } = req.body;

    if (!petTypeId) {
      res.status(400).json({ error: 'Pet type ID is required' });
      return;
    }

    // Redirect to purchase flow
    const pet = await petService.purchasePet(userId, petTypeId, nickname);
    const state = await petService.getPetState(userId);
    res.json({ pet, state });
  } catch (error) {
    console.error('Error adopting pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to adopt pet';

    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else if (message === 'PET_TYPE_NOT_FOUND') {
      res.status(404).json({ error: 'Pet type not found' });
    } else if (message === 'PET_REQUIRES_ACHIEVEMENT') {
      res.status(400).json({ error: 'This pet requires an achievement to unlock' });
    } else if (message === 'PET_ALREADY_OWNED') {
      res.status(400).json({ error: 'You already own this pet' });
    } else if (message === 'INSUFFICIENT_COINS') {
      res.status(400).json({ error: 'Not enough coins to purchase this pet' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/:petId/activate - Set a pet as active
router.post('/:petId/activate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const petId = parseInt(req.params.petId);
    if (isNaN(petId)) {
      res.status(400).json({ error: 'Invalid pet ID' });
      return;
    }

    await petService.setActivePet(userId, petId);
    const pet = await petService.getActivePet(userId);
    const state = await petService.getPetState(userId);
    res.json({ pet, state, success: true });
  } catch (error) {
    console.error('Error activating pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to activate pet';
    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// PATCH /api/pets/:petId/nickname - Update pet nickname
router.patch('/:petId/nickname', async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const { nickname } = req.body;

    if (isNaN(petId)) {
      res.status(400).json({ error: 'Invalid pet ID' });
      return;
    }

    if (!nickname || nickname.length > 50) {
      res.status(400).json({ error: 'Nickname must be 1-50 characters' });
      return;
    }

    const pet = await petService.updatePetNickname(req.userId!, petId, nickname);
    res.json(pet);
  } catch (error) {
    console.error('Error updating nickname:', error);
    const message = error instanceof Error ? error.message : 'Failed to update nickname';
    res.status(400).json({ error: message });
  }
});

// ==================== Pet Interactions ====================

// POST /api/pets/use-item - UNIFIED endpoint to use any pet item
// Automatically detects item category and performs appropriate action
// This is the RECOMMENDED endpoint - frontend doesn't need to know which specific API to call
router.post('/use-item', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const result = await petService.useItem(req.userId!, itemId);
    res.json(result);
  } catch (error) {
    console.error('Error using item:', error);
    const message = error instanceof Error ? error.message : 'Failed to use item';

    if (message === 'NO_ACTIVE_PET') {
      res.status(404).json({ error: 'No active pet found' });
    } else if (message === 'ITEM_REQUIRED') {
      res.status(400).json({ error: 'An item ID is required' });
    } else if (message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ error: 'Item not found in inventory' });
    } else if (message === 'PET_TOO_TIRED') {
      res.status(400).json({ error: 'Your pet is too tired to play right now' });
    } else if (message === 'PET_DEAD_TOO_LONG') {
      res.status(400).json({ error: 'This pet has been dead too long to revive' });
    } else if (message.startsWith('UNSUPPORTED_CATEGORY')) {
      res.status(400).json({ error: 'This item category is not supported' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/feed - Feed the active pet (requires food item)
// NOTE: Consider using /use-item instead - it auto-detects the item category
router.post('/feed', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const result = await petService.feedPet(req.userId!, itemId);
    res.json(result);
  } catch (error) {
    console.error('Error feeding pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to feed pet';

    if (message === 'NO_ACTIVE_PET') {
      res.status(404).json({ error: 'No active pet found' });
    } else if (message === 'ITEM_REQUIRED') {
      res.status(400).json({ error: 'A food item is required to feed your pet' });
    } else if (message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ error: 'Item not found in inventory' });
    } else if (message === 'WRONG_ITEM_CATEGORY') {
      res.status(400).json({ error: 'This item is not food' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/play - Play with the active pet (requires toy item)
router.post('/play', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const result = await petService.playWithPet(req.userId!, itemId);
    res.json(result);
  } catch (error) {
    console.error('Error playing with pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to play with pet';

    if (message === 'NO_ACTIVE_PET') {
      res.status(404).json({ error: 'No active pet found' });
    } else if (message === 'PET_TOO_TIRED') {
      res.status(400).json({ error: 'Your pet is too tired to play right now' });
    } else if (message === 'ITEM_REQUIRED') {
      res.status(400).json({ error: 'A toy item is required to play with your pet' });
    } else if (message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ error: 'Item not found in inventory' });
    } else if (message === 'WRONG_ITEM_CATEGORY') {
      res.status(400).json({ error: 'This item is not a toy' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/pet - Pet (show affection to) the active pet (requires heart item)
router.post('/pet', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const result = await petService.petThePet(req.userId!, itemId);
    res.json(result);
  } catch (error) {
    console.error('Error petting:', error);
    const message = error instanceof Error ? error.message : 'Failed to pet';

    if (message === 'NO_ACTIVE_PET') {
      res.status(404).json({ error: 'No active pet found' });
    } else if (message === 'ITEM_REQUIRED') {
      res.status(400).json({ error: 'A heart item is required to show affection to your pet' });
    } else if (message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ error: 'Item not found in inventory' });
    } else if (message === 'WRONG_ITEM_CATEGORY') {
      res.status(400).json({ error: 'This item is not a heart/affection item' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/heal - Heal the active pet (requires medicine item)
router.post('/heal', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const result = await petService.healPet(req.userId!, itemId);
    res.json(result);
  } catch (error) {
    console.error('Error healing pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to heal pet';

    if (message === 'NO_ACTIVE_PET') {
      res.status(404).json({ error: 'No active pet found' });
    } else if (message === 'ITEM_REQUIRED') {
      res.status(400).json({ error: 'A medicine item is required to heal your pet' });
    } else if (message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ error: 'Item not found in inventory' });
    } else if (message === 'WRONG_ITEM_CATEGORY') {
      res.status(400).json({ error: 'This item is not a medicine' });
    } else if (message === 'PET_DEAD_TOO_LONG') {
      res.status(400).json({ error: 'This pet has been dead too long to revive. Only the Resurrection Scroll can help within 12 hours.' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// ==================== Pet Bonuses ====================

// GET /api/pets/bonuses - Get active pet's bonuses
router.get('/bonuses', async (req: AuthRequest, res: Response) => {
  try {
    const bonuses = await petService.getActivePetBonuses(req.userId!);
    res.json(bonuses);
  } catch (error) {
    console.error('Error getting bonuses:', error);
    res.status(500).json({ error: 'Failed to get bonuses' });
  }
});

// ==================== Pet Items ====================

// GET /api/pets/items - Get all available pet items
router.get('/items', async (req: AuthRequest, res: Response) => {
  try {
    const items = await petService.getPetItems();
    res.json(items);
  } catch (error) {
    console.error('Error getting pet items:', error);
    res.status(500).json({ error: 'Failed to get pet items' });
  }
});

// GET /api/pets/items/inventory - Get user's pet item inventory
router.get('/items/inventory', async (req: AuthRequest, res: Response) => {
  try {
    const items = await petService.getUserPetItems(req.userId!);
    res.json(items);
  } catch (error) {
    console.error('Error getting pet item inventory:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// POST /api/pets/items/buy - Buy a pet item
router.post('/items/buy', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const { itemId, quantity = 1 } = req.body;

    if (!itemId) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const result = await petService.buyPetItem(userId, itemId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Error buying pet item:', error);
    const message = error instanceof Error ? error.message : 'Failed to buy item';

    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else if (message === 'ITEM_NOT_FOUND') {
      res.status(404).json({ error: 'Item not found' });
    } else if (message === 'INSUFFICIENT_COINS') {
      res.status(400).json({ error: 'Not enough coins' });
    } else if (message === 'OUT_OF_STOCK') {
      res.status(400).json({ error: 'Item is out of stock for this week' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// ==================== Pet Activity History ====================

// GET /api/pets/:petId/history - Get pet's activity history
router.get('/:petId/history', async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(petId)) {
      res.status(400).json({ error: 'Invalid pet ID' });
      return;
    }

    // Verify pet belongs to user
    const pet = await petService.getUserPetById(req.userId!, petId);
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const history = await petService.getPetActivityHistory(petId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting pet history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// ==================== Pet Shop & Acquisition ====================

// GET /api/pets/shop - Get pets available for purchase
router.get('/shop', async (req: AuthRequest, res: Response) => {
  try {
    const pets = await petService.getShopPets();
    const canClaimFree = await petService.canUserClaimFreePet(req.userId!);
    res.json({ pets, canClaimFree });
  } catch (error) {
    console.error('Error getting shop pets:', error);
    res.status(500).json({ error: 'Failed to get shop pets' });
  }
});

// GET /api/pets/achievement-pets - Get pets available via achievements
router.get('/achievement-pets', async (req: AuthRequest, res: Response) => {
  try {
    const pets = await petService.getAchievementPets();
    res.json(pets);
  } catch (error) {
    console.error('Error getting achievement pets:', error);
    res.status(500).json({ error: 'Failed to get achievement pets' });
  }
});

// POST /api/pets/purchase - Purchase a pet from shop
router.post('/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const { petTypeId, nickname } = req.body;

    if (!petTypeId) {
      res.status(400).json({ error: 'Pet type ID is required' });
      return;
    }

    const pet = await petService.purchasePet(req.userId!, petTypeId, nickname);
    const state = await petService.getPetState(req.userId!);
    res.json({ pet, state, success: true });
  } catch (error) {
    console.error('Error purchasing pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to purchase pet';

    if (message === 'PET_TYPE_NOT_FOUND') {
      res.status(404).json({ error: 'Pet type not found' });
    } else if (message === 'PET_REQUIRES_ACHIEVEMENT') {
      res.status(400).json({ error: 'This pet requires an achievement to unlock' });
    } else if (message === 'PET_ALREADY_OWNED') {
      res.status(400).json({ error: 'You already own this pet' });
    } else if (message === 'INSUFFICIENT_COINS') {
      res.status(400).json({ error: 'Not enough coins to purchase this pet' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/claim - Claim a pet from achievement
router.post('/claim', async (req: AuthRequest, res: Response) => {
  try {
    const { petTypeId, achievementCode, nickname } = req.body;

    if (!petTypeId || !achievementCode) {
      res.status(400).json({ error: 'Pet type ID and achievement code are required' });
      return;
    }

    const pet = await petService.claimAchievementPet(req.userId!, petTypeId, achievementCode, nickname);
    const state = await petService.getPetState(req.userId!);
    res.json({ pet, state, success: true });
  } catch (error) {
    console.error('Error claiming pet:', error);
    const message = error instanceof Error ? error.message : 'Failed to claim pet';

    if (message === 'PET_TYPE_NOT_FOUND') {
      res.status(404).json({ error: 'Pet type not found' });
    } else if (message === 'WRONG_ACHIEVEMENT') {
      res.status(400).json({ error: 'Wrong achievement for this pet' });
    } else if (message === 'ACHIEVEMENT_NOT_UNLOCKED') {
      res.status(400).json({ error: 'You have not unlocked this achievement yet' });
    } else if (message === 'PET_ALREADY_OWNED') {
      res.status(400).json({ error: 'You already own this pet' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// GET /api/pets/can-claim-free - Check if user can claim free starter pet
router.get('/can-claim-free', async (req: AuthRequest, res: Response) => {
  try {
    const canClaim = await petService.canUserClaimFreePet(req.userId!);
    res.json({ canClaimFree: canClaim });
  } catch (error) {
    console.error('Error checking free pet eligibility:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// ==================== Pet Equipment ====================

// GET /api/pets/equipment - Get all available equipment
router.get('/equipment', async (req: AuthRequest, res: Response) => {
  try {
    const slot = req.query.slot as string;
    let equipment;

    if (slot && ['head', 'body', 'accessory', 'weapon', 'back', 'feet'].includes(slot)) {
      equipment = await petService.getEquipmentBySlot(slot as any);
    } else {
      equipment = await petService.getEquipmentTypes();
    }

    res.json(equipment);
  } catch (error) {
    console.error('Error getting equipment:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// GET /api/pets/equipment/inventory - Get user's equipment inventory
router.get('/equipment/inventory', async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await petService.getUserEquipment(req.userId!);
    res.json(equipment);
  } catch (error) {
    console.error('Error getting equipment inventory:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// GET /api/pets/:petId/equipment - Get equipment equipped on a pet
router.get('/:petId/equipment', async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    if (isNaN(petId)) {
      res.status(400).json({ error: 'Invalid pet ID' });
      return;
    }

    // Verify pet belongs to user
    const pet = await petService.getUserPetById(req.userId!, petId);
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    const equipment = await petService.getPetEquipment(req.userId!, petId);
    const bonuses = await petService.getEquipmentBonuses(req.userId!, petId);
    res.json({ equipment, bonuses });
  } catch (error) {
    console.error('Error getting pet equipment:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// POST /api/pets/equipment/buy - Buy equipment
router.post('/equipment/buy', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const { equipmentTypeId } = req.body;

    if (!equipmentTypeId) {
      res.status(400).json({ error: 'Equipment type ID is required' });
      return;
    }

    const result = await petService.buyEquipment(userId, equipmentTypeId);
    res.json(result);
  } catch (error) {
    console.error('Error buying equipment:', error);
    const message = error instanceof Error ? error.message : 'Failed to buy equipment';

    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else if (message === 'EQUIPMENT_NOT_FOUND') {
      res.status(404).json({ error: 'Equipment not found' });
    } else if (message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'User not found' });
    } else if (message === 'INSUFFICIENT_COINS') {
      res.status(400).json({ error: 'Not enough coins' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/:petId/equipment/equip - Equip an item to a pet
router.post('/:petId/equipment/equip', async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.petId);
    const { userEquipmentId } = req.body;

    if (isNaN(petId)) {
      res.status(400).json({ error: 'Invalid pet ID' });
      return;
    }

    if (!userEquipmentId) {
      res.status(400).json({ error: 'Equipment ID is required' });
      return;
    }

    const result = await petService.equipItemToPet(req.userId!, petId, userEquipmentId);
    const equipment = await petService.getPetEquipment(req.userId!, petId);
    const bonuses = await petService.getEquipmentBonuses(req.userId!, petId);
    res.json({ ...result, equipment, bonuses });
  } catch (error) {
    console.error('Error equipping item:', error);
    const message = error instanceof Error ? error.message : 'Failed to equip item';

    if (message === 'PET_NOT_FOUND') {
      res.status(404).json({ error: 'Pet not found' });
    } else if (message === 'EQUIPMENT_NOT_FOUND') {
      res.status(404).json({ error: 'Equipment not found in your inventory' });
    } else if (message === 'EQUIPMENT_ALREADY_EQUIPPED') {
      res.status(400).json({ error: 'This equipment is already equipped to another pet' });
    } else if (message === 'PET_LEVEL_TOO_LOW') {
      res.status(400).json({ error: 'Pet level is too low for this equipment' });
    } else if (message === 'PET_EVOLUTION_TOO_LOW') {
      res.status(400).json({ error: 'Pet needs to evolve before using this equipment' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/equipment/:equipmentId/unequip - Unequip an item
router.post('/equipment/:equipmentId/unequip', async (req: AuthRequest, res: Response) => {
  try {
    const equipmentId = parseInt(req.params.equipmentId);

    if (isNaN(equipmentId)) {
      res.status(400).json({ error: 'Invalid equipment ID' });
      return;
    }

    const result = await petService.unequipItem(req.userId!, equipmentId);
    res.json(result);
  } catch (error) {
    console.error('Error unequipping item:', error);
    const message = error instanceof Error ? error.message : 'Failed to unequip item';

    if (message === 'EQUIPMENT_NOT_FOUND') {
      res.status(404).json({ error: 'Equipment not found' });
    } else if (message === 'EQUIPMENT_NOT_EQUIPPED') {
      res.status(400).json({ error: 'This equipment is not equipped' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// ==================== Egg System ====================

// GET /api/pets/eggs - Get available egg types
router.get('/eggs', async (req: AuthRequest, res: Response) => {
  try {
    const eggs = await petService.getEggTypes();
    res.json(eggs);
  } catch (error) {
    console.error('Error getting egg types:', error);
    res.status(500).json({ error: 'Failed to get egg types' });
  }
});

// GET /api/pets/eggs/my - Get user's unhatched eggs
router.get('/eggs/my', async (req: AuthRequest, res: Response) => {
  try {
    const eggs = await petService.getUserEggs(req.userId!);
    res.json(eggs);
  } catch (error) {
    console.error('Error getting user eggs:', error);
    res.status(500).json({ error: 'Failed to get eggs' });
  }
});

// GET /api/pets/eggs/:eggTypeId/pool - Get possible pets from an egg
router.get('/eggs/:eggTypeId/pool', async (req: AuthRequest, res: Response) => {
  try {
    const eggTypeId = parseInt(req.params.eggTypeId);
    if (isNaN(eggTypeId)) {
      res.status(400).json({ error: 'Invalid egg type ID' });
      return;
    }

    const pool = await petService.getEggHatchPool(eggTypeId);
    res.json(pool);
  } catch (error) {
    console.error('Error getting egg hatch pool:', error);
    res.status(500).json({ error: 'Failed to get hatch pool' });
  }
});

// POST /api/pets/eggs/purchase - Purchase an egg
router.post('/eggs/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const { eggTypeId } = req.body;

    if (!eggTypeId) {
      res.status(400).json({ error: 'Egg type ID is required' });
      return;
    }

    const egg = await petService.purchaseEgg(userId, eggTypeId);
    res.json({ egg, success: true });
  } catch (error) {
    console.error('Error purchasing egg:', error);
    const message = error instanceof Error ? error.message : 'Failed to purchase egg';

    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else if (message === 'EGG_TYPE_NOT_FOUND') {
      res.status(404).json({ error: 'Egg type not found' });
    } else if (message === 'EGG_REQUIRES_ACHIEVEMENT') {
      res.status(400).json({ error: 'This egg requires an achievement to unlock' });
    } else if (message === 'INSUFFICIENT_COINS') {
      res.status(400).json({ error: 'Not enough coins to purchase this egg' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// POST /api/pets/eggs/:eggId/add-xp - Add XP to egg hatching progress
router.post('/eggs/:eggId/add-xp', async (req: AuthRequest, res: Response) => {
  try {
    const eggId = parseInt(req.params.eggId);
    const { xpAmount, source } = req.body;

    if (isNaN(eggId)) {
      res.status(400).json({ error: 'Invalid egg ID' });
      return;
    }

    if (!xpAmount || xpAmount <= 0) {
      res.status(400).json({ error: 'Valid XP amount is required' });
      return;
    }

    const egg = await petService.addHatchXp(req.userId!, eggId, xpAmount, source || 'manual');
    res.json({ egg, success: true });
  } catch (error) {
    console.error('Error adding hatch XP:', error);
    const message = error instanceof Error ? error.message : 'Failed to add XP';

    if (message === 'EGG_NOT_FOUND') {
      res.status(404).json({ error: 'Egg not found' });
    } else if (message === 'NOT_AN_EGG') {
      res.status(400).json({ error: 'This is not an unhatched egg' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// GET /api/pets/eggs/:eggId/can-hatch - Check if egg can be hatched
router.get('/eggs/:eggId/can-hatch', async (req: AuthRequest, res: Response) => {
  try {
    const eggId = parseInt(req.params.eggId);

    if (isNaN(eggId)) {
      res.status(400).json({ error: 'Invalid egg ID' });
      return;
    }

    const result = await petService.canHatchEgg(req.userId!, eggId);
    res.json(result);
  } catch (error) {
    console.error('Error checking hatch status:', error);
    res.status(500).json({ error: 'Failed to check hatch status' });
  }
});

// POST /api/pets/eggs/:eggId/hatch - Hatch an egg
router.post('/eggs/:eggId/hatch', async (req: AuthRequest, res: Response) => {
  try {
    const eggId = parseInt(req.params.eggId);

    if (isNaN(eggId)) {
      res.status(400).json({ error: 'Invalid egg ID' });
      return;
    }

    const result = await petService.hatchEgg(req.userId!, eggId);
    res.json(result);
  } catch (error) {
    console.error('Error hatching egg:', error);
    const message = error instanceof Error ? error.message : 'Failed to hatch egg';

    if (message === 'EGG_NOT_FOUND') {
      res.status(404).json({ error: 'Egg not found' });
    } else if (message === 'NOT_AN_EGG') {
      res.status(400).json({ error: 'This is not an egg' });
    } else if (message === 'ALREADY_HATCHED') {
      res.status(400).json({ error: 'This egg has already hatched' });
    } else if (message === 'INSUFFICIENT_XP') {
      res.status(400).json({ error: 'Not enough XP to hatch this egg' });
    } else if (message === 'TIME_NOT_MET') {
      res.status(400).json({ error: 'Egg needs more time before hatching' });
    } else if (message === 'NO_PETS_IN_POOL') {
      res.status(500).json({ error: 'No pets available for this egg' });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

// GET /api/pets/hatched - Get user's hatched pets only
router.get('/hatched', async (req: AuthRequest, res: Response) => {
  try {
    const pets = await petService.getUserHatchedPets(req.userId!);
    res.json(pets);
  } catch (error) {
    console.error('Error getting hatched pets:', error);
    res.status(500).json({ error: 'Failed to get pets' });
  }
});

// ==================== Daily Tasks ====================

// GET /api/pets/daily-tasks - Get user's daily tasks with progress
router.get('/daily-tasks', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const tasks = await petService.getDailyTasks(userId);
    const summary = await petService.getDailyTasksSummary(userId);
    res.json({ tasks, summary });
  } catch (error) {
    console.error('Error getting daily tasks:', error);
    const message = error instanceof Error ? error.message : 'Failed to get daily tasks';
    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else {
      res.status(500).json({ error: 'Failed to get daily tasks' });
    }
  }
});

// POST /api/pets/daily-tasks/:taskId/claim - Claim reward for completed task
router.post('/daily-tasks/:taskId/claim', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const taskId = parseInt(req.params.taskId);

    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    const result = await petService.claimTaskReward(userId, taskId);

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Error claiming task reward:', error);
    const message = error instanceof Error ? error.message : 'Failed to claim reward';
    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else {
      res.status(500).json({ error: 'Failed to claim reward' });
    }
  }
});

// POST /api/pets/daily-tasks/record-activity - Record activity for task progress (internal use)
router.post('/daily-tasks/record-activity', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    const { activityType, data } = req.body;

    if (!activityType || !['review', 'exercise', 'game', 'challenge', 'social'].includes(activityType)) {
      res.status(400).json({ error: 'Invalid activity type' });
      return;
    }

    await petService.recordActivityForTasks(userId, activityType, data || {});

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording activity:', error);
    const message = error instanceof Error ? error.message : 'Failed to record activity';
    if (message === 'INVALID_USER_ID') {
      res.status(401).json({ error: 'Invalid user ID' });
    } else {
      res.status(500).json({ error: 'Failed to record activity' });
    }
  }
});

// ==================== Admin / Fix Routes ====================

// POST /api/pets/fix-levels - Fix levels for all pets (admin use)
router.post('/fix-levels', async (req: AuthRequest, res: Response) => {
  try {
    const result = await petService.fixAllPetLevels();
    res.json({
      success: true,
      message: `Fixed levels for ${result.fixed} pets`,
      ...result
    });
  } catch (error) {
    console.error('Error fixing pet levels:', error);
    res.status(500).json({ error: 'Failed to fix pet levels' });
  }
});

// POST /api/pets/:id/fix-level - Fix level for a specific pet
router.post('/:id/fix-level', async (req: AuthRequest, res: Response) => {
  try {
    const petId = parseInt(req.params.id);
    if (isNaN(petId)) {
      res.status(400).json({ error: 'Invalid pet ID' });
      return;
    }

    const result = await petService.fixPetLevel(petId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fixing pet level:', error);
    res.status(500).json({ error: 'Failed to fix pet level' });
  }
});

// ==================== Stock Management ====================

// GET /api/pets/shop/stock-status - Get stock status for all limited items
router.get('/shop/stock-status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await petService.getStockStatus();
    res.json({ items: status });
  } catch (error) {
    console.error('Error getting stock status:', error);
    res.status(500).json({ error: 'Failed to get stock status' });
  }
});

// POST /api/pets/shop/reset-stock - Reset weekly stock (admin only)
router.post('/shop/reset-stock', async (req: AuthRequest, res: Response) => {
  try {
    const result = await petService.resetWeeklyStock();
    res.json({
      success: true,
      message: `Reset stock for ${result.resetCount} items`,
      ...result
    });
  } catch (error) {
    console.error('Error resetting stock:', error);
    res.status(500).json({ error: 'Failed to reset stock' });
  }
});

export default router;
