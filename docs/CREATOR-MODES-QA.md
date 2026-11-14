# Creator modes verification — 14 November 2026

## Automated
- TypeScript check passes.
- 80 tests pass, including original media paths, answer timing, consent/recorder behavior, content grounding, empty-transcript behavior, chapter clipping, MP3 frame encoding, and captured-host caption eligibility.
- Production build packages all 14 app routes plus framework error pages.

## Published-browser checks
- Homepage plays the existing original NOVA MP4 (10.747891 seconds); mode navigation is live.
- Hackathon route displays a three-minute presenter guide and opens the correct live-demo studio.
- A labeled host-only test ran all three questions with 10-second answers. Auto Director moved between host and guest views. No guest camera/microphone was available in the remote browser.
- The actual 51.235-second take saved successfully, with 3 media-clock question sections.
- Social drafts populated LinkedIn, Instagram and TikTok with hashtags using explicitly labeled QA notes, without inventing a guest answer when no transcript existed.
- MP3 download inspected by ffprobe: MP3 codec, 44100 Hz stereo, 51.226083 seconds, 1,229,426 bytes.
- Batch rendering completed all 3 vertical clips. First export inspected: 720×1280, video + non-silent stereo audio, 20.960708 seconds. Initial generic MP4 output used VP9/Opus, so export selection was tightened to allow only explicit H.264/AAC MP4 or a clearly labeled WebM fallback.
- Timeline displays actual decoded waveform, chapter buttons and trim controls. Selecting Q3 updates selection and playhead.
- Full-length Podcast opens the conversational studio, accepts a typed answer, produces an explicitly scripted follow-up, and saves a transcript-only episode without claiming recorded media.

## Not verified with real guest hardware
Live microphone capture, webcam foreground segmentation, browser recognition accuracy, mobile hardware and configured paid-provider conversations require the user's device / configured credentials. Do not present host-only tests as proof of both-voice capture. No new promotional MP4 was attached in this request. Local landing-video upload is a browser-local preview, not publication for other visitors.
