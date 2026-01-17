import { Injectable, signal } from '@angular/core';

/**
 * Cached pronunciation data stored in localStorage
 */
export interface CachedPronunciation {
  audioUk?: string;
  audioUs?: string;
  phonetic?: string;
  cachedAt: number;
  source: 'free-dictionary' | 'not-found';
}

/**
 * Free Dictionary API phonetic entry
 */
export interface FreeDictionaryPhonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: {
    name: string;
    url: string;
  };
}

/**
 * Free Dictionary API definition
 */
export interface FreeDictionaryDefinition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

/**
 * Free Dictionary API meaning (grouped by part of speech)
 */
export interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: FreeDictionaryDefinition[];
  synonyms: string[];
  antonyms: string[];
}

/**
 * Free Dictionary API full response structure
 */
export interface FreeDictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics: FreeDictionaryPhonetic[];
  meanings: FreeDictionaryMeaning[];
  license?: {
    name: string;
    url: string;
  };
  sourceUrls?: string[];
}

/**
 * Cached full dictionary data for vocabulary detail page
 */
export interface CachedDictionaryData {
  word: string;
  phonetic?: string;
  phonetics: FreeDictionaryPhonetic[];
  meanings: FreeDictionaryMeaning[];
  sourceUrls?: string[];
  cachedAt: number;
  source: 'free-dictionary' | 'not-found';
}

/**
 * Options for database audio URLs
 */
export interface DatabaseAudioUrls {
  uk?: string | null;
  us?: string | null;
}

/**
 * PronunciationService - Unified pronunciation handling with smart fallback
 *
 * Priority chain:
 * 1. Cached audio URLs (from Free Dictionary API)
 * 2. Free Dictionary API (fetch and cache)
 * 3. Database audio URLs (passed from component)
 * 4. Speech Synthesis API (browser fallback)
 */
@Injectable({ providedIn: 'root' })
export class PronunciationService {
  private readonly API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
  private readonly CACHE_KEY = 'pronunciation_cache';
  private readonly DICTIONARY_CACHE_KEY = 'dictionary_data_cache';
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /** Current speaking state: 'uk', 'us', or null */
  speaking = signal<'uk' | 'us' | null>(null);

  /** Currently speaking word (for tracking which button to highlight) */
  speakingWord = signal<string | null>(null);

  /** Currently playing audio element */
  private currentAudio: HTMLAudioElement | null = null;

  /** Speech synthesis voices */
  private ukVoice: SpeechSynthesisVoice | null = null;
  private usVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;

  constructor() {
    this.loadVoices();
  }

  /**
   * Load speech synthesis voices
   */
  private loadVoices(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const loadAvailableVoices = () => {
      const voices = speechSynthesis.getVoices();
      this.ukVoice = voices.find(v =>
        v.lang === 'en-GB' || v.lang.startsWith('en-GB')
      ) || null;
      this.usVoice = voices.find(v =>
        v.lang === 'en-US' || v.lang.startsWith('en-US')
      ) || null;

      // Fallback to any English voice
      if (!this.ukVoice && !this.usVoice) {
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        this.ukVoice = englishVoice || null;
        this.usVoice = englishVoice || null;
      }
      this.voicesLoaded = true;
    };

    if (speechSynthesis.getVoices().length > 0) {
      loadAvailableVoices();
    } else {
      speechSynthesis.onvoiceschanged = loadAvailableVoices;
    }
  }

