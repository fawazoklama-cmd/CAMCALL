import type {
  CreativeDesignState,
  CreativeObject,
  LayoutSlotSpec,
  PhotoLayoutId,
  ThemePreset,
} from '../types/creative';
import { PHOTO_LAYOUT_PRESETS, THEME_PRESETS } from '../data/creativePresets';

export interface PixelLayoutSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  polaroidCaption: boolean;
}

/**
 * Computes pixel slot coordinates for any of the 12 Photo Layouts with dynamic gap spacing.
 */
export function computeCreativeLayoutSlots(
  layoutId: PhotoLayoutId,
  canvasWidth: number,
  canvasHeight: number,
  gapPx: number,
  frameInsetPx = 0
): PixelLayoutSlot[] {
  const preset =
    PHOTO_LAYOUT_PRESETS.find((l) => l.id === layoutId) || PHOTO_LAYOUT_PRESETS[0];

  const usableX = frameInsetPx;
  const usableY = frameInsetPx;
  const usableW = Math.max(40, canvasWidth - frameInsetPx * 2);
  const usableH = Math.max(40, canvasHeight - frameInsetPx * 2);

  return preset.slots.map((slot: LayoutSlotSpec) => {
    const baseW = slot.w * usableW;
    const baseH = slot.h * usableH;
    const insetX = Math.min(gapPx * 0.45, baseW * 0.25);
    const insetY = Math.min(gapPx * 0.45, baseH * 0.25);

    return {
      x: Math.round(usableX + slot.x * usableW + insetX),
      y: Math.round(usableY + slot.y * usableH + insetY),
      w: Math.max(20, Math.round(baseW - insetX * 2)),
      h: Math.max(20, Math.round(baseH - insetY * 2)),
      rotation: slot.rotation ?? 0,
      polaroidCaption: Boolean(slot.polaroidCaption),
    };
  });
}

export function applyThemeToDesignState(
  state: CreativeDesignState,
  themeId: string
): CreativeDesignState {
  const theme: ThemePreset | undefined = THEME_PRESETS.find((t) => t.id === themeId);
  if (!theme) return state;

  return {
    ...state,
    themeId: theme.id,
    backgroundId: theme.backgroundId,
    customBackgroundSrc: null,
    frameId: theme.frameId,
    shapeId: theme.shapeId,
    borderColor: theme.borderColor,
    filterId: theme.filterId,
    filterIntensity: theme.filterId ? 100 : 0,
    frameCaption: theme.badgeText,
  };
}

export function moveLayerOrder(
  objects: CreativeObject[],
  id: string,
  direction: 'up' | 'down' | 'top' | 'bottom'
): CreativeObject[] {
  const index = objects.findIndex((o) => o.id === id);
  if (index === -1) return objects;

  const copy = [...objects];
  const [item] = copy.splice(index, 1);

  if (direction === 'top') {
    copy.push(item);
  } else if (direction === 'bottom') {
    copy.unshift(item);
  } else if (direction === 'up') {
    const nextIdx = Math.min(copy.length, index + 1);
    copy.splice(nextIdx, 0, item);
  } else {
    const prevIdx = Math.max(0, index - 1);
    copy.splice(prevIdx, 0, item);
  }

  return copy;
}

export function cloneCreativeDesignState(state: CreativeDesignState): CreativeDesignState {
  return {
    ...state,
    layoutPhotos: [...state.layoutPhotos],
    objects: state.objects.map((o) => ({ ...o })),
  };
}
