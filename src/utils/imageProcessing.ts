import type {
  CollageSlot,
  CropAspectPreset,
  CropRect,
  EditorAdjustments,
  EditorSnapshot,
  FilterConfig,
  PhotoboothAspect,
  PhotoboothFrameCount,
} from '../types/studio';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolates a filter preset against neutral values using an intensity from 0 to 100.
 */
export function resolveFilterWithIntensity(filter: FilterConfig | null, intensity: number): FilterConfig {
  const ratio = clamp(intensity, 0, 100) / 100;
  if (!filter || ratio === 0) {
    return {
      id: 'neutral',
      name: 'Neutral',
      category: 'Natural',
      description: 'Original image',
      brightness: 1,
      contrast: 1,
      saturation: 1,
      sepia: 0,
      hueRotate: 0,
      temperature: 0,
      pinkTint: 0,
      lavenderTint: 0,
      fade: 0,
      vignette: 0,
      grain: 0,
      blur: 0,
    };
  }

  return {
    ...filter,
    brightness: lerp(1, filter.brightness, ratio),
    contrast: lerp(1, filter.contrast, ratio),
    saturation: lerp(1, filter.saturation, ratio),
    sepia: lerp(0, filter.sepia, ratio),
    hueRotate: lerp(0, filter.hueRotate, ratio),
    temperature: lerp(0, filter.temperature, ratio),
    pinkTint: lerp(0, filter.pinkTint, ratio),
    lavenderTint: lerp(0, filter.lavenderTint, ratio),
    fade: lerp(0, filter.fade, ratio),
    vignette: lerp(0, filter.vignette, ratio),
    grain: lerp(0, filter.grain, ratio),
    blur: lerp(0, filter.blur, ratio),
  };
}

/**
 * Builds a CSS/Canvas2D filter string combining user adjustments and an intensity-scaled filter preset.
 */
export function buildCanvasFilterString(
  adjustments: EditorAdjustments,
  filter: FilterConfig | null,
  filterIntensity = 100
): string {
  const f = resolveFilterWithIntensity(filter, filterIntensity);

  // Combine brightness and exposure smoothly
  const adjBrightness = 1 + adjustments.brightness / 100 + (adjustments.exposure / 100) * 0.65;
  const adjContrast = 1 + adjustments.contrast / 100;
  const adjSaturation = 1 + adjustments.saturation / 100;

  const brightness = clamp(adjBrightness * f.brightness, 0.2, 2.5);
  const contrast = clamp(adjContrast * f.contrast, 0.2, 2.5);
  const saturation = clamp(adjSaturation * f.saturation, 0, 2.5);
  const sepia = clamp(f.sepia, 0, 1);
  const hueRotate = f.hueRotate;
  const blur = clamp(adjustments.blur + f.blur, 0, 25);

  const parts = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturation.toFixed(3)})`,
  ];

  if (sepia > 0.001) parts.push(`sepia(${sepia.toFixed(3)})`);
  if (Math.abs(hueRotate) > 0.1) parts.push(`hue-rotate(${hueRotate.toFixed(1)}deg)`);
  if (blur > 0.05) parts.push(`blur(${blur.toFixed(2)}px)`);

  return parts.join(' ');
}

/**
 * Computes a centered crop rectangle inside the source image for a given aspect ratio preset.
 */
export function computeCenteredCropRect(
  sourceWidth: number,
  sourceHeight: number,
  preset: CropAspectPreset
): CropRect {
  if (preset === 'free' || sourceWidth <= 0 || sourceHeight <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const ratioMap: Record<Exclude<CropAspectPreset, 'free'>, number> = {
    '1:1': 1,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
    '16:9': 16 / 9,
  };

  const targetRatio = ratioMap[preset];
  const sourceRatio = sourceWidth / sourceHeight;

  if (sourceRatio > targetRatio) {
    // Source is wider than target
    const widthNorm = targetRatio / sourceRatio;
    return {
      x: (1 - widthNorm) / 2,
      y: 0,
      width: widthNorm,
      height: 1,
    };
  } else {
    // Source is taller than target
    const heightNorm = sourceRatio / targetRatio;
    return {
      x: 0,
      y: (1 - heightNorm) / 2,
      width: 1,
      height: heightNorm,
    };
  }
}

export interface ComputedSlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates exact pixel rectangles for collage slots given canvas dimensions, padding, and gap.
 */
export function computeCollageSlotRects(
  slots: CollageSlot[],
  canvasWidth: number,
  canvasHeight: number,
  outerPadding: number,
  gap: number
): ComputedSlotRect[] {
  const innerW = Math.max(10, canvasWidth - outerPadding * 2);
  const innerH = Math.max(10, canvasHeight - outerPadding * 2);
  const halfGap = gap / 2;

  return slots.map((slot) => {
    const rawX = outerPadding + slot.x * innerW;
    const rawY = outerPadding + slot.y * innerH;
    const rawW = slot.w * innerW;
    const rawH = slot.h * innerH;

    const leftInset = slot.x > 0.001 ? halfGap : 0;
    const topInset = slot.y > 0.001 ? halfGap : 0;
    const rightInset = slot.x + slot.w < 0.999 ? halfGap : 0;
    const bottomInset = slot.y + slot.h < 0.999 ? halfGap : 0;

    return {
      x: Math.round(rawX + leftInset),
      y: Math.round(rawY + topInset),
      width: Math.max(1, Math.round(rawW - leftInset - rightInset)),
      height: Math.max(1, Math.round(rawH - topInset - bottomInset)),
    };
  });
}

export interface PhotostripLayoutSpec {
  canvasWidth: number;
  canvasHeight: number;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  paddingX: number;
  paddingTop: number;
  paddingBottom: number;
  gapX: number;
  gapY: number;
}

/**
 * Computes Korean-style photostrip dimensions for 2, 3, 4, or 6 frames and chosen photo aspect ratio.
 */
export function computePhotostripLayout(
  frameCount: PhotoboothFrameCount,
  aspect: PhotoboothAspect,
  twoColumnForFourAndSix = false
): PhotostripLayoutSpec {
  const aspectRatio = aspect === '4:3' ? 4 / 3 : aspect === '1:1' ? 1 : 3 / 4;
  const columns = twoColumnForFourAndSix && (frameCount === 4 || frameCount === 6) ? 2 : 1;
  const rows = Math.ceil(frameCount / columns);

  const frameWidth = columns === 2 ? 420 : 560;
  const frameHeight = Math.round(frameWidth / aspectRatio);
  const paddingX = 44;
  const paddingTop = 52;
  const paddingBottom = 112;
  const gapX = 24;
  const gapY = 24;

  const canvasWidth = paddingX * 2 + columns * frameWidth + (columns - 1) * gapX;
  const canvasHeight = paddingTop + paddingBottom + rows * frameHeight + (rows - 1) * gapY;

  return {
    canvasWidth,
    canvasHeight,
    columns,
    rows,
    frameWidth,
    frameHeight,
    paddingX,
    paddingTop,
    paddingBottom,
    gapX,
    gapY,
  };
}

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistoryState<T>(initial: T): HistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function pushHistory<T>(history: HistoryState<T>, nextPresent: T, maxEntries = 30): HistoryState<T> {
  const past = [...history.past, history.present].slice(-maxEntries);
  return {
    past,
    present: nextPresent,
    future: [],
  };
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function cloneEditorSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    ...snapshot,
    adjustments: { ...snapshot.adjustments },
    crop: { ...snapshot.crop },
    layers: snapshot.layers.map((layer) => ({ ...layer })),
  };
}
