import {
  ArrowRight,
  Camera,
  Check,
  Eye,
  FolderHeart,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  SwitchCamera,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCameraEngine } from '../context/CameraEngineContext';
import { useSettings } from '../context/SettingsContext';
import { FILTER_CATEGORIES, FILTER_PRESETS } from '../data/presets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type { ExportOptions, FilterCategory, FilterConfig } from '../types/studio';
import { downloadCanvasAsImage, renderFilterPreviewToCanvas } from '../utils/canvasRenderer';
import { renderLiveCameraFrame } from '../utils/liveCameraPipeline';
import { recordHistoryDb, savePhotoToDb } from '../utils/localDb';
import { aspectRatioToNumber } from '../utils/photoboothLayout';
import { playShutterSound } from '../utils/soundEffects';
import { ExportControls } from './ExportControls';

interface FilterLibraryProps {
  initialFilterId?: string | null;
  onApplyToEditor: (imageSrc: string, filterId: string, intensity: number) => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

function FilterThumbnail({
  imageSrc,
  filter,
}: {
  imageSrc: string;
  filter: FilterConfig;
}) {
  const thumbRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = thumbRef.current;
    if (!canvas) return;
    renderFilterPreviewToCanvas(canvas, imageSrc, filter, 100, 220).catch(() => {
      if (!cancelled) {
        // Fallback handled visually by container background
      }
    });
    return () => {
      cancelled = true;
    };
  }, [imageSrc, filter]);

  return (
    <canvas
      ref={thumbRef}
      aria-hidden="true"
      className="w-full h-full object-cover rounded-xl bg-[#fdf2f8]"
    />
  );
}

