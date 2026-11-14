# NOAH studio verification

This upgrades the existing PodPilot project and preserves its public audience. The main upgrade was published as version 10. No live provider credentials were available locally or in Sites runtime configuration (revision 0, no variables).

## Automated checks

- TypeScript passed; all 67 tests passed; production Next.js export and Sites Worker build passed.
- Coverage includes interview/transcript state, consent/provider validation, missing-credential errors, same-origin and platform identity boundaries, mocked signed URLs and voice bytes, PCM encoding, camera hysteresis, media clock/recorder behavior, captions and old/new speaker crop arrangements.
- Provider tests use mocks. They do not represent a successful live OpenAI or ElevenLabs conversation.

## Published-browser verification

| Capability | Observation |
| --- | --- |
| Approved identity | NOAH's supplied portrait rendered in Host Settings, studio and exported media. |
| Supplied sample video | The labeled prerecorded sample loaded with 10.08-second duration, 1920×1080 dimensions and no media error. Its fictional guest is not presented as a live guest. |
| New uploads | Upload controls, file validation and local persistence are implemented. The automation upload attempt stalled; replacement upload/save/reload is not claimed as verified. |
| Camera/microphone | Enable actions returned device-not-found errors in this cloud browser. No physical guest device was available. Actual guest hardware requires a presentation-device check. |
| Long-form Browser Demo | Start without recording, typed answer, deterministic follow-up quoting the answer, stop and local save worked. The episode was correctly marked transcript-only and media exports were disabled. Browser speech output and physical speech recognition were not verified. |
| Manual camera layouts | CAM 1/2/3 changed the preview to wide/guest/NOAH; manual selection disabled Auto Director. |
| Automatic director | Timing/hysteresis covered by tests. Live two-speaker switching remains unverified without guest hardware. |
| Portrait speaking state | Recorded frame 12 shows NOAH's speaking label and blue audio indicator during the real bundled question. This is stylized portrait motion, not realistic lip-sync. |
| Consent | Recording required consent. Device failure exposed an explicit, labeled host-only option. |
| Actual recording | A 36.06-second host-only take was captured and downloaded: 1280×720 VP9 video plus stereo 48 kHz Opus audio, 1,420,202 bytes. No guest audio/video was present or claimed. |
| Monitor independence | Monitor was switched off before question two. Decoded recording audio was non-silent at 0–5, 11–15, 23–29 and 30–36 seconds, covering three questions and closing. RMS values: 0.15244, 0.13229, 0.13174 and 0.19868. This verifies captured sound, not physical-speaker audibility. |
| Results and downloads | The take opened in the editor with transcript, media metadata, playback controls, timeline and original download. The downloaded file decoded successfully. |
| Vertical export | Selected 0–15 seconds, enabled captions, rendered and downloaded a genuine 720×1280 VP9/Opus clip. Decoded audio duration: 15.0 seconds. Audio RMS for 0–5 and 11–15 seconds: 0.15157 and 0.13196. Frame 12 shows NOAH and the correct hot-take caption. Playback control was exercised; decoded-file verification is the stronger evidence. |
| OpenAI / ElevenLabs | Both visibly unconfigured. Secure adapters and errors are implemented; no paid session, cloned voice, live follow-up or provider interruption has been verified. |
| Mobile | Responsive styles are implemented. A real mobile device/viewport and mobile codecs were not tested. |

Evidence: `evidence/noah-recording.jpg` and `evidence/noah-vertical-clip.jpg`. These are frames from actual browser-generated downloads. The test episode is local to the QA browser; it will not appear in another browser's library.

## Environment limits

Managed preview start and status failed with `preview relay unavailable: No such file or directory`. No substitute preview server or alternative browser automation was launched. Browser QA used the published version.

Browser speech synthesis has no inherently capturable stream. Long-form Demo Mode needs explicit tab-audio sharing for host capture, or a labeled guest-only recording. The separate three-question demo mixes actual bundled host audio directly. Typed text does not become recorded guest speech.

## Before presenting with your camera

1. Open the standalone HTTPS studio, enable camera/mic and verify the actual feed and amber meter.
2. Give consent. Record one host prompt, one guest answer and each camera view. Download and play it; confirm both voices.
3. For long-form Browser Demo, route this tab with audio and check the blue meter, or accept guest-only capture. The three-question demo needs no tab sharing for host audio.
4. For paid modes, configure the server credential and authorized provider IDs, then test a contextual follow-up and interruption. Saved configuration alone is not proof of connectivity.
5. Check replacement image/video upload, save and reload on the presentation browser. Uploads stay in that browser.
6. Review captions and export a 15–60-second section. Check framing, sound and spelling before sharing.

## Final polish after QA

The final patch starts playback from the sample-preview button, permits consent after starting an unrecorded interview, correctly labels transcript-only saves and describes portrait animation accurately. These changes do not add live-provider or hardware verification claims.
