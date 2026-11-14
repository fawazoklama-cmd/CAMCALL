export type BoothShapeId =
  | 'square'
  | 'rectangle'
  | 'circle'
  | 'heart'
  | 'star'
  | 'oval'
  | 'polaroid'
  | 'rounded'
  | 'film-strip'
  | 'vintage-camera'
  | 'cloud'
  | 'flower'
  | 'ticket'
  | 'magazine';

export type BoothLayoutId =
  | 'single'
  | 'double'
  | 'triple'
  | 'strip-4'
  | 'strip-6'
  | 'strip-8'
  | 'grid-9'
  | 'grid-2x2'
  | 'grid-3x3'
  | 'vertical-strip'
  | 'horizontal-strip'
  | 'random-collage'
  | 'magazine-layout';

export type BoothThemeCategory =
  | 'Korean Studio'
  | 'Vintage'
  | 'Y2K'
  | 'Cute'
  | 'Aesthetic'
  | 'Dark & Cool';

export type CameraEffectId =
  | 'soft-glow'
  | 'dreamy-blur'
  | 'film-grain'
  | 'vintage-flash'
  | 'vhs'
  | 'rgb-split'
  | 'chromatic-aberration'
  | 'light-leak'
  | 'sparkle'
  | 'glitter'
  | 'star-shine'
  | 'rainbow-light'
  | 'pink-glow'
  | 'lens-flare'
  | 'motion-blur'
  | 'retro-digital'
  | 'old-camera'
  | 'timestamp'
  | 'golden-light'
  | 'glitch-effect'
  | 'double-exposure';

export type FaceFilterCategory = 'Animal' | 'Cute' | 'Fashion' | 'Fun' | 'Aesthetic';

export type FaceFilterId =
  | 'bunny-ears'
  | 'cat-ears'
  | 'puppy-ears'
  | 'bear-ears'
  | 'deer-ears'
  | 'fox-ears'
  | 'pink-ribbon'
  | 'butterfly-decor'
  | 'pink-blush'
  | 'heart-cheeks'
  | 'freckles'
  | 'pink-nose'
  | 'cute-whiskers'
  | 'flower-crown'
  | 'angel-halo'
  | 'princess-crown'
  | 'sunglasses'
  | 'pink-glasses'
  | 'star-glasses'
  | 'butterfly-glasses'
  | 'makeup-filter'
  | 'lip-tint'
  | 'funny-mustache'
  | 'big-glasses'
  | 'cartoon-face'
  | 'rainbow-face'
  | 'star-eyes'
  | 'funny-hat'
  | 'korean-soft-face'
  | 'dreamy-face'
  | 'vintage-face';

export type CameraOverlayId =
  | 'floating-hearts'
  | 'floating-stars'
  | 'pink-sparkles'
  | 'falling-flowers'
  | 'butterflies'
  | 'floating-bubbles'
  | 'cute-clouds'
  | 'glitter-rain'
  | 'animated-ribbons';

export type CameraModeId =
  | 'photo'
  | 'burst'
  | 'photobooth'
  | 'mirror'
  | 'timer'
  | 'video'
  | 'random'
  | 'gesture';

export type BoothAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export type CameraResolutionId = '480p' | '720p' | '1080p';

export type BoothQualityPreset = 'standard' | 'high' | 'original';

export interface BoothShapePreset {
  id: BoothShapeId;
  name: string;
  description: string;
}

export interface BoothLayoutSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
}

export interface BoothLayoutPreset {
  id: BoothLayoutId;
  name: string;
  slotCount: number;
  canvasAspect: number;
  slots: BoothLayoutSlot[];
}

export interface BoothThemePreset {
  id: string;
  name: string;
  category: BoothThemeCategory;
  backgroundColor: string;
  backgroundGradient?: string;
  secondaryColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  motif: 'korean' | 'hearts' | 'film' | 'y2k' | 'ribbon' | 'stars' | 'flowers' | 'dark' | 'minimal';
  defaultShapeId: BoothShapeId;
  recommendedFilterId: string;
  recommendedEffects: CameraEffectId[];
  footerLabel: string;
}

export interface CameraEffectPreset {
  id: CameraEffectId;
  name: string;
  description: string;
  badgeColor: string;
}

export interface FaceFilterPreset {
  id: FaceFilterId;
  name: string;
  category: FaceFilterCategory;
  swatchColor: string;
}

export interface CameraOverlayPreset {
  id: CameraOverlayId;
  name: string;
  symbol: string;
  color: string;
}

export interface CameraModePreset {
  id: CameraModeId;
  name: string;
  description: string;
}

export interface BoothDecorationItem {
  id: string;
  kind: 'sticker' | 'doodle' | 'heart' | 'star' | 'flower' | 'ribbon' | 'text' | 'date' | 'timestamp';
  label: string;
  symbol: string;
  color: string;
  bgColor?: string;
  fontFamily?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceAnchorSet {
  forehead: Point2D;
  leftEar: Point2D;
  rightEar: Point2D;
  leftEye: Point2D;
  rightEye: Point2D;
  noseTip: Point2D;
  leftCheek: Point2D;
  rightCheek: Point2D;
  mouth: Point2D;
  chin: Point2D;
  eyeDistance: number;
  faceHeight: number;
  headAngle: number;
  mouthOpen: number;
  smileScore?: number;
  isTracked: boolean;
}
