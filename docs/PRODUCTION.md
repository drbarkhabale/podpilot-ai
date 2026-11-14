# PodPilot production path

This document describes future engineering work. These services, controls and commercial plans are **not** represented as already integrated or tested. The current product is a browser-local MVP with optional OpenAI server endpoints.

## Preserve the honest product boundary

Keep the active engine visible. Demo questions, browser speech, extractive templates and an animated canvas must remain distinguishable from actual OpenAI conversations. Show the capture sources and recording state before and during recording. Treat timestamps and AI-generated text as drafts that users review. A missing recording must remain a missing recording; never substitute a transcript or synthetic media under the same label.

Paid tiers on the pricing page are proposals. Before selling them, implement real entitlements, cancellation, billing reconciliation and a measured cost model. Do not promise unlimited voice usage. Determine actual costs from provider usage, session length and observed infrastructure consumption, then set quotas and margins. ChatGPT subscriptions, API billing and deployment hosting are separate considerations.

## Identity and cost controls

The hosted API currently expects Sites-injected authenticated identity, verifies the request origin, bounds payloads, and applies an in-memory request throttle. The local Node adapter listens only on loopback and permits localhost development. The throttle is per process/isolate: it is not a distributed rate limit, an invoice, or a reliable spending cap.

Before serving a wider audience:

1. Keep the Sites access boundary, or replace it with a verified authentication system on another host. Never trust identity headers supplied directly by an untrusted client.
2. Enforce server-side user and organization authorization for session creation, editorial generation and stored assets. Reject suspended users and exhausted quotas before making provider calls.
3. Use a shared durable rate-limit and quota store. Track concurrent sessions, maximum session duration, request counts, daily token/audio budgets and organization spend. Client timers alone are not an authoritative cost control.
4. Add server-controlled session lifecycle/termination, idempotent accounting and reconciliation against provider usage. Report both raw usage and a clearly identified pricing version when estimating costs.
5. Keep provider secrets in runtime secret storage, rotate through a controlled process, and redact keys, SDP details, audio and transcript content from routine logs.
6. Add operational alerts for elevated error rates, unusual session creation, quota exhaustion and unexpected spend. Establish an emergency off-switch for paid requests while keeping Demo Mode available.

The current API's bounded JSON validation and generic errors are useful safeguards, but do not replace abuse monitoring, distributed quotas or security review. Revalidate supported Realtime event shapes and model names against official documentation before release; no paid live call was made merely to generate these source files.

## Cloud persistence with Supabase

Supabase is an upgrade option, not a current dependency. Keep the `lib/storage.ts` boundary so local storage can be replaced without rewriting the studio. Migrate only after choosing the identity model, retention requirements and hosting boundary.

A reasonable design is:

- Episode metadata and versioned transcript/content records in Postgres, owned by a verified user or organization.
- Actual media in private object-storage buckets, with short-lived authorized download URLs and explicit upload progress.
- Server-verified identity mapped to row ownership. On Sites, retain the existing host identity or deliberately implement a supported identity bridge; do not assume a Sites identity is automatically a Supabase user.
- Row Level Security on exposed tables, with ownership predicates for reads and writes. Organization roles must come from trusted membership records, not user-editable profile metadata.
- Storage policies aligned with the same ownership model. Never make all podcast media public merely to simplify replay.
- Server-only privileged credentials. A browser may receive a publishable key only with an appropriate verified session and restrictive policies; service/secret keys must never reach the frontend.

Build and test cross-user denial cases, account removal, revoked access, failed uploads, duplicate retries and signed-URL expiry before migration. Update permissions deliberately: table access grants and row policies are separate controls. Use migrations and backups; test restore before treating storage as durable.

