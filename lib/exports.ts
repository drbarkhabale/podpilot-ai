import type { Episode } from './types';

/** Format a session-relative time without depending on the user's locale. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${String(minutes).padStart(2, '0')}:${rest}`;
}

/** Download only supplied bytes: this function never fabricates media. */
export function downloadFile(blob: Blob, name: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Downloads are unavailable in this browser.');
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name.replace(/[\\/\u0000-\u001f]/g, '-');
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Leave time for Safari and other browsers to begin reading the Blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function transcriptText(episode: Episode): string {
  const guest = episode.config.guest.trim() || 'Guest';
  const mode = episode.sample ? 'FICTIONAL WRITTEN SAMPLE — no interview, audio or video was recorded.' : episode.engine === 'demo'
    ? 'DEMO MODE — deterministic interviewer; browser speech where enabled.'
    : 'OPENAI MODE — AI interview conversation.';
  const lines = [
    episode.content.title,
    'PodPilot AI',
    mode,
    `Guest: ${guest}`,
    `Topic: ${episode.config.topic}`,
    `Interview mode: ${episode.config.mode}`,
    `Created: ${episode.createdAt}`,
    `Duration: ${formatTime(episode.duration)}`,
    'Timestamps are relative to the interview, not necessarily to a recording.',
    'This file is a transcript, not a recorded podcast.',
    '',
  ];
  for (const entry of episode.transcript) {
    lines.push(`[${formatTime(entry.timestamp)}] ${entry.role === 'host' ? 'NOAH (AI host)' : guest}: ${entry.text}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Decode actual captured media and export the selected audio samples as PCM WAV.
 * Times are relative to the media file. Video is intentionally not synthesized.
 */
export async function exportAudioClip(blob: Blob, start: number, end: number): Promise<Blob> {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new Error('Choose a valid clip: start must be at least zero and end must be after start.');
  }
  if (blob.size === 0) throw new Error('There is no captured media to export.');
  if (typeof window === 'undefined') throw new Error('Audio clipping requires a browser.');
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('This browser cannot export audio clips. Download the original recording instead.');
  }

  let context: AudioContext;
  try {
    context = new AudioContextClass();
  } catch {
    throw new Error('The browser could not open an audio decoder. Download the original recording instead.');
  }
  try {
    let decoded: AudioBuffer;
    try {
      decoded = await context.decodeAudioData(await blob.arrayBuffer());
    } catch {
      throw new Error('This browser cannot decode this recording for clipping. The original download is still available.');
    }
    if (start >= decoded.duration || end > decoded.duration + 0.25) {
      throw new Error(`Choose a segment within the recording (${formatTime(decoded.duration)}).`);
    }
    const firstSample = Math.floor(start * decoded.sampleRate);
    const lastSample = Math.min(decoded.length, Math.floor(end * decoded.sampleRate));
    const sampleCount = lastSample - firstSample;
    if (sampleCount < 1) throw new Error('The selected segment is too short to export.');
    const channelCount = decoded.numberOfChannels;
    const byteCount = sampleCount * channelCount * 2;
    if (byteCount > 0xffffffff - 36) throw new Error('The selected segment is too large for a WAV file.');

    const buffer = new ArrayBuffer(44 + byteCount);
    const view = new DataView(buffer);
    const writeText = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + byteCount, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Linear PCM.
    view.setUint16(22, channelCount, true);
    view.setUint32(24, decoded.sampleRate, true);
    view.setUint32(28, decoded.sampleRate * channelCount * 2, true);
    view.setUint16(32, channelCount * 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, byteCount, true);
    const channels = Array.from({ length: channelCount }, (_, index) => decoded.getChannelData(index));
    let offset = 44;
    for (let sample = firstSample; sample < lastSample; sample += 1) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        const value = Math.max(-1, Math.min(1, channels[channel][sample]));
        view.setInt16(offset, Math.round(value < 0 ? value * 0x8000 : value * 0x7fff), true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  } finally {
    await context.close().catch(() => undefined);
  }
}
