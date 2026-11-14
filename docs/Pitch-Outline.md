# PodPilot AI pitch outline

Ten-slide investor / hackathon presentation. Updated for the directed studio and episode editor. The PPTX contains editable text, tables and architecture objects.

## Slide 1

THE PROBLEM

podpilot AI

01

PodPilot AI

Everyone has a story.

Now everyone has a host.

An expert can have years of experience

and still struggle to fill a blank microphone.

AN AI PODCAST INTERVIEW STUDIO

### Speaker notes

Problem hypothesis: many prospective creators need an interviewer more than another editing tool. No market validation or traction is claimed. PodPilot AI is a built MVP, not a proven business.

## Slide 2

THE SOLUTION

A conversation makes the story easier to tell

NOVA is an original AI host, designed around the guest.

podpilot AI

02

“What’s the story you’ve

been waiting to tell?”

Share the stage with NOVA.

Direct the camera or use Auto.

Shape actual footage in the episode editor.

Deep Dive   /   Startup Founder   /   Debate Mode

Personal Story   /   Expert Interview

### Speaker notes

The upgraded MVP combines the actual enabled guest webcam with the original local NOVA avatar. It provides wide, guest and host views, manual direction, and a deterministic Auto Director driven by measured guest activity and NOVA speaking state. The same canvas feeds recording. Demo Mode uses deterministic interview questions, not OpenAI inference. OpenAI conversation requires separate API configuration and billing. NOVA does not impersonate a real person.

## Slide 3

LIVE DEMO

The interview becomes an editable episode

Use actual camera and microphone media when the presentation device supports them.

podpilot AI

03

01

Prepare the studio

Enable devices, test audio, then give consent.

02

Tell the story

Answer NOVA. Try wide, guest and host views.

03

Find a moment

Save the take. Select a highlight or trim a range.

04

Shape the clip

Review captions, preview 9:16 and render real footage.

No devices? The verified typed flow saves a transcript. No recording or clip is invented.

### Speaker notes

Published at https://podpilot-ai-studio.balebarkhaphd.chatgpt.site . Suggested topic: What my first failed startup pilot taught me about listening. Camera footage is real webcam input, not generated guest video. Recording includes the composed studio and actual available audio streams. Browser-generated host speech is excluded unless explicit selected-tab audio sharing supplies a real stream. The browser test environment had no camera or microphone: typed interview, three manual shot layouts, Auto/manual toggle, missing-device errors, consent gating, transcript-only editor and same-ID local save were verified. Actual device capture, playback, video rendering and OpenAI voice remain unverified. Rehearse those on the presentation device.

## Slide 4

TECHNICAL ARCHITECTURE

A browser studio with an optional AI boundary

Next.js, React and TypeScript share one UI across both interview engines.

podpilot AI

04

Studio UI

Guest devices + NOVA

Canvas compositor

Camera Director + speech

Session handshake server

Origin + identity checks

OpenAI Realtime

WebRTC + Responses

Episode Editor

Local media + clip export

Server handles setup. WebRTC media travels directly between browser and OpenAI. API keys stay server-side.

### Speaker notes

Implementation: Next.js 15, React 19, Tailwind CSS 4, TypeScript. Browser modules cover original avatar drawing, actual webcam composition, audio meters, deterministic camera direction, consent-gated MediaRecorder capture and episode editing. Recording segments map session time to captured media time across pauses. IndexedDB stores actual Blobs. The editor uses local highlight heuristics, editable approximate captions, a 720x1280 compositor and real-time MediaRecorder export of actual source frames/audio; it does not generate missing camera angles. OpenAI uses the server-created Realtime unified WebRTC handshake at /v1/realtime/calls and Responses for optional editorial drafts. Long-lived keys remain server-side. No credential or paid live session was tested. Official reference: https://developers.openai.com/api/docs/guides/voice-webrtc .

## Slide 5

DIFFERENTIATION

A complete studio with visible boundaries

Both engines use the same original avatar, capture controls and local editor.

podpilot AI

05

Capability

Browser Demo

OpenAI Mode

Conversation

Deterministic questions

and bounded recall

Context-aware model

with interruption support

Audio source

Guest microphone

Optional shared tab audio

Guest microphone

Available OpenAI stream

Episode editing

Local highlight heuristics

Captions and 9:16 export

Same local editor

Optional AI editorial drafts

Webcam and media exports are implemented. Hardware testing and live OpenAI testing remain open.

