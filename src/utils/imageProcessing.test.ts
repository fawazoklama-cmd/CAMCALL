import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanvasFilterString,
  computeCenteredCropRect,
  computeCollageSlotRects,
  computePhotostripLayout,
  createHistoryState,
  pushHistory,
  redoHistory,
  resolveFilterWithIntensity,
  undoHistory,
} from './imageProcessing';
import {
  COLLAGE_TEMPLATES,
  DEFAULT_ADJUSTMENTS,
  FILTER_CATEGORIES,
  FILTER_PRESETS,
  PHOTOBOOTH_TEMPLATES,
  STICKER_CATEGORIES,
  STICKER_PRESETS,
} from '../data/presets';

test('filter presets cover all 11 requested filter categories', () => {
  const expectedCategories = [
    'Vintage',
    'Retro',
    'Korean',
    'Pink',
    'Y2K',
    'Film',
    'Polaroid',
    'Cinematic',
    'Black & White',
    'Dreamy',
    'Natural',
  ];
  for (const category of expectedCategories) {
    assert.ok(FILTER_CATEGORIES.includes(category as any), `Missing category ${category}`);
    assert.ok(
      FILTER_PRESETS.some((f) => f.category === category),
      `No filter presets in category ${category}`
    );
  }
});

test('photobooth templates include all 8 requested themes', () => {
  const names = PHOTOBOOTH_TEMPLATES.map((t) => t.name);
  for (const required of [
    'Classic Korean',
    'Pink Love',
    'Vintage Film',
    'Retro Camera',
    'Minimal White',
    'Y2K',
    'Cute Ribbon',
    'Polaroid Style',
  ]) {
    assert.ok(names.includes(required), `Missing template ${required}`);
  }
});

test('sticker library covers all 10 requested categories', () => {
  const expected = [
    'Hearts',
    'Flowers',
    'Stars',
    'Sparkles',
    'Ribbons',
    'Kawaii',
    'Doodles',
    'Emoji',
    'Text',
    'Frames',
  ];
  assert.deepEqual(STICKER_CATEGORIES, expected);
  for (const cat of expected) {
    assert.ok(
      STICKER_PRESETS.some((s) => s.category === cat),
      `Missing sticker items for ${cat}`
    );
  }
});

test('resolveFilterWithIntensity interpolates cleanly between neutral and full filter', () => {
  const pink = FILTER_PRESETS.find((f) => f.id === 'strawberry-blush')!;
  const zero = resolveFilterWithIntensity(pink, 0);
  const half = resolveFilterWithIntensity(pink, 50);
  const full = resolveFilterWithIntensity(pink, 100);

  assert.equal(zero.brightness, 1);
  assert.equal(zero.pinkTint, 0);
  assert.ok(Math.abs(half.pinkTint - pink.pinkTint / 2) < 1e-6);
  assert.equal(full.pinkTint, pink.pinkTint);
});

test('buildCanvasFilterString reflects adjustments and active filter', () => {
  const neutral = buildCanvasFilterString(DEFAULT_ADJUSTMENTS, null, 100);
  assert.match(neutral, /brightness\(1\.000\)/);
  assert.match(neutral, /contrast\(1\.000\)/);

  const mono = FILTER_PRESETS.find((f) => f.id === 'editorial-mono')!;
  const bwString = buildCanvasFilterString({ ...DEFAULT_ADJUSTMENTS, brightness: 20 }, mono, 100);
  assert.match(bwString, /saturate\(0\.000\)/);
  assert.ok(!bwString.includes('brightness(1.000)'));
});

test('computeCenteredCropRect keeps crop normalized within [0, 1]', () => {
  const squareFromWide = computeCenteredCropRect(1600, 900, '1:1');
  assert.equal(squareFromWide.y, 0);
  assert.equal(squareFromWide.height, 1);
  assert.ok(Math.abs(squareFromWide.width - 900 / 1600) < 1e-6);
  assert.ok(Math.abs(squareFromWide.x - (1 - squareFromWide.width) / 2) < 1e-6);

  const wideFromSquare = computeCenteredCropRect(1000, 1000, '16:9');
  assert.equal(wideFromSquare.x, 0);
  assert.equal(wideFromSquare.width, 1);
  assert.ok(Math.abs(wideFromSquare.height - 9 / 16) < 1e-6);
});

test('collage slot geometries cover 2, 3, 4, 6, and 9 photo templates without overlap', () => {
  for (const count of [2, 3, 4, 6, 9] as const) {
    const template = COLLAGE_TEMPLATES.find((t) => t.photoCount === count);
    assert.ok(template, `Missing collage template for ${count} photos`);
    const rects = computeCollageSlotRects(template!.slots, 1200, 1200, 40, 16);
    assert.equal(rects.length, count);
    for (const r of rects) {
      assert.ok(r.width > 50 && r.height > 50);
      assert.ok(r.x >= 40 && r.y >= 40);
      assert.ok(r.x + r.width <= 1161 && r.y + r.height <= 1161);
    }
  }
});

test('photostrip layout adapts for 2, 3, 4, 6 frames and single/double columns', () => {
  const strip4 = computePhotostripLayout(4, '4:3', false);
  assert.equal(strip4.columns, 1);
  assert.equal(strip4.rows, 4);

  const grid6 = computePhotostripLayout(6, '1:1', true);
  assert.equal(grid6.columns, 2);
  assert.equal(grid6.rows, 3);
  assert.equal(grid6.frameWidth, grid6.frameHeight);
});

test('undo/redo history stack transitions correctly', () => {
  let state = createHistoryState(1);
  state = pushHistory(state, 2);
  state = pushHistory(state, 3);
  assert.equal(state.present, 3);
  assert.deepEqual(state.past, [1, 2]);

  state = undoHistory(state);
  assert.equal(state.present, 2);
  assert.deepEqual(state.future, [3]);

  state = redoHistory(state);
  assert.equal(state.present, 3);
  assert.deepEqual(state.future, []);

  state = undoHistory(state);
  state = pushHistory(state, 99);
  assert.equal(state.present, 99);
  assert.deepEqual(state.future, []);
});
