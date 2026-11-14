# Supplied three-part NOVA interview

The existing `/studio/` now opens the prerecorded NOVA experience. The homepage is unchanged. Previous interview modes remain at `/studio/?legacy=1`.

## Media

The user-supplied files are copied byte-for-byte into `public/nova-video/part1.mp4`, `part2.mp4`, `part3.mp4`. They are not regenerated, re-voiced, recompressed or trimmed. Each has H.264 1280×720 video and AAC audio. Container durations: 10.747891, 4.176621 and 6.066000 seconds. File endings determine transitions; no guessed sentence timestamps are used. The user's separate clips are the authoritative edit; independent word-level transcription is not available here.

## Behavior

Explicit camera and microphone actions; optional camera; microphone required for guest recording. Consent is required. An explicitly labeled host-only test permits a test when guest hardware is unavailable. A shared canvas supplies the preview and video recorder. Each media element connects to a stable Web Audio bus before the recorder starts, with a separate monitoring gain. The guest microphone is mixed into the same recorder.

The `ended` event starts the answer countdown. Default 10 seconds; options 20/30/60. Pause suspends video, recording and countdown together. Skip stops the old clip before the next begins. Auto Director selects NOVA during video and guest during answers. Manual selection disables automatic cuts. End safely finalizes real media, displays playback/download, and attempts browser-local episode storage. Original recordings and legacy pages remain available.

The result contains a question script, not a generated guest transcript. The format is browser-native WebM where supported, with native MP4 only when the browser can genuinely encode it. There is no disguised file-extension conversion.

## Virtual background limitation

Real person segmentation is **not enabled**. The UI explicitly labels this and uses normal camera video. The studio frame does not remove the guest's room. No image is placed behind an opaque camera and described as a virtual background. A future segmentation adapter must provide an alpha-matted person canvas to the shared compositor and pass movement, hair-edge, latency and recording checks before being offered.

## Checks

70 tests and TypeScript passed after the initial implementation. New tests verify supplied-clip order, the ten-second answer boundary, and pause/resume active-time behavior. Managed preview infrastructure returned `preview relay unavailable: No such file or directory`; publication is used for browser QA. Physical camera/microphone and real mobile-device verification still require the user's devices. This document does not assert those checks passed.

## Published-browser QA (version 12)

- All three MP4s loaded with readyState 4 and the exact measured durations, without media errors. SHA-256 comparisons confirm they match the supplied files byte-for-byte. All source audio decoded with nonzero RMS.
- Camera and microphone buttons returned truthful device-not-found errors in the cloud browser. Actual physical guest capture and the separate denied-permission branch were not verified here. No guest hardware is fabricated.
- Consent was required. Selected the explicitly labeled host-only test, then ran all three clips and all three default answer periods to automatic completion.
- During question one the preview selected NOVA. After its end the preview selected the guest and started the countdown. Paused with seven seconds remaining: countdown and recorded time stayed fixed across observations. Resume continued from seven seconds. Question two and three followed automatically.
- Monitoring was muted after question one. The genuine downloaded file decoded as 1280×720 VP9 video plus Opus audio, lasting 51.24 seconds (pause excluded). RMS audio: 0–10s = 0.078883; 21–25s = 0.071802; 36–41s = 0.077043. Silent test answer intervals 12–19s, 27–34s and 43–50s measured zero, as expected without a guest microphone. This verifies all three original host audio segments and separated answer windows, not real guest sound.
- Results displayed an actual recording, duration, format, download and saved-episode link. Download succeeded; playback control was exercised and the file decoded successfully. Extracted frame 37 is `evidence/nova-video-recording.jpg`.
- A second take verified manual camera 1/2/3, manual override disabling Auto Director, re-enabling Auto Director, skip from question one to two (first video paused while second played), and early stop with an actual seven-second saved take. Record Another Interview returned to a fresh consent screen.
- No end-to-end mobile-device test, person-segmentation test, guest transcription, or real guest-camera/microphone test is claimed. Those are distinct from this verified host-only browser recording.

Final polish corrects host-only result wording and preserves explicit paid-engine routing in the existing studio wrapper. No live API is required by the prerecorded video studio.


## Guest camera and virtual set update
The three-question studio now checks iframe camera/microphone policy, offers a standalone studio link, a combined permission request, and input-device selection. Permission denial, absent hardware and busy hardware have separate recovery messages. Browser and OS permission cannot be bypassed.

The default guest view uses MediaPipe Selfie Segmenter locally, feathering the person mask over an original amber/blue acoustic-panel set. Both preview and recording use the same composited canvas. Model/runtime files download from Google and jsDelivr; guest frames are not uploaded. A blocked download leaves the room hidden and offers retry or explicit normal-camera fallback. This supersedes earlier notes saying segmentation is unavailable. NOVA assets remain unchanged.

Verification: TypeScript and automated tests run during packaging. Physical webcam/mic and hair-edge quality still require testing on the guest’s own device; a remote browser has no access to that hardware.
