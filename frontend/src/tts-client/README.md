# ffxiv-tts-inworld

NPC text-to-speech for Final Fantasy XIV using the [Inworld TTS API](https://inworld.ai/tts-api). Listens to the [TextToTalk](https://github.com/karashiiro/TextToTalk) Dalamud plugin over a local WebSocket and speaks NPC dialogue in real time with voice selection based on each NPC's race and gender.

## How it works

TextToTalk intercepts NPC dialogue and emits it over a local WebSocket as JSON messages containing the speaker name, race, gender, and dialogue text. This app connects to that socket, selects a voice from the configured preset based on the NPC's race/gender, streams audio from the Inworld TTS API chunk by chunk, and plays it through your system speakers in real time. A cancel message from TextToTalk immediately stops playback.

## Why Inworld?

Inworld TTS consistently ranks among the top TTS models according to ELO. It's also surprisingly cheap, especially the mini model. Additionally, they provide $10 in free credits per month for evaluation purposes. It's an amazing deal! I fell in love with them months ago, and this was a fun opportunity for me to learn more about audio streaming while supporting one of my favorite models.

## Prerequisites

- **Final Fantasy XIV**
- **[XIVLauncher](https://goatcorp.github.io/)** — custom launcher that enables Dalamud plugins ([GitHub](https://github.com/goatcorp/FFXIVQuickLauncher))
- **[TextToTalk](https://github.com/karashiiro/TextToTalk)** — Dalamud plugin (install from the in-game plugin installer via XIVLauncher)
- **[Inworld account](https://platform.inworld.ai/signup)** with an API key (get one at [platform.inworld.ai](https://platform.inworld.ai))
- **[Bun](https://bun.sh)** runtime (strongly recommended — npm/yarn work but PRs using them will not be accepted)

## Setup

### 1. Configure TextToTalk

In the TextToTalk plugin settings (`/tttconfig`):

**Backend** — set to **WebSocket** and configure the port (e.g. `57575`).

**Synthesizer Settings** — enable:
- Read NPC dialogue from the dialogue window
- Cancel current speech when new text is available or advanced
- Skip reading voice-acted NPC dialogue
- Read NPC dialogue from the battle dialogue window
- Skip reading voice-acted NPC dialogue (battle)

Disable everything else. The "X says:" prefix is unnecessary noise.

**Channel Settings** — enable **NPC Dialogue** only. Disabling other channels avoids reading chat, emotes, and system messages.

### 2. Create a `.env` file

```env
INWORLD_API_KEY=your_api_key_here
TEXT_TO_TALK_PORT=57575
```

The port must match what you set in TextToTalk. Your Inworld API key is available in the [Inworld Portal](https://platform.inworld.ai) under **Settings → API Keys**.

### 3. Install dependencies

[Bun](https://bun.sh) is strongly recommended. It runs TypeScript natively with no build step and makes the overall experience significantly smoother. npm and yarn will technically work, but will require changing the typescript compile settings or using something like ts-node **PRs that change lockfiles or tooling to npm/yarn will not be accepted**.

```bash
bun install
```

### 4. Run

```bash
bun index.ts
```

Only start this app after FFXIV has fully launched and Dalamud plugins are loaded and running. It will automatically reconnect if the WebSocket drops.

## Voice selection

Voices are selected per-NPC using a priority chain:

1. Named speaker match (by speaker name, lowercased)
2. Race + gender match (e.g. `"au ra female"`)
3. Gender-only fallback (`male` / `female`)
4. Default voice

The default preset is in `presets/default.ts` and covers all current playable races. These were picked somewhat arbitrarily. Feel free to swap them for any voice available in the [Inworld TTS Playground](https://docs.inworld.ai/tts/tts-playground). The `speakingRate` (default `1.2`) can also be adjusted in `presets/base.ts`.

To assign a voice to a specific named NPC, add an entry to `namedVoices` in `presets/default.ts`:

```ts
namedVoices: {
  "character name": "inworld voice name",
}
```

The key is the speaker name lowercased exactly as TextToTalk reports it.

## Notes

- After any FFXIV patch, Dalamud becomes temporarily incompatible and plugins stop working for a few days — longer after an expansion launch. This is normal; wait for Dalamud and plugin updates to catch up before using this.
- The app must be running before you enter a dialogue that triggers speech. It does not replay missed lines.
- Only one instance should be running at a time.
