import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronsDown,
  ChevronsUp,
  Download,
  Eye,
  FolderHeart,
  Frame,
  ImagePlus,
  Layers,
  LayoutGrid,
  PaintBucket,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  Shapes,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../context/SettingsContext';
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
import { FILTER_PRESETS, TEXT_FONTS } from '../data/presets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type {
  BackgroundCategory,
  CreativeDesignState,
  CreativeObject,
  DecorationCategory,
  DecorationItem,
  PaperTapePreset,
  ScrapbookTemplatePreset,
  ShapeId,
  ThemeCategory,
} from '../types/creative';
import type { LocalProjectRecord } from '../types/settings';
import { downloadCanvasAsImage, exportCanvasDataUrl } from '../utils/canvasRenderer';
import {
  applyThemeToDesignState,
  cloneCreativeDesignState,
  moveLayerOrder,
} from '../utils/creativeGeometry';
import { renderCreativeDesignToCanvas, traceShapePath } from '../utils/creativeRenderer';
import { createHistoryState, pushHistory, redoHistory, undoHistory } from '../utils/imageProcessing';
import { recordHistoryDb, savePhotoToDb, saveProjectToDb } from '../utils/localDb';
import { LiveCameraCaptureModal } from './LiveCameraCaptureModal';

interface CreativeCollectionStudioProps {
  initialProject?: LocalProjectRecord | null;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

type CollectionTab =
  | 'shapes'
  | 'themes'
  | 'frames'
  | 'backgrounds'
  | 'layouts'
  | 'scrapbook'
  | 'decorations'
  | 'filters';

const DEFAULT_SAMPLE_SRCS = STUDIO_SAMPLE_PHOTOS.map((s) => s.src);

const BORDER_SWATCHES = ['#FFFFFF', '#F9A8D4', '#DB2777', '#C4B5FD', '#7C3AED', '#2D1B28', '#FDE68A'];

function createInitialState(): CreativeDesignState {
  return {
    mode: 'layout',
    shapeId: 'rounded-rectangle',
    shapeSize: 94,
    photoZoom: 100,
    photoOffsetX: 0,
    photoOffsetY: 0,
    borderColor: '#FFFFFF',
    borderWidth: 8,
    cornerRadius: 20,
    themeId: 'theme-baby-pink',
    frameId: 'pink-border',
    frameCaption: 'CAMCALL STUDIO ♡',
    backgroundId: 'bg-baby-pink',
    customBackgroundSrc: null,
    layoutId: '1-photo',
    layoutGap: 16,
    layoutPhotos: [...DEFAULT_SAMPLE_SRCS, ...DEFAULT_SAMPLE_SRCS, DEFAULT_SAMPLE_SRCS[0]],
    filterId: 'seoul-milk',
    filterIntensity: 100,
    objects: [],
  };
}

function ShapeMiniIcon({ shapeId, active }: { shapeId: ShapeId; active: boolean }) {
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = miniRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    traceShapePath(ctx, shapeId, 20, 20, 28, 28, 6);
    ctx.fillStyle = active ? '#FCE7F3' : '#FDF2F8';
    ctx.fill();
    ctx.strokeStyle = active ? '#DB2777' : '#D98CB3';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [shapeId, active]);

  return <canvas ref={miniRef} width={40} height={40} aria-hidden="true" className="w-8 h-8 shrink-0" />;
}

