# PodPilot studio and editor guide

This guide describes implemented source behavior. Device capture, browser encoders and paid API access still require verification on the device used for a demonstration.

## Setup and host

Choose a guest name, topic and duration, then one of Deep Dive, Startup Founder, Debate Mode, Personal Story or Expert Interview. The five personality presets choose a format and tone; expertise, tone, voice and palette remain editable. Blue is the default studio palette. Existing amber, violet and teal episodes remain supported.

Demo Mode is a deterministic script with browser voice tools. NOVA introduces itself as an AI host, asks one question at a time and uses bounded transcript details in scripted follow-ups. It is not an LLM. OpenAI Mode becomes available when the backend reports a configured API key; genuine conversation requires a successful connection. Billing is separate from ChatGPT Pro and hosting.

The setup needs session storage to pass its configuration to the studio. A blocked write keeps the user on Setup with a focusable error. Saving episodes additionally needs localStorage and IndexedDB.

## Studio devices and conversation

The program monitor is a live 16:9 canvas. An enabled webcam is drawn into this same canvas; it is no longer a preview-only device. Without a camera, the guest area shows its camera-off state, never generated guest footage. The microphone has an actual audio meter and a mute control. Camera and microphone permissions can be granted independently. No media is recorded just by entering the studio or starting an interview.

Use **Test audio** before starting. In Demo Mode, **Talk with NOVA** alternates supported speech recognition with NOVA's browser speech; typed answers remain available. **Interrupt** stops host speech, and **Skip question** advances the interview. Browser recognition can be unavailable or vendor-processed, and speaker output can leak into the microphone. Headphones help reduce echo.

OpenAI uses a microphone-backed Realtime WebRTC connection and server instructions. Its returned audio stream can be captured. **Host monitor** controls local playback; muting this monitor does not remove available OpenAI speech from a recording. In Demo Mode, **Host voice** controls browser synthesis, which is not directly exposed as a capture stream.

## Real recording sources

| Source | When it is included |
| --- | --- |
| Guest microphone | A permitted live microphone is required to start a take. Muting the microphone silences its track. |
| Composed studio video | Included when canvas capture and a supported video recorder are available. It contains the actual enabled webcam, NOVA and the selected camera layout. |
| OpenAI host audio | Included only when the connected remote stream actually supplies live audio. |
| Browser-synthesized NOVA | Excluded by default. It can be included through a separately permitted tab-audio stream where the browser supplies one. |
| Selected tab audio | Only after **Producer → Route tab audio**, choosing the intended tab and sharing its audio. All sound in that selected tab may be captured. |
| Shared-screen video | Not used as the studio's video source. The studio still records its own composition. |

Tab audio is optional and browser-dependent. Select this tab and enable **Share tab audio** if the picker offers it. Use Test audio and the NOVA meter before starting the interview and recording. No audio track means no host-audio capture; the app does not replace it with generated speech. The routing control cannot change the source midway through an active take. Stopping browser sharing or losing a device is an error condition, not a success signal.

Select **Start recording** and explicitly accept consent. The REC indicator and recording timer show actual capture. **Pause recording** excludes the paused interval from the media, while the interview's session timer continues. Resume appends a new recorded span to the same take. **Stop recording** finalizes the Blob for replay/download. One take is supported per session. **Stop session & save** closes the conversation, finishes an active take and saves the episode locally.

Browser capture can fall back to microphone audio if video capture is unsupported. If microphone permission is denied, use a transcript-only interview; there is no fabricated recording. Keep the original file as the recovery path when playback or clipping is unsupported.

## Shot director

Wide shows guest and NOVA in the studio. Guest and Host select close-ups. Use the shot buttons or keys 1, 2 and 3; use A to toggle Auto Director when focus is outside text inputs and dialogs. A manual shot turns automatic switching off.

The automatic director follows measured guest voice activity and host speaking state. Silence or simultaneous speech favors Wide. Changes require sustained activity and a minimum three-second shot hold to avoid rapid cuts. Saved cut markers describe the composition already captured in the original file; they are not separate camera tracks.

