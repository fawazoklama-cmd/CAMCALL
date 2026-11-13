export type ShapeCategory = 'Basic' | 'Creative';

export type ShapeId =
  // 12 Basic Shapes
  | 'square'
  | 'circle'
  | 'oval'
  | 'rectangle'
  | 'rounded-rectangle'
  | 'heart'
  | 'star'
  | 'diamond'
  | 'hexagon'
  | 'cloud'
  | 'flower'
  | 'capsule'
  // 10 Creative Shapes
  | 'wavy-frame'
  | 'blob-shape'
  | 'scalloped-circle'
  | 'arch-frame'
  | 'ticket-shape'
  | 'polaroid-shape'
  | 'film-frame'
  | 'speech-bubble'
  | 'flower-petal'
  | 'irregular-organic';

export interface ShapePreset {
  id: ShapeId;
  name: string;
  category: ShapeCategory;
  supportsRadius?: boolean;
}

export type ThemeCategory =
  | 'Pink Collection'
  | 'Korean Collection'
  | 'Vintage Collection'
  | 'Cute Collection'
  | 'Y2K Collection'
  | 'Seasonal Collection';

export interface ThemePreset {
  id: string;
  name: string;
  category: ThemeCategory;
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundId: string;
  frameId: FrameId;
  shapeId: ShapeId;
  filterId: string | null;
  borderColor: string;
  badgeText: string;
}

export type FrameId =
  | 'none'
  | 'classic-white'
  | 'pink-border'
  | 'polaroid'
  | 'film-camera'
  | 'vintage-border'
  | 'heart-frame'
  | 'flower-frame'
  | 'ribbon-frame'
  | 'star-frame'
  | 'newspaper-frame'
  | 'magazine-frame'
  | 'scrapbook-frame'
  | 'retro-digicam-frame'
  | 'korean-photo-frame'
  | 'y2k-frame';

export interface FramePreset {
  id: FrameId;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
}

export type BackgroundCategory = 'Solid' | 'Patterns' | 'Texture';

export interface BackgroundPreset {
  id: string;
  name: string;
  category: BackgroundCategory;
  baseColor: string;
  secondaryColor?: string;
  patternKind?:
    | 'solid'
    | 'polka-dots'
    | 'checkerboard'
    | 'stripes'
    | 'hearts'
    | 'stars'
    | 'flowers'
    | 'clouds'
    | 'grid'
    | 'glitter'
    | 'gradient'
    | 'paper'
    | 'vintage-paper'
    | 'film-grain'
    | 'soft-noise'
    | 'glitter-texture'
    | 'fabric';
}

export type PhotoLayoutId =
  | '1-photo'
  | '2-vertical'
  | '2-horizontal'
  | '3-strip'
  | '4-strip'
  | '4-grid'
  | '6-grid'
  | '9-grid'
  | 'magazine-layout'
  | 'scrapbook-layout'
  | 'polaroid-collage'
  | 'random-layout';

export interface LayoutSlotSpec {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
  rotation?: number; // degrees for scrapbook/polaroid/random
  polaroidCaption?: boolean;
}

export interface PhotoLayoutPreset {
  id: PhotoLayoutId;
  name: string;
  photoCount: number;
  aspectRatio: number; // canvas width / height
  slots: LayoutSlotSpec[];
}

export type DecorationCategory =
  | 'Hearts'
  | 'Stars'
  | 'Flowers'
  | 'Butterflies'
  | 'Ribbons'
  | 'Bows'
  | 'Teddy Bears'
  | 'Bunnies'
  | 'Clouds'
  | 'Sparkles'
  | 'Candies'
  | 'Fruits'
  | 'Doodles'
  | 'Cute Characters'
  | 'Digital Icons';

export interface DecorationItem {
  id: string;
  category: DecorationCategory;
  label: string;
  symbol: string;
  color: string;
  accentColor?: string;
  kind: 'emoji' | 'vector';
}

export interface PaperTapePreset {
  id: string;
  label: string;
  kind: 'tape' | 'paper' | 'stamp' | 'ticket';
  color: string;
  accentColor: string;
  pattern?: 'solid' | 'stripes' | 'dots' | 'grid' | 'lined';
  text?: string;
}

export interface CreativeObject {
  id: string;
  kind: 'photo' | 'decoration' | 'text' | 'paper-tape';
  label: string;
  // Photo fields
  imageSrc?: string;
  shapeId?: ShapeId;
  // Decoration / Paper / Text fields
  symbol?: string;
  vectorKind?: 'emoji' | 'vector';
  paperKind?: 'tape' | 'paper' | 'stamp' | 'ticket';
  paperPattern?: 'solid' | 'stripes' | 'dots' | 'grid' | 'lined';
  text?: string;
  fontFamily?: string;
  color: string;
  accentColor?: string;
  bgColor?: string;
  // Transform (normalized 0..1 coordinates)
  x: number;
  y: number;
  width: number; // normalized 0..1 (for photos & paper elements)
  height: number; // normalized 0..1
  scale: number;
  rotation: number; // -180..180
  opacity: number; // 0..1
  borderColor?: string;
  borderWidth?: number;
}

export interface CreativeDesignState {
  mode: 'layout' | 'scrapbook';
  // Shape & Crop controls (for active layout slots or primary photo)
  shapeId: ShapeId;
  shapeSize: number; // 50..100 (%)
  photoZoom: number; // 100..220 (%)
  photoOffsetX: number; // -50..50
  photoOffsetY: number; // -50..50
  borderColor: string;
  borderWidth: number; // 0..24
  cornerRadius: number; // 0..64
  // Theme, Frame, Background, Layout, Filter
  themeId: string | null;
  frameId: FrameId;
  frameCaption: string;
  backgroundId: string;
  customBackgroundSrc: string | null;
  layoutId: PhotoLayoutId;
  layoutGap: number; // 0..40
  layoutPhotos: string[];
  filterId: string | null;
  filterIntensity: number; // 0..100
  // Freeform Scrapbook & Layered Objects (decorations, text, tape, freeform photos)
  objects: CreativeObject[];
}

export interface ScrapbookTemplatePreset {
  id: string;
  name: string;
  description: string;
  themeId: string;
  backgroundId: string;
  frameId: FrameId;
  objects: Omit<CreativeObject, 'id'>[];
}
