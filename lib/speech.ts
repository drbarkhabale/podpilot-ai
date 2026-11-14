import type { HostState } from './types';

interface RecognitionAlternative { transcript: string }
interface RecognitionResult { isFinal: boolean; length: number; [index: number]: RecognitionAlternative }
interface RecognitionEvent { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } }
interface RecognitionErrorEvent { error: string }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const browser = window as SpeechWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
export function supportedRecognition(): boolean { return !!recognitionConstructor(); }
export function getVoices(): SpeechSynthesisVoice[] {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
}

/** Uses browser-provided speech services, never an OpenAI voice. Recognition may use the browser vendor's servers. */
export class BrowserSpeech {
  private recognition?: Recognition;
  private listeningEnd?: () => void;
  private speechSequence = 0;
  private onSpeechState?: (state: HostState) => void;

  static supportedRecognition(): boolean { return supportedRecognition(); }
  supportedRecognition(): boolean { return supportedRecognition(); }
  getVoices(): SpeechSynthesisVoice[] { return getVoices(); }

  speak(text: string, voice: string, onState: (state: HostState) => void): void {
    this.stopListening();
    this.stop();
    this.onSpeechState = onState;
    if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) { onState('idle'); return; }
    const sequence = ++this.speechSequence;
    const utterance = new SpeechSynthesisUtterance(text);
    const chosen = getVoices().find(item => item.voiceURI === voice || item.name === voice);
    if (chosen) utterance.voice = chosen;
    utterance.lang = chosen?.lang || 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => { if (sequence === this.speechSequence) onState('speaking'); };
    utterance.onend = () => { if (sequence === this.speechSequence) onState('idle'); };
    utterance.onerror = () => { if (sequence === this.speechSequence) onState('idle'); };
    onState('thinking');
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    this.speechSequence++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    this.onSpeechState?.('idle');
    this.onSpeechState = undefined;
  }

  listen(onText: (text: string) => void, onError: (message: string) => void, onEnd: () => void): void {
    this.stopListening();
    this.stop();
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      onError('Speech recognition is unavailable in this browser. Type your answer below, or try a supported browser.');
      onEnd();
      return;
    }
    const recognition = new Constructor();
    this.recognition = recognition;
    let ended = false;
    let delivered = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      if (this.recognition === recognition) { this.recognition = undefined; this.listeningEnd = undefined; }
      onEnd();
    };
    this.listeningEnd = finish;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      if (ended || delivered) return;
      const parts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) parts.push(event.results[i][0].transcript);
      }
      const text = parts.join(' ').trim();
      if (text) {
        delivered = true;
        try { recognition.stop(); } catch { /* Some engines end immediately after a final result. */ }
        onText(text);
      }
    };
    recognition.onerror = event => {
      if (ended || event.error === 'aborted') return;
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone or speech permission was denied. Allow access in browser settings, or type your answer.',
        'service-not-allowed': 'Your browser has blocked its speech recognition service. You can type your answer.',
        'audio-capture': 'No usable microphone was found. Check your input device, or type your answer.',
        'no-speech': 'No speech was detected. Try again, or type your answer.',
        network: 'The browser speech service could not connect. Speech recognition may need an internet connection. Text input still works.',
        'language-not-supported': 'English speech recognition is unavailable in this browser. Type your answer instead.',
      };
      onError(messages[event.error] || 'Speech recognition stopped unexpectedly. Try again, or type your answer.');
      finish();
    };
    recognition.onend = finish;
    try { recognition.start(); } catch { onError('The microphone could not start. Check browser permissions, or type your answer.'); finish(); }
  }

  stopListening(): void {
    const recognition = this.recognition;
    this.listeningEnd?.();
    if (recognition) { try { recognition.abort(); } catch { /* It may already have ended. */ } }
  }
}
