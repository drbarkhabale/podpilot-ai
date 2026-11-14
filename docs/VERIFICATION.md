# Verification record and device checklist

This file separates source-level checks from real device validation. A passing unit test or build does not establish successful microphone capture, webcam encoding, tab-audio capture, clip playback or a live OpenAI conversation.

## Checks performed in this documentation pass

- `npm run typecheck` passed on 2026-11-13 after the setup/storage handling and blue-theme additions.
- The current studio, editor, recording, timing and export source was inspected to align the README and feature guide with implemented behavior.
- No paid OpenAI call was made in this pass.
- No successful real-device media capture, browser encoder output or browser speech session is claimed in this pass.

The release workflow below records its production build and unit-test results. To repeat the source checks locally:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

The current unit suites exercise interview/transcript behavior, API boundaries with mocked upstream responses, actual-audio export plumbing, director/recording logic, pause-aware media timing and clip/highlight logic. Browser-like mocks verify control flow; they cannot prove camera availability, audible tracks, A/V synchronization or encoded-file integrity.

## Published-browser checks (2026-11-13)

Version 3 published successfully at the existing PodPilot URL. The production build passed, and all 43 tests passed. Browser checks exercised setup, the three manual camera layouts, manual override of Auto Director, missing-camera and missing-microphone errors, recording consent gating, and the recording failure path without a false REC state.

A two-answer typed Demo Mode interview completed with a closing, saved to the editor as transcript-only, and retained an edited title in the library. Media controls were disabled when no recording existed. The fictional sample remained labeled, saved to a stable episode URL, retained its edited title after reload, and produced a transcript download.

The test browser reported no camera or microphone. Real webcam/audio capture, A/V synchronization, record pause/replay/download, and encoded clip exports were therefore **not verified end to end**. No successful speech-recognition or audible speech-output test is claimed. No mobile-device test or paid OpenAI call was performed. Automated media tests use mocks; they do not substitute for device validation.

## Manual checks before a live presentation

Record browser name/version, OS, capture MIME type, source devices and observed results. Leave each item unverified until it has actually been exercised on the intended device.

| Scenario | Expected observable result | Current device status |
| --- | --- | --- |
| Normal setup and text interview | Mode/topic reach the studio; actual typed answers appear; closing leads to editable local content. | Passed in published desktop browser |
| Denied temporary storage | Setup stays visible with a focused error; no blank studio navigation. | Not verified in this pass |
| Narrow/mobile viewport and keyboard | Readable layout; reachable controls; visible focus; dialogs contain focus and close appropriately. | Not verified in this pass |
| Camera allow/deny/disconnect | Real image when allowed; honest off/error state when denied; no generated guest. | Not verified in this pass |
| Microphone allow/mute/deny/disconnect | Meter reacts only to real input; mute silences capture; denial leaves text usable. | Not verified in this pass |
| Browser voice and recognition | NOVA speaks where supported; recognition takes turns; interrupt/skip work; unsupported recognition offers typing. | Not verified in this pass |
| Recording without consent | No capture starts. Cancelling leaves the interview usable. | Passed: consent gate and cancellation; capture failed honestly with no microphone |
| Guest-only demo take | Actual guest audio and composed frames; no claim that uncaptured synthesis is in the file. | Not verified in this pass |
| Optional selected-tab audio | Picker and explicit audio permission; actual host meter activity; replay confirms shared sound. | Not verified in this pass |
| Pause and resume | Recording duration excludes pause; transcript/media alignment survives resume; no paused speech leaks into cue suggestions. | Not verified in this pass |
| Manual and auto director | Visible camera changes are in the saved video; automatic cuts hold at least three seconds. | Not verified in this pass |
| Stop and replay | Nonempty real Blob; expected video/audio sources, duration and MIME; no duplicate recording. | Not verified in this pass |
| Save and reopen | Same episode ID, original playable media and edited drafts remain after page reload. | Edited text and sample reload passed; real media retention not device-tested |
| Caption edit and render | Text/timing corrections affect the preview and burned result; typed or uncaptured turns do not become automatic speech captions. | Not verified in this pass |
| Vertical export | Actual selected frames/audio; expected 9:16 dimensions; native MIME/extension; no missing frame recovery claim. | Not verified in this pass |
| Cancel/background/stalled export | Useful error or cancellation; no downloadable fake success; resources released. | Not verified in this pass |
| WAV extraction | Playable real-audio segment and full audio where supported; original-download fallback on decoding error. | Not verified in this pass |
| Fictional sample | Clear sample/transcript-only labels; no recorded guest, video, audio or clip download. | Passed, including saved title reload and transcript download |
| Storage quota failure/deletion | Recoverable errors/downloads; deletion removes intended local data without claiming to erase external downloads. | Not verified in this pass |
| OpenAI success and failure | Authorized live conversation proves follow-up/interrupt/transcription; failure visibly falls back to Demo Mode. | Requires separately configured paid API; not run |

## Evidence worth retaining

For one short successful device take, retain the original file, one exported clip and its decoded metadata. Listen to the beginning, a speaker change and a pause boundary; inspect the corresponding frames and captions. Confirm that a transcript-only episode has no media. Repeat on each browser/device claimed as supported.

No screenshot of a recording indicator proves that media was encoded, and no animated avatar proves that its browser voice was captured. Use actual replay and file inspection for those conclusions. Release and deployment confirmation is separate from source/type/build verification.