### Speaker notes

The comparison is between product modes, not a competitive claim. Browser speech synthesis is excluded from recordings unless a separately permitted tab capture actually supplies audio. All sound from that selected tab may be recorded. The editor exports actual recorded frames and audio in a supported MIME format, with WAV audio as another option. It does not rename WebM as MP4 or create footage from transcripts. Captions begin as approximate turn timing and remain editable. Local highlight scores are explainable rules, not AI confidence scores. Hardware capture and rendering remain unverified in this environment; the browser had no devices. OpenAI is implemented but not configured or live-tested.

## Slide 6

TARGET CUSTOMERS

Experts, founders and small content teams

Initial segments are hypotheses to validate in a small pilot.

podpilot AI

06

Independent experts

Turn professional knowledge into a recurring conversation.

Recruit through professional communities.

Startup founders

Tell the real product story behind a launch or pivot.

Recruit through founder and accelerator networks.

Small content teams

Help a subject expert talk before an editor shapes the output.

Test with teams publishing an existing series.

### Speaker notes

Customer and channel choices are proposed validation targets, not claims of existing demand. The first pilot should test whether guided interviews make these users publish more consistently and return for another session.

## Slide 7

BUSINESS MODEL

Free entry. Paid depth when value is proven

Paid tiers are proposed. The MVP has no checkout or active subscriptions.

podpilot AI

07

Tier

Price

Intended value

Free

$0

Browser studio, local episodes and clips

Creator

$19 / month

Planned hosted AI and cloud backup

Pro

$49 / month

Planned brand presets and batch clips

Business

Custom

Planned teams and organization controls

OpenAI API usage and hosting are separate costs. ChatGPT Pro does not supply API credits.

### Speaker notes

Pricing matches components/PricingSettings.tsx: Free $0 available now, Creator $19/month proposed, Pro $49/month proposed, Business custom proposed. Planned features are not currently part of these paid subscriptions because subscriptions are not launched. Validate willingness to pay and unit economics before promising allowances.

## Slide 8

MARKET OPPORTUNITY

An initial market among independent creators

Illustrative revenue scenarios for the proposed $19 Creator tier.

podpilot AI

08

$5,700

monthly recurring revenue at 300 paying creators

Scenario only. Not revenue, traction or a forecast.

Paying creators

Monthly revenue

100

$1,900

300

$5,700

1,000

$19,000

### Speaker notes

Illustrative bottom-up scenarios only: paying creators multiplied by proposed Creator price of $19/month. 100 x $19 = $1,900 MRR. 300 x $19 = $5,700 MRR. 1,000 x $19 = $19,000 MRR. No TAM, market-share, customer or revenue claim is made. Next research: reachable prospects, conversion, repeat usage, support burden and API cost per completed interview.

## Slide 9

ROADMAP

The next milestone is device-tested repeat use

The working flow has browser evidence. Media quality still needs real devices.

podpilot AI

09

VERIFIED IN BROWSER

Interview to editor

Typed answers and closing

Manual shots and error states

Local editing and same-ID save

PILOT GATES

Prove real media

Webcam, mic and tab audio QA

Playback and clip rendering

Live OpenAI and mobile tests

PRODUCTION

Make it dependable

Auth, cloud storage and RLS

Distributed quotas and billing

Measured cost and retention

### Speaker notes

Upgrade verification supplied by the project owner: production deployment v3 succeeded at the original site; 43 automated tests, TypeScript checking and production build passed. Browser checks covered setup, all three manual shot layouts, Auto/manual toggling, missing-camera and missing-microphone errors, consent disabled until checked, no false recording indicator after failure, two typed answers plus closing, transcript-only editor with media controls disabled, edited title, and library persistence under the same episode ID. The browser had no camera or microphone. Actual webcam/audio capture, playback, clip rendering, mobile device behavior and live OpenAI connectivity remain unverified. Production items are future work, not current integrations.

## Slide 10

THE ASK

podpilot AI

10

Ten storytellers.

Four weeks.

A reason to come back.

We’re looking for pilot partners who already publish,

and experts who have a story they keep postponing.

The test: complete an episode, share something useful, and return for another interview.

### Speaker notes

This is a proposed pilot ask, not an existing cohort. Recruit ten target users for four weeks. Measure completed interviews, published outputs, repeat sessions, qualitative interview quality, and API cost for configured sessions. Ask the audience for introductions to suitable pilot participants. No funding amount or fabricated traction is claimed.
