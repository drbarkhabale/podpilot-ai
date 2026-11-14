# PodPilot AI - 3-minute hackathon demo script

Everyone has a story. Now everyone has a host.

**Target run time:** 3:00 using the segment marks below. Stage cues are not spoken. Rehearse the timing; browser permissions and media rendering do not have a guaranteed duration.

## Before the timer starts

- Open the published site at https://podpilot-ai-studio.balebarkhaphd.chatgpt.site and complete a short device test on the presentation computer. Use headphones and HTTPS. Keep the site visible while recording and rendering.
- Prepare Sam as the guest and **What a failed startup pilot taught me about listening** as the topic. Select **Startup Founder**, **Curious**, **5 minutes**, and **Demo Mode**. Use the ordinary studio for the timed pitch so you can finish early. The separate Start Hackathon Mode option opens the three-question interview with device and consent checks; allow 30–45 seconds per answer plus host playback, or advance manually.
- Enable the real camera and microphone before the pitch. Do not use fake camera footage. If either is unavailable, use the fallback cues below. The guest camera is now part of the recorded composition when enabled.
- Turn **Host voice off** to keep the presenter narration clear. Browser-generated host speech is excluded from recordings unless **Producer > Route tab audio** explicitly supplies a real selected-tab audio stream. If demonstrating that option, select the intended tab, enable its audio, confirm the blue meter, and remember all sound in that tab may be included.
- Keep two supplied guest answers ready to paste. The words are demonstration content, not a claim about the presenter's own company. Speak them aloud during the take if demonstrating captured voice. Typed text alone does not create recorded speech or eligible audio captions.
- If showing video export, rehearse it on this browser and choose a 3-5-second recorded segment. Rendering happens in real time. Keep a previously captured, clearly identified rehearsal take ready only as a fallback; never imply it was recorded live.

## 00:00 - 00:20 | Give the story a host

**Stage cue:** Start on the landing page. Enter the prepared studio. Show the guest and NOVA together in the wide shot.

**Say:** Most people have a story worth hearing, but no interviewer waiting across the microphone. PodPilot gives that story a place to start: NOVA, an original digital host, and a studio where the guest and host share the frame. Everyone has a story. Now everyone has a host.

## 00:20 - 00:40 | Make the promise clear

**Stage cue:** Point to DEMO MODE, then start the interview. Show the question and live transcript. Host voice stays off for the timed narration.

**Say:** I chose a Startup Founder conversation about a failed pilot. This is Demo Mode: scripted questions, browser speech, and a visible text fallback. It is not an OpenAI conversation. NOVA asks one question at a time, and I can interrupt or skip whenever I need to.

## 00:40 - 01:10 | Capture with permission

**Stage cue:** Select Start recording. Read the capture sources, check consent, then start. Confirm the REC state and advancing captured-time timer before claiming capture. Say the demonstration answer and use Talk with NOVA when supported; otherwise paste the same answer while speaking it into the actual recording microphone.

**Say:** Recording asks for permission separately. With my devices enabled, the composed take includes my webcam, microphone, NOVA's animated visuals, and camera cuts. Browser host speech stays excluded unless I explicitly route real tab audio. Here is our sample answer: Our first pilot failed because we built what we assumed customers needed. One customer showed us their actual workflow, and we started listening before building.

## 01:10 - 01:35 | Direct the conversation

**Stage cue:** Select Guest, then NOVA, then Wide. Show that a manual cut turns Auto Director off. Toggle Auto back on. If measured voice activity is available, allow at least three seconds for a shot to settle. Submit the second answer. Optionally pause and resume recording once, without suggesting the interview timer pauses.

**Say:** I can direct wide, guest, and NOVA shots myself, or use a rule-based Auto Director that follows speaking activity. This is camera switching, not generated guest footage. NOVA's demo follow-up reuses a detail through local rules. Our second answer: We stopped counting features and started asking whether customers could finish their work.

## 01:35 - 02:15 | Edit the actual take

**Stage cue:** Stop recording, then Stop session & save. Open the Episode Editor. If media exists, play it briefly, choose a 3-5-second range and preview the vertical composition. Show the captions tab and editable timing. Render only if preflight succeeded; wait for completion and play the result before downloading. If time runs short, show the controls without claiming an export completed.

**Say:** The episode opens in an editor with its actual recording and transcript. I can choose a moment, adjust its boundaries, and preview a vertical composition. Highlight suggestions use local text heuristics. Caption timings are approximate and editable, so I review them against the sound. A supported browser can render a nine-by-sixteen clip from the source frames and audio. It cannot invent a missing camera angle or turn a transcript into footage.

## 02:15 - 02:40 | Show what is proven

**Stage cue:** Edit the episode title and Save episode. Open My episodes and reopen the same episode. State the verification boundary accurately. If a render is still running, cancel it or keep the editor visible; do not move away and claim success.

**Say:** I can also edit the title, show notes, and social drafts, then save the same episode locally. Browser checks verified the typed interview, camera-layout controls, honest missing-device states, and editing through the library. Automated tests and the production build pass. Real-device capture, playback, and clip rendering still need device testing. OpenAI is optional, unconfigured here, and billed separately from ChatGPT Pro.

## 02:40 - 03:00 | Ask for repeat storytellers

**Stage cue:** End on the studio or editor. If media succeeded on the presentation device, refer only to the captured take shown. Make the pilot-partner ask and finish at 03:00.

**Say:** We are looking for ten pilot storytellers over four weeks: founders, experts, and small content teams. Help us learn whether a guided conversation becomes something useful to publish, and whether people return for a second episode. You bring the story. NOVA brings the questions.

## Recovery cues

- **No microphone:** Continue with typed answers. Do not start or claim a recording. Say: "This browser has no microphone. The interview still works as a transcript."
- **No camera:** If the microphone works, use the actual microphone plus available studio visuals. Say: "The guest camera is unavailable; this take will not contain guest webcam footage."
- **Recording denied or unsupported:** Continue without recording and finish the text interview. The editor should show transcript-only state and disabled media actions. Say: "No media was captured, so PodPilot does not offer a pretend clip."
- **Recognition unavailable:** Type the answer. If a real microphone take is running, speaking the same answer records the voice, but typed transcript entries are not automatically treated as speech-aligned captions.
- **Export fails or exceeds the pitch time:** Cancel and download the original where possible. Say: "This device has not completed the clip render. The original recording is unchanged."
- **Only a sample is available:** Open the clearly labeled sample transcript. State that it is fictional written content with no audio or video. Do not call it a recorded demo.
- **Timing slips:** Omit the second answer, pause/resume, or the live render. Keep Demo disclosure, real consent, the actual saved result, and the pilot ask.

## Verification boundary for this upgrade

The production site was published successfully. The upgrade passed 43 automated tests, TypeScript checking, and a production build. Browser interaction verified setup, all three manual shot layouts, Auto/manual toggling, missing-camera and missing-microphone messages, consent disabled until checked, no false recording state on failure, two typed answers plus a closing, transcript-only editor with media actions disabled, title editing, and saving under the same episode ID in the library.

The browser test environment had no camera or microphone. Actual webcam/audio capture, tab-audio capture, playback, clip rendering, mobile device behavior, and live OpenAI conversation remain unverified. The media paths are implemented, not proven on real devices by this run.

Episodes and recordings stay in browser storage until deletion or site-data loss. Download what you want to keep. Web Speech recognition may use the browser provider's service. Demo interviewing and its templates do not make OpenAI API calls.
