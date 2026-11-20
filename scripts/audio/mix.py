#!/usr/bin/env python3
"""
Audio mixer for Episode 1: Rule Four.
Mixes Voice (0 dB), ducked Music bed (+3 dB), and SFX (-6 dB),
followed by a soft-knee limiter at -1 dBFS, totaling voice_dur + 1.5s (60.0s).
"""

from __future__ import annotations

import array
import json
import math
import shutil
import wave
from pathlib import Path

from cue import CueResolver, build_ep01_cues
from sfx import (
    SAMPLE_RATE,
    bone_crack,
    fluorescent_hum,
    glass_thump,
    heartbeat_ramp,
    rear_latch_click_boom,
    red_strobe_ping,
    sub_drone,
    vent_scratch,
)

ROOT = Path(__file__).resolve().parent.parent.parent


def db_to_lin(db: float) -> float:
    return 10.0 ** (db / 20.0)


def read_wav_float(path: Path) -> list[float]:
    with wave.open(str(path), "rb") as wf:
        frames = wf.readframes(wf.getnframes())
    arr = array.array("h")
    arr.frombytes(frames)
    return [s / 32768.0 for s in arr]


def write_wav_float(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    arr = array.array("h", (max(-32768, min(32767, int(round(s * 32767.0)))) for s in samples))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(arr.tobytes())


def compute_duck_envelope(voice: list[float], n_total: int) -> list[float]:
    """Smooth speech activity envelope for ducking music bed under narration."""
    env = [1.0] * n_total
    follow = 0.0
    attack = 0.008
    release = 0.0004
    for i in range(n_total):
        v = abs(voice[i]) if i < len(voice) else 0.0
        coeff = attack if v > follow else release
        follow += (v - follow) * coeff
        # Duck music by up to ~6.5 dB when narration is active
        duck = 1.0 - min(0.55, follow * 4.5)
        env[i] = duck
    return env


def add_at(buf: list[float], clip: list[float], t_sec: float, gain: float) -> None:
    start = int(round(t_sec * SAMPLE_RATE))
    n = len(buf)
    for i, s in enumerate(clip):
        idx = start + i
        if 0 <= idx < n:
            buf[idx] += s * gain


def soft_knee_limit(samples: list[float], ceiling_dbfs: float = -1.0) -> list[float]:
    ceil = db_to_lin(ceiling_dbfs)
    knee = ceil * 0.82
    out = [0.0] * len(samples)
    for i, x in enumerate(samples):
        ax = abs(x)
        if ax <= knee:
            out[i] = x
        else:
            excess = ax - knee
            max_ex = ceil - knee
            shaped = knee + max_ex * math.tanh(excess / max(1e-6, max_ex))
            out[i] = math.copysign(min(ceil, shaped), x)
    return out


def main() -> None:
    out_dir = ROOT / "out" / "ep01_rule_four"
    voice_path = out_dir / "voice.wav"
    lines_json = out_dir / "lines.json"
    if not voice_path.exists() or not lines_json.exists():
        raise FileNotFoundError("Missing voice.wav or lines.json; run scripts/voice_el.py first.")

    resolver = CueResolver(lines_json)
    cues = build_ep01_cues(resolver)
    total_dur = cues["total_dur"]
    n_total = int(round(total_dur * SAMPLE_RATE))

    voice_samples = read_wav_float(voice_path)
    voice_bus = [0.0] * n_total
    for i in range(min(len(voice_samples), n_total)):
        voice_bus[i] = voice_samples[i]

    # Music / Ambience bed (+3 dB ducked under narration)
    hum = fluorescent_hum(resolver.voice_dur)
    drone = sub_drone(total_dur, silence_after=cues["drone_silence_at"])
    duck_env = compute_duck_envelope(voice_bus, n_total)
    music_gain = db_to_lin(3.0) * 0.34  # calibrated bed +3 dB relative target
    music_bus = [0.0] * n_total
    for i in range(n_total):
        h_s = hum[i] if i < len(hum) else 0.0
        d_s = drone[i] if i < len(drone) else 0.0
        # Silence fluorescent hum right before L26 as well for stark cliffhanger contrast
        if i / SAMPLE_RATE >= cues["drone_silence_at"]:
            h_s = 0.0
        music_bus[i] = (h_s * 0.45 + d_s * 0.85) * music_gain * duck_env[i]

    # SFX bus (-6 dB)
    sfx_bus = [0.0] * n_total
    sfx_generators = {
        "glass_thump": glass_thump(),
        "vent_scratch": vent_scratch(),
        "bone_crack": bone_crack(),
        "red_strobe_ping": red_strobe_ping(),
        "rear_latch_click_boom": rear_latch_click_boom(max(0.8, total_dur - resolver.E("L26") - 0.01)),
    }
    for ev in cues["sfx_events"]:
        clip = sfx_generators[ev["type"]]
        add_at(sfx_bus, clip, float(ev["time"]), float(ev["gain"]))

    hb_start, hb_end = cues["heartbeat_window"]
    for t_hb, pulse in heartbeat_ramp(hb_start, hb_end, 64.0, 112.0):
        add_at(sfx_bus, pulse, t_hb, 0.85)

    voice_gain = db_to_lin(0.0)
    sfx_gain = db_to_lin(-6.0)

    master = [
        voice_bus[i] * voice_gain + music_bus[i] + sfx_bus[i] * sfx_gain
        for i in range(n_total)
    ]
    master_limited = soft_knee_limit(master, ceiling_dbfs=-1.0)

    master_wav = out_dir / "master.wav"
    write_wav_float(master_wav, master_limited)

    # Also expose browser-playable copy in public/audio/
    public_wav = ROOT / "public" / "audio" / "ep01_master.wav"
    public_wav.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(master_wav, public_wav)

    cues_out = out_dir / "cues.json"
    cues_out.write_text(json.dumps(cues, indent=2), encoding="utf-8")
    print(f"[mix] Mixed {total_dur:.3f}s ({n_total} samples @ {SAMPLE_RATE}Hz) -> {master_wav.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
