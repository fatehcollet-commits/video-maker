#!/usr/bin/env python3
"""
100% Procedural 48kHz Mono Seeded Horror Audio Synthesis (zero external samples).
Works purely with Python stdlib (math, random, array) and uses numpy if available.
"""

from __future__ import annotations

import math
import random

SAMPLE_RATE = 48000


def _clamp(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return lo if x < lo else (hi if x > hi else x)


def fluorescent_hum(dur: float, seed: int = 101) -> list[float]:
    n = int(round(dur * SAMPLE_RATE))
    rng = random.Random(seed)
    out = [0.0] * n
    lp = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        # 60Hz mains hum + odd harmonics + subtle ballast flicker
        flicker = 1.0 - 0.12 * (0.5 + 0.5 * math.sin(2.0 * math.pi * 1.7 * t))
        if int(t * 7.3) % 19 == 0:
            flicker *= 0.65
        hum = (
            0.50 * math.sin(2.0 * math.pi * 60.0 * t)
            + 0.30 * math.sin(2.0 * math.pi * 120.0 * t)
            + 0.16 * math.sin(2.0 * math.pi * 180.0 * t)
            + 0.08 * math.sin(2.0 * math.pi * 300.0 * t)
        )
        noise = rng.uniform(-1.0, 1.0)
        lp = lp * 0.92 + noise * 0.08
        fade = min(1.0, t / 0.25) * min(1.0, max(0.0, (dur - t) / 0.15))
        out[i] = fade * flicker * (hum * 0.18 + lp * 0.09)
    return out


def sub_drone(dur: float, silence_after: float | None = None, seed: int = 202) -> list[float]:
    """Rising bunker sub-bass tension bed across the episode, cutting dead before L26 if specified."""
    n = int(round(dur * SAMPLE_RATE))
    rng = random.Random(seed)
    out = [0.0] * n
    lp = 0.0
    phase1 = 0.0
    phase2 = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        u = min(1.0, t / max(1.0, dur))
        # Tension curve rises steadily into L21-L25
        tension = 0.25 + 0.75 * (u ** 1.45)
        f1 = 36.0 + 18.0 * (u ** 1.8)
        f2 = f1 * 1.498  # eerie detuned fifth
        phase1 += 2.0 * math.pi * f1 / SAMPLE_RATE
        phase2 += 2.0 * math.pi * f2 / SAMPLE_RATE
        drone = 0.65 * math.sin(phase1) + 0.32 * math.sin(phase2) + 0.14 * math.sin(phase1 * 2.0)

        # Filtered dark air rumble
        lp = lp * 0.985 + rng.uniform(-1.0, 1.0) * 0.015
        env = min(1.0, t / 0.6)
        if silence_after is not None and t >= silence_after - 0.08:
            # Hard choke right before L26 cliffhanger line
            fade_out = max(0.0, 1.0 - (t - (silence_after - 0.08)) / 0.08)
            env *= fade_out
        out[i] = env * tension * (drone * 0.38 + lp * 0.45)
    return out


def glass_thump(dur: float = 0.45, seed: int = 303) -> list[float]:
    n = int(round(dur * SAMPLE_RATE))
    rng = random.Random(seed)
    out = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        body = math.exp(-t * 16.0) * math.sin(2.0 * math.pi * (88.0 - 28.0 * min(1.0, t * 8.0)) * t)
        glass_ring = math.exp(-t * 11.0) * (
            0.35 * math.sin(2.0 * math.pi * 410.0 * t)
            + 0.22 * math.sin(2.0 * math.pi * 760.0 * t)
        )
        transient = math.exp(-t * 95.0) * rng.uniform(-1.0, 1.0) * 0.5
        out[i] = _clamp(body * 0.85 + glass_ring * 0.4 + transient)
    return out


def vent_scratch(dur: float = 0.95, seed: int = 404) -> list[float]:
    n = int(round(dur * SAMPLE_RATE))
    rng = random.Random(seed)
    out = [0.0] * n
    bp1 = 0.0
    bp2 = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        u = t / dur
        # Three scraping nail/claw strokes on wired glass/metal
        scrape_env = (
            math.exp(-((u - 0.20) / 0.09) ** 2)
            + 0.85 * math.exp(-((u - 0.52) / 0.10) ** 2)
            + 0.70 * math.exp(-((u - 0.80) / 0.08) ** 2)
        )
        raw = rng.uniform(-1.0, 1.0)
        bp1 = bp1 * 0.68 + raw * 0.32
        bp2 = bp2 * 0.82 + (raw - bp1) * 0.18
        res = (
            0.35 * math.sin(2.0 * math.pi * (1950.0 + 380.0 * math.sin(22.0 * t)) * t)
            + 0.25 * math.sin(2.0 * math.pi * 3120.0 * t)
        )
        out[i] = _clamp(scrape_env * (bp2 * 0.75 + res * 0.32))
    return out


def bone_crack(dur: float = 0.55, seed: int = 505) -> list[float]:
    n = int(round(dur * SAMPLE_RATE))
    rng = random.Random(seed)
    out = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        # Double snap transient (cartilage + bone fracture)
        snap1 = math.exp(-t * 140.0) * (rng.uniform(-1.0, 1.0) * 0.9 + math.sin(2.0 * math.pi * 1150.0 * t) * 0.6)
        snap2 = 0.0
        if t > 0.045:
            dt = t - 0.045
            snap2 = math.exp(-dt * 110.0) * (rng.uniform(-1.0, 1.0) * 0.95 + math.sin(2.0 * math.pi * 880.0 * dt) * 0.65)
        sub_crunch = math.exp(-t * 18.0) * math.sin(2.0 * math.pi * 68.0 * t) * 0.6
        out[i] = _clamp(snap1 * 0.85 + snap2 * 0.95 + sub_crunch)
    return out


def _single_heartbeat_pulse(seed: int = 606) -> list[float]:
    dur = 0.34
    n = int(round(dur * SAMPLE_RATE))
    rng = random.Random(seed)
    out = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        lub = math.exp(-t * 24.0) * math.sin(2.0 * math.pi * (56.0 - 18.0 * min(1.0, t * 9.0)) * t)
        dub = 0.0
        if t > 0.13:
            dt = t - 0.13
            dub = 0.72 * math.exp(-dt * 28.0) * math.sin(2.0 * math.pi * (48.0 - 14.0 * min(1.0, dt * 9.0)) * dt)
        thump_air = (math.exp(-t * 45.0) + (0.6 * math.exp(-max(0.0, t - 0.13) * 45.0) if t > 0.13 else 0.0)) * rng.uniform(-0.1, 0.1)
        out[i] = _clamp(lub + dub + thump_air)
    return out


def heartbeat_ramp(t_start: float, t_end: float, bpm_start: float = 64.0, bpm_end: float = 112.0, seed: int = 606) -> list[tuple[float, list[float]]]:
    """Generate timestamped heartbeat pulses ramping from 64->112 BPM and cutting dead before t_end."""
    pulse = _single_heartbeat_pulse(seed)
    events: list[tuple[float, list[float]]] = []
    t = t_start
    span = max(0.1, t_end - t_start)
    while t < t_end - 0.12:
        u = (t - t_start) / span
        bpm = bpm_start + (bpm_end - bpm_start) * (u ** 1.15)
        period = 60.0 / bpm
        gain = 0.45 + 0.55 * u
        events.append((t, [s * gain for s in pulse]))
        t += period
    return events


def red_strobe_ping(dur: float = 0.38, seed: int = 707) -> list[float]:
    n = int(round(dur * SAMPLE_RATE))
    out = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 9.5) * min(1.0, t / 0.004)
        tone = (
            0.65 * math.sin(2.0 * math.pi * 920.0 * t)
            + 0.35 * math.sin(2.0 * math.pi * 1380.0 * t)
            + 0.20 * math.sin(2.0 * math.pi * 460.0 * t)
        )
        out[i] = _clamp(env * tone * 0.72)
    return out