Relevant current documentation: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), and [changelog](https://supabase.com/changelog.md). No database, buckets, schema, authentication project or migration is provisioned by this MVP.

## Media pipeline and exports

Browser MediaRecorder and canvas capture keep the first version small, but codecs, permissions and background tab behavior differ across devices. Add a tested browser/device matrix with microphone denial, disconnected devices, long sessions, silent input, interrupted network, low storage and tab suspension.

The current implementation records the same canvas shown in the program monitor, including the actual enabled webcam, NOVA and manual/automatic camera changes. Recording consent names these sources. Pause/resume stores session-to-media segments, and saved camera cuts use media-relative time. The editor maps eligible transcript turns into recorded spans and labels initial captions as approximate. Existing continuous recordings remain readable through start-offset fallback.

Browser-generated host speech is not directly exposed as a captured Web Audio stream. Demo Mode therefore excludes it by default. An optional selected-tab audio route now requests separate screen-sharing permission and mixes only an actual audio track when the browser supplies one. The source labels disclose selected-tab sound; screen-sharing pictures are not the video recording source. Available OpenAI remote audio is another actual capture source, independent of local monitor muting. None of these paths has a successful real-device capture claim merely because its code exists.

The current vertical clip renderer replays real recorded footage into a 720 × 1280 canvas, overlays an optional title/captions and re-records its actual audio/video through browser APIs. Preview and export share framing code. This is local real-time re-encoding, not a frame-accurate server transcoder. Native codec support determines WebM or MP4; keep the tab visible and validate completed clips. A composed frame cannot recover an angle or image area absent from the original capture. Audio extraction uses actual decoded samples, with original downloads as a fallback.

For production, preserve original captured bytes and a versioned media manifest containing sources, segments, cuts, MIME type, measured duration and capture errors. Chunk uploads with resumable transfer and checksums can reduce data loss. Durable processing jobs and a tested transcoder can provide normalized formats, sample/frame-accurate cutting, long exports, thumbnails and precise forced-alignment captions. Add independent camera/host tracks only with matching consent and storage controls. Keep approximate transcript timings distinct from verified media alignment.

The avatar renderer remains modular so another provider could be introduced later, but no third-party avatar or voice integration exists. The fictional sample transcript has no media and must never be presented as a completed interview or a test of capture/export. See [the verification checklist](VERIFICATION.md) for the device checks that remain separate from automated logic tests.

## Privacy and editorial controls

Separate consent to use a speech provider from consent to retain a recording, consent to upload media and consent to publish it. Before cloud storage, define retention periods, deletion guarantees, export behavior, backup deletion handling and who can access organization content. A local deletion cannot erase a file already downloaded or content already sent to a provider.

Web Speech recognition may use the browser provider's servers; browser-only application logic does not imply offline or device-only processing. Review current OpenAI data controls for API processing and any desired retention configuration. The editorial endpoint sets `store: false`, which must not be described as a universal zero-retention guarantee across all products and processing layers.

Treat interview topics and transcripts as untrusted content. Constrain editorial output to the transcript, validate structured output, retain its provenance, and require user review before publishing. Any future automated posting needs separate explicit authorization and verified destinations.

## Deployment and observability

The Sites Worker embeds the static export for a small self-contained MVP. As the application grows, move static files to supported host asset storage/CDN rather than increasing Worker size indefinitely. Preserve immutable asset hashes and deploy matching source/build versions together. Do not put API secrets into the static build.

On a conventional Node host, use the `build:next` output and put the API behind a production authentication and reverse-proxy boundary. The provided loopback adapter is intended for local operation; it is not a public multi-tenant API gateway.

Add structured redacted diagnostics for browser errors, failed recording starts, storage failures, WebRTC connection states and API failures. Record enough metadata to investigate without logging private conversation contents by default. Maintain distinct development and production credentials, usage budgets and data stores.

## Release gates

- Reproducible install, typecheck, unit tests and deployment build from the committed lockfile.
- Real browser verification of navigation, keyboard operation, mobile layout, text interviews, speech fallback, media permissions, recording playback/download, clipping and deletion.
- Authorized live OpenAI test proving context-aware follow-up, barge-in, transcripts, closing behavior, usage reporting and honest failure fallback.
- Server-side authorization and quota tests for the intended audience, plus review of how trusted identity reaches the API.
- Retention, export and deletion tests for any added cloud media or database layer.
- Measured media duration, track sources and output integrity on supported devices.

Official references: [OpenAI WebRTC guide](https://developers.openai.com/api/docs/guides/voice-webrtc), [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [OpenAI API pricing](https://openai.com/api/pricing/), [API data controls](https://platform.openai.com/docs/guides/your-data), [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder), and [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
