import {
  ArrowLeft,
  Check,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Sliders,
  Sparkles,
  Sticker,
  Undo2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_ADJUSTMENTS, FILTER_PRESETS } from '../data/presets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type {
  CanvasLayer,
  CropAspectPreset,
  EditorAdjustments,
  EditorSnapshot,
  ExportOptions,
} from '../types/studio';
import {
  downloadCanvasAsImage,
  exportCanvasDataUrl,
  loadHtmlImage,
  renderEditedPhotoToCanvas,
} from '../utils/canvasRenderer';
import {
  cloneEditorSnapshot,
  computeCenteredCropRect,
  createHistoryState,
  pushHistory,
  redoHistory,
  undoHistory,
} from '../utils/imageProcessing';
import { ExportControls } from './ExportControls';
import { StickerStudioPanel } from './StickerStudioPanel';

interface PhotoEditorProps {
  initialImageSrc?: string | null;
  initialFilterId?: string | null;
  initialFilterIntensity?: number;
  onBack: () => void;
  onSaveCreation: (title: string, dataUrl: string) => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

type EditorTab = 'adjust' | 'transform' | 'filters' | 'stickers';

const INITIAL_SNAPSHOT: EditorSnapshot = {
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  filterId: null,
  filterIntensity: 100,
  layers: [],
};

const ADJUSTMENT_SLIDERS: {
  key: keyof EditorAdjustments;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: 'brightness', label: 'Brightness', min: -60, max: 60 },
  { key: 'contrast', label: 'Contrast', min: -60, max: 60 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'exposure', label: 'Exposure', min: -60, max: 60 },
  { key: 'temperature', label: 'Temperature', min: -80, max: 80 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
  { key: 'blur', label: 'Blur', min: 0, max: 12 },
  { key: 'grain', label: 'Grain', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
];

export function PhotoEditor({
  initialImageSrc,
  initialFilterId,
  initialFilterIntensity = 100,
  onBack,
  onSaveCreation,
  onNotify,
}: PhotoEditorProps) {
  const [imageSrc, setImageSrc] = useState<string>(initialImageSrc || STUDIO_SAMPLE_PHOTOS[0].src);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('adjust');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [cropPreset, setCropPreset] = useState<CropAspectPreset>('free');

  const [history, setHistory] = useState(() =>
    createHistoryState<EditorSnapshot>({
      ...cloneEditorSnapshot(INITIAL_SNAPSHOT),
      filterId: initialFilterId || null,
      filterIntensity: initialFilterIntensity,
    })
  );

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 95,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draggingLayerRef = useRef<{ id: string } | null>(null);

  const current = history.present;

  // Sync external navigation payload when arriving from FilterLibrary or Photobooth
  useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
    }
    if (initialFilterId !== undefined) {
      setHistory(
        createHistoryState<EditorSnapshot>({
          ...cloneEditorSnapshot(INITIAL_SNAPSHOT),
          filterId: initialFilterId,
          filterIntensity: initialFilterIntensity,
        })
      );
    }
  }, [initialImageSrc, initialFilterId, initialFilterIntensity]);

  // Load HTMLImageElement whenever imageSrc changes
  useEffect(() => {
    let cancelled = false;
    loadHtmlImage(imageSrc)
      .then((img) => {
        if (!cancelled) {
          setLoadedImage(img);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  const commitSnapshot = useCallback((updater: (prev: EditorSnapshot) => EditorSnapshot) => {
    setHistory((prev) => pushHistory(prev, updater(cloneEditorSnapshot(prev.present))));
  }, []);

  // Re-render HTML5 Canvas whenever loadedImage or snapshot changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;
    const activeFilter = current.filterId
      ? FILTER_PRESETS.find((f) => f.id === current.filterId) || null
      : null;

    renderEditedPhotoToCanvas(canvas, {
      image: loadedImage,
      adjustments: current.adjustments,
      filter: activeFilter,
      filterIntensity: current.filterIntensity,
      crop: current.crop,
      rotation: current.rotation,
      flipH: current.flipH,
      flipV: current.flipV,
      layers: current.layers,
      maxDimension: 1400,
    });
  }, [loadedImage, current]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setHistory(createHistoryState(cloneEditorSnapshot(INITIAL_SNAPSHOT)));
        setCropPreset('free');
        setSelectedLayerId(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetAll = () => {
    commitSnapshot(() => cloneEditorSnapshot(INITIAL_SNAPSHOT));
    setCropPreset('free');
    setSelectedLayerId(null);
    onNotify('Editor adjustments reset.', 'info');
  };

  const handleCropPreset = (preset: CropAspectPreset) => {
    setCropPreset(preset);
    if (!loadedImage) return;
    const nextCrop = computeCenteredCropRect(
      loadedImage.naturalWidth,
      loadedImage.naturalHeight,
      preset
    );
    commitSnapshot((s) => ({ ...s, crop: nextCrop }));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = exportCanvasDataUrl(canvas, { format: 'jpg', quality: 88 });
    onSaveCreation(`CAMCALL Edit ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, dataUrl);
    onNotify('Saved to your local Studio Shelf!');
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasAsImage(canvas, 'camcall-edited-photo', exportOptions);
    onNotify(`Photo downloaded (${exportOptions.format.toUpperCase()})!`);
  };

  // Interactive Canvas Dragging for Stickers and Text
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
    // Find nearest non-frame layer within hit radius
    let nearest: CanvasLayer | null = null;
    let bestDist = 0.14;
    for (let i = current.layers.length - 1; i >= 0; i--) {
      const layer = current.layers[i];
      if (layer.type === 'frame') continue;
      const dist = Math.hypot(layer.x - x, layer.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = layer;
      }
    }
    if (nearest) {
      setSelectedLayerId(nearest.id);
      draggingLayerRef.current = { id: nearest.id };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingLayerRef.current) return;
    const { x, y } = getNormalizedCoords(e);
    const id = draggingLayerRef.current.id;
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        layers: prev.present.layers.map((l) => (l.id === id ? { ...l, x, y } : l)),
      },
    }));
  };

  const handleCanvasPointerUp = () => {
    draggingLayerRef.current = null;
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-[#f3d5e5] p-3 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#2d1b28] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#db2777]" aria-hidden="true" />
            <span>Back</span>
          </button>
          <h1 className="font-display text-lg sm:text-xl font-bold text-[#2d1b28] px-1">
            Photo Editor
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] hover:border-[#db2777] text-xs font-semibold text-[#2d1b28] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#db2777]" aria-hidden="true" />
            <span>Upload</span>
          </button>

          <button
            type="button"
            disabled={history.past.length === 0}
            onClick={() => setHistory((prev) => undoHistory(prev))}
            aria-label="Undo last edit"
            className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] disabled:opacity-40 text-xs font-semibold text-[#2d1b28] inline-flex items-center gap-1 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            disabled={history.future.length === 0}
            onClick={() => setHistory((prev) => redoHistory(prev))}
            aria-label="Redo edit"
            className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] disabled:opacity-40 text-xs font-semibold text-[#2d1b28] inline-flex items-center gap-1 cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Redo</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] hover:border-rose-300 text-xs font-semibold text-[#6e4f62] hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main Editor Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Canvas Viewport */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 shadow-sm shadow-pink-950/5 flex flex-col gap-3">
            <div className="relative rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] min-h-[340px] max-h-[560px] flex items-center justify-center p-3 overflow-hidden">
              <canvas
                ref={canvasRef}
                data-testid="photo-editor-canvas"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                className="max-w-full max-h-[510px] w-auto h-auto rounded-xl shadow-md touch-none cursor-grab active:cursor-grabbing"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6e4f62]">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="font-medium shrink-0">Quick Sample:</span>
                {STUDIO_SAMPLE_PHOTOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setImageSrc(s.src)}
                    className={`px-2.5 py-1 rounded-lg border shrink-0 cursor-pointer ${
                      imageSrc === s.src
                        ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d] font-semibold'
                        : 'bg-[#fdf2f8] border-transparent hover:text-[#2d1b28]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px]">Tip: Drag stickers or text directly on the photo</span>
            </div>
          </div>
        </div>

        {/* Right: Tool Tabs & Controls + Export */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 flex flex-col gap-4">
            {/* 4 Workspace Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5]">
              {(
                [
                  { id: 'adjust', label: 'Adjust', Icon: Sliders },
                  { id: 'transform', label: 'Crop', Icon: Crop },
                  { id: 'filters', label: 'Filters', Icon: Sparkles },
                  { id: 'stickers', label: 'Stickers', Icon: Sticker },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#db2777] text-white shadow-sm'
                        : 'text-[#6e4f62] hover:text-[#2d1b28]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Adjustments */}
            {activeTab === 'adjust' && (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1 studio-scroll">
                {ADJUSTMENT_SLIDERS.map((slider) => {
                  const value = current.adjustments[slider.key];
                  return (
                    <div key={slider.key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <label
                          htmlFor={`adj-${slider.key}`}
                          className="font-medium text-[#2d1b28]"
                        >
                          {slider.label}
                        </label>
                        <span className="font-mono tabular-nums text-[#6e4f62]">{value}</span>
                      </div>
                      <input
                        id={`adj-${slider.key}`}
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        value={value}
                        onChange={(e) => {
                          const nextVal = Number(e.target.value);
                          commitSnapshot((s) => ({
                            ...s,
                            adjustments: {
                              ...s.adjustments,
                              [slider.key]: nextVal,
                            },
                          }));
                        }}
                        className="studio-slider w-full"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Crop, Rotate, Flip */}
            {activeTab === 'transform' && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#2d1b28] mb-2">Crop Aspect Ratio</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['free', '1:1', '4:3', '3:4', '16:9'] as CropAspectPreset[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleCropPreset(preset)}
                        className={`py-2 px-2 rounded-xl text-xs font-mono font-semibold border cursor-pointer transition-colors ${
                          cropPreset === preset
                            ? 'bg-[#db2777] text-white border-[#db2777]'
                            : 'bg-[#fdf2f8] text-[#2d1b28] border-[#f3d5e5] hover:border-[#db2777]'
                        }`}
                      >
                        {preset === 'free' ? 'Full' : preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#2d1b28] mb-2">Rotate & Flip</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        commitSnapshot((s) => ({ ...s, rotation: (s.rotation + 270) % 360 }))
                      }
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5] hover:border-[#db2777] text-xs font-semibold text-[#2d1b28] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-[#db2777]" aria-hidden="true" />
                      <span>Rotate Left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        commitSnapshot((s) => ({ ...s, rotation: (s.rotation + 90) % 360 }))
                      }
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5] hover:border-[#db2777] text-xs font-semibold text-[#2d1b28] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4 text-[#db2777]" aria-hidden="true" />
                      <span>Rotate Right</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => commitSnapshot((s) => ({ ...s, flipH: !s.flipH }))}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        current.flipH
                          ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                          : 'bg-[#fdf2f8] border-[#f3d5e5] text-[#2d1b28]'
                      }`}
                    >
                      <FlipHorizontal2 className="w-4 h-4" aria-hidden="true" />
                      <span>Flip Horizontal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => commitSnapshot((s) => ({ ...s, flipV: !s.flipV }))}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        current.flipV
                          ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                          : 'bg-[#fdf2f8] border-[#f3d5e5] text-[#2d1b28]'
                      }`}
                    >
                      <FlipVertical2 className="w-4 h-4" aria-hidden="true" />
                      <span>Flip Vertical</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Filters */}
            {activeTab === 'filters' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <label htmlFor="editor-filter-intensity" className="font-medium text-[#2d1b28]">
                      Filter Intensity
                    </label>
                    <span className="font-mono tabular-nums text-[#db2777]">
                      {current.filterIntensity}%
                    </span>
                  </div>
                  <input
                    id="editor-filter-intensity"
                    type="range"
                    min={0}
                    max={100}
                    value={current.filterIntensity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      commitSnapshot((s) => ({ ...s, filterIntensity: val }));
                    }}
                    className="studio-slider w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 studio-scroll">
                  <button
                    type="button"
                    onClick={() => commitSnapshot((s) => ({ ...s, filterId: null }))}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer flex items-center justify-between ${
                      current.filterId === null
                        ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                        : 'bg-white border-[#f3d5e5] text-[#2d1b28]'
                    }`}
                  >
                    <span>Original</span>
                    {current.filterId === null && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {FILTER_PRESETS.map((f) => {
                    const active = current.filterId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => commitSnapshot((s) => ({ ...s, filterId: f.id }))}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-center justify-between ${
                          active
                            ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                            : 'bg-white border-[#f3d5e5] text-[#2d1b28] hover:border-[#f472b6]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{f.name}</p>
                          <p className="text-[10px] text-[#6e4f62] truncate">{f.category}</p>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 4: Stickers & Text (10 categories) */}
            {activeTab === 'stickers' && (
              <div className="max-h-[420px] overflow-y-auto pr-1 studio-scroll">
                <StickerStudioPanel
                  layers={current.layers}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onAddLayer={(layer) =>
                    commitSnapshot((s) => ({ ...s, layers: [...s.layers, layer] }))
                  }
                  onUpdateLayer={(id, patch) =>
                    commitSnapshot((s) => ({
                      ...s,
                      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
                    }))
                  }
                  onDeleteLayer={(id) => {
                    commitSnapshot((s) => ({
                      ...s,
                      layers: s.layers.filter((l) => l.id !== id),
                    }));
                    setSelectedLayerId(null);
                  }}
                />
              </div>
            )}
          </div>

          <ExportControls
            options={exportOptions}
            onChange={setExportOptions}
            onDownload={handleDownload}
            buttonLabel="Download Edited Photo"
          />
        </div>
      </div>
    </section>
  );
}