  /**
   * Main method - speak a word with smart fallback
   *
   * @param word - The word to pronounce
   * @param accent - 'uk' or 'us' accent
   * @param databaseAudioUrls - Optional audio URLs from database
   */
  async speak(
    word: string,
    accent: 'uk' | 'us' = 'us',
    databaseAudioUrls?: DatabaseAudioUrls
  ): Promise<void> {
    // Stop any current playback
    this.stop();

    const normalizedWord = word.toLowerCase().trim();

    // Track which word is being spoken
    this.speakingWord.set(normalizedWord);

    // Try to get cached or fetch new pronunciation data
    const cached = await this.getOrFetchPronunciation(normalizedWord);

    // Priority 1: Cached audio URL from Free Dictionary
    const cachedAudioUrl = accent === 'uk' ? cached?.audioUk : cached?.audioUs;
    if (cachedAudioUrl) {
      try {
        await this.playAudioUrl(cachedAudioUrl, accent);
        return;
      } catch {
        // Audio failed, try next option
      }
    }

    // Priority 2: Database audio URL
    const dbAudioUrl = accent === 'uk' ? databaseAudioUrls?.uk : databaseAudioUrls?.us;
    if (dbAudioUrl) {
      try {
        await this.playAudioUrl(dbAudioUrl, accent);
        return;
      } catch {
        // Audio failed, try next option
      }
    }

    // Priority 3: Speech Synthesis (final fallback)
    this.useSpeechSynthesis(word, accent);
  }

  /**
   * Speak a word using only Speech Synthesis (for quick playback without network)
   */
  speakWithSynthesis(word: string, accent: 'uk' | 'us' = 'us'): void {
    this.stop();
    this.useSpeechSynthesis(word, accent);
  }

  /**
   * Fetch pronunciation data from Free Dictionary API
   */
  async fetchFreeDictionary(word: string): Promise<CachedPronunciation | null> {
    const normalizedWord = word.toLowerCase().trim();

    try {
      const response = await fetch(`${this.API_URL}/${encodeURIComponent(normalizedWord)}`);

      if (!response.ok) {
        // Word not found - cache this to avoid repeated API calls
        const notFound: CachedPronunciation = {
          cachedAt: Date.now(),
          source: 'not-found'
        };
        this.setCache(normalizedWord, notFound);
        return null;
      }

      const data: FreeDictionaryResponse[] = await response.json();
      if (!data || data.length === 0) {
        return null;
      }

      const entry = data[0];
      const phonetics = entry.phonetics || [];

      // Find UK and US audio URLs
      let audioUk: string | undefined;
      let audioUs: string | undefined;
      let phonetic: string | undefined = entry.phonetic;

      for (const p of phonetics) {
        if (p.audio) {
          // Free Dictionary uses patterns like:
          // - ...us.mp3 or ...-us-... for US
          // - ...uk.mp3 or ...-uk-... or ...gb... for UK
          const audioLower = p.audio.toLowerCase();
          if (audioLower.includes('-us') || audioLower.includes('_us')) {
            audioUs = p.audio;
          } else if (audioLower.includes('-uk') || audioLower.includes('_uk') || audioLower.includes('-gb') || audioLower.includes('_gb')) {
            audioUk = p.audio;
          } else if (!audioUs && !audioUk) {
            // Use as fallback for both if no specific accent found
            audioUs = p.audio;
            audioUk = p.audio;
          }
        }
        if (p.text && !phonetic) {
          phonetic = p.text;
        }
      }

      const cached: CachedPronunciation = {
        audioUk,
        audioUs,
        phonetic,
        cachedAt: Date.now(),
        source: 'free-dictionary'
      };

      this.setCache(normalizedWord, cached);
      return cached;

    } catch (error) {
      console.warn('Failed to fetch from Free Dictionary API:', error);
      return null;
    }
  }

  /**
   * Get pronunciation from cache or fetch from API
   */
  private async getOrFetchPronunciation(word: string): Promise<CachedPronunciation | null> {
    const cached = this.getFromCache(word);

    if (cached) {
      // Return cached data if not expired
      if (!this.isExpired(cached.cachedAt)) {
        return cached.source === 'not-found' ? null : cached;
      }
    }

    // Fetch fresh data
    return this.fetchFreeDictionary(word);
  }

  /**
   * Get pronunciation data from cache
   */
  getFromCache(word: string): CachedPronunciation | null {
    const cache = this.getCache();
    return cache[word.toLowerCase().trim()] || null;
  }

