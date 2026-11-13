import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKGROUND_PRESETS,
  DECORATION_CATEGORIES,
  DECORATION_ITEMS,
  FRAME_PRESETS,
  PAPER_TAPE_PRESETS,
  PHOTO_LAYOUT_PRESETS,
  SCRAPBOOK_TEMPLATES,
  SHAPE_PRESETS,
  THEME_CATEGORIES,
  THEME_PRESETS,
} from '../data/creativePresets';
import type { CreativeDesignState, CreativeObject } from '../types/creative';
import {
  applyThemeToDesignState,
  computeCreativeLayoutSlots,
  moveLayerOrder,
} from './creativeGeometry';

test('shape collection contains all 12 basic and 10 creative shapes', () => {
  const basic = SHAPE_PRESETS.filter((s) => s.category === 'Basic');
  const creative = SHAPE_PRESETS.filter((s) => s.category === 'Creative');
  assert.equal(basic.length, 12);
  assert.equal(creative.length, 10);

  const names = SHAPE_PRESETS.map((s) => s.name);
  for (const required of [
    'Square',
    'Circle',
    'Oval',
    'Rectangle',
    'Rounded Rectangle',
    'Heart',
    'Star',
    'Diamond',
    'Hexagon',
    'Cloud',
    'Flower',
    'Capsule',
    'Wavy Frame',
    'Blob Shape',
    'Scalloped Circle',
    'Arch Frame',
    'Ticket Shape',
    'Polaroid Shape',
    'Film Frame',
    'Speech Bubble',
    'Flower Petal',
    'Irregular Organic Shape',
  ]) {
    assert.ok(names.includes(required), `Missing shape ${required}`);
  }
});

test('theme collection contains all 6 categories and 48 themes', () => {
  assert.equal(THEME_CATEGORIES.length, 6);
  assert.equal(THEME_PRESETS.length, 48);

  const countsByCategory = {
    'Pink Collection': 10,
    'Korean Collection': 8,
    'Vintage Collection': 7,
    'Cute Collection': 8,
    'Y2K Collection': 7,
    'Seasonal Collection': 8,
  };

  for (const [cat, expectedCount] of Object.entries(countsByCategory)) {
    const items = THEME_PRESETS.filter((t) => t.category === cat);
    assert.equal(items.length, expectedCount, `Category ${cat} count mismatch`);
  }
});

test('frame, background, layout, and decoration collections are complete', () => {
  // 15 named frames + 'No Frame' option = 16
  const namedFrames = FRAME_PRESETS.filter((f) => f.id !== 'none');
  assert.equal(namedFrames.length, 15);

  // Backgrounds: 7 Solid + 10 Patterns + 6 Texture = 23
  assert.equal(BACKGROUND_PRESETS.filter((b) => b.category === 'Solid').length, 7);
  assert.equal(BACKGROUND_PRESETS.filter((b) => b.category === 'Patterns').length, 10);
  assert.equal(BACKGROUND_PRESETS.filter((b) => b.category === 'Texture').length, 6);

  // 12 Photo Layouts
  assert.equal(PHOTO_LAYOUT_PRESETS.length, 12);

  // 15 Decoration Categories
  assert.equal(DECORATION_CATEGORIES.length, 15);
  for (const cat of DECORATION_CATEGORIES) {
    assert.ok(
      DECORATION_ITEMS.some((d) => d.category === cat),
      `Missing decoration items in ${cat}`
    );
  }

  // Scrapbook Templates & Paper/Tape presets
  assert.ok(SCRAPBOOK_TEMPLATES.length >= 4);
  assert.ok(PAPER_TAPE_PRESETS.length >= 6);
});

test('computeCreativeLayoutSlots returns valid pixel geometry for all 12 layouts', () => {
  for (const layout of PHOTO_LAYOUT_PRESETS) {
    const slots = computeCreativeLayoutSlots(layout.id, 1200, 1200, 16, 48);
    assert.equal(slots.length, layout.photoCount);
    for (const slot of slots) {
      assert.ok(slot.w > 20 && slot.h > 20);
      assert.ok(slot.x >= 48 && slot.y >= 48);
      assert.ok(slot.x + slot.w <= 1152);
      assert.ok(slot.y + slot.h <= 1152);
    }
  }
});

test('applyThemeToDesignState updates theme, background, frame, shape, and filter', () => {
  const base: CreativeDesignState = {
    mode: 'layout',
    shapeId: 'square',
    shapeSize: 92,
    photoZoom: 100,
    photoOffsetX: 0,
    photoOffsetY: 0,
    borderColor: '#FFFFFF',
    borderWidth: 6,
    cornerRadius: 16,
    themeId: null,
    frameId: 'none',
    frameCaption: '',
    backgroundId: 'bg-white',
    customBackgroundSrc: null,
    layoutId: '1-photo',
    layoutGap: 16,
    layoutPhotos: [],
    filterId: null,
    filterIntensity: 100,
    objects: [],
  };

  const next = applyThemeToDesignState(base, 'theme-pink-coquette');
  assert.equal(next.themeId, 'theme-pink-coquette');
  assert.equal(next.backgroundId, 'bg-stripes');
  assert.equal(next.frameId, 'ribbon-frame');
  assert.equal(next.shapeId, 'wavy-frame');
  assert.equal(next.filterId, 'pola-pastel');
  assert.equal(next.frameCaption, 'COQUETTE BOW');
});

test('moveLayerOrder reorders layers up, down, top, and bottom', () => {
  const mk = (id: string): CreativeObject => ({
    id,
    kind: 'decoration',
    label: id,
    color: '#EC4899',
    x: 0.5,
    y: 0.5,
    width: 0.1,
    height: 0.1,
    scale: 1,
    rotation: 0,
    opacity: 1,
  });

  const initial = [mk('a'), mk('b'), mk('c')];
  assert.deepEqual(
    moveLayerOrder(initial, 'a', 'up').map((o) => o.id),
    ['b', 'a', 'c']
  );
  assert.deepEqual(
    moveLayerOrder(initial, 'c', 'down').map((o) => o.id),
    ['a', 'c', 'b']
  );
  assert.deepEqual(
    moveLayerOrder(initial, 'a', 'top').map((o) => o.id),
    ['b', 'c', 'a']
  );
  assert.deepEqual(
    moveLayerOrder(initial, 'c', 'bottom').map((o) => o.id),
    ['c', 'a', 'b']
  );
});
