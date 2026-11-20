#!/usr/bin/env python3
"""
ElevenLabs Voice + Auto-60s Timing Engine for Sector Seven: The Night Shift.
Reads stories/ep01_rule_four/lines.txt, fetches/caches ElevenLabs TTS with word timestamps
(or synthesizes deterministic speech-cadence WAVs when ELEVENLABS_API_KEY is unset),
trims leading/trailing silence at -42 dBFS (25ms pre-roll, 45ms post-roll),
and tunes inter-line gaps to hit TARGET_VOICE_SEC (58.5s) + 1.5s tail = 60.0s.
"""

from __future__ import annotations

import argparse
import array
import base64
import hashlib
import json
import math
import os
import random
import re
import struct
import subprocess
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path
from typing import Any

try:
    import numpy as np  # type: ignore
except ImportError:
    np = None  # Pure-Python array fallback is used seamlessly

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_RATE = 48000
THRESHOLD_DBFS = -42.0
PRE_ROLL_SEC = 0.025
POST_ROLL_SEC = 0.045
DRAMATIC_PAUSE_LINES = {"L16": 0.25, "L26": 0.25}
GAP_MIN_SEC = 0.10
GAP_MAX_SEC = 0.42


def load_dotenv(env_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not env_path.exists():
        return values
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        values[k] = v
    return values


def read_wav_mono(path: Path) -> list[int]:
    with wave.open(str(path), "rb") as wf:
        assert wf.getnchannels() == 1, f"Expected mono WAV: {path}"
        assert wf.getsampwidth() == 2, f"Expected 16-bit PCM WAV: {path}"
        assert wf.getframerate() == SAMPLE_RATE, f"Expected {SAMPLE_RATE}Hz WAV: {path}"
        frames = wf.readframes(wf.getnframes())
    arr = array.array("h")
    arr.frombytes(frames)
    return list(arr)


def write_wav_mono(path: Path, samples: list[int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    arr = array.array("h", (max(-32768, min(32767, int(s))) for s in samples))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(arr.tobytes())


def trim_silence_dbfs(
    samples: list[int],
    threshold_dbfs: float = THRESHOLD_DBFS,
    pre_roll_sec: float = PRE_ROLL_SEC,
    post_roll_sec: float = POST_ROLL_SEC,
) -> tuple[list[int], float, float]:
    """Trim leading and trailing silence below threshold_dbfs with pre/post roll."""
    if not samples:
        return [], 0.0, 0.0

    thresh_amp = int((10.0 ** (threshold_dbfs / 20.0)) * 32767.0)
    pre_n = int(round(pre_roll_sec * SAMPLE_RATE))
    post_n = int(round(post_roll_sec * SAMPLE_RATE))

    if np is not None:
        arr = np.asarray(samples, dtype=np.int16)
        idx = np.flatnonzero(np.abs(arr) >= thresh_amp)
        if idx.size == 0:
            return samples, 0.0, 0.0
        first = int(idx[0])
        last = int(idx[-1])
    else:
        first = -1
        last = -1
        for i, v in enumerate(samples):
            if abs(v) >= thresh_amp:
                if first == -1:
                    first = i
                last = i
        if first == -1:
            return samples, 0.0, 0.0

    start_idx = max(0, first - pre_n)
    end_idx = min(len(samples), last + 1 + post_n)
    head_trim_sec = start_idx / SAMPLE_RATE
    tail_trim_sec = (len(samples) - end_idx) / SAMPLE_RATE
    return samples[start_idx:end_idx], head_trim_sec, tail_trim_sec


def extract_words_from_char_alignment(
    script_text: str,
    chars: list[str],
    starts: list[float],
    ends: list[float],
    head_trim_sec: float,
    max_dur: float,
) -> list[dict[str, Any]]:
    """Map ElevenLabs character timestamps back to exact script words preserving punctuation."""
    tokens = script_text.split()
    if not tokens:
        return []

    if not chars or len(chars) != len(starts) or len(chars) != len(ends):
        return uniform_word_timings(script_text, max_dur)

    # Build character stream excluding whitespace for robust alignment matching
    non_ws_times: list[tuple[str, float, float]] = []
    for ch, st, en in zip(chars, starts, ends):
        if not ch.isspace():
            adj_s = max(0.0, min(max_dur, float(st) - head_trim_sec))
            adj_e = max(adj_s + 0.02, min(max_dur, float(en) - head_trim_sec))
            non_ws_times.append((ch, adj_s, adj_e))

    words_out: list[dict[str, Any]] = []
    cursor = 0
    for tok in tokens:
        clean_len = len(tok)
        if cursor < len(non_ws_times):
            w_start = non_ws_times[cursor][1]
            end_cursor = min(len(non_ws_times) - 1, cursor + clean_len - 1)
            w_end = non_ws_times[end_cursor][2]
            cursor = min(len(non_ws_times), cursor + clean_len)
        else:
            prev_end = words_out[-1]["end"] if words_out else 0.0
            w_start = prev_end
            w_end = min(max_dur, w_start + 0.12)
        words_out.append({
            "word": tok,
            "start": round(w_start, 4),
            "end": round(max(w_start + 0.03, w_end), 4),
        })
    return words_out


def uniform_word_timings(text: str, duration: float) -> list[dict[str, Any]]:
    tokens = text.split()
    if not tokens:
        return []
    weights = [max(2.0, len(re.sub(r"[^A-Za-z0-9]", "", t)) + (1.2 if t.endswith((".", ",", ":", "?")) else 0.0)) for t in tokens]
    total_w = sum(weights)
    t_cur = 0.03
    usable = max(0.15, duration - 0.07)
    out: list[dict[str, Any]] = []
    for tok, w in zip(tokens, weights):
        dur = usable * (w / total_w)
        st = t_cur
        en = min(duration - 0.02, st + dur * 0.92)
        out.append({
            "word": tok,
            "start": round(st, 4),
            "end": round(max(st + 0.04, en), 4),
        })
        t_cur += dur
    return out


def call_elevenlabs_line(
    api_key: str,
    voice_id: str,
    text: str,
    prev_text: str | None,
    next_text: str | None,
    cache_dir: Path,
) -> tuple[Path, dict[str, Any]]:
    payload: dict[str, Any] = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.78,
            "style": 0.14,
            "use_speaker_boost": True,
            "speed": 0.98,
        },
    }
    if prev_text:
        payload["previous_text"] = prev_text
    if next_text:
        payload["next_text"] = next_text

    cache_key = hashlib.sha256(
        json.dumps({"voice_id": voice_id, **payload}, sort_keys=True).encode("utf-8")
    ).hexdigest()
    mp3_path = cache_dir / f"{cache_key}.mp3"
    meta_path = cache_dir / f"{cache_key}.json"
    wav_raw_path = cache_dir / f"{cache_key}_raw.wav"

    if mp3_path.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    else:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"ElevenLabs API HTTP {exc.code}: {body}") from exc

        audio_b64 = data.get("audio_base64", "")
        if not audio_b64:
            raise RuntimeError("ElevenLabs response missing audio_base64")
        mp3_path.write_bytes(base64.b64decode(audio_b64))
        meta = {
            "alignment": data.get("alignment") or data.get("normalized_alignment") or {},
        }
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    if not wav_raw_path.exists():
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(mp3_path),
                "-ar", str(SAMPLE_RATE),
                "-ac", "1",
                "-c:a", "pcm_s16le",
                str(wav_raw_path),
            ],
            check=True,
        )
    return wav_raw_path, meta


