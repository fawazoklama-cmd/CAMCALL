import { Check, Eye, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { BoothLayoutId, BoothShapeId } from '../types/photobooth';
import type { CreativeModeId } from './Navbar';
import { recordHistoryDb } from '../utils/localDb';

export interface StudioTemplateEntry {
  id: string;
  name: string;
  category:
    | 'Korean Studio'
    | 'Pink Love'
    | 'Vintage Film'
    | 'Retro Camera'
    | 'Polaroid Style'
    | 'Minimal White'
    | 'Y2K'
    | 'Cute Ribbon'
    | 'Lavender Dream'
    | 'Dark & Cool'
    | 'Magazine'
    | 'Film Strip';
  target: 'photobooth' | 'creative-modes';
  boothThemeId: string;
  boothLayoutId: BoothLayoutId;
  boothShapeId: BoothShapeId;
  creativeMode?: CreativeModeId;
  bgColor: string;
  secondaryColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  subtitle: string;
}

export const LIBRARY_TEMPLATES: StudioTemplateEntry[] = [
  {
    id: 'tpl-korean-studio',
    name: 'Seoul 4-Cut Pink Room',
    category: 'Korean Studio',
    target: 'photobooth',
    boothThemeId: 'korean-pink-studio',
    boothLayoutId: 'strip-4',
    boothShapeId: 'rounded',
    bgColor: '#FCE7F3',
    secondaryColor: '#FFFFFF',
    borderColor: '#F472B6',
    textColor: '#831843',
    accentColor: '#DB2777',
    subtitle: 'Classic Hongdae 4-cut strip with soft blush border',
  },
  {
    id: 'tpl-pink-love',
    name: 'Pink Love Heart Diary',
    category: 'Pink Love',
    target: 'photobooth',
    boothThemeId: 'love-diary',
    boothLayoutId: 'grid-2x2',
    boothShapeId: 'heart',
    bgColor: '#FFF0F6',
    secondaryColor: '#FCE7F3',
    borderColor: '#EC4899',
    textColor: '#9D174D',
    accentColor: '#DB2777',
    subtitle: 'Heart-shaped 2x2 grid for cute duo memories',
  },
  {
    id: 'tpl-vintage-film',
    name: '1998 Analog 35mm Film',
    category: 'Vintage Film',
    target: 'photobooth',
    boothThemeId: '90s-film',
    boothLayoutId: 'strip-4',
    boothShapeId: 'film-strip',
    bgColor: '#231B20',
    secondaryColor: '#362931',
    borderColor: '#5C4453',
    textColor: '#FDF2F8',
    accentColor: '#F9A8D4',
    subtitle: 'Warm analog film grain & sprocket frame edges',
  },
  {
    id: 'tpl-retro-camera',
    name: 'Retro Digicam Viewfinder',
    category: 'Retro Camera',
    target: 'photobooth',
    boothThemeId: 'retro-camera',
    boothLayoutId: 'double',
    boothShapeId: 'vintage-camera',
    bgColor: '#3B2F2F',
    secondaryColor: '#4A3C3C',
    borderColor: '#A1887F',
    textColor: '#FFF8F0',
    accentColor: '#FB923C',
    subtitle: '2004 digicam viewfinder marks & warm amber timestamp',
  },
  {
    id: 'tpl-polaroid-style',
    name: 'Blush Instant Polaroid',
    category: 'Polaroid Style',
    target: 'creative-modes',
    boothThemeId: 'old-memories',
    boothLayoutId: 'single',
    boothShapeId: 'polaroid',
    creativeMode: 'polaroid',
    bgColor: '#FFFBF7',
    secondaryColor: '#FCE7F3',
    borderColor: '#F3D5E5',
    textColor: '#2D1B28',
    accentColor: '#DB2777',
    subtitle: 'Instant Polaroid print with handwritten caption & date',
  },
  {
    id: 'tpl-minimal-white',
    name: 'Minimal White Life Cut',
    category: 'Minimal White',
    target: 'photobooth',
    boothThemeId: 'korean-white-studio',
    boothLayoutId: 'strip-4',
    boothShapeId: 'rectangle',
    bgColor: '#FFFFFF',
    secondaryColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    textColor: '#1E293B',
    accentColor: '#DB2777',
    subtitle: 'Clean editorial white gallery strip',
  },
  {
    id: 'tpl-y2k',
    name: 'Y2K Cyber Chrome Hearts',
    category: 'Y2K',
    target: 'photobooth',
    boothThemeId: 'y2k-pink',
    boothLayoutId: 'grid-2x2',
    boothShapeId: 'star',
    bgColor: '#F5D0FE',
    secondaryColor: '#FFFDFE',
    borderColor: '#C084FC',
    textColor: '#701A75',
    accentColor: '#A855F7',
    subtitle: 'High-gloss Y2K lilac & star silhouettes',
  },
  {
    id: 'tpl-cute-ribbon',
    name: 'Coquette Pink Ribbon',
    category: 'Cute Ribbon',
    target: 'photobooth',
    boothThemeId: 'pink-ribbon',
    boothLayoutId: 'triple',
    boothShapeId: 'oval',
    bgColor: '#FDF2F8',
    secondaryColor: '#FFFFFF',
    borderColor: '#F472B6',
    textColor: '#9D174D',
    accentColor: '#EC4899',
    subtitle: 'Coquette cameo ovals with soft bow accents',
  },
  {
    id: 'tpl-lavender-dream',
    name: 'Lavender Cloud Nine',
    category: 'Lavender Dream',
    target: 'photobooth',
    boothThemeId: 'soft-lavender',
    boothLayoutId: 'strip-6',
    boothShapeId: 'cloud',
    bgColor: '#EDE9FE',
    secondaryColor: '#F5F3FF',
    borderColor: '#A78BFA',
    textColor: '#4C1D95',
    accentColor: '#7C3AED',
    subtitle: 'Dreamy lilac cloud frames across 6 shots',
  },
  {
    id: 'tpl-dark-cool',
    name: 'Midnight Black Room',
    category: 'Dark & Cool',
    target: 'photobooth',
    boothThemeId: 'black-studio',
    boothLayoutId: 'strip-4',
    boothShapeId: 'rectangle',
    bgColor: '#141115',
    secondaryColor: '#221C24',
    borderColor: '#3D3140',
    textColor: '#FFFDFE',
    accentColor: '#F472B6',
    subtitle: 'Sleek dark room contrast with neon pink caption',
  },
  {
    id: 'tpl-magazine',
    name: 'CAMCALL Editorial Cover',
    category: 'Magazine',
    target: 'creative-modes',
    boothThemeId: 'flash-photography',
    boothLayoutId: 'magazine-layout',
    boothShapeId: 'magazine',
    creativeMode: 'magazine',
    bgColor: '#FFFDFE',
    secondaryColor: '#FCE7F3',
    borderColor: '#DB2777',
    textColor: '#2D1B28',
    accentColor: '#DB2777',
    subtitle: 'Glossy fashion issue cover with headline & barcode',
  },
  {
    id: 'tpl-film-strip',
    name: 'Horizontal Cinema Strip',
    category: 'Film Strip',
    target: 'photobooth',
    boothThemeId: 'seoul-photobooth',
    boothLayoutId: 'horizontal-strip',
    boothShapeId: 'film-strip',
    bgColor: '#1F1815',
    secondaryColor: '#2E2420',
    borderColor: '#8C6D53',
    textColor: '#FDF2F8',
    accentColor: '#F472B6',
    subtitle: 'Widescreen 4-frame cinema contact sheet',
  },
];

interface TemplatesPageProps {
  onUseTemplate: (tpl: StudioTemplateEntry) => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

export function TemplatesPage({ onUseTemplate, onNotify }: TemplatesPageProps) {
  const { t } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewTpl, setPreviewTpl] = useState<StudioTemplateEntry | null>(null);

  const categories = ['ALL', ...Array.from(new Set(LIBRARY_TEMPLATES.map((item) => item.category)))];

  const visible =
    selectedCategory === 'ALL'
      ? LIBRARY_TEMPLATES
      : LIBRARY_TEMPLATES.filter((item) => item.category === selectedCategory);

  const handleApply = (tpl: StudioTemplateEntry) => {
    recordHistoryDb('template', tpl.id, tpl.name).catch(() => {});
    onUseTemplate(tpl);
    onNotify(`${tpl.name} applied!`);
  };

  return (
    <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold text-[#db2777] mb-1">{t.templates.kicker}</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          {t.templates.title}
        </h1>
        <p className="text-sm opacity-75 mt-1 max-w-2xl">{t.templates.subtitle}</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#db2777] text-white shadow-xs'
                  : 'camcall-surface-soft border hover:border-[#db2777]'
              }`}
            >
              {cat === 'ALL' ? t.templates.allCategories : cat}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {visible.map((tpl) => (
          <div
            key={tpl.id}
            className="rounded-3xl camcall-surface border p-4 flex flex-col gap-3.5 hover:border-[#db2777] transition-all"
          >
            {/* Visual Thumbnail Mockup */}
            <div
              className="aspect-[4/3] rounded-2xl border p-4 flex flex-col justify-between relative overflow-hidden"
              style={{
                backgroundColor: tpl.bgColor,
                borderColor: tpl.borderColor,
                color: tpl.textColor,
              }}
            >
              <div className="grid grid-cols-2 gap-2 flex-1">
                {[0, 1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className="rounded-lg border flex items-center justify-center text-[10px] font-mono opacity-85"
                    style={{
                      backgroundColor: tpl.secondaryColor,
                      borderColor: tpl.borderColor,
                    }}
                  >
                    #{slot + 1}
                  </div>
                ))}
              </div>
              <div className="pt-2 flex items-center justify-between text-[11px] font-bold">
                <span className="truncate">{tpl.category}</span>
                <span style={{ color: tpl.accentColor }}>CAMCALL ♡</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-[11px] font-semibold text-[#db2777]">{tpl.category}</p>
              <h2 className="font-display text-base font-bold mt-0.5">{tpl.name}</h2>
              <p className="text-xs opacity-75 mt-1 line-clamp-2">{tpl.subtitle}</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewTpl(tpl)}
                className="min-h-[40px] px-3 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.templates.preview}</span>
              </button>
              <button
                type="button"
                onClick={() => handleApply(tpl)}
                className="flex-1 min-h-[40px] px-3 py-2 rounded-xl camcall-btn-primary text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t.templates.useTemplate}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewTpl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewTpl(null)}
        >
          <div
            className="max-w-lg w-full rounded-3xl camcall-surface border p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#db2777]">{previewTpl.category}</p>
                <h3 className="font-display text-xl font-bold">{previewTpl.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTpl(null)}
                aria-label={t.templates.close}
                className="min-h-[38px] min-w-[38px] rounded-xl camcall-surface-soft border flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="aspect-[4/3] rounded-2xl border p-6 flex flex-col justify-between"
              style={{
                backgroundColor: previewTpl.bgColor,
                borderColor: previewTpl.borderColor,
                color: previewTpl.textColor,
              }}
            >
              <div className="grid grid-cols-2 gap-3 flex-1">
                {[0, 1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className="rounded-xl border flex items-center justify-center text-xs font-mono"
                    style={{
                      backgroundColor: previewTpl.secondaryColor,
                      borderColor: previewTpl.borderColor,
                    }}
                  >
                    CAMCALL SHOT #{slot + 1}
                  </div>
                ))}
              </div>
              <div className="pt-3 flex items-center justify-between text-xs font-bold">
                <span>{previewTpl.boothLayoutId}</span>
                <span style={{ color: previewTpl.accentColor }}>Shape: {previewTpl.boothShapeId}</span>
              </div>
            </div>

            <p className="text-sm opacity-80">{previewTpl.subtitle}</p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewTpl(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold cursor-pointer"
              >
                {t.templates.close}
              </button>
              <button
                type="button"
                onClick={() => {
                  const tpl = previewTpl;
                  setPreviewTpl(null);
                  handleApply(tpl);
                }}
                className="min-h-[42px] px-5 py-2 rounded-xl camcall-btn-primary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.templates.useTemplate}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
