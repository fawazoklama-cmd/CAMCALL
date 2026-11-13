import { ArrowRight, Check, Eye, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FILTER_CATEGORIES, FILTER_PRESETS } from '../data/presets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type { ExportOptions, FilterCategory, FilterConfig } from '../types/studio';
import { downloadCanvasAsImage, renderFilterPreviewToCanvas } from '../utils/canvasRenderer';
import { ExportControls } from './ExportControls';

interface FilterLibraryProps {
  initialFilterId?: string | null;
  onApplyToEditor: (imageSrc: string, filterId: string, intensity: number) => void;
  onNotify: (msg: string) => void;
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
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [activeFilterId, setActiveFilterId] = useState<string>(
    initialFilterId || FILTER_PRESETS[0].id
  );
  const [intensity, setIntensity] = useState<number>(100);
  const [showOriginal, setShowOriginal] = useState(false);
  const [sourceImage, setSourceImage] = useState<string>(STUDIO_SAMPLE_PHOTOS[0].src);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 95,
  });

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    renderFilterPreviewToCanvas(
      canvas,
      sourceImage,
      showOriginal ? null : activeFilter,
      showOriginal ? 0 : intensity,
      1200
    ).catch(() => {});
  }, [sourceImage, activeFilter, intensity, showOriginal]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    downloadCanvasAsImage(canvas, `camcall-${activeFilter.id}`, exportOptions);
    onNotify(`Filtered photo downloaded (${exportOptions.format.toUpperCase()})!`);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#db2777] mb-1">11 Curated Categories</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2d1b28]">
            Aesthetic Filter Library
          </h1>
          <p className="text-sm text-[#6e4f62] mt-1">
            Real HTML5 Canvas color grading. Preview live, dial in intensity, and apply or download free.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#f3d5e5] hover:border-[#db2777] text-sm font-semibold text-[#2d1b28] inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-[#db2777]" aria-hidden="true" />
            <span>Upload Photo</span>
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
                  : 'bg-[#fdf2f8] text-[#6e4f62] hover:text-[#2d1b28] hover:bg-[#fce7f3]'
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
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 shadow-sm shadow-pink-950/5">
            <div className="relative rounded-2xl overflow-hidden bg-[#fdf2f8] flex items-center justify-center min-h-[300px] max-h-[520px]">
              <canvas
                ref={mainCanvasRef}
                data-testid="filter-preview-canvas"
                className="max-w-full max-h-[480px] w-auto h-auto object-contain rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowOriginal((prev) => !prev)}
                className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border backdrop-blur-md transition-colors cursor-pointer ${
                  showOriginal
                    ? 'bg-[#2d1b28] text-white border-[#2d1b28]'
                    : 'bg-white/90 text-[#2d1b28] border-[#f3d5e5] hover:bg-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{showOriginal ? 'Showing Original' : 'Compare Original'}</span>
              </button>
            </div>

            {/* Sample Image Switcher */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-medium text-[#6e4f62] shrink-0">Samples:</span>
              {STUDIO_SAMPLE_PHOTOS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => setSourceImage(sample.src)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-colors cursor-pointer ${
                    sourceImage === sample.src
                      ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                      : 'bg-[#fdf2f8] border-transparent text-[#6e4f62] hover:text-[#2d1b28]'
                  }`}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Controls & Apply */}
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#2d1b28]">
                  {activeFilter.name}
                </h2>
                <p className="text-xs text-[#6e4f62]">
                  {activeFilter.category} · {activeFilter.description}
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-[#db2777]">
                {intensity}%
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="filter-intensity" className="text-xs font-medium text-[#6e4f62]">
                Filter Intensity
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

            <button
              type="button"
              onClick={() => {
                onApplyToEditor(sourceImage, activeFilter.id, intensity);
                onNotify(`Applied "${activeFilter.name}" (${intensity}%) in Photo Editor`);
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Apply Filter & Open in Editor</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <ExportControls
            options={exportOptions}
            onChange={setExportOptions}
            onDownload={handleDownload}
            buttonLabel="Download Filtered Photo"
          />
        </div>

        {/* Right: Filter Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {visibleFilters.map((filter) => {
            const isActive = filter.id === activeFilter.id;
            return (
              <div
                key={filter.id}
                className={`rounded-2xl bg-white border p-3 flex flex-col gap-2.5 transition-all ${
                  isActive
                    ? 'border-[#db2777] ring-2 ring-[#fce7f3]'
                    : 'border-[#f3d5e5] hover:border-[#f472b6]'
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
                    <p className="text-sm font-semibold text-[#2d1b28] truncate">{filter.name}</p>
                    <p className="text-xs text-[#6e4f62] truncate">{filter.category}</p>
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
                        : 'bg-[#fdf2f8] text-[#6e4f62] hover:text-[#2d1b28]'
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