def synthesize_offline_narration_line(
    line_id: str,
    text: str,
    cache_dir: Path,
) -> tuple[Path, dict[str, Any]]:
    """
    Deterministic offline fallback when ELEVENLABS_API_KEY is not set.
    Produces whispered close-mic baritone formant cadence WAVs with exact word timings.
    """
    cache_key = hashlib.sha256(f"offline_v1:{line_id}:{text}".encode("utf-8")).hexdigest()
    wav_raw_path = cache_dir / f"{cache_key}_raw.wav"
    meta_path = cache_dir / f"{cache_key}_offline.json"

    tokens = text.split()
    # Natural thriller narrator pacing (~150 wpm + pauses on short dramatic lines)
    syllable_est = sum(max(1, len(re.findall(r"[aeiouy]+", t.lower()))) for t in tokens)
    base_dur = max(0.75, 0.24 + syllable_est * 0.148 + (0.14 if line_id in ("L16", "L18", "L20") else 0.0))
    if line_id == "L16":
        base_dur = 0.62

    if wav_raw_path.exists() and meta_path.exists():
        return wav_raw_path, json.loads(meta_path.read_text(encoding="utf-8"))

    rng = random.Random(int(cache_key[:8], 16))
    lead_sil = 0.06
    tail_sil = 0.08
    total_dur = lead_sil + base_dur + tail_sil
    n_total = int(round(total_dur * SAMPLE_RATE))
    samples = [0] * n_total

    word_timings = uniform_word_timings(text, base_dur)
    # Build voiced formant + breathy whisper pulse per word
    f0_base = 104.0 if line_id not in ("L10",) else 198.0  # L10 mimics girl whispering
    for w_idx, wt in enumerate(word_timings):
        st_i = int((lead_sil + wt["start"]) * SAMPLE_RATE)
        en_i = min(n_total - 1, int((lead_sil + wt["end"]) * SAMPLE_RATE))
        span = max(1, en_i - st_i)
        # Formant frequencies shifted slightly per word
        f1 = 420.0 + (w_idx % 4) * 75.0
        f2 = 1280.0 + ((w_idx * 7) % 5) * 140.0
        for i in range(span):
            t_local = i / SAMPLE_RATE
            u = i / span
            env = math.sin(math.pi * u) ** 0.55
            pitch = f0_base * (1.0 - 0.08 * u + 0.015 * math.sin(2.0 * math.pi * 4.5 * t_local))
            glottal = (
                0.55 * math.sin(2.0 * math.pi * pitch * t_local)
                + 0.28 * math.sin(2.0 * math.pi * pitch * 2.0 * t_local)
                + 0.14 * math.sin(2.0 * math.pi * pitch * 3.0 * t_local)
            )
            formant = (
                0.55 * math.sin(2.0 * math.pi * f1 * t_local)
                + 0.25 * math.sin(2.0 * math.pi * f2 * t_local)
            )
            breath = (rng.random() * 2.0 - 1.0) * 0.28
            val = env * (glottal * 0.45 + formant * 0.22 + breath) * 4800.0
            samples[st_i + i] += int(val)

    write_wav_mono(wav_raw_path, samples)
    meta = {
        "offline": True,
        "lead_sil": lead_sil,
        "words": [
            {
                "word": wt["word"],
                "start": round(wt["start"] + lead_sil, 4),
                "end": round(wt["end"] + lead_sil, 4),
            }
            for wt in word_timings
        ],
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return wav_raw_path, meta


def tune_gaps_to_target(
    line_ids: list[str],
    speech_durs: list[float],
    target_voice_sec: float,
) -> tuple[float, list[float]]:
    """
    Compute pre-roll lead and 25 inter-line gaps (plus optional end pad) to land cleanly at target_voice_sec.
    Allocates +0.25s dramatic pause before L16 and L26, then distributes remaining evenly clamped [0.10, 0.42].
    """
    n_gaps = len(line_ids) - 1
    speech_sum = sum(speech_durs)
    dramatic_extras = sum(DRAMATIC_PAUSE_LINES.values())
    remaining = target_voice_sec - speech_sum - dramatic_extras

    base_gap = remaining / max(1, n_gaps)
    clamped_base = max(GAP_MIN_SEC, min(GAP_MAX_SEC, base_gap))

    gaps: list[float] = []
    for idx in range(n_gaps):
        next_id = line_ids[idx + 1]
        extra = DRAMATIC_PAUSE_LINES.get(next_id, 0.0)
        gaps.append(clamped_base + extra)

    total_so_far = speech_sum + sum(gaps)
    diff = target_voice_sec - total_so_far

    # Spread any residual difference cleanly while keeping dramatic pauses pronounced
    lead_pad = 0.0
    if diff > 0.001:
        # Allocate a small initial silence lead (up to 0.28s) and distribute the rest across scene transitions
        lead_pad = min(0.28, diff * 0.15)
        diff -= lead_pad
        transition_indices = [
            i for i in range(n_gaps)
            if line_ids[i + 1] in ("L04", "L07", "L11", "L12", "L14", "L16", "L19", "L21", "L23", "L24", "L25", "L26")
        ]
        per_trans = diff / max(1, len(transition_indices))
        for i in transition_indices:
            gaps[i] += per_trans
    elif diff < -0.001:
        # Gently compress non-dramatic gaps proportionally down to 0.06s minimum
        needed = -diff
        adjustable = [i for i in range(n_gaps) if line_ids[i + 1] not in DRAMATIC_PAUSE_LINES]
        avail = sum(max(0.0, gaps[i] - 0.06) for i in adjustable)
        if avail > 0:
            ratio = min(1.0, needed / avail)
            for i in adjustable:
                gaps[i] -= max(0.0, gaps[i] - 0.06) * ratio

    return lead_pad, gaps


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate voice track and auto-60s timing JSON.")
    parser.add_argument("--target", type=float, default=58.5, help="Target voice duration in seconds before tail.")
    parser.add_argument("--tail", type=float, default=2.0, help="Final suspense tail duration in seconds.")
    args = parser.parse_args()

    dotenv = load_dotenv(ROOT / ".env")
    raw_key = (os.environ.get("ELEVENLABS_API_KEY") or dotenv.get("ELEVENLABS_API_KEY", "")).strip()
    raw_voice = (os.environ.get("ELEVENLABS_VOICE_ID") or dotenv.get("ELEVENLABS_VOICE_ID", "")).strip()
    if not raw_key.startswith("sk_") and raw_voice.startswith("sk_"):
        api_key = raw_voice
        voice_id = "pNInz6obpgDQGcFmaJgB"
    else:
        api_key = raw_key
        voice_id = raw_voice if raw_voice and not raw_voice.startswith("sk_") else "pNInz6obpgDQGcFmaJgB"

    script_path = ROOT / "stories" / "ep01_rule_four" / "lines.txt"
    raw_lines = [ln.strip() for ln in script_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    if len(raw_lines) != 26:
        raise RuntimeError(f"Expected 26 lines in {script_path}, found {len(raw_lines)}")

    line_ids = [f"L{i+1:02d}" for i in range(len(raw_lines))]
    out_dir = ROOT / "out" / "ep01_rule_four"
    cache_dir = out_dir / "voice_cache"
    trimmed_dir = out_dir / "voice_trimmed"
    cache_dir.mkdir(parents=True, exist_ok=True)
    trimmed_dir.mkdir(parents=True, exist_ok=True)

    using_el = bool(api_key and not api_key.startswith("MY_"))
    if using_el:
        print(f"[voice_el] Using ElevenLabs API (voice={voice_id}, model=eleven_multilingual_v2, speed=0.98)")
    else:
        print("[voice_el] ELEVENLABS_API_KEY not set — synthesizing deterministic speech-cadence WAVs for offline render.")

    trimmed_samples_list: list[list[int]] = []
    speech_durs: list[float] = []
    words_per_line: list[list[dict[str, Any]]] = []

    for idx, (lid, text) in enumerate(zip(line_ids, raw_lines)):
        prev_text = raw_lines[idx - 1] if idx > 0 else None
        next_text = raw_lines[idx + 1] if idx + 1 < len(raw_lines) else None

        if using_el:
            raw_wav, meta = call_elevenlabs_line(api_key, voice_id, text, prev_text, next_text, cache_dir)
        else:
            raw_wav, meta = synthesize_offline_narration_line(lid, text, cache_dir)

        raw_samples = read_wav_mono(raw_wav)
        trimmed, head_trim, _tail_trim = trim_silence_dbfs(raw_samples)
        dur = len(trimmed) / SAMPLE_RATE
        write_wav_mono(trimmed_dir / f"{lid}.wav", trimmed)

        if using_el:
            align = meta.get("alignment", {})
            words = extract_words_from_char_alignment(
                text,
                align.get("characters", []),
                align.get("character_start_times_seconds", []),
                align.get("character_end_times_seconds", []),
                head_trim,
                dur,
            )
        else:
            words = []
            for w in meta.get("words", []):
                ws = max(0.0, min(dur - 0.03, float(w["start"]) - head_trim))
                we = max(ws + 0.03, min(dur, float(w["end"]) - head_trim))
                words.append({"word": w["word"], "start": round(ws, 4), "end": round(we, 4)})

        trimmed_samples_list.append(trimmed)
        speech_durs.append(dur)
        words_per_line.append(words)

    lead_pad, gaps = tune_gaps_to_target(line_ids, speech_durs, args.target)

    # Assemble voice.wav sample-accurately to match exact timestamps
    master_samples: list[int] = [0] * int(round(lead_pad * SAMPLE_RATE))
    lines_json_items: list[dict[str, Any]] = []

    for idx, (lid, text, samples, words) in enumerate(zip(line_ids, raw_lines, trimmed_samples_list, words_per_line)):
        start_sample = len(master_samples)
        start_sec = start_sample / SAMPLE_RATE
        master_samples.extend(samples)
        end_sample = len(master_samples)
        end_sec = end_sample / SAMPLE_RATE

        abs_words = [
            {
                "word": w["word"],
                "start": round(start_sec + w["start"], 4),
                "end": round(start_sec + w["end"], 4),
            }
            for w in words
        ]
        lines_json_items.append({
            "id": lid,
            "text": text,
            "start": round(start_sec, 4),
            "end": round(end_sec, 4),
            "duration": round(end_sec - start_sec, 4),
            "words": abs_words,
        })

        if idx < len(gaps):
            gap_n = int(round(gaps[idx] * SAMPLE_RATE))
            master_samples.extend([0] * gap_n)

    # Exact target length adjustment (sample-accurate to args.target)
    target_samples = int(round(args.target * SAMPLE_RATE))
    if len(master_samples) < target_samples:
        master_samples.extend([0] * (target_samples - len(master_samples)))
    elif len(master_samples) > target_samples:
        master_samples = master_samples[:target_samples]

    voice_wav_path = out_dir / "voice.wav"
    write_wav_mono(voice_wav_path, master_samples)

    actual_voice_dur = len(master_samples) / SAMPLE_RATE
    total_video_dur = actual_voice_dur + args.tail
    lines_payload = {
        "episode": "ep01_rule_four",
        "source": "elevenlabs" if using_el else "offline_synth",
        "sample_rate": SAMPLE_RATE,
        "speech_dur": round(sum(speech_durs), 4),
        "voice_dur": round(actual_voice_dur, 4),
        "tail_dur": round(args.tail, 4),
        "total_dur": round(total_video_dur, 4),
        "lines": lines_json_items,
    }
    lines_json_path = out_dir / "lines.json"
    lines_json_path.write_text(json.dumps(lines_payload, indent=2), encoding="utf-8")

    print(
        f"[voice_el] speech_dur={sum(speech_durs):.3f}s | "
        f"voice_dur={actual_voice_dur:.3f}s | "
        f"total_video_dur={total_video_dur:.3f}s ({int(round(total_video_dur * 30))} frames)"
    )


if __name__ == "__main__":
    main()
