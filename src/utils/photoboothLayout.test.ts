import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOTH_ASPECT_RATIOS,
  BOOTH_FRAME_SHAPES,
  BOOTH_LAYOUTS,
  BOOTH_THEMES,
  BOOTH_THEME_CATEGORIES,
  CAMERA_EFFECT_PRESETS,
  CAMERA_MODE_PRESETS,
  CAMERA_OVERLAY_PRESETS,
  FACE_FILTER_CATEGORIES,
  FACE_FILTER_PRESETS,
} from '../data/photoboothPresets';
import { FILTER_PRESETS } from '../data/presets';
import {
  aspectRatioToNumber,
  computeBoothLayoutGeometry,
  createDefaultFaceAnchors,
  landmarksToFaceAnchors,
  pickRandomBoothConfig,
  type NormalizedLandmarkLike,
} from './photoboothLayout';

test('photobooth presets contain all requested shapes, layouts, themes, effects, face filters, overlays, and modes', () => {
  assert.equal(BOOTH_FRAME_SHAPES.length, 14);
  assert.equal(BOOTH_LAYOUTS.length, 13);
  assert.equal(BOOTH_THEME_CATEGORIES.length, 6);
  assert.equal(BOOTH_THEMES.length, 36);
  assert.equal(CAMERA_EFFECT_PRESETS.length, 21);
  assert.equal(FACE_FILTER_CATEGORIES.length, 5);
  assert.equal(FACE_FILTER_PRESETS.length, 31);
  assert.equal(CAMERA_OVERLAY_PRESETS.length, 9);
  assert.equal(CAMERA_MODE_PRESETS.length, 8);
  assert.deepEqual(BOOTH_ASPECT_RATIOS, ['1:1', '3:4', '4:3', '9:16', '16:9']);
});

test('computeBoothLayoutGeometry produces valid slot rectangles for all 13 layouts', () => {
  for (const layout of BOOTH_LAYOUTS) {
    const geom = computeBoothLayoutGeometry(layout.id, 'high');
    assert.ok(geom.canvasWidth >= 400);
    assert.ok(geom.canvasHeight >= 400);
    assert.equal(geom.slots.length, layout.slotCount);
    for (const slot of geom.slots) {
      assert.ok(slot.w > 40);
      assert.ok(slot.h > 40);
      assert.ok(slot.x >= 0 && slot.x + slot.w <= geom.canvasWidth + 2);
      assert.ok(slot.y >= 0 && slot.y + slot.h <= geom.canvasHeight + 2);
    }
  }
});

test('aspectRatioToNumber computes accurate ratios', () => {
  assert.equal(aspectRatioToNumber('1:1'), 1);
  assert.equal(aspectRatioToNumber('3:4'), 0.75);
  assert.ok(Math.abs(aspectRatioToNumber('16:9') - 16 / 9) < 0.0001);
});

test('landmarksToFaceAnchors extracts valid anchors and head rotation', () => {
  const dummy: NormalizedLandmarkLike[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  dummy[10] = { x: 0.5, y: 0.2 }; // forehead
  dummy[152] = { x: 0.5, y: 0.7 }; // chin
  dummy[1] = { x: 0.5, y: 0.45 }; // nose
  dummy[468] = { x: 0.4, y: 0.35 }; // left eye
  dummy[473] = { x: 0.6, y: 0.35 }; // right eye
  dummy[54] = { x: 0.32, y: 0.25 };
  dummy[284] = { x: 0.68, y: 0.25 };
  dummy[123] = { x: 0.35, y: 0.48 };
  dummy[352] = { x: 0.65, y: 0.48 };
  dummy[13] = { x: 0.5, y: 0.54 };
  dummy[14] = { x: 0.5, y: 0.57 };

  const anchors = landmarksToFaceAnchors(dummy, false);
  assert.ok(anchors);
  assert.equal(anchors.isTracked, true);
  assert.ok(Math.abs(anchors.eyeDistance - 0.2) < 0.001);
  assert.ok(Math.abs(anchors.headAngle) < 0.001);
  assert.ok(anchors.mouth.y > anchors.noseTip.y);

  const mirrored = landmarksToFaceAnchors(dummy, true);
  assert.ok(mirrored);
  assert.ok(mirrored.leftEye.x < mirrored.rightEye.x);
});

test('createDefaultFaceAnchors and pickRandomBoothConfig return valid data', () => {
  const fallback = createDefaultFaceAnchors(1.0);
  assert.equal(fallback.isTracked, false);
  assert.ok(fallback.eyeDistance > 0.08);

  const randomCfg = pickRandomBoothConfig(() => 0.42);
  assert.ok(BOOTH_THEMES.some((t) => t.id === randomCfg.themeId));
  assert.ok(FILTER_PRESETS.some((f) => f.id === randomCfg.filterId));
  assert.ok(CAMERA_EFFECT_PRESETS.some((e) => e.id === randomCfg.effectIds[0]));
  assert.ok(FACE_FILTER_PRESETS.some((f) => f.id === randomCfg.faceFilterIds[0]));
  assert.ok(CAMERA_OVERLAY_PRESETS.some((o) => o.id === randomCfg.overlayIds[0]));
});
