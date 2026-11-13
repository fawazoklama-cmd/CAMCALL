export type StudioView = 'home' | 'photobooth' | 'filters' | 'editor' | 'collage' | 'about';

export type FilterCategory =
  | 'All'
  | 'Vintage'
  | 'Retro'
  | 'Korean'
  | 'Pink'
  | 'Y2K'
  | 'Film'
  | 'Polaroid'
  | 'Cinematic'
  | 'Black & White'
  | 'Dreamy'
  | 'Natural';

export interface FilterConfig {
  id: string;
  name: string;
  category: Exclude<FilterCategory, 'All'>;
  description: string;
  brightness: number; // 1.0 neutral
  contrast: number; // 1.0 neutral
  saturation: number; // 1.0 neutral
  sepia: number; // 0..1
  hueRotate: number; // degrees
  temperature: number; // -100..100 (warm positive, cool negative)
  pinkTint: number; // 0..1
  lavenderTint: number; // 0..1
  fade: number; // 0..0.35 lifted blacks
  vignette: number; // 0..1
  grain: number; // 0..1
  blur: number; // px
}

export interface EditorAdjustments {
  brightness: number; // -100 to 100 (0 neutral)
  contrast: number; // -100 to 100 (0 neutral)
  saturation: number; // -100 to 100 (0 neutral)
  exposure: number; // -100 to 100 (0 neutral)
  temperature: number; // -100 to 100 (0 neutral)
  sharpness: number; // 0 to 100
  blur: number; // 0 to 20
  grain: number; // 0 to 100
  vignette: number; // 0 to 100
}

export interface CropRect {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  width: number; // normalized 0..1
  height: number; // normalized 0..1
}

export type CropAspectPreset = 'free' | '1:1' | '4:3' | '3:4' | '16:9';

export type StickerCategory =
  | 'Hearts'
  | 'Flowers'
  | 'Stars'
  | 'Sparkles'
  | 'Ribbons'
  | 'Kawaii'
  | 'Doodles'
  | 'Emoji'
  | 'Text'
  | 'Frames';

export interface StickerPreset {
  id: string;
  category: StickerCategory;
  label: string;
  symbol: string;
  color: string;
  accentColor?: string;
  kind: 'vector' | 'emoji' | 'frame' | 'text-preset';
}

export interface CanvasLayer {
  id: string;
  type: 'sticker' | 'text' | 'frame';
  label: string;
  symbol?: string;
  text?: string;
  fontFamily?: string;
  color: string;
  accentColor?: string;
  bgColor?: string;
  x: number; // normalized 0..1 center
  y: number; // normalized 0..1 center
  scale: number; // 0.3..3.0
  rotation: number; // degrees -180..180
  opacity: number; // 0..1
  stickerId?: string;
}

export interface EditorSnapshot {
  adjustments: EditorAdjustments;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  crop: CropRect;
  filterId: string | null;
  filterIntensity: number; // 0..100
  layers: CanvasLayer[];
}

export type PhotoboothTemplateId =
  | 'classic-korean'
  | 'pink-love'
  | 'vintage-film'
  | 'retro-camera'
  | 'minimal-white'
  | 'y2k'
  | 'cute-ribbon'
  | 'polaroid-style';

export interface PhotoboothTemplate {
  id: PhotoboothTemplateId;
  name: string;
  subtitle: string;
  backgroundColor: string;
  secondaryColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  frameRadius: number;
  footerLabel: string;
  motif: 'hearts' | 'film' | 'ribbon' | 'y2k' | 'minimal' | 'retro' | 'polaroid' | 'korean';
}

export type PhotoboothFrameCount = 2 | 3 | 4 | 6;
export type PhotoboothAspect = '4:3' | '1:1' | '3:4';

export type CollagePhotoCount = 2 | 3 | 4 | 6 | 9;

export interface CollageSlot {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

export interface CollageTemplate {
  id: string;
  name: string;
  photoCount: CollagePhotoCount;
  aspectRatio: number; // width / height
  slots: CollageSlot[];
}

export type ExportFormat = 'png' | 'jpg';

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 10..100
}

export interface SavedCreation {
  id: string;
  title: string;
  dataUrl: string;
  createdAt: string;
  source: 'photobooth' | 'editor' | 'collage' | 'filter';
}
