# NOVA: original human-style host

The bundled portrait atlas at `public/nova/host-atlas.png` was generated for this project from the user’s visual brief and attached inspiration photos. NOVA is an original fictional character, not a named real person. No voice cloning or third-party avatar service is used.

Visual brief: original male podcaster in his thirties, short brown hair, light stubble, navy shirt, over-ear headphones and a black studio microphone; warm amber practical lighting, walnut and plants to the left, deep blue curtain to the right. Four matched portrait frames: listening, small speech mouth, wider speech mouth, blink. No logos or lettering.

`NovaAvatar.tsx` renders the atlas locally on canvas. Soft-masked mouth patches respond to measured host audio energy; a blink frame and subtle idle movement bring the portrait to life. It is a locally animated portrait, not photorealistic generative video or phoneme-perfect lip synchronization.

## Included audio

The three requested questions and closing line are bundled as mono, 24 kHz, 16-bit PCM WAV files under `public/audio/nova/`. They are generic synthetic speech produced locally with Flite’s `rms` voice via FFmpeg, with a 70 Hz high-pass, 7.5 kHz low-pass, loudness normalization to -17 LUFS/-2 dBTP and a short trailing pad. No external AI voice provider, API call, or reference-speaker recording was used.

The local Flite engine is permissively licensed: https://github.com/festvox/flite/blob/master/COPYING . Engine source/documentation: https://github.com/festvox/flite . This repository distributes the synthesized output, not the engine or a voice model.

The same decoded voice source feeds the recording destination and a separate monitor gain. Monitor mute cannot silence the recording destination. `StudioRecorder` mixes that stable host stream with the consented guest microphone before capture begins. Reel export reads the resulting actual mixed media. Missing host audio in an older recording cannot be recovered by this change.
