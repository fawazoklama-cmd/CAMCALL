import {
  BOOTH_LAYOUTS,
  BOOTH_THEMES,
  CAMERA_EFFECT_PRESETS,
  CAMERA_OVERLAY_PRESETS,
  FACE_FILTER_PRESETS,
} from '../data/photoboothPresets';
import { FILTER_PRESETS } from '../data/presets';
import type {
  BoothAspectRatio,
  BoothLayoutId,
  BoothQualityPreset,
  CameraEffectId,
  CameraOverlayId,
  FaceAnchorSet,
  FaceFilterId,
  Point2D,
} from '../types/photobooth';

export function aspectRatioToNumber(aspect: BoothAspectRatio): number {
  switch (aspect) {
    case '1:1':
      return 1;
    case '3:4':
      return 3 / 4;
    case '4:3':
      return 4 / 3;
    case '9:16':
      return 9 / 16;
    case '16:9':
      return 16 / 9;
  }
}

export interface ComputedBoothSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export interface ComputedBoothGeometry {
  canvasWidth: number;
  canvasHeight: number;
  slots: ComputedBoothSlot[];
  footerY: number;
  footerHeight: number;
}

export function computeBoothLayoutGeometry(
  layoutId: BoothLayoutId,
  quality: BoothQualityPreset = 'high'
): ComputedBoothGeometry {
  const layout = BOOTH_LAYOUTS.find((l) => l.id === layoutId) || BOOTH_LAYOUTS[3];
  const baseScale = quality === 'original' ? 1600 : quality === 'high' ? 1200 : 900;

  let canvasWidth = baseScale;
  let canvasHeight = Math.round(baseScale / layout.canvasAspect);

  // Cap extreme vertical strips so memory stays reasonable while preserving crisp aspect
  const maxDim = quality === 'original' ? 2600 : quality === 'high' ? 2000 : 1500;
  if (canvasHeight > maxDim) {
    const ratio = maxDim / canvasHeight;
    canvasHeight = maxDim;
    canvasWidth = Math.round(canvasWidth * ratio);
  }

  const slots: ComputedBoothSlot[] = layout.slots.map((s) => ({
    x: Math.round(s.x * canvasWidth),
    y: Math.round(s.y * canvasHeight),
    w: Math.round(s.w * canvasWidth),
    h: Math.round(s.h * canvasHeight),
    rotation: s.rotation ?? 0,
  }));

  const maxSlotBottom = slots.reduce((acc, s) => Math.max(acc, s.y + s.h), 0);
  const footerHeight = Math.max(54, canvasHeight - maxSlotBottom);
  const footerY = maxSlotBottom + footerHeight * 0.5;

  return {
    canvasWidth,
    canvasHeight,
    slots,
    footerY,
    footerHeight,
  };
}

export interface NormalizedLandmarkLike {
  x: number;
  y: number;
  z?: number;
}

function avgPoint(a: NormalizedLandmarkLike, b: NormalizedLandmarkLike): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Maps MediaPipe 468/478 face landmarks (normalized 0..1) into semantic AR anchors.
 */
