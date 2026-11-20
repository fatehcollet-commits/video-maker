#!/usr/bin/env python3
"""
Line-ID and word-level cue resolver for Episode 1: Rule Four.
Provides B(lineId), E(lineId), and W(lineId, word) resolved against out/ep01_rule_four/lines.json.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent


class CueResolver:
    def __init__(self, lines_json_path: Path | None = None) -> None:
        path = lines_json_path or (ROOT / "out" / "ep01_rule_four" / "lines.json")
        data = json.loads(path.read_text(encoding="utf-8"))
        self.voice_dur = float(data["voice_dur"])
        self.tail_dur = float(data["tail_dur"])
        self.total_dur = float(data["total_dur"])
        self.by_id: dict[str, dict[str, Any]] = {ln["id"]: ln for ln in data["lines"]}

    def B(self, line_id: str, offset: float = 0.0) -> float:
        return max(0.0, float(self.by_id[line_id]["start"]) + offset)

    def E(self, line_id: str, offset: float = 0.0) -> float:
        return max(0.0, float(self.by_id[line_id]["end"]) + offset)

    def W(self, line_id: str, word: str, offset: float = 0.0) -> float:
        target = re.sub(r"[^a-z0-9]", "", word.lower())
        for w in self.by_id[line_id]["words"]:
            norm = re.sub(r"[^a-z0-9]", "", w["word"].lower())
            if norm == target:
                return max(0.0, float(w["start"]) + offset)
        return self.B(line_id, offset)


def build_ep01_cues(resolver: CueResolver) -> dict[str, Any]:
    B = resolver.B
    E = resolver.E
    W = resolver.W

    return {
        "voice_dur": resolver.voice_dur,
        "total_dur": resolver.total_dur,
        "heartbeat_window": (B("L11"), B("L26") - 0.15),  # 64->112 BPM from L11 to L25, dead silent before L26!
        "drone_silence_at": B("L26") - 0.05,
        "sfx_events": [
            {"type": "red_strobe_ping", "time": W("L04", "blinked"), "gain": 0.42},
            {"type": "glass_thump", "time": W("L05", "pressed"), "gain": 0.78},
            {"type": "vent_scratch", "time": W("L06", "scratches", -0.05), "gain": 0.65},
            {"type": "glass_thump", "time": W("L15", "glass", -0.08), "gain": 0.48},
            {"type": "bone_crack", "time": W("L21", "cracked", -0.03), "gain": 0.92},
            {"type": "bone_crack", "time": W("L22", "dropped", -0.03), "gain": 0.88},
            {"type": "red_strobe_ping", "time": B("L24"), "gain": 0.75},
            {"type": "red_strobe_ping", "time": B("L24") + 0.55, "gain": 0.72},
            {"type": "red_strobe_ping", "time": B("L24") + 1.10, "gain": 0.68},
            {"type": "rear_latch_click_boom", "time": E("L26", 0.01), "gain": 1.0},
        ],
    }
