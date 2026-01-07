import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ShopService, InventoryItem, EquippedItems, ItemType, ActiveBooster } from '../shop.service';

@Component({
  selector: 'app-shop-inventory',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-inventory.component.html',
  styleUrls: ['./shop-inventory.component.scss']
})
export class ShopInventoryComponent implements OnInit, OnDestroy {
  private shopService = inject(ShopService);
  private boosterRefreshInterval: any;

  inventory = signal<InventoryItem[]>([]);
  equippedItems = signal<EquippedItems | null>(null);
  activeBoosters = signal<ActiveBooster[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  selectedType = signal<ItemType | ''>('');

  itemTypes: { value: ItemType | ''; label: string }[] = [
    { value: '', label: 'All Items' },
    { value: 'avatar_frame', label: 'Avatar Frames' },
    { value: 'avatar_effect', label: 'Avatar Effects' },
    { value: 'avatar_badge', label: 'Avatar Badges' },
    { value: 'profile_theme', label: 'Profile Themes' },
    { value: 'profile_banner', label: 'Profile Banners' },
    { value: 'name_effect', label: 'Name Effects' },
    { value: 'chat_bubble', label: 'Chat Bubbles' },
    { value: 'game_theme', label: 'Game Themes' },
    { value: 'card_back', label: 'Card Backs' },
    { value: 'booster', label: 'Boosters' },
    { value: 'title', label: 'Titles' }
  ];

  filteredInventory = computed(() => {
    const items = this.inventory();
    const type = this.selectedType();
    if (!type) return items;
    return items.filter(i => i.item.itemType === type);
  });

  ngOnInit(): void {
    this.loadData();
    this.startBoosterRefresh();
  }

  ngOnDestroy(): void {
    if (this.boosterRefreshInterval) {
      clearInterval(this.boosterRefreshInterval);
    }
  }

  private startBoosterRefresh(): void {
    // Refresh boosters every 30 seconds to update remaining time and hide expired ones
    this.boosterRefreshInterval = setInterval(() => {
      const boosters = this.activeBoosters();
      if (boosters.length > 0) {
        // Update remaining minutes for each booster locally
        const now = new Date();
        const updated = boosters
          .map(b => {
            const expiresAt = new Date(b.expiresAt);
            const remainingMs = expiresAt.getTime() - now.getTime();
            const remainingMinutes = Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
            return { ...b, remainingMinutes };
          })
          .filter(b => b.remainingMinutes > 0); // Remove expired boosters

        this.activeBoosters.set(updated);

        // If any boosters expired, refresh the full list from server
        if (updated.length < boosters.length) {
          this.shopService.getActiveBoosters().subscribe({
            next: (serverBoosters) => this.activeBoosters.set(serverBoosters),
            error: () => {} // Ignore refresh errors
          });
        }
      }
    }, 30000); // Every 30 seconds
  }

  private loadData(): void {
    this.loading.set(true);

    this.shopService.getInventory().subscribe({
      next: (inv) => {
        this.inventory.set(inv);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load inventory', err);
        this.loading.set(false);
      }
    });

    this.shopService.getEquippedItems().subscribe({
      next: (eq) => this.equippedItems.set(eq),
      error: (err) => console.error('Failed to load equipped items', err)
    });

    this.shopService.getActiveBoosters().subscribe({
      next: (boosters) => this.activeBoosters.set(boosters),
      error: (err) => console.error('Failed to load boosters', err)
    });
  }

  equipItem(item: InventoryItem): void {
    this.shopService.equipItem(item.itemId).subscribe({
      next: () => {
        // Update local state
        const updated = this.inventory().map(i => ({
          ...i,
          isEquipped: i.itemId === item.itemId ? true :
            (i.item.itemType === item.item.itemType ? false : i.isEquipped)
        }));
        this.inventory.set(updated);
        this.success.set(`${item.item.name} equipped!`);
        this.loadData(); // Refresh equipped items
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to equip item');
      }
    });
  }

  unequipItem(item: InventoryItem): void {
    this.shopService.unequipItem(item.itemId).subscribe({
      next: () => {
        const updated = this.inventory().map(i => ({
          ...i,
          isEquipped: i.itemId === item.itemId ? false : i.isEquipped
        }));
        this.inventory.set(updated);
        this.success.set(`${item.item.name} unequipped!`);
        this.loadData();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to unequip item');
      }
    });
  }

  activateBooster(item: InventoryItem): void {
    console.log('Activating booster', item);
    this.shopService.activateBooster(item.itemId).subscribe({
      next: (booster) => {
        this.success.set(`${item.item.name} activated! Effect lasts for ${booster.remainingMinutes} minutes.`);
        this.loadData();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to activate booster');
      }
    });
  }

  getRarityColor(rarity: string): string {
    return this.shopService.getRarityColor(rarity as any);
  }

  getRarityBgColor(rarity: string): string {
    return this.shopService.getRarityBgColor(rarity as any);
  }

  getItemTypeIcon(type: string): string {
    return this.shopService.getItemTypeIcon(type as any);
  }

  getItemTypeName(type: string): string {
    return this.shopService.getItemTypeName(type as any);
  }

  // New helper methods for consistent styling
  getItemTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      'avatar_frame': '🖼️',
      'avatar_effect': '✨',
      'avatar_badge': '🏅',
      'profile_theme': '🎨',
      'profile_banner': '🏞️',
      'name_effect': '💫',
      'chat_bubble': '💬',
      'emoji_pack': '😎',
      'sticker_pack': '🎭',
      'game_theme': '🎮',
      'card_back': '🃏',
      'sound_pack': '🔊',
      'booster': '⚡',
      'title': '👑'
    };
    return emojis[type] || '📦';
  }

  getRarityGradient(rarity: string): string {
    const gradients: Record<string, string> = {
      'common': 'from-gray-100 to-gray-200',
      'uncommon': 'from-green-100 to-emerald-200',
      'rare': 'from-blue-100 to-cyan-200',
      'epic': 'from-purple-100 to-fuchsia-200',
      'legendary': 'from-amber-100 via-yellow-200 to-orange-200'
    };
    return gradients[rarity] || 'from-gray-100 to-gray-200';
  }

  getRarityGlow(rarity: string): string {
    const glows: Record<string, string> = {
      'common': '',
      'uncommon': 'shadow-green-200',
      'rare': 'shadow-blue-300',
      'epic': 'shadow-purple-300',
      'legendary': 'shadow-yellow-400 shadow-lg'
    };
    return glows[rarity] || '';
  }

  getRarityEmoji(rarity: string): string {
    const emojis: Record<string, string> = {
      'common': '⚪',
      'uncommon': '🌿',
      'rare': '💠',
      'epic': '💎',
      'legendary': '👑'
    };
    return emojis[rarity] || '⚪';
  }

  formatRemainingTime(minutes: number): string {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  getBoosterEffectEmoji(effectType: string): string {
    const emojis: Record<string, string> = {
      'xp': '⭐',
      'coins': '🪙',
      'streak_freeze': '❄️'
    };
    return emojis[effectType] || '⚡';
  }
}
