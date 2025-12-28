import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Available voices for different languages
export const VOICES = {
  // English voices (US)
  'en-US-female': 'en-US-JennyNeural',
  'en-US-male': 'en-US-GuyNeural',
  'en-US-aria': 'en-US-AriaNeural',
  // English voices (UK)
  'en-GB-female': 'en-GB-SoniaNeural',
  'en-GB-male': 'en-GB-RyanNeural',
  // Vietnamese voices
  'vi-VN-female': 'vi-VN-HoaiMyNeural',
  'vi-VN-male': 'vi-VN-NamMinhNeural',
} as const;

export type VoiceKey = keyof typeof VOICES;

interface TTSOptions {
  voice?: VoiceKey | string;
  rate?: string; // e.g., '+0%', '-10%', '+20%'
  pitch?: string; // e.g., '+0Hz', '-10Hz'
  volume?: string; // e.g., '+0%', '-20%'
}

// Ensure audio directory exists
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio', 'tts');

function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

/**
 * Generate a unique filename based on text and options
 */
function generateFilename(text: string, voice: string): string {
  const hash = crypto.createHash('md5')
    .update(`${text}-${voice}`)
    .digest('hex')
    .substring(0, 12);
  return `tts_${hash}.mp3`;
}

/**
 * Generate speech audio from text using Microsoft Edge TTS
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<{ filePath: string; url: string; cached: boolean }> {
  ensureAudioDir();

  // Determine voice
  let voiceName: string;
  if (options.voice && options.voice in VOICES) {
    voiceName = VOICES[options.voice as VoiceKey];
  } else if (options.voice) {
    voiceName = options.voice; // Use directly if it's a full voice name
  } else {
    voiceName = VOICES['en-US-female']; // Default
  }

  const filename = generateFilename(text, voiceName);
  const filePath = path.join(AUDIO_DIR, filename);
  const url = `/audio/tts/${filename}`;

  // Check if file already exists (caching)
  if (fs.existsSync(filePath)) {
    return { filePath, url, cached: true };
  }

  // Generate new audio using toFile
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  // Apply prosody options
  const prosodyOptions: { rate?: string; pitch?: string; volume?: string } = {};
  if (options.rate) prosodyOptions.rate = options.rate;
  if (options.pitch) prosodyOptions.pitch = options.pitch;
  if (options.volume) prosodyOptions.volume = options.volume;

  // Generate audio file
  const result = await tts.toFile(AUDIO_DIR, text, prosodyOptions);

  // Rename the generated file to our hash-based filename
  const generatedPath = result.audioFilePath;
  if (generatedPath !== filePath) {
    // Move file to correct location with hash-based name
    fs.renameSync(generatedPath, filePath);
  }

  return { filePath, url, cached: false };
}

/**
 * Generate speech for listening exercises (English with slower speed for learners)
 */
export async function generateListeningSpeech(
  text: string,
  options: { speed?: 'slow' | 'normal' | 'fast'; accent?: 'us' | 'uk' } = {}
): Promise<{ filePath: string; url: string; cached: boolean }> {
  const speed = options.speed || 'normal';
  const accent = options.accent || 'us';

  // Map speed to rate
  const rateMap = {
    slow: '-15%',
    normal: '+0%',
    fast: '+10%',
  };

  // Map accent to voice
  const voiceMap = {
    us: 'en-US-female' as VoiceKey,
    uk: 'en-GB-female' as VoiceKey,
  };

  return generateSpeech(text, {
    voice: voiceMap[accent],
    rate: rateMap[speed],
  });
}

/**
 * Generate speech for vocabulary pronunciation
 */
export async function generatePronunciation(
  word: string,
  accent: 'us' | 'uk' = 'us'
): Promise<{ filePath: string; url: string; cached: boolean }> {
  const voice = accent === 'uk' ? 'en-GB-female' : 'en-US-female';

  return generateSpeech(word, {
    voice: voice as VoiceKey,
    rate: '-10%', // Slightly slower for clarity
  });
}

/**
 * Generate Vietnamese speech
 */
export async function generateVietnameseSpeech(
  text: string,
  options: { gender?: 'female' | 'male' } = {}
): Promise<{ filePath: string; url: string; cached: boolean }> {
  const voice = options.gender === 'male' ? 'vi-VN-male' : 'vi-VN-female';

  return generateSpeech(text, {
    voice: voice as VoiceKey,
  });
}

/**
 * List all available voices
 */
export async function listVoices(): Promise<string[]> {
  const tts = new MsEdgeTTS();
  const voices = await tts.getVoices();
  return voices.map((v: any) => `${v.ShortName} - ${v.Locale} - ${v.Gender}`);
}

/**
 * Delete cached audio file
 */
export function deleteCachedAudio(filename: string): boolean {
  const filePath = path.join(AUDIO_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * Clear all cached TTS audio files
 */
export function clearAudioCache(): number {
  ensureAudioDir();
  const files = fs.readdirSync(AUDIO_DIR);
  let count = 0;
  for (const file of files) {
    if (file.startsWith('tts_') && file.endsWith('.mp3')) {
      fs.unlinkSync(path.join(AUDIO_DIR, file));
      count++;
    }
  }
  return count;
}
