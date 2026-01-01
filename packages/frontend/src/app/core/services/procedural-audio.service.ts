import { Injectable } from '@angular/core';

/**
 * Procedural Audio Service
 * Generates game sound effects using Web Audio API
 * No external files needed - all sounds are synthesized in real-time
 */
@Injectable({
  providedIn: 'root'
})
export class ProceduralAudioService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.5;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // ============ SOUND GENERATORS ============

  /**
   * Click sound - short noise burst
   */
  playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 1000;

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.05);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  /**
   * Countdown beep (3, 2, 1)
   */
  playCountdownBeep(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 440;

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.15);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  /**
   * Game Start - ascending tones
   */
  playGameStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    const duration = 0.12;

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      const startTime = ctx.currentTime + i * duration;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialDecayTo(0.01, startTime + duration);

      oscillator.connect(gain);
      gain.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * Correct answer - pleasant ding
   */
  playCorrect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.3);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  /**
   * Wrong answer - low buzz
   */
  playWrong(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 150;

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.25);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  }

  /**
   * Card flip - short woosh
   */
  playCardFlip(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    // Create noise
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(ctx.currentTime);
  }

  /**
   * Match found - happy double ding
   */
  playMatch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    [0, 0.1].forEach((delay, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = i === 0 ? 880 : 1320;

      const startTime = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialDecayTo(0.01, startTime + 0.2);

      oscillator.connect(gain);
      gain.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }

  /**
   * Victory fanfare - triumphant chord
   */
  playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    // C major chord arpeggio + final chord
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },    // C5
      { freq: 659.25, time: 0.12, duration: 0.15 }, // E5
      { freq: 783.99, time: 0.24, duration: 0.15 }, // G5
      { freq: 1046.5, time: 0.36, duration: 0.4 },  // C6
      // Chord
      { freq: 523.25, time: 0.5, duration: 0.5 },   // C5
      { freq: 659.25, time: 0.5, duration: 0.5 },   // E5
      { freq: 783.99, time: 0.5, duration: 0.5 },   // G5
    ];

    notes.forEach(note => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = note.freq;

      const startTime = ctx.currentTime + note.time;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialDecayTo(0.01, startTime + note.duration);

      oscillator.connect(gain);
      gain.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + note.duration);
    });
  }

  /**
   * Game over - sad descending tones
   */
  playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const frequencies = [392, 349.23, 293.66]; // G4, F4, D4
    const duration = 0.25;

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      const startTime = ctx.currentTime + i * duration;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialDecayTo(0.01, startTime + duration);

      oscillator.connect(gain);
      gain.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * Coin collect - classic coin sound
   */
  playCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    oscillator.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.3);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  /**
   * Level up / Achievement
   */
  playLevelUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const frequencies = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    const duration = 0.1;

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.value = freq;

      const startTime = ctx.currentTime + i * duration;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialDecayTo(0.01, startTime + duration * 2);

      oscillator.connect(gain);
      gain.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration * 2);
    });
  }

  /**
   * Timer tick
   */
  playTimerTick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.03);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  }

  /**
   * Timer warning (last seconds)
   */
  playTimerWarning(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 880;

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Combo sound with increasing pitch
   */
  playCombo(comboCount: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const baseFreq = 440;
    const freq = baseFreq * Math.pow(1.1, Math.min(comboCount, 10));

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = freq;

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.15);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  /**
   * Whoosh - for transitions
   */
  playWhoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(3000, ctx.currentTime + 0.1);
    filter.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(ctx.currentTime);
  }

  /**
   * Pop sound
   */
  playPop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Ding - simple bell sound
   */
  playDing(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 1200;

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.4);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }

  /**
   * Select - confirmation sound
   */
  playSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Close - descending tone
   */
  playClose(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Hover - subtle sound
   */
  playHover(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 800;

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.03);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  }

  /**
   * Streak sound
   */
  playStreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const frequencies = [523.25, 783.99, 1046.5]; // C5, G5, C6

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialDecayTo(0.01, startTime + 0.15);

      oscillator.connect(gain);
      gain.connect(this.masterGain!);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  }

  /**
   * Card draw sound
   */
  playCardDraw(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    // Sliding sound
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(ctx.currentTime);
  }

  /**
   * Open sound - ascending
   */
  playOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  /**
   * Type sound - keyboard click
   */
  playType(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 1500 + Math.random() * 500;

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.02);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.02);
  }

  /**
   * Achievement unlock
   */
  playAchievement(): void {
    this.playLevelUp();
    // Add sparkle
    setTimeout(() => {
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;

      [1200, 1400, 1600].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = ctx.currentTime + i * 0.05;
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialDecayTo(0.01, startTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.1);
      });
    }, 400);
  }
}

// Polyfill for exponentialDecayTo
declare global {
  interface AudioParam {
    exponentialDecayTo(value: number, endTime: number): void;
  }
}

AudioParam.prototype.exponentialDecayTo = function(value: number, endTime: number) {
  // Clamp value to prevent 0 (which throws error)
  const safeValue = Math.max(0.0001, value);
  this.exponentialRampToValueAtTime(safeValue, endTime);
};
