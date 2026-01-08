import { Component, OnInit, signal, inject, AfterViewInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ShopService, Gift } from '../shop.service';

type GiftTab = 'received' | 'sent';

// Interface for claimed gift result popup
interface ClaimedGiftResult {
  gift: Gift;
  message: string;
}

@Component({
  selector: 'app-shop-gifts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shop-gifts.component.html',
  styleUrl: './shop-gifts.component.scss'
})
export class ShopGiftsComponent implements OnInit, AfterViewInit {
  private shopService = inject(ShopService);
  private route = inject(ActivatedRoute);

  // State
  loading = signal(true);
  claiming = signal<number | null>(null);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  claimedGiftResult = signal<ClaimedGiftResult | null>(null);

  activeTab = signal<GiftTab>('received');
  receivedGifts = signal<Gift[]>([]);
  sentGifts = signal<Gift[]>([]);

  // Highlighted gift from URL query param
  highlightedGiftId = signal<number | null>(null);

  @ViewChildren('giftCard') giftCards!: QueryList<ElementRef>;

  ngOnInit(): void {
    // Check for giftId query param
    this.route.queryParams.subscribe(params => {
      if (params['giftId']) {
        this.highlightedGiftId.set(Number(params['giftId']));
      }
    });
    this.loadGifts();
  }

  ngAfterViewInit(): void {
    // Watch for gift cards to scroll to highlighted one
    this.giftCards.changes.subscribe(() => {
      this.scrollToHighlightedGift();
    });
  }

  private scrollToHighlightedGift(): void {
    const giftId = this.highlightedGiftId();
    if (!giftId) return;

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById(`gift-${giftId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  loadGifts(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load both received and sent gifts
    Promise.all([
      new Promise<Gift[]>((resolve, reject) => {
        this.shopService.getReceivedGifts().subscribe({ next: resolve, error: reject });
      }),
      new Promise<Gift[]>((resolve, reject) => {
        this.shopService.getSentGifts().subscribe({ next: resolve, error: reject });
      })
    ]).then(([received, sent]) => {
      this.receivedGifts.set(received);
      this.sentGifts.set(sent);
      this.loading.set(false);
      // Scroll to highlighted gift after loading
      this.scrollToHighlightedGift();
    }).catch(err => {
      console.error('Error loading gifts:', err);
      this.error.set('Failed to load gifts');
      this.loading.set(false);
    });
  }

  setActiveTab(tab: GiftTab): void {
    this.activeTab.set(tab);
  }

  claimGift(gift: Gift): void {
    if (this.claiming()) return;

    this.claiming.set(gift.id);
    this.error.set(null);
    this.success.set(null);

    this.shopService.claimGift(gift.id).subscribe({
      next: () => {
        // Show success popup instead of simple message
        this.claimedGiftResult.set({
          gift: gift,
          message: `You received ${gift.itemName} from ${gift.senderName}!`
        });
        this.claiming.set(null);
        this.loadGifts(); // Refresh
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to claim gift');
        this.claiming.set(null);
      }
    });
  }

  closeClaimedGiftPopup(): void {
    this.claimedGiftResult.set(null);
  }

  getStatusColor(status: Gift['status']): string {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'claimed': return 'text-green-600 bg-green-50';
      case 'expired': return 'text-gray-500 bg-gray-100';
      case 'returned': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusLabel(status: Gift['status']): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'claimed': return 'Claimed';
      case 'expired': return 'Expired';
      case 'returned': return 'Returned';
      default: return status;
    }
  }

  getRarityColor(rarity?: string): string {
    return this.shopService.getRarityColor((rarity || 'common') as any);
  }

  getRarityBgColor(rarity?: string): string {
    return this.shopService.getRarityBgColor((rarity || 'common') as any);
  }

  // New helper methods for consistent styling
  getItemTypeEmoji(type?: string): string {
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
    return emojis[type || ''] || '🎁';
  }

  getRarityGradient(rarity?: string): string {
    const gradients: Record<string, string> = {
      'common': 'from-gray-100 to-gray-200',
      'uncommon': 'from-green-100 to-emerald-200',
      'rare': 'from-blue-100 to-cyan-200',
      'heroic': 'from-red-100 to-rose-200',
      'mythic': 'from-orange-100 to-amber-200',
      'epic': 'from-purple-100 to-fuchsia-200',
      'legendary': 'from-amber-100 via-yellow-200 to-orange-200'
    };
    return gradients[rarity || ''] || 'from-gray-100 to-gray-200';
  }

  getRarityGlow(rarity?: string): string {
    const glows: Record<string, string> = {
      'common': '',
      'uncommon': 'shadow-green-200',
      'rare': 'shadow-blue-300',
      'heroic': 'shadow-red-300',
      'mythic': 'shadow-orange-300',
      'epic': 'shadow-purple-300',
      'legendary': 'shadow-yellow-400 shadow-lg'
    };
    return glows[rarity || ''] || '';
  }

  getRarityEmoji(rarity?: string): string {
    const emojis: Record<string, string> = {
      'common': '⚪',
      'uncommon': '🌿',
      'rare': '💠',
      'heroic': '🔴',
      'mythic': '🟠',
      'epic': '💎',
      'legendary': '👑'
    };
    return emojis[rarity || ''] || '⚪';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  get pendingCount(): number {
    return this.receivedGifts().filter(g => g.status === 'pending').length;
  }

  isHighlighted(giftId: number): boolean {
    return this.highlightedGiftId() === giftId;
  }

  clearHighlight(): void {
    this.highlightedGiftId.set(null);
  }
}