export function CreativeCollectionStudio({
  initialProject,
  onNotify,
}: CreativeCollectionStudioProps) {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState<CollectionTab>('shapes');
  const [themeCategory, setThemeCategory] = useState<ThemeCategory>('Pink Collection');
  const [bgCategory, setBgCategory] = useState<BackgroundCategory>('Solid');
  const [decCategory, setDecCategory] = useState<DecorationCategory>('Hearts');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [cameraModalTarget, setCameraModalTarget] = useState<
    { kind: 'slot'; index: number } | { kind: 'scrapbook' } | null
  >(null);

  const [customText, setCustomText] = useState('Cute Memories ♡');
  const [customFont, setCustomFont] = useState(TEXT_FONTS[1].id);
  const [customColor, setCustomColor] = useState('#DB2777');
  const [customBgPill, setCustomBgPill] = useState(true);
  const [exportQuality, setExportQuality] = useState(95);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const [history, setHistory] = useState(() => createHistoryState<CreativeDesignState>(createInitialState()));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgUploadRef = useRef<HTMLInputElement | null>(null);
  const slotUploadRef = useRef<HTMLInputElement | null>(null);
  const scrapPhotoUploadRef = useRef<HTMLInputElement | null>(null);
  const targetSlotRef = useRef<number>(0);
  const draggingObjRef = useRef<{ id: string } | null>(null);

  const current = history.present;

  useEffect(() => {
    if (!initialProject || initialProject.kind !== 'creative') return;
    try {
      const parsed = JSON.parse(initialProject.stateJson) as CreativeDesignState;
      setHistory(createHistoryState<CreativeDesignState>(parsed));
    } catch {
      // Ignore malformed JSON
    }
  }, [initialProject]);

  const commit = useCallback((updater: (prev: CreativeDesignState) => CreativeDesignState) => {
    setHistory((prev) => pushHistory(prev, updater(cloneCreativeDesignState(prev.present))));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderCreativeDesignToCanvas(canvas, current, DEFAULT_SAMPLE_SRCS).catch(() => {});
  }, [current]);

  const activeLayout =
    PHOTO_LAYOUT_PRESETS.find((l) => l.id === current.layoutId) || PHOTO_LAYOUT_PRESETS[0];

  const selectedObject = current.objects.find((o) => o.id === selectedObjectId) || null;

  const handleOpenPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPreviewDataUrl(exportCanvasDataUrl(canvas, { format: 'png', quality: 100 }));
  };

  const handleDownload = (format: 'png' | 'jpg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasAsImage(canvas, 'camcall-creative-design', {
      format,
      quality: exportQuality,
    });
    onNotify(t.notifications.downloaded);
  };

  const handleSaveToGallery = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await savePhotoToDb({
      title: `Creative · ${current.frameCaption || current.shapeId}`,
      dataUrl: exportCanvasDataUrl(canvas, { format: 'png', quality: 95 }) || '',
      source: 'creative',
      format: 'png',
      favorite: false,
    });
    await recordHistoryDb(
      'template',
      current.themeId || 'custom',
      `Creative (${current.shapeId})`
    );
    onNotify(t.notifications.savedGallery);
  };

  const handleSaveProject = async () => {
    const canvas = canvasRef.current;
    const thumb = canvas ? exportCanvasDataUrl(canvas, { format: 'jpg', quality: 75 }) || '' : '';
    await saveProjectToDb({
      title: `Collection · ${current.frameCaption || 'Scrapbook'}`,
      kind: 'creative',
      thumbnailUrl: thumb,
      stateJson: JSON.stringify(current),
    });
    onNotify(t.notifications.savedProject);
  };

  const handleReset = () => {
    commit(() => createInitialState());
    setSelectedObjectId(null);
    onNotify('Creative design reset to studio default.', 'info');
  };

  const handleApplyTheme = (themeId: string) => {
    commit((prev) => applyThemeToDesignState(prev, themeId));
    const t = THEME_PRESETS.find((item) => item.id === themeId);
    if (t) onNotify(`Applied "${t.name}" theme!`);
  };

  const handleLoadScrapbookTemplate = (tpl: ScrapbookTemplatePreset) => {
    const objs: CreativeObject[] = tpl.objects.map((o, idx) => ({
      ...o,
      id: `scrap-${Date.now()}-${idx}`,
      imageSrc: o.kind === 'photo' ? DEFAULT_SAMPLE_SRCS[idx % DEFAULT_SAMPLE_SRCS.length] : o.imageSrc,
    }));
    commit((prev) => ({
      ...prev,
      mode: 'scrapbook',
      themeId: tpl.themeId,
      backgroundId: tpl.backgroundId,
      frameId: tpl.frameId,
      customBackgroundSrc: null,
      objects: objs,
    }));
    setSelectedObjectId(objs[1]?.id || objs[0]?.id || null);
    onNotify(`Loaded "${tpl.name}" scrapbook template!`);
  };

  const handleAddDecoration = (item: DecorationItem) => {
    const id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextObj: CreativeObject = {
      id,
      kind: 'decoration',
      label: item.label,
      symbol: item.symbol,
      vectorKind: item.kind,
      color: item.color,
      accentColor: item.accentColor,
      x: 0.5,
      y: 0.5,
      width: 0.12,
      height: 0.12,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    commit((prev) => ({ ...prev, objects: [...prev.objects, nextObj] }));
    setSelectedObjectId(id);
  };

  const handleAddPaperTape = (item: PaperTapePreset) => {
    const id = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextObj: CreativeObject = {
      id,
      kind: 'paper-tape',
      label: item.label,
      paperKind: item.kind,
      paperPattern: item.pattern,
      color: item.color,
      accentColor: item.accentColor,
      text: item.text,
      x: 0.5,
      y: item.kind === 'tape' ? 0.22 : 0.72,
      width: item.kind === 'tape' ? 0.22 : item.kind === 'stamp' ? 0.16 : 0.34,
      height: item.kind === 'tape' ? 0.06 : item.kind === 'stamp' ? 0.16 : 0.2,
      scale: 1,
      rotation: item.kind === 'tape' ? -12 : 0,
      opacity: item.kind === 'tape' ? 0.92 : 1,
    };
    commit((prev) => ({ ...prev, objects: [...prev.objects, nextObj] }));
    setSelectedObjectId(id);
  };

  const handleAddScrapbookPhoto = (src: string) => {
    const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextObj: CreativeObject = {
      id,
      kind: 'photo',
      label: `Photo ${current.objects.filter((o) => o.kind === 'photo').length + 1}`,
      imageSrc: src,
      shapeId: current.shapeId,
      color: '#FFFFFF',
      borderColor: current.borderColor,
      borderWidth: current.borderWidth,
      x: 0.5,
      y: 0.5,
      width: 0.42,
      height: 0.44,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    commit((prev) => ({
      ...prev,
      mode: 'scrapbook',
      objects: [...prev.objects, nextObj],
    }));
    setSelectedObjectId(id);
  };

  const handleAddCustomText = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    const id = `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextObj: CreativeObject = {
      id,
      kind: 'text',
      label: trimmed,
      text: trimmed,
      fontFamily: customFont,
      color: customColor,
      bgColor: customBgPill ? 'rgba(255,255,255,0.92)' : undefined,
      x: 0.5,
      y: 0.22,
      width: 0.3,
      height: 0.1,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    commit((prev) => ({ ...prev, objects: [...prev.objects, nextObj] }));
    setSelectedObjectId(id);
  };

  const handleUploadCustomBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        commit((prev) => ({ ...prev, customBackgroundSrc: reader.result as string }));
        onNotify('Custom background applied!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSlotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const idx = targetSlotRef.current;
        commit((prev) => {
          const nextPhotos = [...prev.layoutPhotos];
          nextPhotos[idx] = reader.result as string;
          return { ...prev, layoutPhotos: nextPhotos };
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScrapPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleAddScrapbookPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Interactive Canvas Dragging
  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(0.96, Math.max(0.04, (e.clientX - rect.left) / rect.width)),
      y: Math.min(0.96, Math.max(0.04, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getNormalizedCoords(e);
    let nearest: CreativeObject | null = null;
    let bestDist = 0.22;
    for (let i = current.objects.length - 1; i >= 0; i--) {
      const obj = current.objects[i];
      const hitRadius = obj.kind === 'photo' || obj.kind === 'paper-tape' ? 0.24 : 0.14;
      const dist = Math.hypot(obj.x - x, obj.y - y);
      if (dist < hitRadius && dist < bestDist) {
        bestDist = dist;
        nearest = obj;
      }
    }
    if (nearest) {
      setSelectedObjectId(nearest.id);
      draggingObjRef.current = { id: nearest.id };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingObjRef.current) return;
    const { x, y } = getNormalizedCoords(e);
    const id = draggingObjRef.current.id;
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        objects: prev.present.objects.map((o) => (o.id === id ? { ...o, x, y } : o)),
      },
    }));
  };

  const handleCanvasPointerUp = () => {
    draggingObjRef.current = null;
  };

  const TABS: { id: CollectionTab; label: string; Icon: typeof Shapes }[] = [
    { id: 'shapes', label: 'Shapes', Icon: Shapes },
    { id: 'themes', label: 'Themes', Icon: Palette },
    { id: 'frames', label: 'Frames', Icon: Frame },
    { id: 'backgrounds', label: 'Backgrounds', Icon: PaintBucket },
    { id: 'layouts', label: 'Layouts', Icon: LayoutGrid },
    { id: 'scrapbook', label: 'Scrapbook', Icon: Layers },
    { id: 'decorations', label: 'Decorations', Icon: Sticker },
    { id: 'filters', label: 'Filter & Text', Icon: Sparkles },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
      <input
        ref={bgUploadRef}
        type="file"
        accept="image/*"
        onChange={handleUploadCustomBackground}
        className="hidden"
      />
      <input
        ref={slotUploadRef}
        type="file"
        accept="image/*"
        onChange={handleSlotFileChange}
        className="hidden"
      />
      <input
        ref={scrapPhotoUploadRef}
        type="file"
        accept="image/*"
        onChange={handleScrapPhotoFileChange}
        className="hidden"
      />

      {/* Top Studio Header & Custom Design Actions */}
      <div className="rounded-3xl camcall-surface border p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="shrink-0">
          <p className="text-xs font-semibold text-[#db2777]">CAMCALL Creative Collection</p>
          <h1 className="font-display text-xl sm:text-2xl font-bold">
            Custom Design &amp; Scrapbook Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Mode Toggle */}
          <div className="inline-flex p-1 rounded-xl camcall-surface-soft border">
            <button
              type="button"
              onClick={() => commit((prev) => ({ ...prev, mode: 'layout' }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                current.mode === 'layout' ? 'bg-[#db2777] text-white' : 'opacity-80'
              }`}
            >
              Layout &amp; Shape
            </button>
            <button
              type="button"
              onClick={() => {
                if (current.objects.filter((o) => o.kind === 'photo').length === 0) {
                  handleLoadScrapbookTemplate(SCRAPBOOK_TEMPLATES[0]);
                } else {
                  commit((prev) => ({ ...prev, mode: 'scrapbook' }));
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                current.mode === 'scrapbook' ? 'bg-[#7c3aed] text-white' : 'opacity-80'
              }`}
            >
              Scrapbook Studio
            </button>
          </div>

          <button
            type="button"
            disabled={history.past.length === 0}
            onClick={() => setHistory((prev) => undoHistory(prev))}
            className="min-h-[40px] px-3 py-2 rounded-xl camcall-surface-soft border disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            disabled={history.future.length === 0}
            onClick={() => setHistory((prev) => redoHistory(prev))}
            className="min-h-[40px] px-3 py-2 rounded-xl camcall-surface-soft border disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Redo</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="min-h-[40px] px-3 py-2 rounded-xl camcall-surface-soft border hover:border-rose-300 text-xs font-semibold hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProject}
            className="min-h-[40px] px-3 py-2 rounded-xl camcall-surface-soft border hover:border-[#7c3aed] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#7c3aed]" aria-hidden="true" />
            <span>{t.creativeModes.saveProject}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToGallery}
            className="min-h-[40px] px-3 py-2 rounded-xl camcall-surface-soft border hover:border-[#db2777] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <FolderHeart className="w-3.5 h-3.5 text-[#db2777]" aria-hidden="true" />
            <span>{t.creativeModes.saveGallery}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPreview}
            className="min-h-[40px] px-3.5 py-2 rounded-xl camcall-surface-soft border hover:border-[#db2777] text-xs font-semibold text-[#db2777] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownload('png')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>PNG</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownload('jpg')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>JPG</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Interactive Canvas & Slot Photos */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="rounded-3xl camcall-surface border p-4 shadow-sm shadow-pink-950/5 flex flex-col gap-3">
            <div className="rounded-2xl camcall-surface-soft border p-3 flex items-center justify-center min-h-[340px] max-h-[580px]">
              <canvas
                ref={canvasRef}
                data-testid="creative-collection-canvas"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                className="max-w-full max-h-[520px] w-auto h-auto rounded-xl shadow-md touch-none cursor-grab active:cursor-grabbing"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-80">
              <span>Drag stickers, text, tape, or scrapbook photos directly on canvas</span>
              <div className="flex items-center gap-2">
                <label htmlFor="creative-export-quality" className="font-medium">
                  Quality:
                </label>
                <input
                  id="creative-export-quality"
                  type="range"
                  min={40}
                  max={100}
                  step={5}
                  value={exportQuality}
                  onChange={(e) => setExportQuality(Number(e.target.value))}
                  className="studio-slider w-24"
                />
                <span className="font-mono tabular-nums font-semibold">{exportQuality}%</span>
              </div>
            </div>
          </div>

          {/* Layout Photos Manager (visible in layout mode) */}
          {current.mode === 'layout' && (
            <div className="rounded-3xl camcall-surface border p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold">
                  Layout Photos ({activeLayout.name} · {activeLayout.photoCount} slots)
                </h2>
                <button
                  type="button"
                  onClick={() => setCameraModalTarget({ kind: 'slot', index: 0 })}
                  className="px-3 py-1.5 rounded-xl bg-[#db2777] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t.camera.captureFromCamera}</span>
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {Array.from({ length: activeLayout.photoCount }, (_, idx) => {
                  const src = current.layoutPhotos[idx] || DEFAULT_SAMPLE_SRCS[idx % DEFAULT_SAMPLE_SRCS.length];
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          targetSlotRef.current = idx;
                          slotUploadRef.current?.click();
                        }}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-[#f3d5e5] hover:border-[#db2777] bg-[#fdf2f8] cursor-pointer"
                        aria-label={`Upload photo for layout slot ${idx + 1}`}
                      >
                        <img
                          src={src}
                          alt={`Layout slot ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 py-1 bg-[#2d1b28]/70 text-white text-[10px] font-semibold text-center opacity-90 group-hover:bg-[#db2777]">
                          Slot #{idx + 1}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraModalTarget({ kind: 'slot', index: idx })}
                        className="py-1 rounded-lg camcall-surface-soft border text-[10px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-2.5 h-2.5 text-[#db2777]" />
                        <span>Cam</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Layers & Arrangement Panel (whenever objects exist) */}
          {current.objects.length > 0 && (
            <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-[#2d1b28]">
                  Object Layers ({current.objects.length})
                </h2>
                <span className="text-[11px] text-[#6e4f62]">Select layer to arrange or edit</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {current.objects.map((obj, idx) => {
                  const active = obj.id === selectedObjectId;
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => setSelectedObjectId(obj.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                          : 'bg-[#fdf2f8] border-[#f3d5e5] text-[#2d1b28]'
                      }`}
                    >
                      {idx + 1}. {obj.label}
                    </button>
                  );
                })}
              </div>

              {selectedObject && (
                <div className="p-3 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#2d1b28]">
                      Editing: {selectedObject.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Bring layer forward"
                        title="Bring Forward"
                        onClick={() =>
                          commit((prev) => ({
                            ...prev,
                            objects: moveLayerOrder(prev.objects, selectedObject.id, 'up'),
                          }))
                        }
                        className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:border-[#db2777] text-[#2d1b28] cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Send layer backward"
                        title="Send Backward"
                        onClick={() =>
                          commit((prev) => ({
                            ...prev,
                            objects: moveLayerOrder(prev.objects, selectedObject.id, 'down'),
                          }))
                        }
                        className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:border-[#db2777] text-[#2d1b28] cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Bring to front"
                        title="Bring to Front"
                        onClick={() =>
                          commit((prev) => ({
                            ...prev,
                            objects: moveLayerOrder(prev.objects, selectedObject.id, 'top'),
                          }))
                        }
                        className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:border-[#db2777] text-[#2d1b28] cursor-pointer"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Send to back"
                        title="Send to Back"
                        onClick={() =>
                          commit((prev) => ({
                            ...prev,
                            objects: moveLayerOrder(prev.objects, selectedObject.id, 'bottom'),
                          }))
                        }
                        className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:border-[#db2777] text-[#2d1b28] cursor-pointer"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${selectedObject.label}`}
                        onClick={() => {
                          commit((prev) => ({
                            ...prev,
                            objects: prev.objects.filter((o) => o.id !== selectedObject.id),
                          }));
                          setSelectedObjectId(null);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-[#6e4f62]">
                        <span>Size</span>
                        <span className="font-mono tabular-nums">{Math.round(selectedObject.scale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        aria-label="Object size"
                        min={0.4}
                        max={2.4}
                        step={0.05}
                        value={selectedObject.scale}
                        onChange={(e) => {
                          const scale = Number(e.target.value);
                          commit((prev) => ({
                            ...prev,
                            objects: prev.objects.map((o) =>
                              o.id === selectedObject.id ? { ...o, scale } : o
                            ),
                          }));
                        }}
                        className="studio-slider w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-[#6e4f62]">
                        <span>Rotate</span>
                        <span className="font-mono tabular-nums">{selectedObject.rotation}°</span>
                      </div>
                      <input
                        type="range"
                        aria-label="Object rotation"
                        min={-180}
                        max={180}
                        step={5}
                        value={selectedObject.rotation}
                        onChange={(e) => {
                          const rotation = Number(e.target.value);
                          commit((prev) => ({
                            ...prev,
                            objects: prev.objects.map((o) =>
                              o.id === selectedObject.id ? { ...o, rotation } : o
                            ),
                          }));
                        }}
                        className="studio-slider w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-[#6e4f62]">
                        <span>Opacity</span>
                        <span className="font-mono tabular-nums">{Math.round(selectedObject.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        aria-label="Object opacity"
                        min={0.2}
                        max={1}
                        step={0.05}
                        value={selectedObject.opacity}
                        onChange={(e) => {
                          const opacity = Number(e.target.value);
                          commit((prev) => ({
                            ...prev,
                            objects: prev.objects.map((o) =>
                              o.id === selectedObject.id ? { ...o, opacity } : o
                            ),
                          }));
                        }}
                        className="studio-slider w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Creative Collection Tabs & Tool Panels */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-[#f3d5e5] p-4 flex flex-col gap-4">
          {/* Category Navigation Tabs */}
          <div
            className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5]"
            role="tablist"
            aria-label="Creative Collection Categories"
          >
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(id)}
                  className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#db2777] text-white shadow-sm'
                      : 'text-[#6e4f62] hover:text-[#2d1b28] hover:bg-white/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. SHAPES PANEL */}
          {activeTab === 'shapes' && (
            <div className="flex flex-col gap-4 max-h-[580px] overflow-y-auto pr-1 studio-scroll">
              {(['Basic', 'Creative'] as const).map((cat) => (
                <div key={cat}>
                  <h2 className="text-xs font-semibold text-[#db2777] mb-2">
                    {cat} Shapes ({SHAPE_PRESETS.filter((s) => s.category === cat).length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SHAPE_PRESETS.filter((s) => s.category === cat).map((shape) => {
                      const active =
                        selectedObject?.kind === 'photo'
                          ? selectedObject.shapeId === shape.id
                          : current.shapeId === shape.id;
                      return (
                        <button
                          key={shape.id}
                          type="button"
                          onClick={() => {
                            if (selectedObject?.kind === 'photo') {
                              commit((prev) => ({
                                ...prev,
                                objects: prev.objects.map((o) =>
                                  o.id === selectedObject.id ? { ...o, shapeId: shape.id } : o
                                ),
                              }));
                            } else {
                              commit((prev) => ({ ...prev, shapeId: shape.id }));
                            }
                          }}
                          className={`p-2 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                              : 'bg-white border-[#f3d5e5] text-[#2d1b28] hover:border-[#f472b6]'
                          }`}
                        >
                          <ShapeMiniIcon shapeId={shape.id} active={active} />
                          <span className="text-xs font-medium leading-tight">{shape.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Shape Customization Sliders */}
              <div className="p-3.5 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-[#2d1b28]">
                  Shape Size, Crop &amp; Border Controls
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#6e4f62]">
                      <span>Shape Size</span>
                      <span className="font-mono tabular-nums">{current.shapeSize}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Shape size"
                      min={55}
                      max={100}
                      value={current.shapeSize}
                      onChange={(e) =>
                        commit((prev) => ({ ...prev, shapeSize: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#6e4f62]">
                      <span>Photo Zoom (Crop)</span>
                      <span className="font-mono tabular-nums">{current.photoZoom}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Photo zoom inside shape"
                      min={100}
                      max={220}
                      step={5}
                      value={current.photoZoom}
                      onChange={(e) =>
                        commit((prev) => ({ ...prev, photoZoom: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#6e4f62]">
                      <span>Photo Position X</span>
                      <span className="font-mono tabular-nums">{current.photoOffsetX}</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Photo horizontal offset"
                      min={-50}
                      max={50}
                      value={current.photoOffsetX}
                      onChange={(e) =>
                        commit((prev) => ({ ...prev, photoOffsetX: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#6e4f62]">
                      <span>Photo Position Y</span>
                      <span className="font-mono tabular-nums">{current.photoOffsetY}</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Photo vertical offset"
                      min={-50}
                      max={50}
                      value={current.photoOffsetY}
                      onChange={(e) =>
                        commit((prev) => ({ ...prev, photoOffsetY: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#6e4f62]">
                      <span>Border Thickness</span>
                      <span className="font-mono tabular-nums">{current.borderWidth}px</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Shape border thickness"
                      min={0}
                      max={24}
                      value={current.borderWidth}
                      onChange={(e) =>
                        commit((prev) => ({ ...prev, borderWidth: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#6e4f62]">
                      <span>Corner Radius</span>
                      <span className="font-mono tabular-nums">{current.cornerRadius}px</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Shape corner radius"
                      min={0}
                      max={64}
                      value={current.cornerRadius}
                      onChange={(e) =>
                        commit((prev) => ({ ...prev, cornerRadius: Number(e.target.value) }))
                      }
                      className="studio-slider w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-[#2d1b28]">Border Color</span>
                  <div className="flex items-center gap-1.5">
                    {BORDER_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Set border color ${c}`}
                        onClick={() => commit((prev) => ({ ...prev, borderColor: c }))}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          current.borderColor === c ? 'border-[#db2777] scale-110' : 'border-[#e5e7eb]'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Custom border color"
                      value={current.borderColor}
                      onChange={(e) =>
                        commit((prev) => ({ ...prev, borderColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded-lg border border-[#f3d5e5] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. THEMES PANEL (48 Themes across 6 Collections) */}
          {activeTab === 'themes' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {THEME_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setThemeCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      themeCategory === cat
                        ? 'bg-[#db2777] text-white'
                        : 'bg-[#fdf2f8] text-[#6e4f62] hover:text-[#2d1b28]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1 studio-scroll">
                {THEME_PRESETS.filter((t) => t.category === themeCategory).map((theme) => {
                  const active = current.themeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleApplyTheme(theme.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                        active
                          ? 'bg-[#fce7f3] border-[#db2777] ring-2 ring-[#fce7f3]'
                          : 'bg-white border-[#f3d5e5] hover:border-[#f472b6]'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl border shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: theme.secondaryColor,
                          borderColor: theme.borderColor,
                          color: theme.accentColor,
                        }}
                      >
                        {theme.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#2d1b28] truncate">{theme.name}</p>
                        <p className="text-[11px] text-[#6e4f62] truncate">{theme.badgeText}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-[#db2777] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. FRAMES PANEL (15 Frames + No Frame) */}
          {activeTab === 'frames' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="creative-frame-caption" className="text-xs font-semibold text-[#2d1b28]">
                  Frame Caption Text
                </label>
                <input
                  id="creative-frame-caption"
                  type="text"
                  value={current.frameCaption}
                  onChange={(e) =>
                    commit((prev) => ({ ...prev, frameCaption: e.target.value }))
                  }
                  placeholder="CAMCALL STUDIO ♡"
                  className="px-3 py-2 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5] text-xs text-[#2d1b28] focus:outline-none focus:border-[#db2777]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-[450px] overflow-y-auto pr-1 studio-scroll">
                {FRAME_PRESETS.map((frame) => {
                  const active = current.frameId === frame.id;
                  return (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => commit((prev) => ({ ...prev, frameId: frame.id }))}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#fce7f3] border-[#db2777]'
                          : 'bg-white border-[#f3d5e5] hover:border-[#f472b6]'
                      }`}
                    >
                      <span
                        className="w-9 h-10 rounded-lg border-4 shrink-0"
                        style={{
                          backgroundColor: '#FFFDFE',
                          borderColor:
                            frame.primaryColor === 'transparent' ? '#E5E7EB' : frame.accentColor,
                        }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#2d1b28] truncate">{frame.name}</p>
                        <p className="text-[11px] text-[#6e4f62] line-clamp-1">{frame.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. BACKGROUNDS PANEL (Solid, Patterns, Texture + Custom Upload) */}
          {activeTab === 'backgrounds' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {(['Solid', 'Patterns', 'Texture'] as BackgroundCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBgCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        bgCategory === cat
                          ? 'bg-[#db2777] text-white'
                          : 'bg-[#fdf2f8] text-[#6e4f62]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => bgUploadRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Upload Background</span>
                </button>
              </div>

              {current.customBackgroundSrc && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#ede9fe] border border-[#c4b5fd] text-xs text-[#4c1d95]">
                  <span className="font-medium">Custom background image active</span>
                  <button
                    type="button"
                    onClick={() => commit((prev) => ({ ...prev, customBackgroundSrc: null }))}
                    className="font-semibold underline cursor-pointer"
                  >
                    Clear Custom
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[440px] overflow-y-auto pr-1 studio-scroll">
                {BACKGROUND_PRESETS.filter((b) => b.category === bgCategory).map((bg) => {
                  const active = !current.customBackgroundSrc && current.backgroundId === bg.id;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() =>
                        commit((prev) => ({
                          ...prev,
                          backgroundId: bg.id,
                          customBackgroundSrc: null,
                        }))
                      }
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#fce7f3] border-[#db2777]'
                          : 'bg-white border-[#f3d5e5] hover:border-[#f472b6]'
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg border border-[#f3d5e5] shrink-0"
                        style={{
                          background: bg.secondaryColor
                            ? `linear-gradient(135deg, ${bg.baseColor} 0%, ${bg.secondaryColor} 100%)`
                            : bg.baseColor,
                        }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-[#2d1b28] truncate">{bg.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. PHOTO LAYOUTS PANEL (12 Layouts) */}
          {activeTab === 'layouts' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <label htmlFor="creative-layout-gap" className="font-semibold text-[#2d1b28]">
                    Photo Spacing
                  </label>
                  <span className="font-mono tabular-nums text-[#6e4f62]">{current.layoutGap}px</span>
                </div>
                <input
                  id="creative-layout-gap"
                  type="range"
                  min={0}
                  max={40}
                  value={current.layoutGap}
                  onChange={(e) =>
                    commit((prev) => ({ ...prev, layoutGap: Number(e.target.value) }))
                  }
                  className="studio-slider w-full"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[450px] overflow-y-auto pr-1 studio-scroll">
                {PHOTO_LAYOUT_PRESETS.map((layout) => {
                  const active = current.mode === 'layout' && current.layoutId === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        commit((prev) => ({
                          ...prev,
                          mode: 'layout',
                          layoutId: layout.id,
                        }))
                      }
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1 cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#fce7f3] border-[#db2777]'
                          : 'bg-white border-[#f3d5e5] hover:border-[#f472b6]'
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#2d1b28]">{layout.name}</span>
                      <span className="font-mono text-[11px] text-[#6e4f62]">
                        {layout.photoCount} {layout.photoCount === 1 ? 'Photo' : 'Photos'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. SCRAPBOOK STUDIO PANEL */}
          {activeTab === 'scrapbook' && (
            <div className="flex flex-col gap-4 max-h-[540px] overflow-y-auto pr-1 studio-scroll">
              <div>
                <h2 className="text-xs font-semibold text-[#db2777] mb-2">
                  Ready-Made Scrapbook Templates
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SCRAPBOOK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleLoadScrapbookTemplate(tpl)}
                      className="p-3 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] hover:border-[#db2777] text-left cursor-pointer transition-colors"
                    >
                      <p className="text-xs font-semibold text-[#2d1b28]">{tpl.name}</p>
                      <p className="text-[11px] text-[#6e4f62] mt-0.5 line-clamp-2">
                        {tpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCameraModalTarget({ kind: 'scrapbook' })}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>{t.camera.captureFromCamera}</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrapPhotoUploadRef.current?.click()}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" aria-hidden="true" />
                  <span>Add Uploaded Photo</span>
                </button>
                {STUDIO_SAMPLE_PHOTOS.slice(0, 2).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleAddScrapbookPhoto(s.src)}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] hover:border-[#db2777] text-xs font-semibold text-[#2d1b28] cursor-pointer"
                  >
                    + {s.label}
                  </button>
                ))}
              </div>

              <div>
                <h2 className="text-xs font-semibold text-[#7c3aed] mb-2">
                  Washi Tape, Paper &amp; Stamp Elements
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {PAPER_TAPE_PRESETS.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => handleAddPaperTape(pt)}
                      className="p-2.5 rounded-xl bg-white border border-[#f3d5e5] hover:border-[#7c3aed] flex items-center gap-2.5 text-left cursor-pointer"
                    >
                      <span
                        className="w-7 h-7 rounded-lg border shrink-0"
                        style={{ backgroundColor: pt.color, borderColor: pt.accentColor }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-[#2d1b28] truncate">{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. DECORATION COLLECTION PANEL (15 Categories) */}
          {activeTab === 'decorations' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {DECORATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDecCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium cursor-pointer transition-colors ${
                      decCategory === cat
                        ? 'bg-[#db2777] text-white'
                        : 'bg-[#fdf2f8] text-[#6e4f62] hover:text-[#2d1b28]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1 studio-scroll">
                {DECORATION_ITEMS.filter((item) => item.category === decCategory).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddDecoration(item)}
                    className="p-2.5 rounded-xl bg-white border border-[#f3d5e5] hover:border-[#db2777] hover:bg-[#fdf2f8] flex items-center gap-2.5 text-left cursor-pointer min-h-[44px]"
                  >
                    <span
                      className="w-8 h-8 rounded-lg bg-[#fdf2f8] flex items-center justify-center text-base shrink-0"
                      style={{ color: item.color }}
                      aria-hidden="true"
                    >
                      {item.symbol === 'bow-vector'
                        ? '🎀'
                        : item.symbol === 'butterfly-vector'
                        ? '🦋'
                        : item.symbol === 'cloud-vector'
                        ? '☁️'
                        : item.symbol}
                    </span>
                    <span className="text-xs font-medium text-[#2d1b28] truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. FILTERS & TEXT PANEL */}
          {activeTab === 'filters' && (
            <div className="flex flex-col gap-4 max-h-[540px] overflow-y-auto pr-1 studio-scroll">
              {/* Custom Text Block */}
              <div className="p-3 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2d1b28]">
                  <Type className="w-3.5 h-3.5 text-[#db2777]" aria-hidden="true" />
                  <span>Add Custom Text</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Custom design text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] text-xs text-[#2d1b28]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomText}
                    className="px-3.5 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold cursor-pointer"
                  >
                    Add Text
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Select text font"
                    value={customFont}
                    onChange={(e) => setCustomFont(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#f3d5e5] text-xs text-[#2d1b28]"
                  >
                    {TEXT_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    aria-label="Text color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-[#f3d5e5]"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#6e4f62] cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={customBgPill}
                      onChange={(e) => setCustomBgPill(e.target.checked)}
                      className="accent-[#db2777]"
                    />
                    Backdrop
                  </label>
                </div>
              </div>

              {/* Filter Selector */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#2d1b28]">Photo Filter</span>
                  <span className="font-mono tabular-nums text-[#db2777]">
                    {current.filterIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Creative design filter intensity"
                  min={0}
                  max={100}
                  value={current.filterIntensity}
                  onChange={(e) =>
                    commit((prev) => ({ ...prev, filterIntensity: Number(e.target.value) }))
                  }
                  className="studio-slider w-full"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => commit((prev) => ({ ...prev, filterId: null }))}
                    className={`p-2 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                      current.filterId === null
                        ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                        : 'bg-white border-[#f3d5e5] text-[#2d1b28]'
                    }`}
                  >
                    Original (No Filter)
                  </button>
                  {FILTER_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => commit((prev) => ({ ...prev, filterId: f.id }))}
                      className={`p-2 rounded-xl border text-left cursor-pointer ${
                        current.filterId === f.id
                          ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                          : 'bg-white border-[#f3d5e5] text-[#2d1b28]'
                      }`}
                    >
                      <p className="text-xs font-semibold truncate">{f.name}</p>
                      <p className="text-[10px] text-[#6e4f62]">{f.category}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Preview Modal before Download */}
      {previewDataUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-[#2d1b28]/70 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Creative Design Preview"
          >
            <div className="bg-white rounded-3xl border border-[#f3d5e5] max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#2d1b28]">
                  Design Preview
                </h2>
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setPreviewDataUrl(null)}
                  className="p-2 rounded-xl hover:bg-[#fdf2f8] text-[#6e4f62] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] p-3 flex items-center justify-center max-h-[60vh] overflow-auto">
                <img
                  src={previewDataUrl}
                  alt="High-resolution CAMCALL creative design preview"
                  className="max-w-full max-h-[54vh] object-contain rounded-lg shadow-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDataUrl(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-white border border-[#f3d5e5] text-xs font-semibold text-[#2d1b28] cursor-pointer"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownload('png');
                    setPreviewDataUrl(null);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownload('jpg');
                    setPreviewDataUrl(null);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download JPG</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <LiveCameraCaptureModal
        open={cameraModalTarget !== null}
        title={t.camera.captureFromCamera}
        onCapture={(dataUrl) => {
          if (!cameraModalTarget) return;
          if (cameraModalTarget.kind === 'scrapbook') {
            handleAddScrapbookPhoto(dataUrl);
            onNotify('Captured photo added to Scrapbook!');
          } else {
            const idx = cameraModalTarget.index;
            commit((prev) => {
              const nextPhotos = [...prev.layoutPhotos];
              nextPhotos[idx] = dataUrl;
              return { ...prev, layoutPhotos: nextPhotos };
            });
            onNotify(`Captured photo for slot #${idx + 1}!`);
          }
        }}
        onClose={() => setCameraModalTarget(null)}
      />
    </section>
  );
}
