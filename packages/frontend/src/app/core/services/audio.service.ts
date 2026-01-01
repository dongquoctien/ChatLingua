import { Injectable, signal, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ProceduralAudioService } from './procedural-audio.service';

export type SoundEffect =
  | 'click'
  | 'countdown'
  | 'game-start'
  | 'correct'
  | 'wrong'
  | 'card-flip'
  | 'card-draw'
  | 'match'
  | 'victory'
  | 'game-over'
  | 'level-up'
  | 'coin'
  | 'achievement'
  | 'timer-tick'
  | 'timer-warning'
  | 'combo'
  | 'streak'
  | 'close'
  | 'open'
  | 'hover'
  | 'select'
  | 'deselect'
  | 'type'
  | 'whoosh'
  | 'pop'
  | 'ding';

interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

const STORAGE_KEY = 'chatlingua_audio_settings';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  // Signals for reactive UI
  musicEnabled = signal(true);
  sfxEnabled = signal(true);
  musicVolume = signal(0.3);
  sfxVolume = signal(0.5);
  isMusicPlaying = signal(false);

  // Audio elements
  private musicPlayer: HTMLAudioElement | null = null;
  private currentMusicTrack = 0;

  // Music tracks (optional - will gracefully fail if not present)
  private musicTracks: string[] = [
    'assets/audio/music/game-loop-1.mp3',
    'assets/audio/music/game-loop-2.mp3'
  ];

  private routerSubscription: Subscription | null = null;

  constructor(
    private proceduralAudio: ProceduralAudioService,
    private router: Router
  ) {
    this.loadSettings();
    this.initMusicPlayer();
    this.setupRouteWatcher();
  }

  private setupRouteWatcher(): void {
    // Watch for route changes and stop music when leaving games routes
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const isGamesRoute = event.urlAfterRedirects.startsWith('/games');
      if (!isGamesRoute && this.isMusicPlaying()) {
        this.stopMusic();
      }
    });
  }

  // ============ Settings Management ============

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings: AudioSettings = JSON.parse(stored);
        this.musicEnabled.set(settings.musicEnabled);
        this.sfxEnabled.set(settings.sfxEnabled);
        this.musicVolume.set(settings.musicVolume);
        this.sfxVolume.set(settings.sfxVolume);
        // Update procedural audio volume
        this.proceduralAudio.setMasterVolume(settings.sfxVolume);
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }
  }

  private saveSettings(): void {
    const settings: AudioSettings = {
      musicEnabled: this.musicEnabled(),
      sfxEnabled: this.sfxEnabled(),
      musicVolume: this.musicVolume(),
      sfxVolume: this.sfxVolume()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save audio settings:', e);
    }
  }

  // ============ Music Control ============

  private initMusicPlayer(): void {
    if (typeof window === 'undefined') return;

    this.musicPlayer = new Audio();
    this.musicPlayer.loop = false;
    this.musicPlayer.volume = this.musicVolume();

    // Auto-play next track when current ends
    this.musicPlayer.addEventListener('ended', () => {
      this.playNextTrack();
    });

    // Handle errors gracefully (e.g., file not found)
    this.musicPlayer.addEventListener('error', () => {
      // Silently handle - music files are optional
      this.isMusicPlaying.set(false);
    });
  }

  toggleMusic(): void {
    const newState = !this.musicEnabled();
    this.musicEnabled.set(newState);
    this.saveSettings();

    if (newState) {
      this.playMusic();
    } else {
      this.stopMusic();
    }
  }

  playMusic(): void {
    if (!this.musicPlayer || !this.musicEnabled()) return;

    this.musicPlayer.src = this.musicTracks[this.currentMusicTrack];
    this.musicPlayer.volume = this.musicVolume();

    this.musicPlayer.play()
      .then(() => {
        this.isMusicPlaying.set(true);
      })
      .catch(() => {
        // Auto-play was prevented or file not found - silently handle
        this.isMusicPlaying.set(false);
      });
  }

  stopMusic(): void {
    if (!this.musicPlayer) return;

    this.musicPlayer.pause();
    this.musicPlayer.currentTime = 0;
    this.isMusicPlaying.set(false);
  }

  pauseMusic(): void {
    if (!this.musicPlayer) return;
    this.musicPlayer.pause();
    this.isMusicPlaying.set(false);
  }

  resumeMusic(): void {
    if (!this.musicPlayer || !this.musicEnabled()) return;

    this.musicPlayer.play()
      .then(() => this.isMusicPlaying.set(true))
      .catch(() => this.isMusicPlaying.set(false));
  }

  private playNextTrack(): void {
    this.currentMusicTrack = (this.currentMusicTrack + 1) % this.musicTracks.length;
    this.playMusic();
  }

  setMusicVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.musicVolume.set(clampedVolume);
    if (this.musicPlayer) {
      this.musicPlayer.volume = clampedVolume;
    }
    this.saveSettings();
  }

  // ============ Sound Effects (Procedural) ============

  toggleSfx(): void {
    const newState = !this.sfxEnabled();
    this.sfxEnabled.set(newState);
    this.saveSettings();
  }

  setSfxVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.sfxVolume.set(clampedVolume);
    this.proceduralAudio.setMasterVolume(clampedVolume);
    this.saveSettings();
  }

  /**
   * Play a sound effect using procedural audio (Web Audio API)
   * No external files needed!
   */
  playSound(effect: SoundEffect, options?: { volume?: number; playbackRate?: number }): void {
    if (!this.sfxEnabled()) return;

    // Apply volume option
    if (options?.volume !== undefined) {
      const currentVolume = this.sfxVolume();
      this.proceduralAudio.setMasterVolume(options.volume * currentVolume);
    }

    // Map effect to procedural audio method
    switch (effect) {
      case 'click':
        this.proceduralAudio.playClick();
        break;
      case 'countdown':
        this.proceduralAudio.playCountdownBeep();
        break;
      case 'game-start':
        this.proceduralAudio.playGameStart();
        break;
      case 'correct':
        this.proceduralAudio.playCorrect();
        break;
      case 'wrong':
        this.proceduralAudio.playWrong();
        break;
      case 'card-flip':
        this.proceduralAudio.playCardFlip();
        break;
      case 'card-draw':
        this.proceduralAudio.playCardDraw();
        break;
      case 'match':
        this.proceduralAudio.playMatch();
        break;
      case 'victory':
        this.proceduralAudio.playVictory();
        break;
      case 'game-over':
        this.proceduralAudio.playGameOver();
        break;
      case 'level-up':
        this.proceduralAudio.playLevelUp();
        break;
      case 'coin':
        this.proceduralAudio.playCoin();
        break;
      case 'achievement':
        this.proceduralAudio.playAchievement();
        break;
      case 'timer-tick':
        this.proceduralAudio.playTimerTick();
        break;
      case 'timer-warning':
        this.proceduralAudio.playTimerWarning();
        break;
      case 'combo':
        this.proceduralAudio.playCombo(1);
        break;
      case 'streak':
        this.proceduralAudio.playStreak();
        break;
      case 'close':
        this.proceduralAudio.playClose();
        break;
      case 'open':
        this.proceduralAudio.playOpen();
        break;
      case 'hover':
        this.proceduralAudio.playHover();
        break;
      case 'select':
        this.proceduralAudio.playSelect();
        break;
      case 'deselect':
        this.proceduralAudio.playClose(); // reuse close sound
        break;
      case 'type':
        this.proceduralAudio.playType();
        break;
      case 'whoosh':
        this.proceduralAudio.playWhoosh();
        break;
      case 'pop':
        this.proceduralAudio.playPop();
        break;
      case 'ding':
        this.proceduralAudio.playDing();
        break;
    }

    // Reset volume if it was changed
    if (options?.volume !== undefined) {
      this.proceduralAudio.setMasterVolume(this.sfxVolume());
    }
  }

  // ============ Convenience Methods ============

  /**
   * Play countdown sounds (3, 2, 1, GO!)
   */
  playCountdown(count: number): void {
    if (count > 0) {
      this.proceduralAudio.playCountdownBeep();
    } else {
      this.proceduralAudio.playGameStart();
    }
  }

  /**
   * Play sound based on answer correctness
   */
  playAnswerFeedback(isCorrect: boolean): void {
    if (!this.sfxEnabled()) return;
    if (isCorrect) {
      this.proceduralAudio.playCorrect();
    } else {
      this.proceduralAudio.playWrong();
    }
  }

  /**
   * Play combo sound with increasing pitch
   */
  playCombo(comboCount: number): void {
    if (!this.sfxEnabled()) return;
    this.proceduralAudio.playCombo(comboCount);
  }

  /**
   * Play timer warning when time is running low
   */
  playTimerWarning(): void {
    if (!this.sfxEnabled()) return;
    this.proceduralAudio.playTimerWarning();
  }

  /**
   * Stop all sounds (useful when leaving game)
   * Note: Procedural sounds auto-stop, but this is here for API consistency
   */
  stopAllSounds(): void {
    // Procedural sounds are short and auto-stop
    // Nothing to do here
  }

  /**
   * Preload sounds - not needed for procedural audio
   * Kept for API compatibility
   */
  preloadSounds(effects: SoundEffect[]): void {
    // No preloading needed for procedural audio
  }

  // ============ Cleanup ============

  destroy(): void {
    this.stopMusic();
    this.musicPlayer = null;
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
      this.routerSubscription = null;
    }
  }
}
