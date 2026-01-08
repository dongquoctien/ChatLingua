import { Router, Response } from 'express';
import { shopService, ItemType, Rarity, ShopBundle } from '../services/shop.service.js';
import { petService } from '../services/pet.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Helper to validate userId is set. Returns true if valid, false if error response was sent.
 * Use at the start of any route handler that requires an authenticated user.
 */
function validateUserId(req: AuthRequest, res: Response): req is AuthRequest & { userId: number } {
  if (!req.userId) {
    res.status(401).json({ error: 'User not authenticated' });
    return false;
  }
  return true;
}

// ============================================================
// Category Endpoints
// ============================================================

/**
 * GET /api/shop/categories
 * Get all shop categories with item counts
 */
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await shopService.getCategories();
    res.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/categories/:slug
 * Get a single category by slug
 */
router.get('/categories/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const category = await shopService.getCategoryBySlug(req.params.slug);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get category';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Item Endpoints
// ============================================================

/**
 * GET /api/shop/items
 * Get shop items with filters, sorting, and pagination
 */
router.get('/items', async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      type,
      rarity,
      minPrice,
      maxPrice,
      search,
      sort,
      limit,
      offset
    } = req.query;

    // Special handling for pets-eggs category - fetch eggs from pet_types
    if (category === 'pets-eggs') {
      const eggs = await petService.getAvailableEggs();

      // Apply filters
      let filteredEggs = eggs;

      if (rarity) {
        filteredEggs = filteredEggs.filter(e => e.rarity === rarity);
      }

      if (minPrice !== undefined) {
        const min = parseInt(minPrice as string);
        filteredEggs = filteredEggs.filter(e => e.priceCoins >= min);
      }

      if (maxPrice !== undefined) {
        const max = parseInt(maxPrice as string);
        filteredEggs = filteredEggs.filter(e => e.priceCoins <= max);
      }

      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredEggs = filteredEggs.filter(e =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      const sortBy = sort as string || 'popularity';
      switch (sortBy) {
        case 'price_asc':
          filteredEggs.sort((a, b) => a.priceCoins - b.priceCoins);
          break;
        case 'price_desc':
          filteredEggs.sort((a, b) => b.priceCoins - a.priceCoins);
          break;
        case 'newest':
          // Eggs don't have created_at in response, keep original order
          break;
        case 'popularity':
        default:
          // Keep original order (sorted by rarity in getAvailableEggs)
          break;
      }

      // Apply pagination
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;
      const paginatedEggs = filteredEggs.slice(offsetNum, offsetNum + limitNum);

      // Transform eggs to match ShopItem structure
      const items = paginatedEggs.map(egg => ({
        id: egg.id,
        name: egg.name,
        slug: egg.slug,
        description: egg.description,
        categoryId: 16, // pets-eggs category ID
        categoryName: 'Pets & Eggs',
        itemType: 'pet_egg' as const,
        priceCoins: egg.priceCoins,
        priceGems: egg.priceGems,
        originalPrice: null,
        rarity: egg.rarity,
        isAvailable: true,
        isLimited: false,
        limitedQuantity: null,
        soldCount: 0,
        availableFrom: null,
        availableUntil: null,
        requiredLevel: 0,
        requiredAchievement: null,
        assetUrl: egg.imageUrl,
        previewUrl: egg.imageUrl,
        assetData: null,
        isConsumable: true,
        effectDurationMinutes: null,
        purchaseCount: 0,
        favoriteCount: 0,
        isOwned: false,
        isEquipped: false,
        ownedQuantity: 0
      }));

      res.json({ items, total: filteredEggs.length });
      return;
    }

    const result = await shopService.getItems({
      categorySlug: category as string,
      itemType: type as ItemType,
      rarity: rarity as Rarity,
      minPrice: minPrice ? parseInt(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      search: search as string,
      sortBy: sort as 'price_asc' | 'price_desc' | 'popularity' | 'newest',
      limit: Math.min(parseInt(limit as string) || 20, 100),
      offset: parseInt(offset as string) || 0,
      userId: req.userId
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get items';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/items/featured
 * Get featured/popular items
 */
router.get('/items/featured', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);
    const items = await shopService.getFeaturedItems(req.userId, limit);
    res.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get featured items';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/items/:slug
 * Get a single item by slug
 */
router.get('/items/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const item = await shopService.getItemBySlug(req.params.slug, req.userId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get item';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Purchase Endpoints
// ============================================================

/**
 * POST /api/shop/purchase
 * Purchase an item
 */
router.post('/purchase', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const { itemId, quantity = 1 } = req.body;

    if (!itemId) {
      res.status(400).json({ error: 'Item ID is required' });
      return;
    }

    const result = await shopService.purchaseItem(req.userId, itemId, quantity);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase item';

    // Map specific errors to user-friendly messages
    const errorMap: Record<string, { status: number; message: string }> = {
      'USER_CURRENCY_NOT_FOUND': { status: 400, message: 'Currency not initialized' },
      'ITEM_NOT_AVAILABLE': { status: 404, message: 'Item is not available for purchase' },
      'INSUFFICIENT_COINS': { status: 400, message: 'Insufficient coins' },
      'ITEM_SOLD_OUT': { status: 400, message: 'Item is sold out' },
      'ALREADY_OWNED': { status: 400, message: 'You already own this item' }
    };

    const errorInfo = errorMap[message] || { status: 500, message };
    res.status(errorInfo.status).json({ error: errorInfo.message });
  }
});

// ============================================================
// Inventory Endpoints
// ============================================================

/**
 * GET /api/shop/inventory
 * Get user's inventory
 */
router.get('/inventory', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const { type } = req.query;
    const inventory = await shopService.getInventory(req.userId, type as ItemType);
    res.json(inventory);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get inventory';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/inventory/:itemId/equip
 * Equip an item
 */
router.post('/inventory/:itemId/equip', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      res.status(400).json({ error: 'Invalid item ID' });
      return;
    }

    await shopService.equipItem(req.userId, itemId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to equip item';

    const errorMap: Record<string, { status: number; message: string }> = {
      'ITEM_NOT_FOUND': { status: 404, message: 'Item not found' },
      'ITEM_NOT_OWNED': { status: 400, message: 'You do not own this item' },
      'ITEM_CANNOT_BE_EQUIPPED': { status: 400, message: 'This item cannot be equipped' }
    };

    const errorInfo = errorMap[message] || { status: 500, message };
    res.status(errorInfo.status).json({ error: errorInfo.message });
  }
});

/**
 * POST /api/shop/inventory/:itemId/unequip
 * Unequip an item
 */
router.post('/inventory/:itemId/unequip', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      res.status(400).json({ error: 'Invalid item ID' });
      return;
    }

    await shopService.unequipItem(req.userId, itemId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unequip item';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/equipped
 * Get all equipped items
 */
router.get('/equipped', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const equipped = await shopService.getEquippedItems(req.userId);
    res.json(equipped);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get equipped items';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Currency Endpoints
// ============================================================

/**
 * GET /api/shop/currency
 * Get user's currency balance
 */
router.get('/currency', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const currency = await shopService.getUserCurrency(req.userId);
    res.json(currency);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get currency';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/currency/history
 * Get currency transaction history
 */
router.get('/currency/history', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const history = await shopService.getCurrencyHistory(req.userId, limit, offset);
    res.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get currency history';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Daily Deals Endpoints
// ============================================================

/**
 * GET /api/shop/daily-deals
 * Get today's daily deals
 */
router.get('/daily-deals', async (req: AuthRequest, res: Response) => {
  try {
    // Generate deals if needed
    await shopService.generateDailyDeals();

    const deals = await shopService.getDailyDeals(req.userId);
    res.json(deals);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get daily deals';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/daily-deals/:dealId/purchase
 * Purchase a daily deal at the discounted price
 */
router.post('/daily-deals/:dealId/purchase', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      res.status(400).json({ error: 'Invalid deal ID' });
      return;
    }

    const result = await shopService.purchaseDailyDeal(req.userId, dealId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase deal';

    const errorMap: Record<string, { status: number; message: string }> = {
      'USER_CURRENCY_NOT_FOUND': { status: 400, message: 'Currency not initialized' },
      'DEAL_NOT_FOUND': { status: 404, message: 'Deal not found or expired' },
      'DEAL_ALREADY_PURCHASED': { status: 400, message: 'You have already purchased this deal today' },
      'DEAL_SOLD_OUT': { status: 400, message: 'This deal is sold out' },
      'INSUFFICIENT_COINS': { status: 400, message: 'Insufficient coins' },
      'ALREADY_OWNED': { status: 400, message: 'You already own this item' },
      'LEVEL_REQUIREMENT_NOT_MET': { status: 400, message: 'You do not meet the level requirement' },
      'ACHIEVEMENT_REQUIREMENT_NOT_MET': { status: 400, message: 'You do not have the required achievement' }
    };

    const errorInfo = errorMap[message] || { status: 500, message };
    res.status(errorInfo.status).json({ error: errorInfo.message });
  }
});

// ============================================================
// Booster Endpoints
// ============================================================

/**
 * POST /api/shop/boosters/:itemId/activate
 * Activate a booster item
 */
router.post('/boosters/:itemId/activate', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      res.status(400).json({ error: 'Invalid item ID' });
      return;
    }

    const booster = await shopService.activateBooster(req.userId, itemId);
    res.json(booster);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate booster';

    const errorMap: Record<string, { status: number; message: string }> = {
      'BOOSTER_NOT_OWNED': { status: 400, message: 'You do not own this booster' },
      'BOOSTER_ALREADY_USED': { status: 400, message: 'This booster has already been used' },
      'NOT_A_BOOSTER': { status: 400, message: 'This item is not a booster' }
    };

    const errorInfo = errorMap[message] || { status: 500, message };
    res.status(errorInfo.status).json({ error: errorInfo.message });
  }
});

/**
 * GET /api/shop/boosters/active
 * Get active boosters
 */
router.get('/boosters/active', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const boosters = await shopService.getActiveBoosters(req.userId);
    res.json(boosters);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get active boosters';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Wishlist Endpoints
// ============================================================

/**
 * GET /api/shop/wishlist
 * Get user's wishlist
 */
router.get('/wishlist', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const wishlist = await shopService.getWishlist(req.userId);
    res.json(wishlist);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get wishlist';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/wishlist/:itemId
 * Add item to wishlist
 */
router.post('/wishlist/:itemId', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      res.status(400).json({ error: 'Invalid item ID' });
      return;
    }

    await shopService.addToWishlist(req.userId, itemId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add to wishlist';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/shop/wishlist/:itemId
 * Remove item from wishlist
 */
router.delete('/wishlist/:itemId', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      res.status(400).json({ error: 'Invalid item ID' });
      return;
    }

    await shopService.removeFromWishlist(req.userId, itemId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove from wishlist';
    res.status(500).json({ error: message });
  }
});

// ===== GIFT SYSTEM =====

/**
 * POST /api/shop/gift
 * Send a gift to another user
 */
router.post('/gift', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const { recipientId, itemId, message } = req.body;

    if (!recipientId || !itemId) {
      res.status(400).json({ error: 'Recipient and item are required' });
      return;
    }

    if (recipientId === req.userId) {
      res.status(400).json({ error: 'Cannot gift items to yourself' });
      return;
    }

    // Gift is sent and chat notification is handled in shopService.sendGift
    const gift = await shopService.sendGift(req.userId, recipientId, itemId, message);

    res.json(gift);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send gift';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/shop/gifts/received
 * Get received gifts
 */
router.get('/gifts/received', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const gifts = await shopService.getReceivedGifts(req.userId);
    res.json(gifts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get received gifts';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/gifts/sent
 * Get sent gifts
 */
router.get('/gifts/sent', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const gifts = await shopService.getSentGifts(req.userId);
    res.json(gifts);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sent gifts';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/gifts/:giftId/claim
 * Claim a received gift
 */
router.post('/gifts/:giftId/claim', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const giftId = parseInt(req.params.giftId);
    if (isNaN(giftId)) {
      res.status(400).json({ error: 'Invalid gift ID' });
      return;
    }

    const result = await shopService.claimGift(req.userId, giftId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to claim gift';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/shop/gifts/pending-count
 * Get count of unclaimed gifts
 */
router.get('/gifts/pending-count', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const count = await shopService.getPendingGiftCount(req.userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending gift count' });
  }
});

// ============================================================
// Bundle Endpoints
// ============================================================

/**
 * GET /api/shop/bundles
 * Get all available bundles
 */
router.get('/bundles', async (req: AuthRequest, res: Response) => {
  try {
    const bundles = await shopService.getBundles(req.userId);
    res.json(bundles);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get bundles';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/bundles/:slug
 * Get a single bundle by slug
 */
router.get('/bundles/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const bundle = await shopService.getBundleBySlug(req.params.slug, req.userId);
    if (!bundle) {
      res.status(404).json({ error: 'Bundle not found' });
      return;
    }
    res.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get bundle';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/bundles/:bundleId/purchase
 * Purchase a bundle
 */
router.post('/bundles/:bundleId/purchase', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const bundleId = parseInt(req.params.bundleId);
    if (isNaN(bundleId)) {
      res.status(400).json({ error: 'Invalid bundle ID' });
      return;
    }

    const result = await shopService.purchaseBundle(req.userId, bundleId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase bundle';

    const errorMap: Record<string, { status: number; message: string }> = {
      'USER_CURRENCY_NOT_FOUND': { status: 400, message: 'Currency not initialized' },
      'BUNDLE_NOT_AVAILABLE': { status: 404, message: 'Bundle is not available' },
      'INSUFFICIENT_COINS': { status: 400, message: 'Insufficient coins' },
      'BUNDLE_SOLD_OUT': { status: 400, message: 'Bundle is sold out' }
    };

    const errorInfo = errorMap[message] || { status: 500, message };
    res.status(errorInfo.status).json({ error: errorInfo.message });
  }
});

// ============================================================
// Egg & Pet Endpoints (redirects to pet service)
// ============================================================
// NOTE: Egg/pet purchases should use the pet service for proper
// HP initialization, care tracking, and transaction logging.
// These endpoints provide backwards compatibility.

/**
 * GET /api/shop/eggs
 * Get all available egg types for purchase
 * @deprecated Use petService.getAvailableEggs() for full details
 */
router.get('/eggs', async (req: AuthRequest, res: Response) => {
  try {
    // Use petService for eggs to get full data including possible pets
    const eggs = await petService.getAvailableEggs();
    res.json(eggs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get egg types';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/eggs/:slug
 * Get a single egg type by slug
 * @deprecated Use petService for full details
 */
router.get('/eggs/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const egg = await petService.getEggTypeBySlug(req.params.slug);
    if (!egg) {
      res.status(404).json({ error: 'Egg type not found' });
      return;
    }
    res.json(egg);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get egg type';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/eggs/:eggTypeId/purchase
 * Purchase an egg - uses petService for proper handling
 */
router.post('/eggs/:eggTypeId/purchase', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const eggTypeId = parseInt(req.params.eggTypeId);
    if (isNaN(eggTypeId)) {
      res.status(400).json({ error: 'Invalid egg type ID' });
      return;
    }

    // Use petService for egg purchase (handles HP init, care tracking, etc.)
    const egg = await petService.purchaseEgg(req.userId, eggTypeId);
    const currency = await petService.getUserCurrency(req.userId);

    res.json({
      success: true,
      egg: {
        id: egg.id,
        userId: egg.userId,
        petTypeId: egg.petTypeId,
        nickname: egg.nickname,
        isHatched: egg.isHatched,
        hatchXpProgress: egg.hatchXpProgress,
        hatchStartedAt: egg.hatchStartedAt
      },
      newBalance: currency.coins,
      message: `You purchased an egg! Start earning XP to hatch it.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase egg';

    const errorMap: Record<string, { status: number; message: string }> = {
      'CURRENCY_NOT_FOUND': { status: 400, message: 'Currency not initialized' },
      'EGG_TYPE_NOT_FOUND': { status: 404, message: 'Egg type not found' },
      'INSUFFICIENT_COINS': { status: 400, message: 'Insufficient coins' }
    };

    const errorInfo = errorMap[message] || { status: 500, message };
    res.status(errorInfo.status).json({ error: errorInfo.message });
  }
});

// ============================================================
// Pet Care Items Endpoints
// ============================================================

/**
 * GET /api/shop/pet-care
 * Get all pet care items (food, toys, hearts, medicine)
 * Grouped by category with user inventory counts
 */
router.get('/pet-care', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const { category } = req.query;
    const items = await petService.getPetItems(category as string);
    const inventory = await petService.getUserPetItems(req.userId);

    // Group items by category
    const grouped: Record<string, any[]> = {
      food: [],
      toy: [],
      heart: [],
      medicine: [],
      special: []
    };

    // Create inventory lookup map
    const inventoryMap = new Map<number, number>();
    inventory.forEach(inv => {
      inventoryMap.set(inv.petItemId, inv.quantity);
    });

    // Add items to groups with owned quantity
    items.forEach(item => {
      const cat = item.itemCategory;
      if (grouped[cat]) {
        grouped[cat].push({
          ...item,
          ownedQuantity: inventoryMap.get(item.id) || 0
        });
      }
    });

    // Sort each category by rarity then price
    const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => {
        const rarityDiff = rarityOrder[a.rarity as keyof typeof rarityOrder] - rarityOrder[b.rarity as keyof typeof rarityOrder];
        if (rarityDiff !== 0) return rarityDiff;
        return a.priceCoins - b.priceCoins;
      });
    });

    res.json({
      items: grouped,
      inventory: inventory.map(inv => ({
        itemId: inv.petItemId,
        name: inv.name,
        category: inv.itemCategory,
        quantity: inv.quantity,
        iconUrl: inv.iconUrl
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get pet care items';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/shop/pet-equipment
 * Get all pet equipment items grouped by slot
 */
router.get('/pet-equipment', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const { slot } = req.query;
    // Get equipment types (optionally filtered by slot)
    const equipment = slot
      ? await petService.getEquipmentBySlot(slot as any)
      : await petService.getEquipmentTypes();
    const userEquipment = await petService.getUserEquipment(req.userId);

    // Group equipment by slot
    const grouped: Record<string, any[]> = {
      head: [],
      body: [],
      accessory: [],
      weapon: [],
      back: [],
      feet: []
    };

    // Create owned equipment lookup
    const ownedMap = new Map<number, { quantity: number; equippedPetId: number | null }>();
    userEquipment.forEach(eq => {
      const typeId = eq.equipmentType?.id || eq.equipmentTypeId;
      if (typeId) {
        const existing = ownedMap.get(typeId);
        if (existing) {
          existing.quantity++;
        } else {
          ownedMap.set(typeId, { quantity: 1, equippedPetId: eq.equippedPetId });
        }
      }
    });

    // Add equipment to groups
    equipment.forEach(eq => {
      const slotKey = eq.equipmentSlot;
      if (grouped[slotKey]) {
        const owned = ownedMap.get(eq.id);
        grouped[slotKey].push({
          ...eq,
          owned: owned?.quantity || 0,
          equipped: owned?.equippedPetId !== null && owned?.equippedPetId !== undefined
        });
      }
    });

    // Sort each slot by rarity then price
    const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    Object.keys(grouped).forEach(slotKey => {
      grouped[slotKey].sort((a, b) => {
        const rarityDiff = rarityOrder[a.rarity as keyof typeof rarityOrder] - rarityOrder[b.rarity as keyof typeof rarityOrder];
        if (rarityDiff !== 0) return rarityDiff;
        return a.priceCoins - b.priceCoins;
      });
    });

    res.json({
      equipment: grouped,
      userEquipment: userEquipment.map(eq => ({
        id: eq.id,
        equipmentTypeId: eq.equipmentType?.id || eq.equipmentTypeId,
        name: eq.equipmentType?.name,
        slot: eq.equipmentType?.equipmentSlot || eq.equippedSlot,
        equippedPetId: eq.equippedPetId,
        previewUrl: eq.equipmentType?.previewUrl
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get pet equipment';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/pet-equipment/:equipmentTypeId/purchase
 * Purchase pet equipment
 */
router.post('/pet-equipment/:equipmentTypeId/purchase', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const equipmentTypeId = parseInt(req.params.equipmentTypeId);
    if (isNaN(equipmentTypeId)) {
      res.status(400).json({ error: 'Invalid equipment type ID' });
      return;
    }

    const result = await petService.buyEquipment(req.userId, equipmentTypeId);
    const currency = await petService.getUserCurrency(req.userId);

    res.json({
      success: true,
      equipment: result.equipment,
      message: result.message,
      currency
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase equipment';
    if (message === 'INSUFFICIENT_COINS') {
      res.status(400).json({ error: 'Not enough coins' });
    } else if (message === 'EQUIPMENT_NOT_FOUND') {
      res.status(404).json({ error: 'Equipment not found' });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * GET /api/shop/pets
 * Get all available pets for direct purchase
 */
router.get('/pets', async (req: AuthRequest, res: Response) => {
  try {
    const pets = await petService.getAvailablePets();
    res.json(pets);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get pet types';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/shop/pets/:petTypeId/purchase
 * Purchase a pet directly (bypasses egg hatching)
 */
router.post('/pets/:petTypeId/purchase', async (req: AuthRequest, res: Response) => {
  if (!validateUserId(req, res)) return;

  try {
    const petTypeId = parseInt(req.params.petTypeId);
    if (isNaN(petTypeId)) {
      res.status(400).json({ error: 'Invalid pet type ID' });
      return;
    }

    const { nickname } = req.body;

    // Use petService for pet purchase
    const pet = await petService.purchasePet(req.userId, petTypeId, nickname);
    const currency = await petService.getUserCurrency(req.userId);

    res.json({
      success: true,
      pet,
      newBalance: currency.coins,
      message: `You purchased a new pet! Take good care of it.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase pet';

    const errorMap: Record<string, { status: number; message: string }> = {
      'CURRENCY_NOT_FOUND': { status: 400, message: 'Currency not initialized' },
      'PET_TYPE_NOT_FOUND': { status: 404, message: 'Pet type not found' },
      'INSUFFICIENT_COINS': { status: 400, message: 'Insufficient coins' }
    };

    const errorInfo = errorMap[message] || { status: 500, message };
    res.status(errorInfo.status).json({ error: errorInfo.message });
  }
});

export default router;