export function FilterLibrary({
  initialFilterId,
  onApplyToEditor,
  onNotify,
}: FilterLibraryProps) {
  const { settings, t } = useSettings();
  const engine = useCameraEngine();

  const [sourceMode, setSourceMode] = useState<'photo' | 'live-camera'>('photo');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [activeFilterId, setActiveFilterId] = useState<string>(
    initialFilterId || FILTER_PRESETS[0].id
  );
  const [intensity, setIntensity] = useState<number>(100);
  const [showOriginal, setShowOriginal] = useState(false);
  const [sourceImage, setSourceImage] = useState<string>(STUDIO_SAMPLE_PHOTOS[0].src);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: settings.saveFormat,
    quality: 95,
  });

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialFilterId) {
      setActiveFilterId(initialFilterId);
      const found = FILTER_PRESETS.find((f) => f.id === initialFilterId);
      if (found) {
        setSelectedCategory('All');
      }
    }
  }, [initialFilterId]);

  const activeFilter =
    FILTER_PRESETS.find((f) => f.id === activeFilterId) || FILTER_PRESETS[0];

  const visibleFilters =
    selectedCategory === 'All'
      ? FILTER_PRESETS
      : FILTER_PRESETS.filter((f) => f.category === selectedCategory);

  // Attach shared video ref when in live-camera mode
  useEffect(() => {
    if (sourceMode === 'live-camera' && videoRef.current) {
      engine.attachVideoElement(videoRef.current);
    }
    if (sourceMode !== 'live-camera') {
      engine.stopStream();
    }
  }, [sourceMode, engine]);

  // Static photo render loop
  useEffect(() => {
    if (sourceMode !== 'photo') return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    renderFilterPreviewToCanvas(
      canvas,
      sourceImage,
      showOriginal ? null : activeFilter,
      showOriginal ? 0 : intensity,
      1200
    ).catch(() => {});
  }, [sourceMode, sourceImage, activeFilter, intensity, showOriginal]);

  // Live Camera render loop
  useEffect(() => {
    if (sourceMode !== 'live-camera') return;
    if (engine.cameraState !== 'active' && engine.cameraState !== 'demo-live') return;

    let rafId = 0;
    const tick = (nowMs: number) => {
      const canvas = liveCanvasRef.current;
      const source =
        engine.cameraState === 'active' ? videoRef.current : engine.getDemoImage();
      const ready =
        source instanceof HTMLVideoElement
          ? source.readyState >= 2 && source.videoWidth > 0
          : Boolean(source && source.complete && source.naturalWidth > 0);

      if (canvas && source && ready) {
        renderLiveCameraFrame(canvas, source, {
          aspectRatio: aspectRatioToNumber(settings.aspectRatio),
          mirror:
            engine.cameraState === 'active'
              ? settings.mirrorPreview && engine.facingMode === 'user'
              : settings.mirrorPreview,
          zoom: settings.defaultZoom,
          filter: showOriginal ? null : activeFilter,
          filterIntensity: showOriginal ? 0 : intensity,
          activeEffects: [],
          activeFaceFilters: [],
          activeOverlays: [],
          anchors: [],
          timeSec: nowMs / 1000,
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    sourceMode,
    engine.cameraState,
    engine.facingMode,
    activeFilter,
    intensity,
    showOriginal,
    settings.aspectRatio,
    settings.mirrorPreview,
    settings.defaultZoom,
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceImage(reader.result);
        setSourceMode('photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureLiveToPhoto = () => {
    const liveCanvas = liveCanvasRef.current;
    if (!liveCanvas || liveCanvas.width === 0) return;
    if (settings.cameraSoundEnabled) playShutterSound();
    const shot = liveCanvas.toDataURL('image/png');
    setSourceImage(shot);
    setSourceMode('photo');
    recordHistoryDb('filter', activeFilter.id, activeFilter.name).catch(() => {});
    onNotify(`Captured snapshot with "${activeFilter.name}"!`);
  };

  const handleDownload = () => {
    const canvas = sourceMode === 'live-camera' ? liveCanvasRef.current : mainCanvasRef.current;
    if (!canvas || canvas.width === 0) return;
    downloadCanvasAsImage(canvas, `camcall-${activeFilter.id}`, exportOptions);
    recordHistoryDb('filter', activeFilter.id, activeFilter.name).catch(() => {});
    onNotify(t.notifications.downloaded);
  };

  const handleSaveToGallery = async () => {
    const canvas = sourceMode === 'live-camera' ? liveCanvasRef.current : mainCanvasRef.current;
    if (!canvas || canvas.width === 0) return;
    await savePhotoToDb({
      title: `Filter · ${activeFilter.name}`,
      dataUrl: canvas.toDataURL('image/png'),
      source: 'filter',
      format: 'png',
      favorite: false,
    });
    await recordHistoryDb('filter', activeFilter.id, activeFilter.name);
    onNotify(t.notifications.savedGallery);
  };

  return (
    <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-6">
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#db2777] mb-1">{t.filters.kicker}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.filters.title}
          </h1>
          <p className="text-sm opacity-75 mt-1">{t.filters.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl camcall-surface border">
            <button
              type="button"
              onClick={() => setSourceMode('photo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                sourceMode === 'photo' ? 'bg-[#db2777] text-white' : 'opacity-80'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t.filters.photoUploadTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('live-camera')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                sourceMode === 'live-camera' ? 'bg-[#7c3aed] text-white' : 'opacity-80'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t.filters.liveCameraTab}</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface border hover:border-[#db2777] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-[#db2777]" aria-hidden="true" />
            <span>{t.camera.uploadPhoto}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter categories">
        {FILTER_CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setSelectedCategory(category);
                setShowOriginal(false);
                if (category !== 'All') {
                  const firstInCat = FILTER_PRESETS.find((f) => f.category === category);
                  if (firstInCat && activeFilter.category !== category) {
                    setActiveFilterId(firstInCat.id);
                  }
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer min-h-[40px] ${
                active
                  ? 'bg-[#db2777] text-white shadow-sm'
                  : 'camcall-surface-soft border hover:border-[#db2777]'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Canvas Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-22 flex flex-col gap-4">
          <div className="rounded-3xl camcall-surface border p-4 shadow-sm shadow-pink-950/5">
            <div className="relative rounded-2xl overflow-hidden camcall-surface-soft flex items-center justify-center min-h-[300px] max-h-[520px]">
              {sourceMode === 'photo' ? (
                <canvas
                  ref={mainCanvasRef}
                  data-testid="filter-preview-canvas"
                  className="max-w-full max-h-[480px] w-auto h-auto object-contain rounded-xl"
                />
              ) : engine.cameraState === 'active' || engine.cameraState === 'demo-live' ? (
                <canvas
                  ref={liveCanvasRef}
                  data-testid="filter-live-canvas"
                  className="max-w-full max-h-[480px] w-auto h-auto object-contain rounded-xl"
                />
              ) : (
                <div className="p-6 text-center max-w-xs flex flex-col items-center gap-3">
                  <Camera className="w-8 h-8 text-[#db2777]" />
                  <p className="text-xs opacity-80">{t.camera.permissionRequiredDesc}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => engine.startCamera()}
                      className="px-3.5 py-2 rounded-xl bg-[#db2777] text-white text-xs font-semibold cursor-pointer"
                    >
                      {t.camera.enableCamera}
                    </button>
                    <button
                      type="button"
                      onClick={() => engine.setCameraState('demo-live')}
                      className="px-3.5 py-2 rounded-xl bg-[#7c3aed] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t.camera.liveModel}</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowOriginal((prev) => !prev)}
                className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border backdrop-blur-md transition-colors cursor-pointer ${
                  showOriginal
                    ? 'bg-[#2d1b28] text-white border-[#2d1b28]'
                    : 'camcall-surface'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {showOriginal ? t.filters.showingOriginal : t.filters.compareOriginal}
                </span>
              </button>
            </div>

            {sourceMode === 'live-camera' &&
              (engine.cameraState === 'active' || engine.cameraState === 'demo-live') && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = engine.facingMode === 'user' ? 'environment' : 'user';
                      engine.setFacingMode(next);
                      if (engine.cameraState === 'active') engine.startCamera(next);
                    }}
                    className="px-3 py-1.5 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#db2777]" />
                    <span>
                      {engine.facingMode === 'user' ? t.camera.frontCam : t.camera.rearCam}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureLiveToPhoto}
                    className="px-4 py-1.5 rounded-xl bg-[#db2777] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{t.camera.capturePhoto}</span>
                  </button>
                </div>
              )}

            {/* Sample Image Switcher */}
            {sourceMode === 'photo' && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-medium opacity-75 shrink-0">Samples:</span>
                {STUDIO_SAMPLE_PHOTOS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setSourceImage(sample.src)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-colors cursor-pointer ${
                      sourceImage === sample.src
                        ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                        : 'camcall-surface-soft border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Filter Controls & Apply */}
          <div className="rounded-3xl camcall-surface border p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">{activeFilter.name}</h2>
                <p className="text-xs opacity-75">
                  {activeFilter.category} · {activeFilter.description}
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-[#db2777]">
                {intensity}%
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="filter-intensity" className="text-xs font-medium opacity-75">
                {t.filters.intensity}
              </label>
              <input
                id="filter-intensity"
                type="range"
                min={0}
                max={100}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="studio-slider w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveToGallery}
                className="min-h-[42px] px-3 py-2 rounded-xl camcall-surface-soft border hover:border-[#db2777] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderHeart className="w-4 h-4 text-[#db2777]" />
                <span>{t.camera.saveToGallery}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIntensity(100);
                  setShowOriginal(false);
                }}
                className="min-h-[42px] px-3 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.filters.resetFilter}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onApplyToEditor(sourceImage, activeFilter.id, intensity);
                onNotify(`Applied "${activeFilter.name}" (${intensity}%) in Photo Editor`);
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{t.filters.applyToEditor}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <ExportControls
            options={exportOptions}
            onChange={setExportOptions}
            onDownload={handleDownload}
            buttonLabel={t.filters.downloadFiltered}
          />
        </div>

        {/* Right: Filter Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {visibleFilters.map((filter) => {
            const isActive = filter.id === activeFilter.id;
            return (
              <div
                key={filter.id}
                className={`rounded-2xl camcall-surface border p-3 flex flex-col gap-2.5 transition-all ${
                  isActive ? 'border-[#db2777] ring-2 ring-[#fce7f3]' : 'hover:border-[#f472b6]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilterId(filter.id);
                    setShowOriginal(false);
                  }}
                  className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#fdf2f8] cursor-pointer"
                  aria-label={`Preview ${filter.name} filter`}
                >
                  <FilterThumbnail imageSrc={sourceImage} filter={filter} />
                </button>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{filter.name}</p>
                    <p className="text-xs opacity-70 truncate">{filter.category}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilterId(filter.id);
                      setShowOriginal(false);
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#fce7f3] text-[#be185d]'
                        : 'camcall-surface-soft border'
                    }`}
                  >
                    {isActive ? 'Selected' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyToEditor(sourceImage, filter.id, intensity);
                      onNotify(`Applied "${filter.name}" in Photo Editor`);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
