# Human host and recorded audio verification

Date: 2026-11-13. Production update tested in a Chromium cloud browser.

## Automated checks

51 tests passed, including prompt sequence, 30-second minimum/45-second maximum answer windows, speech-pause behavior, timer reset, separate monitor/recording audio paths, host playback offset after pause, actual non-silent bundled WAV data, host-only recorder sources and bounded host captions. TypeScript and the Next/Sites production build passed. Recorder unit tests use mocked devices; they are not evidence of physical microphone capture.

## Live browser checks

- Setup displayed the human host, default three-question format and exact requested prompts.
- Recording remained consent-gated. The cloud browser reported no microphone; its explicit host-only preview was used. No fake microphone or guest footage was injected.
- Recorded all three included questions and the closing line. Pause held both the answer countdown and captured-time clock; Resume continued them.
- Turned speaker monitoring off before question two. Continued capture without changing the recording audio bus.
- Added an explicitly labeled typed QA answer; it remained transcript text.
- Finished and opened the editor with a real approximately 30-second WebM source.
- Downloaded the source, rendered 7.5–11.5 seconds as a vertical clip with captions, and downloaded the rendered file.
- FFprobe found 1280×720 VP9 video and 48 kHz Opus audio in the source. FFmpeg measured non-silent source audio (mean -20.6 dBFS, peak -2.0 dBFS).
- FFprobe found 720×1280 VP9 video and 48 kHz Opus audio in the exported clip. FFmpeg measured non-silent clip audio (mean -20.7 dBFS, peak -2.3 dBFS). This clip contains the second question captured while monitoring was muted.

## Limits

Physical guest microphone/camera capture and device-specific browser recognition were not exercised in this environment. The optional live OpenAI path was not invoked. A physical-device test remains appropriate before a real interview. Local preview infrastructure was unavailable; verification used the published site. Older files without host audio remain unchanged.
