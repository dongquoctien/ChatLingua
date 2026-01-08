import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ShopService, ShopItem } from '../shop.service';

@Component({
  selector: 'app-shop-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-wishlist.component.html',
  styleUrl: './shop-wishlist.component.scss'
})
export class ShopWishlistComponent implements OnInit {
  private shopService = inject(ShopService);

  // State
  loading = signal(true);
  removing = signal<number | null>(null);
  error = signal<string | null>(null);
  wishlistItems = signal<ShopItem[]>([]);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.loading.set(true);
    this.error.set(null);

    this.shopService.getWishlist().subscribe({
      next: (items) => {
        this.wishlistItems.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading wishlist:', err);
        this.error.set('Failed to load wishlist');
        this.loading.set(false);
      }
    });
  }

  removeFromWishlist(item: ShopItem): void {
    if (this.removing()) return;

    this.removing.set(item.id);
    this.shopService.removeFromWishlist(item.id).subscribe({
      next: () => {
        // Remove from list locally
        this.wishlistItems.update(items => items.filter(i => i.id !== item.id));
        this.removing.set(null);
      },
      error: (err) => {
        console.error('Error removing from wishlist:', err);
        this.error.set('Failed to remove item');
        this.removing.set(null);
      }
    });
  }

  getRarityColor(rarity: string): string {
    return this.shopService.getRarityColor(rarity as any);
  }

  getRarityBgColor(rarity: string): string {
    return this.shopService.getRarityBgColor(rarity as any);
  }

  getItemTypeIcon(itemType: string): string {
    return this.shopService.getItemTypeIcon(itemType as any);
  }

  formatPrice(price: number | null): string {
    if (!price) return 'Free';
    return price.toLocaleString();
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
      'heroic': 'from-red-100 to-rose-200',
      'mythic': 'from-orange-100 to-amber-200',
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
      'heroic': 'shadow-red-300',
      'mythic': 'shadow-orange-300',
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
      'heroic': '🔴',
      'mythic': '🟠',
      'epic': '💎',
      'legendary': '👑'
    };
    return emojis[rarity] || '⚪';
  }
}
