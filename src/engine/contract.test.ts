import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAM_DIST_MAX_M,
  CAM_DIST_MIN_M,
  CAPTION_MAX_CHARS,
  CAPTION_MAX_WORDS,
  FOV_MAX,
  FOV_MIN,
  FPS,
  TAIL_SEC,
  TARGET_VOICE_SEC,
  TOTAL_DURATION_SEC,
  TOTAL_FRAMES,
  clampFov,
  validateCameraRig,
} from './contract';
import { mulberry32, smootherstep } from './rng';
import { LINE_IDS, LINES } from '../stories/ep01_rule_four/lines';
import { SHOTS, shotAt } from '../stories/ep01_rule_four/story';
import { CAPTION_CARDS, TOTAL_DURATION, VOICE_DURATION } from '../stories/ep01_rule_four/timeline';

test('single numeric contract enforces exact 60.5s 1815-frame timing', () => {
  assert.equal(TARGET_VOICE_SEC + TAIL_SEC, TOTAL_DURATION_SEC);
  assert.equal(TOTAL_DURATION_SEC, 60.5);
  assert.equal(TOTAL_FRAMES, 1815);
  assert.equal(FPS, 30);
  assert.ok(Math.abs(VOICE_DURATION - TARGET_VOICE_SEC) < 0.01);
  assert.ok(Math.abs(TOTAL_DURATION - TOTAL_DURATION_SEC) < 0.01);
});

test('camera rig contract clamps FOV 30-44 and indoor distance 4-8m', () => {
  assert.equal(clampFov(12), FOV_MIN);
  assert.equal(clampFov(95), FOV_MAX);

  const tooClose = validateCameraRig([0, 1.5, 1.2], [0, 1.5, 0], 22);
  assert.equal(tooClose.fov, FOV_MIN);
  const distClose = Math.hypot(
    tooClose.pos[0] - tooClose.look[0],
    tooClose.pos[1] - tooClose.look[1],
    tooClose.pos[2] - tooClose.look[2],
  );
  assert.ok(Math.abs(distClose - CAM_DIST_MIN_M) < 1e-4);

  const tooFar = validateCameraRig([0, 1.5, 15], [0, 1.5, 0], 70);
  assert.equal(tooFar.fov, FOV_MAX);
  const distFar = Math.hypot(
    tooFar.pos[0] - tooFar.look[0],
    tooFar.pos[1] - tooFar.look[1],
    tooFar.pos[2] - tooFar.look[2],
  );
  assert.ok(Math.abs(distFar - CAM_DIST_MAX_M) < 1e-4);
});

test('every script line L01..L26 is keyed in SHOTS and valid under camera contract', () => {
  assert.equal(LINE_IDS.length, 26);
  for (const id of LINE_IDS) {
    assert.ok(LINES[id], `Missing line ${id}`);
    assert.ok(SHOTS[id], `Missing shot ${id}`);
    assert.equal(SHOTS[id].lineId, id);
    assert.ok(SHOTS[id].fovStart >= FOV_MIN && SHOTS[id].fovStart <= FOV_MAX);
    assert.ok(SHOTS[id].fovEnd >= FOV_MIN && SHOTS[id].fovEnd <= FOV_MAX);
  }
});

test('caption cards are non-overlapping, within word/char bounds, and end cleanly on L26 final card', () => {
  assert.ok(CAPTION_CARDS.length > 26);
  for (let i = 0; i < CAPTION_CARDS.length; i++) {
    const c = CAPTION_CARDS[i];
    assert.ok(c.words.length <= CAPTION_MAX_WORDS, `Too many words in ${c.id}`);
    assert.ok(c.text.length <= CAPTION_MAX_CHARS, `Too many chars in ${c.id}: "${c.text}"`);
    assert.ok(c.end > c.start, `Invalid card duration in ${c.id}`);
    if (i > 0) {
      assert.ok(c.start >= CAPTION_CARDS[i - 1].end - 0.0001, `Overlap between ${CAPTION_CARDS[i - 1].id} and ${c.id}`);
    }
  }
  const last = CAPTION_CARDS[CAPTION_CARDS.length - 1];
  assert.equal(last.lineId, 'L26');
  assert.equal(last.isFinal, true);
  assert.ok(last.end > 58.6, 'Final card must hold into 1.5s suspense tail');
});

test('deterministic PRNG and smootherstep produce repeatable outputs', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 10; i++) {
    assert.equal(a(), b());
  }
  assert.equal(smootherstep(0, 1, 0), 0);
  assert.equal(smootherstep(0, 1, 0.5), 0.5);
  assert.equal(smootherstep(0, 1, 1), 1);

  const s1 = shotAt(38.4);
  const s2 = shotAt(38.4);
  assert.deepEqual(s1, s2);
});
