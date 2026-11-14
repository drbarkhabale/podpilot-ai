import type { CaptionCue, Episode, RecordingSegment } from './types';

function validSegments(segments: RecordingSegment[]): RecordingSegment[] {
  return segments.filter(segment =>
    [segment.sessionStart, segment.sessionEnd, segment.mediaStart, segment.mediaEnd].every(Number.isFinite) &&
    segment.sessionStart >= 0 && segment.mediaStart >= 0 &&
    segment.sessionEnd > segment.sessionStart && segment.mediaEnd > segment.mediaStart
  ).map(segment => ({ ...segment })).sort((a, b) => a.sessionStart - b.sessionStart);
}

/** Maps a session timestamp into the captured media. Paused/outside time has no media timestamp. */
export function mediaTimeForSession(time: number, segments: RecordingSegment[]): number | null {
  if (!Number.isFinite(time) || time < 0) return null;
  const valid = validSegments(segments);
  const last = valid.at(-1);
  const segment = valid.find(segment => time >= segment.sessionStart && time < segment.sessionEnd)
    ?? (last && time === last.sessionEnd ? last : undefined);
  if (!segment) return null;
  const fraction = (time - segment.sessionStart) / (segment.sessionEnd - segment.sessionStart);
  return segment.mediaStart + fraction * (segment.mediaEnd - segment.mediaStart);
}

/** At a joined media boundary, the resumed segment owns the timestamp. */
export function sessionTimeForMedia(time: number, segments: RecordingSegment[]): number | null {
  if (!Number.isFinite(time) || time < 0) return null;
  const valid = validSegments(segments).sort((a, b) => a.mediaStart - b.mediaStart);
  const last = valid.at(-1);
  const segment = valid.find(segment => time >= segment.mediaStart && time < segment.mediaEnd)
    ?? (last && time === last.mediaEnd ? last : undefined);
  if (!segment) return null;
  const fraction = (time - segment.mediaStart) / (segment.mediaEnd - segment.mediaStart);
  return segment.sessionStart + fraction * (segment.sessionEnd - segment.sessionStart);
}

/** Provides a backward-compatible continuous segment for recordings from the original MVP. */
export function recordingSegmentsForEpisode(episode: Episode): RecordingSegment[] {
  if (episode.recordingSegments?.length) return validSegments(episode.recordingSegments);
  if (!episode.mediaType) return [];
  const sessionStart = Math.max(0, episode.recordingStartedAt || 0);
  const duration = episode.recordingDuration ?? Math.max(0, episode.duration - sessionStart);
  if (!Number.isFinite(duration) || duration <= 0) return [];
  return [{ sessionStart, sessionEnd: sessionStart + duration, mediaStart: 0, mediaEnd: duration }];
}

/**
 * Transcript-derived cue estimates, not speech alignment or word timestamps.
 * Existing edited cues are retained. A turn starting outside captured time is omitted.
 * Users must review timing against the recording before exporting subtitles.
 */
export function buildCaptionCues(episode: Episode): CaptionCue[] {
  const segments = recordingSegmentsForEpisode(episode);
  const mediaEnd = Math.max(0, ...segments.map(segment => segment.mediaEnd));
  if (!mediaEnd) return [];
  if (episode.captions) {
    return episode.captions.filter(cue =>
      cue && typeof cue.id === 'string' && typeof cue.text === 'string' && cue.text.trim() &&
      ['host', 'guest'].includes(cue.role) && ['approximate', 'edited'].includes(cue.timing) &&
      Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start >= 0 &&
      cue.end > cue.start && cue.start < mediaEnd
    ).map(cue => ({ ...cue, end: Math.min(mediaEnd, cue.end) })).sort((a, b) => a.start - b.start);
  }
  // Browser speechSynthesis is not captured unless an actual tab-audio route was selected.
  // Do not turn unheard host text into apparent subtitles for a guest-only recording.
  const label = episode.mediaLabel || '';
  const missingHostAudio = /browser host (?:voice|speech).{0,25}(?:not captured|not included|excluded)|(?:microphone|mic)(?: audio)? only/i.test(label);
  const capturedHostAudio = /(?:selected browser|explicitly shared|captured) tab audio|(?:captured|actual|available|OpenAI) host audio|OpenAI audio|original NOVA (?:video|clips|audio)/i.test(label);
  const allowHostCues = !missingHostAudio && capturedHostAudio;
  const transcript = [...episode.transcript].filter(entry =>
    typeof entry.text === 'string' && entry.text.trim() && Number.isFinite(entry.timestamp) && entry.timestamp >= 0
  ).sort((a, b) => a.timestamp - b.timestamp);
  const result: CaptionCue[] = [];
  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i];
    // Typed text belongs in the transcript, but is not evidence of recorded speech.
    if (entry.input === 'typed') continue;
    if (entry.role === 'host' && !allowHostCues) continue;
    if (mediaTimeForSession(entry.timestamp, segments) === null) continue;
    const next = transcript.slice(i + 1).find(candidate => candidate.timestamp > entry.timestamp);
    // The timestamp is a turn estimate only. Avoid extending a cue over a long silence.
    const end = entry.endTimestamp !== undefined && Number.isFinite(entry.endTimestamp) && entry.endTimestamp > entry.timestamp ? entry.endTimestamp : Math.min(next?.timestamp ?? entry.timestamp + 12, entry.timestamp + 12);
    if (end <= entry.timestamp) continue;
    for (let part = 0; part < segments.length; part++) {
      const segment = segments[part];
      const from = Math.max(entry.timestamp, segment.sessionStart);
      const to = Math.min(end, segment.sessionEnd);
      if (to <= from) continue;
      const rate = (segment.mediaEnd - segment.mediaStart) / (segment.sessionEnd - segment.sessionStart);
      const start = segment.mediaStart + (from - segment.sessionStart) * rate;
      const finish = segment.mediaStart + (to - segment.sessionStart) * rate;
      if (finish > start) result.push({
        id: `${entry.id}-caption-${part}`, start, end: Math.min(mediaEnd, finish),
        text: entry.text.trim(), role: entry.role, timing: 'approximate',
      });
    }
  }
  return result.sort((a, b) => a.start - b.start);
}
