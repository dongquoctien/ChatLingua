import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { GiftPayload } from '../../chat.types';
import { ShopService, Gift } from '../../../shop/shop.service';

// Interface for claimed gift result popup
interface ClaimedGiftResult {
  itemName: string;
  itemRarity: string;
  itemPreviewUrl: string | null;
  itemType: string;
  message: string;
}

@Component({
  selector: 'app-gift-message-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gift-message-card.component.html',
  styleUrls: ['./gift-message-card.component.scss'],
})
export class GiftMessageCardComponent {
  private shopService = inject(ShopService);

  readonly data = input.required<GiftPayload>();
  readonly isOwn = input(false);
  readonly senderName = input<string>('');

  readonly giftClaimed = output<number>();

  // State
  claiming = signal(false);
  error = signal<string | null>(null);
  claimedGiftResult = signal<ClaimedGiftResult | null>(null);
  localClaimed = signal(false); // Track if claimed in this session

  // Computed status from data (considers local claimed state)
  readonly giftStatus = computed(() => this.localClaimed() ? 'claimed' : this.data().status);
  readonly isPending = computed(() => this.giftStatus() === 'pending');
  readonly isClaimed = computed(() => this.giftStatus() === 'claimed');
  readonly isExpired = computed(() => this.giftStatus() === 'expired');

  claimGift(): void {
    if (this.claiming() || !this.isPending()) return;

    const payload = this.data();
    this.claiming.set(true);
    this.error.set(null);

    this.shopService.claimGift(payload.giftId).subscribe({
      next: () => {
        // Show success popup
        this.claimedGiftResult.set({
          itemName: payload.itemName,
          itemRarity: payload.itemRarity,
          itemPreviewUrl: payload.itemPreviewUrl,
          itemType: payload.itemType,
          message: `You received ${payload.itemName}!`
        });
        this.claiming.set(false);
        this.localClaimed.set(true); // Mark as claimed locally to hide button
        this.giftClaimed.emit(payload.giftId);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to claim gift');
        this.claiming.set(false);
      }
    });
  }

  closeClaimedGiftPopup(): void {
    this.claimedGiftResult.set(null);
  }

  // Rarity styling helpers
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

  getRarityBorder(rarity: string): string {
    const borders: Record<string, string> = {
      'common': 'border-gray-300',
      'uncommon': 'border-green-300',
      'rare': 'border-blue-300',
      'heroic': 'border-red-300',
      'mythic': 'border-orange-300',
      'epic': 'border-purple-300',
      'legendary': 'border-yellow-400'
    };
    return borders[rarity] || 'border-gray-300';
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

  getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      'common': 'text-gray-600',
      'uncommon': 'text-green-600',
      'rare': 'text-blue-600',
      'heroic': 'text-red-600',
      'mythic': 'text-orange-600',
      'epic': 'text-purple-600',
      'legendary': 'text-yellow-600'
    };
    return colors[rarity] || 'text-gray-600';
  }

  getItemTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      'avatar_frame': '🖼️',
      'avatar_effect': '✨',
      'avatar_badge': '🏅',
      'profile_theme': '🎨',
      'profile_banner': '🏞️',
      'name_effect': '💫',
      'chat_bubble': '💬',
      'chat_effect': '💬',
      'emoji_pack': '😎',
      'sticker_pack': '🎭',
      'game_theme': '🎮',
      'card_back': '🃏',
      'sound_pack': '🔊',
      'booster': '⚡',
      'title': '👑'
    };
    return emojis[type] || '🎁';
  }

  getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'claimed': return 'text-green-600 bg-green-50';
      case 'expired': return 'text-gray-500 bg-gray-100';
      case 'returned': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'claimed': return 'Claimed';
      case 'expired': return 'Expired';
      case 'returned': return 'Returned';
      default: return status;
    }
  }
}
