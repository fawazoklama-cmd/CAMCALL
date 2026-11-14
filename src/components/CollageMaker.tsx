import { Camera, FolderHeart, ImagePlus, Sparkles, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { COLLAGE_BACKGROUNDS, COLLAGE_TEMPLATES } from '../data/presets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type { CanvasLayer, CollagePhotoCount, ExportOptions } from '../types/studio';
import { downloadCanvasAsImage, renderCollageToCanvas } from '../utils/canvasRenderer';
import { recordHistoryDb, savePhotoToDb } from '../utils/localDb';
import { ExportControls } from './ExportControls';
import { LiveCameraCaptureModal } from './LiveCameraCaptureModal';
import { StickerStudioPanel } from './StickerStudioPanel';

interface CollageMakerProps {
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

const PHOTO_COUNTS: CollagePhotoCount[] = [2, 3, 4, 6, 9];

export function CollageMaker({ onNotify }: CollageMakerProps) {
  const { settings, t } = useSettings();
  const [selectedCount, setSelectedCount] = useState<CollagePhotoCount>(4);
  const [templateId, setTemplateId] = useState<string>('4-grid');
  const [photos, setPhotos] = useState<(string | null)[]>([
    STUDIO_SAMPLE_PHOTOS[0].src,
    STUDIO_SAMPLE_PHOTOS[1].src,
    STUDIO_SAMPLE_PHOTOS[2].src,
    STUDIO_SAMPLE_PHOTOS[3].src,
  ]);
  const [spacing, setSpacing] = useState<number>(18);
  const [borderWidth, setBorderWidth] = useState<number>(6);
  const [cornerRadius, setCornerRadius] = useState<number>(18);
  const [background, setBackground] = useState<string>('#FCE7F3');
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'layout' | 'decorate'>('layout');
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [cameraSlotIndex, setCameraSlotIndex] = useState<number>(0);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: settings.saveFormat,
    quality: 95,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const multiUploadRef = useRef<HTMLInputElement | null>(null);
  const slotUploadRef = useRef<HTMLInputElement | null>(null);
  const targetSlotRef = useRef<number>(0);
  const draggingLayerRef = useRef<{ id: string } | null>(null);

  const templatesForCount = COLLAGE_TEMPLATES.filter((tItem) => tItem.photoCount === selectedCount);
  const activeTemplate =
    COLLAGE_TEMPLATES.find((tItem) => tItem.id === templateId) ||
    templatesForCount[0] ||
    COLLAGE_TEMPLATES[0];

  const handleSelectCount = (count: CollagePhotoCount) => {
    setSelectedCount(count);
    const first = COLLAGE_TEMPLATES.find((tItem) => tItem.photoCount === count);
    if (first) setTemplateId(first.id);
    setPhotos((prev) =>
      Array.from({ length: count }, (_, idx) => {
        if (prev[idx]) return prev[idx];
        return STUDIO_SAMPLE_PHOTOS[idx % STUDIO_SAMPLE_PHOTOS.length].src;
      })
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderCollageToCanvas(canvas, {
      template: activeTemplate,
      photos,
      spacing,
      borderWidth,
      cornerRadius,
      background,
      layers,
    }).catch(() => {});
  }, [activeTemplate, photos, spacing, borderWidth, cornerRadius, background, layers]);

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    Promise.all(
      files.slice(0, selectedCount).map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      setPhotos((prev) => {
        const next = [...prev];
        results.forEach((src, i) => {
          if (src) next[i] = src;
        });
        return next;
      });
      onNotify(`Loaded ${results.length} photo${results.length > 1 ? 's' : ''} into collage.`);
    });

    e.target.value = '';
  };

  const handleSingleSlotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const idx = targetSlotRef.current;
        setPhotos((prev) => {
          const next = [...prev];
          next[idx] = reader.result as string;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFillSamples = () => {
    setPhotos(
      Array.from(
        { length: selectedCount },
        (_, idx) => STUDIO_SAMPLE_PHOTOS[idx % STUDIO_SAMPLE_PHOTOS.length].src
      )
    );
    onNotify('Filled collage slots with studio samples.', 'info');
  };

  const handleSaveToGallery = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await savePhotoToDb({
      title: `Collage ${selectedCount}-Shot`,
      dataUrl: canvas.toDataURL('image/png'),
      source: 'collage',
      format: 'png',
      favorite: false,
    });
    await recordHistoryDb('download', 'collage', `${selectedCount}-Shot Collage`);
    onNotify(t.notifications.savedGallery);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasAsImage(canvas, `camcall-collage-${selectedCount}`, exportOptions);
    onNotify(t.notifications.downloaded);
  };

  // Drag stickers/text directly on collage canvas
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
    let nearest: CanvasLayer | null = null;
    let bestDist = 0.14;
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
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
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, x, y } : l)));
  };

  const handleCanvasPointerUp = () => {
    draggingLayerRef.current = null;
  };

  return (
    <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <input
        ref={multiUploadRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleMultiUpload}
        className="hidden"
      />
      <input
        ref={slotUploadRef}
        type="file"
        accept="image/*"
        onChange={handleSingleSlotUpload}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#db2777] mb-1">{t.collage.kicker}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.collage.title}
          </h1>
          <p className="text-sm opacity-75 mt-1">{t.collage.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCameraSlotIndex(0);
              setCameraModalOpen(true);
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span>{t.camera.captureFromCamera}</span>
          </button>
          <button
            type="button"
            onClick={() => multiUploadRef.current?.click()}
            className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface border hover:border-[#db2777] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#db2777]" aria-hidden="true" />
            <span>{t.collage.uploadMultiple}</span>
          </button>
          <button
            type="button"
            onClick={handleFillSamples}
            className="min-h-[42px] px-3.5 py-2 rounded-xl camcall-surface border hover:border-[#7c3aed] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#7c3aed]" aria-hidden="true" />
            <span>{t.collage.fillSamples}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToGallery}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FolderHeart className="w-4 h-4" aria-hidden="true" />
            <span>{t.camera.saveToGallery}</span>
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Collage Canvas + Slot Manager */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="rounded-3xl camcall-surface border p-4 shadow-sm shadow-pink-950/5 flex flex-col gap-3">
            <div className="rounded-2xl camcall-surface-soft border p-3 flex items-center justify-center min-h-[340px] max-h-[540px]">
              <canvas
                ref={canvasRef}
                data-testid="collage-preview-canvas"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                className="max-w-full max-h-[490px] w-auto h-auto rounded-xl shadow-md touch-none cursor-grab active:cursor-grabbing"
              />
            </div>
            <p className="text-xs opacity-75 text-center">
              Drag stickers or text directly on the collage preview to reposition them.
            </p>
          </div>

          {/* Individual Photo Slots */}
          <div className="rounded-3xl camcall-surface border p-4 flex flex-col gap-3">
            <h2 className="font-display text-base font-bold">Photo Slots ({selectedCount})</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {photos.slice(0, selectedCount).map((src, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border camcall-surface-soft p-1.5 flex flex-col gap-1.5"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    {src ? (
                      <img
                        src={src}
                        alt={`Collage slot ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-xs opacity-70">#{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={t.collage.captureSlot}
                      onClick={() => {
                        setCameraSlotIndex(idx);
                        setCameraModalOpen(true);
                      }}
                      className="p-1 rounded-lg camcall-surface border hover:border-[#db2777] text-[#db2777] cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        targetSlotRef.current = idx;
                        slotUploadRef.current?.click();
                      }}
                      className="flex-1 py-1 px-1 rounded-lg camcall-surface border hover:border-[#db2777] text-[10px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ImagePlus className="w-3 h-3 text-[#7c3aed]" aria-hidden="true" />
                      <span>Swap</span>
                    </button>
                    {src && (
                      <button
                        type="button"
                        aria-label={`Clear collage slot ${idx + 1}`}
                        onClick={() =>
                          setPhotos((prev) => prev.map((item, i) => (i === idx ? null : item)))
                        }
                        className="p-1 rounded-lg camcall-surface border text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Controls Sidebar */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-3xl camcall-surface border p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl camcall-surface-soft border">
              <button
                type="button"
                onClick={() => setActivePanel('layout')}
                className={`min-h-[42px] rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  activePanel === 'layout' ? 'bg-[#db2777] text-white' : 'opacity-80'
                }`}
              >
                Layout & Style
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('decorate')}
                className={`min-h-[42px] rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  activePanel === 'decorate' ? 'bg-[#db2777] text-white' : 'opacity-80'
                }`}
              >
                Text & Stickers ({layers.length})
              </button>
            </div>

            {activePanel === 'layout' ? (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs font-semibold block mb-2">Number of Photos</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PHOTO_COUNTS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleSelectCount(count)}
                        className={`py-2 rounded-xl text-xs font-mono font-semibold border cursor-pointer transition-colors ${
                          selectedCount === count
                            ? 'bg-[#db2777] text-white border-[#db2777]'
                            : 'camcall-surface-soft'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold block mb-2">Grid Template</span>
                  <div className="flex flex-col gap-1.5">
                    {templatesForCount.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setTemplateId(tpl.id)}
                        className={`px-3 py-2 rounded-xl border text-left text-xs font-semibold cursor-pointer transition-colors ${
                          activeTemplate.id === tpl.id
                            ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                            : 'camcall-surface-soft hover:border-[#f472b6]'
                        }`}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="collage-spacing" className="font-medium">
                        {t.collage.spacing}
                      </label>
                      <span className="font-mono tabular-nums opacity-75">{spacing}px</span>
                    </div>
                    <input
                      id="collage-spacing"
                      type="range"
                      min={0}
                      max={40}
                      value={spacing}
                      onChange={(e) => setSpacing(Number(e.target.value))}
                      className="studio-slider w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="collage-border" className="font-medium">
                        {t.collage.border}
                      </label>
                      <span className="font-mono tabular-nums opacity-75">{borderWidth}px</span>
                    </div>
                    <input
                      id="collage-border"
                      type="range"
                      min={0}
                      max={24}
                      value={borderWidth}
                      onChange={(e) => setBorderWidth(Number(e.target.value))}
                      className="studio-slider w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="collage-radius" className="font-medium">
                        {t.collage.corners}
                      </label>
                      <span className="font-mono tabular-nums opacity-75">{cornerRadius}px</span>
                    </div>
                    <input
                      id="collage-radius"
                      type="range"
                      min={0}
                      max={36}
                      value={cornerRadius}
                      onChange={(e) => setCornerRadius(Number(e.target.value))}
                      className="studio-slider w-full"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold block mb-2">{t.collage.background}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLLAGE_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        aria-label={`Select ${bg.label} background`}
                        title={bg.label}
                        onClick={() => setBackground(bg.value)}
                        className={`w-9 h-9 rounded-xl border-2 cursor-pointer transition-transform ${
                          background === bg.value
                            ? 'border-[#db2777] scale-110'
                            : 'border-[#f3d5e5]'
                        }`}
                        style={{ background: bg.value }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Custom background color"
                      value={background.startsWith('#') ? background : '#FCE7F3'}
                      onChange={(e) => setBackground(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-[#f3d5e5] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1 studio-scroll">
                <StickerStudioPanel
                  layers={layers}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onAddLayer={(layer) => setLayers((prev) => [...prev, layer])}
                  onUpdateLayer={(id, patch) =>
                    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
                  }
                  onDeleteLayer={(id) => {
                    setLayers((prev) => prev.filter((l) => l.id !== id));
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
            buttonLabel="Download Collage Free"
          />
        </div>
      </div>

      <LiveCameraCaptureModal
        open={cameraModalOpen}
        title={`${t.camera.captureFromCamera} · Slot #${cameraSlotIndex + 1}`}
        onCapture={(dataUrl) => {
          setPhotos((prev) => {
            const next = [...prev];
            next[cameraSlotIndex] = dataUrl;
            return next;
          });
          onNotify(`Captured photo for collage slot #${cameraSlotIndex + 1}!`);
        }}
        onClose={() => setCameraModalOpen(false)}
      />
    </section>
  );
}
