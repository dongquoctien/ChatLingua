import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
export class ShopInventoryComponent implements OnInit {
  private shopService = inject(ShopService);

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
    { value: 'title', label: 'Titles' },
    { value: 'pet', label: 'Pets' }
  ];

  filteredInventory = computed(() => {
    const items = this.inventory();
    const type = this.selectedType();
    if (!type) return items;
    return items.filter(i => i.item.itemType === type);
  });

  ngOnInit(): void {
    this.loadData();
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
      'title': '👑',
      'pet': '🐾'
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
}
