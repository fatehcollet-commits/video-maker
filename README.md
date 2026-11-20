# Sector Seven: The Night Shift — Episode 1 ("Rule Four")

Code-only 2.5D vertical horror short pipeline (`1080×1920 @ 30fps`, exported at `1440×2560`, exact `60.0s` / `1800` frames: `58.5s` narration + `1.5s` cliffhanger tail).

## Pipeline Commands

1. **Voice & Auto-60s Gap Tuning**
   ```bash
   python3 scripts/voice_el.py --target 58.5 --tail 1.5
   ```
   Reads `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` from `.env`, calls ElevenLabs `/v1/text-to-speech/{voice_id}/with-timestamps` (`eleven_multilingual_v2`, `speed: 0.98`) with SHA-256 disk caching in `out/ep01_rule_four/voice_cache/`, trims silence at `-42 dBFS` (`25ms` pre-roll / `45ms` post-roll), and tunes inter-line gaps to land at `58.5s`. When `ELEVENLABS_API_KEY` is omitted, synthesizes deterministic speech-cadence narration WAVs so the full pipeline renders offline.

2. **Caption Timeline Generation**
   ```bash
   python3 scripts/timeline.py
   ```
   Chunks `out/ep01_rule_four/lines.json` into non-overlapping cards (`MAX_WORDS = 4`, `MAX_CHARS = 26`, max 1 `#ffd84a` highlight word per card, `isFinal: true` on `L26`) and emits `src/stories/ep01_rule_four/timeline.ts`.

3. **Procedural Audio Mix**
   ```bash
   python3 scripts/audio/mix.py
   ```
   Synthesizes 48kHz mono seeded horror SFX (`fluorescent_hum`, `sub_drone`, `glass_thump`, `vent_scratch`, `bone_crack`, `heartbeat` ramping `64 -> 112 BPM` across `L11–L25` then cutting silent before `L26`, `red_strobe_ping`, and `rear_latch_click_boom`) and mixes Voice (`0 dB`), ducked Music (`+3 dB`), and SFX (`-6 dB`) through a `-1 dBFS` soft-knee limiter into `out/ep01_rule_four/master.wav`.

4. **Build Guard, Unit Tests & Regression Stills**
   ```bash
   npm run check
   npx --yes tsx --test src/engine/contract.test.ts
   npm run stills
   ```

5. **Full 1440×2560 Export**
   ```bash
   npm run render:ep01
   ```
   Outputs `out/ep01_rule_four/EP01_RULE_FOUR.mp4` (`H.264`, `CRF 14`, `AAC 256k @ 48kHz`, `+faststart`).
