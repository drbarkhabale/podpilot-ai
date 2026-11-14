/** Captures actual media only. Browser speechSynthesis is not an audio source. */
export interface RecordingOptions {
  canvas?: HTMLCanvasElement;
  microphone?: MediaStream;
  remoteAudio?: MediaStream;
  hostAudio?: MediaStream;
  hostAudioLabel?: string;
  /** False only after explicitly choosing the host-only preview. */
  microphoneRequired?: boolean;
  /** Optional explicitly shared tab audio. Never call getDisplayMedia without a user action. */
  captureAudio?: MediaStream;
  audioLabel?: string;
  guestCamera?: boolean;
  onError?: (message: string) => void;
}

function recordingError(error: unknown): string {
  if (typeof DOMException!=='undefined' && error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Microphone permission was denied. Allow it in your browser, or continue without recording.';
    if (error.name === 'NotFoundError') return 'No microphone was found. Connect one, or continue without recording.';
    if (error.name === 'NotReadableError') return 'The microphone is busy or unavailable. Close other recording apps and try again.';
  }
  return error instanceof Error ? error.message : 'Recording could not start. You can still complete a text interview.';
}

/** Monotonic elapsed-media clock. Pause gaps never become recorded duration. */
export class RecordingClock {
  private accumulated=0;
  private runningSince:number|undefined;
  constructor(private readonly now:()=>number=()=>performance.now()){}
  start():void{this.accumulated=0;this.runningSince=this.now();}
  pause():void{if(this.runningSince!==undefined){this.accumulated+=Math.max(0,this.now()-this.runningSince);this.runningSince=undefined;}}
  resume():void{if(this.runningSince===undefined)this.runningSince=this.now();}
  stop():void{this.pause();}
  seconds():number{return (this.accumulated+(this.runningSince===undefined?0:Math.max(0,this.now()-this.runningSince)))/1000;}
}

export class StudioRecorder {
  private recorder?: MediaRecorder;
  private context?: AudioContext;
  private ownedTracks: MediaStreamTrack[] = [];
  private nodes: AudioNode[] = [];
  private chunks: BlobPart[] = [];
  private result?: Promise<Blob>;
  private settle?: (blob: Blob) => void;
  private reject?: (reason: Error) => void;
  private cancelled = false;
  private starting = false;
  private paused=false;
  private running=false;
  private finalMime = '';
  private clock=new RecordingClock();