## Session time, media time and captions

Transcript timestamps are approximate session elapsed time. Recording can start late and pause. Recording segments map the included session spans to continuous media-relative seconds, so a turn during a paused interval does not become a clip from the wrong moment. The editor's timeline and range controls always use recording-file time. Legacy recordings without segments use their earlier start-offset mapping.

Initial caption cues estimate turn boundaries from transcript and capture metadata. They exclude typed answers, speech outside recorded spans and host text when host audio was not captured. They are not word-level transcription alignment. Edit text, start and end in the Captions tab while listening to the recording. Caption burning is optional; review it before sharing. Captions cannot recreate missing audio.

## Episode Editor and outputs

Open an episode from the Library or finish a session. The original player shows only an available captured Blob. A transcript-only episode can still provide editable text. Missing locally stored media is shown as missing, even if its old metadata remains.

Use the seek bar, numerical clip boundaries or playhead buttons to select a range. **Preview selected clip** plays the source range while the vertical canvas follows the actual frames. The editor suggests up to five highlights from recorded guest speech, ranking hook, clarity, standalone context and relevance with local heuristics. Suggestions normally target short moments; short recordings can produce a shorter candidate, and insufficient material produces fewer or none. They are recommendations, not a promise of viral performance.

Three vertical layouts are available:

- **Speaker-aware crop:** uses saved camera cuts and the active caption's speaker to choose a crop from the existing frame.
- **Center crop:** fills the vertical frame with the center of the original video.
- **Full frame + caption space:** preserves the horizontal shot within a vertical background and overlay space.

The preview and renderer share composition code. A composite cannot recover an off-camera guest, a cropped-out host or an angle that was never recorded. Title and captions are optional overlays. Exports use actual captured video and its actual available audio; the browser does not generate replacement footage or narration.

**Render vertical clip** replays and records the selected range locally at 720 × 1280. Keep the tab visible. Rendering takes approximately the clip duration and may be cancelled; navigation, hidden-tab suspension, unsupported formats or stalls can prevent completion. The renderer limits a single clip to five minutes. Output is WebM or native MP4 only when the browser supports that MediaRecorder format; no conversion service is installed. Replay the completed result before downloading.

**Export WAV clip** and **Download audio** decode actual recorded audio where supported. WAV files can be much larger than the compressed original. If decoding or rendering fails, download the original. An audio-only recording cannot become a real video clip through this editor.

Edit the episode title, summary, quotes, show notes and LinkedIn/Instagram/YouTube drafts in Content. Save preserves the episode ID and original media; unsaved text changes need saving before leaving. Default drafts are labeled demo templates built from transcript text. Optional OpenAI improvement sends the transcript to `/api/generate`, incurs separate API usage and still needs review. Download text, transcript or episode JSON for portability. Social posting is manual.

## Hackathon and sample fallback

**Start Hackathon Mode** opens the updated three-question studio with a camera preview, microphone meter, host audio test and consent panel. Answers last 30–45 seconds each, plus question playback. Enable the microphone, optionally enable the camera and accept recording consent. The app uses actual device media and the user's real spoken or typed answers. Its ending can take extra time to speak NOVA's closing and finalize storage. This is not a prerecorded automatic success demo.

`/editor/?sample=1` contains a clearly labeled fictional founder transcript about a failed product pilot. It is a written editing example, not a real interview or testimonial. It contains no guest media and enables no video/audio downloads. Saving it creates a sample-marked local transcript; it does not create media.

## Storage and recovery

Original media is stored in IndexedDB; metadata, transcript and drafts use localStorage. Clips are rendered for replay/download, not automatically backed up to a cloud account. Library search, reopen and delete work on this browser's saved episodes. Settings can delete all local episodes and set preferences for future interviews.

Storage can fill or be blocked. The studio exposes local download recovery when saving fails. Download valuable files before clearing browser data or switching devices. The app has no cross-device synchronization, public podcast feed, remote media upload, payment checkout or team workspace. The production roadmap is in [PRODUCTION.md](PRODUCTION.md).
