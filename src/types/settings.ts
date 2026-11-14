import type { BoothAspectRatio, CameraModeId, CameraResolutionId } from './photobooth';
import type { ExportFormat } from './studio';

export type LanguageCode = 'id' | 'en';

export type AppThemeId = 'pink' | 'soft-pink' | 'lavender' | 'white-minimalist' | 'dark';

export type ColorMode = 'light' | 'dark';

export type TextSizeScale = 'sm' | 'md' | 'lg';

export interface AppSettings {
  language: LanguageCode;
  theme: AppThemeId;
  colorMode: ColorMode;
  textSize: TextSizeScale;
  animationsEnabled: boolean;
  reduceMotion: boolean;
  glassTransparency: number; // 65..100
  defaultFacing: 'user' | 'environment';
  mirrorPreview: boolean;
  resolution: CameraResolutionId;
  aspectRatio: BoothAspectRatio;
  defaultZoom: number; // 1.0..2.5
  flashEnabled: boolean;
  countdownSeconds: 0 | 3 | 5 | 10;
  cameraSoundEnabled: boolean;
  saveFormat: ExportFormat;
  defaultCameraMode: CameraModeId;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'pink',
  colorMode: 'light',
  textSize: 'md',
  animationsEnabled: true,
  reduceMotion: false,
  glassTransparency: 90,
  defaultFacing: 'user',
  mirrorPreview: true,
  resolution: '720p',
  aspectRatio: '3:4',
  defaultZoom: 1.0,
  flashEnabled: true,
  countdownSeconds: 3,
  cameraSoundEnabled: true,
  saveFormat: 'png',
  defaultCameraMode: 'photobooth',
};

export interface GalleryPhotoRecord {
  id: string;
  title: string;
  dataUrl: string;
  format: 'png' | 'jpg' | 'gif' | 'webm';
  source:
    | 'camera'
    | 'photobooth'
    | 'filter'
    | 'editor'
    | 'collage'
    | 'creative'
    | 'templates';
  createdAt: number;
  favorite: boolean;
}

export interface LocalProjectRecord {
  id: string;
  title: string;
  kind: 'editor' | 'collage' | 'creative' | 'photobooth' | 'creative-mode';
  thumbnailUrl: string;
  stateJson: string;
  createdAt: number;
  updatedAt: number;
}

export interface UsageHistoryRecord {
  id: string;
  kind: 'template' | 'filter' | 'download';
  itemId: string;
  label: string;
  usedAt: number;
}