  async start(options: RecordingOptions): Promise<{ mimeType: string; label: string }> {
    if (this.starting || this.running) throw new Error('A recording is already in progress.');
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') throw new Error('Recording is not supported by this browser. Text interviews and transcript downloads remain available.');
    this.starting = true;this.cancelled = false;this.paused=false;this.chunks = [];this.result=undefined;
    try {
      let microphone = options.microphone;
      // Preserve an explicitly muted track. Never quietly replace it with a newly enabled microphone.
      if(microphone && !microphone.getAudioTracks().some(track=>track.readyState==='live'))throw new Error('The selected microphone has disconnected. Enable it again before recording.');
      if (!microphone && options.microphoneRequired !== false) {
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone recording requires HTTPS or localhost and a compatible browser.');
        microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
        this.ownedTracks.push(...microphone.getTracks());
      }
      if (this.cancelled) throw new Error('Recording was cancelled.');
      const Context = window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if (!Context) throw new Error('Audio mixing is not available in this browser.');
      this.context = new Context();
      await this.context.resume();
      if (this.cancelled) throw new Error('Recording was cancelled.');
      const destination = this.context.createMediaStreamDestination();
      this.ownedTracks.push(...destination.stream.getTracks());
      const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.003;limiter.release.value=.1;limiter.connect(destination);this.nodes.push(limiter);
      const seenTracks=new Set<string>();
      const connect=(stream:MediaStream|undefined):boolean=>{
        if(!stream)return false;
        const tracks=stream.getAudioTracks().filter(track=>track.readyState==='live'&&!seenTracks.has(track.id));
        if(!tracks.length)return false;
        tracks.forEach(track=>seenTracks.add(track.id));
        const source=this.context!.createMediaStreamSource(new MediaStream(tracks));source.connect(limiter);this.nodes.push(source);return true;
      };
      const hasMicrophone=connect(microphone);
      const hasHost=connect(options.hostAudio);
      const hasRemote=connect(options.remoteAudio);
      const hasTabAudio=connect(options.captureAudio);
      if(!hasMicrophone&&!hasHost&&!hasRemote&&!hasTabAudio)throw new Error('No audio source is connected. Enable a microphone or the included host voice before recording.');
      const tracks = [...destination.stream.getAudioTracks()];
      let hasVideo = false;
      if (options.canvas && typeof options.canvas.captureStream === 'function') {
        const videoTracks=options.canvas.captureStream(30).getVideoTracks();tracks.push(...videoTracks);this.ownedTracks.push(...videoTracks);hasVideo=videoTracks.length>0;
      }
      const candidates = hasVideo
        ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
        : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
      this.recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType, ...(hasVideo?{videoBitsPerSecond:4_000_000}:{}) } : undefined);
      this.finalMime = this.recorder.mimeType || mimeType || (hasVideo ? 'video/webm' : 'audio/webm');
      this.result = new Promise<Blob>((resolve, reject) => { this.settle = resolve; this.reject = reject; });
      void this.result.catch(() => {});
      this.recorder.ondataavailable = event => { if (event.data.size) this.chunks.push(event.data); };
      this.recorder.onerror = () => {
        this.clock.stop();this.running=false;this.paused=false;
        const error = new Error('Media recording failed. Your transcript is still available, but a complete media export is not available.');
        options.onError?.(error.message);this.reject?.(error);
        if (this.recorder?.state !== 'inactive') this.recorder?.stop();this.releaseMedia();
      };
      this.recorder.onstop = () => {
        this.clock.stop();this.running=false;this.paused=false;
        const blob = new Blob(this.chunks, { type: this.finalMime });
        if (blob.size) this.settle?.(blob);else this.reject?.(new Error('No media was captured. Try recording for a little longer.'));
        this.releaseMedia();
      };
      this.recorder.start(1000);this.clock.start();this.running=true;
      const videoLabel=hasVideo?(options.guestCamera?'live guest camera when enabled + NOAH + studio camera cuts':'NOAH + studio camera cuts; guest camera off at start, included if enabled later'):'audio-only recording';
      const audioParts=[microphone?'guest microphone':'no guest microphone'];if(hasHost)audioParts.push(options.hostAudioLabel||'captured host audio (included synthetic voice)');if(hasRemote)audioParts.push('available OpenAI host audio');if(hasTabAudio)audioParts.push(options.audioLabel||'explicitly shared tab audio');
      const label=`${videoLabel} • ${audioParts.join(' + ')}${hasHost||hasRemote||hasTabAudio?'':'; browser host speech is not included'}`;
      return { mimeType: this.finalMime, label };
    } catch (error) {
      this.running=false;this.paused=false;this.releaseMedia();throw new Error(recordingError(error));
    } finally {this.starting = false;}
  }
  canPause():boolean{return !!this.recorder&&typeof this.recorder.pause==='function'&&typeof this.recorder.resume==='function';}
  isPaused():boolean{return this.paused;}
  isRecording():boolean{return this.running;}
  getDuration():number{return this.clock.seconds();}
  pause():void{
    if(!this.running||!this.recorder)throw new Error('Start a recording before pausing it.');
    if(!this.canPause())throw new Error('This browser cannot pause recording. Stop and save the take instead.');
    if(this.paused)return;
    this.recorder.pause();this.clock.pause();this.paused=true;
  }
  resume():void{
    if(!this.running||!this.recorder)throw new Error('There is no paused recording to resume.');
    if(!this.paused)return;
    this.recorder.resume();this.clock.resume();this.paused=false;
  }
  async stop(): Promise<Blob> {
    if (!this.recorder || !this.result) throw new Error('There is no recording to stop.');
    this.clock.stop();this.running=false;this.paused=false;
    if (this.recorder.state !== 'inactive') this.recorder.stop();return this.result;
  }
  private releaseMedia(): void {
    this.nodes.forEach(node => { try { node.disconnect(); } catch { /* Already disconnected. */ } });this.nodes = [];
    this.ownedTracks.forEach(track => track.stop());this.ownedTracks = [];
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});this.context = undefined;
  }
  dispose(): void {
    this.cancelled = true;this.clock.stop();this.running=false;this.paused=false;
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();this.releaseMedia();
  }
}