def rear_latch_click_boom(dur: float = 1.48, seed: int = 808) -> list[float]:
    """Crisp metallic door-latch click followed immediately by a deep sub-bass drop across the 1.5s tail."""
    n = int(round(dur * SAMPLE_RATE))
    rng = random.Random(seed)
    out = [0.0] * n
    phase = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        # 1) Crisp metallic latch click at t=0.00s and bolt release at t=0.042s
        click1 = math.exp(-t * 190.0) * (
            0.85 * math.sin(2.0 * math.pi * 2450.0 * t)
            + 0.65 * math.sin(2.0 * math.pi * 4120.0 * t)
            + 0.55 * rng.uniform(-1.0, 1.0)
        )
        click2 = 0.0
        if t >= 0.038:
            dt = t - 0.038
            click2 = math.exp(-dt * 145.0) * (
                0.75 * math.sin(2.0 * math.pi * 1820.0 * dt)
                + 0.55 * math.sin(2.0 * math.pi * 3390.0 * dt)
                + 0.45 * rng.uniform(-1.0, 1.0)
            )
        # 2) Sub-bass boom drop starting at t=0.045s
        boom = 0.0
        if t >= 0.045:
            bt = t - 0.045
            freq = 76.0 * math.exp(-bt * 2.2) + 27.0
            phase += 2.0 * math.pi * freq / SAMPLE_RATE
            boom_env = min(1.0, bt / 0.012) * math.exp(-bt * 1.45)
            boom = boom_env * (0.92 * math.sin(phase) + 0.25 * math.sin(phase * 2.0))
        out[i] = _clamp(click1 * 0.9 + click2 * 0.95 + boom * 0.95)
    return out