export function landmarksToFaceAnchors(
  landmarks: NormalizedLandmarkLike[],
  mirrorX = false
): FaceAnchorSet | null {
  if (!landmarks || landmarks.length < 400) return null;

  const mapPt = (pt: NormalizedLandmarkLike): Point2D => ({
    x: mirrorX ? 1 - pt.x : pt.x,
    y: pt.y,
  });

  // MediaPipe canonical indices:
  // 10 = forehead top, 152 = chin, 1 = nose tip
  // 33 & 133 = right/left corners of subject's right eye (viewer left if unmirrored)
  // 362 & 263 = inner/outer corners of subject's left eye (viewer right if unmirrored)
  // 123 / 352 = cheek puffs, 54 / 284 = temples above ears, 13 / 14 = upper/lower lip
  const leftEyeRaw = landmarks[468] ? mapPt(landmarks[468]) : mapPt(avgPoint(landmarks[33], landmarks[133]));
  const rightEyeRaw = landmarks[473] ? mapPt(landmarks[473]) : mapPt(avgPoint(landmarks[362], landmarks[263]));

  // Ensure leftEye is always the one visually on the left (smaller x)
  const leftEye = leftEyeRaw.x <= rightEyeRaw.x ? leftEyeRaw : rightEyeRaw;
  const rightEye = leftEyeRaw.x <= rightEyeRaw.x ? rightEyeRaw : leftEyeRaw;

  const forehead = mapPt(landmarks[10]);
  const chin = mapPt(landmarks[152]);
  const noseTip = mapPt(landmarks[1]);

  const templeA = mapPt(landmarks[54]);
  const templeB = mapPt(landmarks[284]);
  const leftEar = templeA.x <= templeB.x ? templeA : templeB;
  const rightEar = templeA.x <= templeB.x ? templeB : templeA;

  const cheekA = mapPt(landmarks[123]);
  const cheekB = mapPt(landmarks[352]);
  const leftCheek = cheekA.x <= cheekB.x ? cheekA : cheekB;
  const rightCheek = cheekA.x <= cheekB.x ? cheekB : cheekA;

  const upperLip = mapPt(landmarks[13]);
  const lowerLip = mapPt(landmarks[14]);
  const leftMouthCorner = mapPt(landmarks[61]);
  const rightMouthCorner = mapPt(landmarks[291]);
  const mouth = { x: (upperLip.x + lowerLip.x) / 2, y: (upperLip.y + lowerLip.y) / 2 };

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const eyeDistance = Math.max(0.06, Math.hypot(dx, dy));
  const headAngle = Math.atan2(dy, dx);
  const faceHeight = Math.max(0.15, Math.hypot(chin.x - forehead.x, chin.y - forehead.y));
  const mouthOpen = Math.min(1, Math.max(0, Math.abs(lowerLip.y - upperLip.y) / (faceHeight * 0.2)));
  const mouthWidth = Math.hypot(
    rightMouthCorner.x - leftMouthCorner.x,
    rightMouthCorner.y - leftMouthCorner.y
  );
  const smileScore = Math.min(1, Math.max(0, (mouthWidth / eyeDistance - 0.68) / 0.35));

  return {
    forehead,
    leftEar,
    rightEar,
    leftEye,
    rightEye,
    noseTip,
    leftCheek,
    rightCheek,
    mouth,
    chin,
    eyeDistance,
    faceHeight,
    headAngle,
    mouthOpen,
    smileScore,
    isTracked: true,
  };
}

/**
 * Fallback portrait anchor set when live face landmarks are unavailable or initializing.
 */
export function createDefaultFaceAnchors(timeSec = 0): FaceAnchorSet {
  const swayX = Math.sin(timeSec * 1.4) * 0.008;
  const swayY = Math.cos(timeSec * 1.1) * 0.005;
  const angle = Math.sin(timeSec * 1.2) * 0.03;

  return {
    forehead: { x: 0.5 + swayX, y: 0.25 + swayY },
    leftEar: { x: 0.37 + swayX, y: 0.29 + swayY },
    rightEar: { x: 0.63 + swayX, y: 0.29 + swayY },
    leftEye: { x: 0.435 + swayX, y: 0.375 + swayY },
    rightEye: { x: 0.565 + swayX, y: 0.375 + swayY },
    noseTip: { x: 0.5 + swayX, y: 0.44 + swayY },
    leftCheek: { x: 0.405 + swayX, y: 0.455 + swayY },
    rightCheek: { x: 0.595 + swayX, y: 0.455 + swayY },
    mouth: { x: 0.5 + swayX, y: 0.51 + swayY },
    chin: { x: 0.5 + swayX, y: 0.59 + swayY },
    eyeDistance: 0.13,
    faceHeight: 0.34,
    headAngle: angle,
    mouthOpen: 0.15,
    smileScore: 0.25,
    isTracked: false,
  };
}

export function pickRandomBoothConfig(rand: () => number = Math.random): {
  themeId: string;
  filterId: string;
  effectIds: CameraEffectId[];
  faceFilterIds: FaceFilterId[];
  overlayIds: CameraOverlayId[];
} {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length) % arr.length];

  const theme = pick(BOOTH_THEMES);
  const filter = pick(FILTER_PRESETS);
  const effectA = pick(CAMERA_EFFECT_PRESETS).id;
  const effectB = pick(CAMERA_EFFECT_PRESETS).id;
  const faceA = pick(FACE_FILTER_PRESETS).id;
  const faceB = pick(FACE_FILTER_PRESETS).id;
  const overlay = pick(CAMERA_OVERLAY_PRESETS).id;

  return {
    themeId: theme.id,
    filterId: filter.id,
    effectIds: effectA === effectB ? [effectA] : [effectA, effectB],
    faceFilterIds: faceA === faceB ? [faceA] : [faceA, faceB],
    overlayIds: [overlay],
  };
}