  /**
   * Get the entire cache object
   */
  private getCache(): Record<string, CachedPronunciation> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }

    try {
      const data = localStorage.getItem(this.CACHE_KEY);
      if (!data) return {};

      const cache = JSON.parse(data) as Record<string, CachedPronunciation>;

      // Clean up expired entries while we're at it
      const now = Date.now();
      let hasExpired = false;
      for (const key of Object.keys(cache)) {
        if (this.isExpired(cache[key].cachedAt)) {
          delete cache[key];
          hasExpired = true;
        }
      }

      // Save cleaned cache
      if (hasExpired) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      }

      return cache;
    } catch {
      return {};
    }
  }

  /**
   * Set a cache entry
   */
  private setCache(word: string, data: CachedPronunciation): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const cache = this.getCache();
      cache[word.toLowerCase().trim()] = data;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch {
      // localStorage might be full or disabled
    }
  }

  /**
   * Check if a cached entry is expired
   */
  private isExpired(cachedAt: number): boolean {
    return Date.now() - cachedAt > this.CACHE_TTL;
  }

  /**
   * Play audio from URL
   */
  private playAudioUrl(url: string, accent: 'uk' | 'us'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.speaking.set(accent);
      this.currentAudio = new Audio(url);

      this.currentAudio.onended = () => {
        this.speaking.set(null);
        this.speakingWord.set(null);
        this.currentAudio = null;
        resolve();
      };

      this.currentAudio.onerror = () => {
        this.speaking.set(null);
        this.speakingWord.set(null);
        this.currentAudio = null;
        reject(new Error('Audio playback failed'));
      };

      this.currentAudio.play().catch(err => {
        this.speaking.set(null);
        this.speakingWord.set(null);
        this.currentAudio = null;
        reject(err);
      });
    });
  }

  /**
   * Use Speech Synthesis API as fallback
   */
  private useSpeechSynthesis(word: string, accent: 'uk' | 'us'): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voice = accent === 'uk' ? this.ukVoice : this.usVoice;
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';

    utterance.onstart = () => this.speaking.set(accent);
    utterance.onend = () => {
      this.speaking.set(null);
      this.speakingWord.set(null);
    };
    utterance.onerror = () => {
      this.speaking.set(null);
      this.speakingWord.set(null);
    };

    speechSynthesis.speak(utterance);
  }

  /**
   * Stop any current playback
   */
  stop(): void {
    // Stop audio element
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    // Stop speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
    }

    this.speaking.set(null);
    this.speakingWord.set(null);
  }

  /**
   * Clear the entire pronunciation cache
   */
  clearCache(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.CACHE_KEY);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; oldestEntry: Date | null } {
    const cache = this.getCache();
    const entries = Object.keys(cache).length;
    let oldest: number | null = null;

    for (const key of Object.keys(cache)) {
      const cachedAt = cache[key].cachedAt;
      if (oldest === null || cachedAt < oldest) {
        oldest = cachedAt;
      }
    }

    return {
      entries,
      oldestEntry: oldest ? new Date(oldest) : null
    };
  }

  // ============================================================
  // Full Dictionary Data (for vocabulary detail page)
  // ============================================================

  /**
   * Fetch full dictionary data from Free Dictionary API
   * This includes all meanings, definitions, synonyms, antonyms, examples, etc.
   */
  async fetchFullDictionary(word: string): Promise<CachedDictionaryData | null> {
    const normalizedWord = word.toLowerCase().trim();

    // Check dictionary cache first
    const cached = this.getDictionaryFromCache(normalizedWord);
    if (cached) {
      if (!this.isExpired(cached.cachedAt)) {
        return cached.source === 'not-found' ? null : cached;
      }
    }

    try {
      const response = await fetch(`${this.API_URL}/${encodeURIComponent(normalizedWord)}`);

      if (!response.ok) {
        // Word not found - cache this to avoid repeated API calls
        const notFound: CachedDictionaryData = {
          word: normalizedWord,
          phonetics: [],
          meanings: [],
          cachedAt: Date.now(),
          source: 'not-found'
        };
        this.setDictionaryCache(normalizedWord, notFound);
        return null;
      }

      const data: FreeDictionaryResponse[] = await response.json();
      if (!data || data.length === 0) {
        return null;
      }

      const entry = data[0];

      // Merge all meanings from all entries (some words have multiple entries)
      const allMeanings: FreeDictionaryMeaning[] = [];
      const allPhonetics: FreeDictionaryPhonetic[] = [];
      const allSourceUrls: string[] = [];

      for (const e of data) {
        if (e.meanings) {
          allMeanings.push(...e.meanings);
        }
        if (e.phonetics) {
          // Avoid duplicate phonetics
          for (const p of e.phonetics) {
            if (!allPhonetics.some(existing => existing.audio === p.audio && existing.text === p.text)) {
              allPhonetics.push(p);
            }
          }
        }
        if (e.sourceUrls) {
          for (const url of e.sourceUrls) {
            if (!allSourceUrls.includes(url)) {
              allSourceUrls.push(url);
            }
          }
        }
      }

      const cachedData: CachedDictionaryData = {
        word: entry.word,
        phonetic: entry.phonetic,
        phonetics: allPhonetics,
        meanings: allMeanings,
        sourceUrls: allSourceUrls.length > 0 ? allSourceUrls : undefined,
        cachedAt: Date.now(),
        source: 'free-dictionary'
      };

      this.setDictionaryCache(normalizedWord, cachedData);
      return cachedData;

    } catch (error) {
      console.warn('Failed to fetch full dictionary data from Free Dictionary API:', error);
      return null;
    }
  }

  /**
   * Get dictionary data from cache
   */
  private getDictionaryFromCache(word: string): CachedDictionaryData | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const data = localStorage.getItem(this.DICTIONARY_CACHE_KEY);
      if (!data) return null;

      const cache = JSON.parse(data) as Record<string, CachedDictionaryData>;
      return cache[word.toLowerCase().trim()] || null;
    } catch {
      return null;
    }
  }

  /**
   * Set dictionary data in cache
   */
  private setDictionaryCache(word: string, data: CachedDictionaryData): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const cacheStr = localStorage.getItem(this.DICTIONARY_CACHE_KEY);
      const cache: Record<string, CachedDictionaryData> = cacheStr ? JSON.parse(cacheStr) : {};

      // Clean up expired entries
      const now = Date.now();
      for (const key of Object.keys(cache)) {
        if (this.isExpired(cache[key].cachedAt)) {
          delete cache[key];
        }
      }

      cache[word.toLowerCase().trim()] = data;
      localStorage.setItem(this.DICTIONARY_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // localStorage might be full or disabled
    }
  }

  /**
   * Clear dictionary data cache
   */
  clearDictionaryCache(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.DICTIONARY_CACHE_KEY);
    }
  }

  /**
   * Get all unique synonyms from all meanings
   */
  static extractAllSynonyms(data: CachedDictionaryData): string[] {
    const synonyms = new Set<string>();
    for (const meaning of data.meanings) {
      for (const syn of meaning.synonyms) {
        synonyms.add(syn);
      }
      for (const def of meaning.definitions) {
        for (const syn of def.synonyms) {
          synonyms.add(syn);
        }
      }
    }
    return Array.from(synonyms);
  }

  /**
   * Get all unique antonyms from all meanings
   */
  static extractAllAntonyms(data: CachedDictionaryData): string[] {
    const antonyms = new Set<string>();
    for (const meaning of data.meanings) {
      for (const ant of meaning.antonyms) {
        antonyms.add(ant);
      }
      for (const def of meaning.definitions) {
        for (const ant of def.antonyms) {
          antonyms.add(ant);
        }
      }
    }
    return Array.from(antonyms);
  }
}
