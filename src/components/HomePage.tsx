import {
  Camera,
  Download,
  Frame,
  Heart,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Palette,
  Shapes,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sticker,
  Wand2,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { FILTER_PRESETS, PHOTOBOOTH_TEMPLATES } from '../data/presets';
import { HERO_STUDIO_IMAGE, STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type { PhotoboothTemplateId, StudioView } from '../types/studio';
import { CamcallLogo } from './CamcallLogo';

interface HomePageProps {
  onNavigate: (view: StudioView) => void;
  onStartWithFilter: (filterId: string) => void;
  onStartWithTemplate: (templateId: PhotoboothTemplateId) => void;
}

const FEATURED_FILTERS = FILTER_PRESETS.filter((f) =>
  ['seoul-milk', 'strawberry-blush', 'pastel-vintage', 'y2k-lavender', 'kodak-blush', 'cotton-cloud'].includes(
    f.id
  )
);

function getFilterCssPreview(filterId: string): string {
  const f = FILTER_PRESETS.find((item) => item.id === filterId);
  if (!f) return 'none';
  return `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturation}) sepia(${f.sepia}) hue-rotate(${f.hueRotate}deg)`;
}

export function HomePage({
  onNavigate,
  onStartWithFilter,
  onStartWithTemplate,
}: HomePageProps) {
  const { t } = useSettings();

  return (
    <div className="flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden camcall-surface-soft border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 flex flex-col justify-center gap-6">
              <div className="flex items-center gap-3">
                <CamcallLogo variant="hero" />
                <p className="text-sm font-semibold tracking-wide text-[#db2777]">
                  {t.home.heroKicker}
                </p>
              </div>

              <h1
                className="font-display font-bold tracking-tight leading-[1.08]"
                style={{
                  fontSize: 'clamp(2.35rem, 4.4vw, 3.75rem)',
                  textWrap: 'balance',
                }}
              >
                {t.home.heroTitle}
              </h1>

              <p className="text-base sm:text-lg opacity-80 leading-relaxed max-w-xl">
                {t.home.heroDesc}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('photobooth')}
                  className="min-h-[48px] px-6 py-3 rounded-2xl camcall-btn-primary text-sm font-semibold inline-flex items-center gap-2.5 shadow-md shadow-pink-500/20 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.home.startPhotobooth}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('filters')}
                  className="min-h-[48px] px-6 py-3 rounded-2xl camcall-surface border hover:border-[#db2777] text-sm font-semibold inline-flex items-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Wand2 className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
                  <span>{t.home.exploreFilters}</span>
                </button>
              </div>
            </div>

            {/* Right Aesthetic Photostrip & Studio Preview Column */}
            <div className="lg:col-span-6 flex items-center justify-center">
              <div className="relative w-full max-w-xl flex items-center justify-center gap-4 sm:gap-6">
                {/* Main Studio Portrait Card */}
                <div className="flex-1 rounded-3xl camcall-surface p-3 sm:p-4 border shadow-xl shadow-pink-950/5">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#fce7f3]">
                    <img
                      src={HERO_STUDIO_IMAGE}
                      alt="Two friends posing happily in the CAMCALL pink Korean self-photo studio"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="pt-3 px-1 flex items-center justify-between text-xs opacity-80">
                    <span className="font-medium">{t.home.heroRoomTag}</span>
                    <span className="font-mono tabular-nums">{t.home.heroExportTag}</span>
                  </div>
                </div>

                {/* Floating Korean 3-Cut Photostrip Mockup */}
                <div className="hidden sm:flex w-36 md:w-44 shrink-0 flex-col gap-2 p-2.5 rounded-2xl bg-[#fce7f3] border border-[#f472b6]/40 shadow-xl shadow-pink-950/10 rotate-2">
                  {STUDIO_SAMPLE_PHOTOS.slice(0, 3).map((sample, idx) => (
                    <div
                      key={sample.id}
                      className="aspect-[4/3] rounded-lg overflow-hidden bg-white border border-white"
                    >
                      <img
                        src={sample.src}
                        alt={`Photostrip frame ${idx + 1}: ${sample.label}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  <div className="pt-1 pb-0.5 text-center">
                    <p className="font-display text-[11px] font-bold tracking-wide text-[#831843]">
                      CAMCALL ♡
                    </p>
                    <p className="font-mono text-[9px] text-[#db2777]">SEOUL 3-CUT</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width Studio Guarantees Strip */}
          <div className="mt-10 pt-6 border-t border-current/10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
              <span className="font-medium">{t.home.guarantees.liveBooth}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
              <span className="font-medium">{t.home.guarantees.filterCats}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
              <span className="font-medium">{t.home.guarantees.freeExport}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
              <span className="font-medium">{t.home.guarantees.localPrivacy}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR FILTERS */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#db2777] mb-1.5">
              {t.home.popularFiltersKicker}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {t.home.popularFiltersTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('filters')}
            className="text-sm font-semibold text-[#db2777] hover:text-[#be185d] transition-colors self-start sm:self-auto cursor-pointer"
          >
            {t.home.browseFilters}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {FEATURED_FILTERS.map((filter, idx) => {
            const sample = STUDIO_SAMPLE_PHOTOS[idx % STUDIO_SAMPLE_PHOTOS.length];
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onStartWithFilter(filter.id)}
                className="group text-left rounded-2xl camcall-surface border hover:border-[#db2777] p-2.5 transition-all hover:-translate-y-0.5 shadow-sm shadow-pink-950/5 cursor-pointer"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#fdf2f8] mb-2.5">
                  <img
                    src={sample.src}
                    alt={`${filter.name} filter preview`}
                    referrerPolicy="no-referrer"
                    style={{ filter: getFilterCssPreview(filter.id) }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="text-sm font-semibold truncate">{filter.name}</p>
                <p className="text-xs opacity-70 truncate">{filter.category}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. PHOTOBOOTH TEMPLATES */}
      <section className="camcall-surface-soft border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-[#7c3aed] mb-1.5">
                {t.home.templatesKicker}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                {t.home.templatesTitle}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('templates')}
                className="text-sm font-semibold text-[#7c3aed] hover:underline cursor-pointer"
              >
                {t.home.openTemplates} →
              </button>
              <button
                type="button"
                onClick={() => onNavigate('photobooth')}
                className="text-sm font-semibold text-[#db2777] hover:text-[#be185d] transition-colors self-start sm:self-auto cursor-pointer"
              >
                {t.home.openPhotobooth}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {PHOTOBOOTH_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onStartWithTemplate(tpl.id)}
                className="group text-left rounded-2xl camcall-surface border hover:border-[#db2777] p-4 transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col gap-3"
              >
                <div
                  className="w-full py-3 px-5 rounded-xl border flex flex-col gap-1.5 items-center"
                  style={{
                    backgroundColor: tpl.backgroundColor,
                    borderColor: tpl.borderColor,
                  }}
                >
                  {[0, 1, 2].map((slot) => (
                    <div
                      key={slot}
                      className="w-full h-7 border"
                      style={{
                        backgroundColor: tpl.secondaryColor,
                        borderColor: tpl.borderColor,
                        borderRadius: Math.min(8, tpl.frameRadius),
                      }}
                    />
                  ))}
                  <span
                    className="text-[9px] font-bold tracking-wider pt-1 truncate max-w-full"
                    style={{ color: tpl.textColor }}
                  >
                    {tpl.name}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold group-hover:text-[#db2777] transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs opacity-70 line-clamp-1">{tpl.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CREATIVE TOOLS (Asymmetric Bento Grid) */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#db2777] mb-1.5">{t.home.toolsKicker}</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.home.toolsTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Card 1: Photobooth Studio */}
          <button
            type="button"
            onClick={() => onNavigate('photobooth')}
            className="md:col-span-7 text-left rounded-3xl camcall-surface-soft border hover:border-[#db2777] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">
                  {t.home.bento.boothTitle}
                </h3>
                <p className="text-sm opacity-80 max-w-md leading-relaxed">
                  {t.home.bento.boothDesc}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl camcall-surface border flex items-center justify-center text-[#db2777] shrink-0">
                <Camera className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#db2777] group-hover:underline">
              {t.home.openPhotobooth}
            </span>
          </button>

          {/* Card 2: Filter Library */}
          <button
            type="button"
            onClick={() => onNavigate('filters')}
            className="md:col-span-5 text-left rounded-3xl camcall-surface border hover:border-[#7c3aed] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">
                  {t.nav.filters}
                </h3>
                <p className="text-sm opacity-80 leading-relaxed">
                  {t.home.bento.filterDesc}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl camcall-surface-soft border flex items-center justify-center text-[#7c3aed] shrink-0">
                <Wand2 className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#7c3aed] group-hover:underline">
              {t.home.exploreFilters} →
            </span>
          </button>

          {/* Card 3: Photo Editor & Stickers */}
          <button
            type="button"
            onClick={() => onNavigate('editor')}
            className="md:col-span-5 text-left rounded-3xl camcall-surface border hover:border-[#db2777] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">
                  {t.nav.photoEditor}
                </h3>
                <p className="text-sm opacity-80 leading-relaxed">
                  {t.home.bento.editorDesc}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl camcall-surface-soft border flex items-center justify-center text-[#db2777] shrink-0">
                <Sliders className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#db2777] group-hover:underline">
              {t.nav.photoEditor} →
            </span>
          </button>

          {/* Card 4: Collage Maker */}
          <button
            type="button"
            onClick={() => onNavigate('collage')}
            className="md:col-span-7 text-left rounded-3xl camcall-surface-soft border hover:border-[#db2777] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">
                  {t.nav.collageMaker}
                </h3>
                <p className="text-sm opacity-80 max-w-md leading-relaxed">
                  {t.home.bento.collageDesc}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl camcall-surface border flex items-center justify-center text-[#db2777] shrink-0">
                <Layers className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#db2777] group-hover:underline">
              {t.home.tryCollage} →
            </span>
          </button>
        </div>

        {/* CAMCALL Creative Collection & 12 Creative Modes Showcase Card */}
        <div className="mt-6 rounded-3xl camcall-surface-soft border p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#db2777] mb-1.5">
              {t.home.creativeBanner.kicker}
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold mb-2">
              {t.home.creativeBanner.title}
            </h3>
            <p className="text-sm opacity-80 leading-relaxed mb-4">
              {t.home.creativeBanner.desc}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-medium">
              <div className="rounded-xl camcall-surface border px-3 py-2 flex items-center gap-2">
                <Shapes className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
                <span>{t.home.creativeBanner.shapeBadge}</span>
              </div>
              <div className="rounded-xl camcall-surface border px-3 py-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
                <span>{t.home.creativeBanner.themeBadge}</span>
              </div>
              <div className="rounded-xl camcall-surface border px-3 py-2 flex items-center gap-2">
                <Frame className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
                <span>{t.home.creativeBanner.modeBadge}</span>
              </div>
              <div className="rounded-xl camcall-surface border px-3 py-2 flex items-center gap-2">
                <Sticker className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
                <span>{t.home.creativeBanner.decorBadge}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('creative-modes')}
              className="min-h-[48px] px-6 py-3 rounded-2xl camcall-btn-primary text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <LayoutTemplate className="w-4 h-4" aria-hidden="true" />
              <span>{t.home.openCreativeModes}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('creative')}
              className="min-h-[46px] px-6 py-2.5 rounded-2xl camcall-surface border hover:border-[#db2777] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#7c3aed]" aria-hidden="true" />
              <span>{t.nav.creativeCollection}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="camcall-surface-soft border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#db2777] mb-1.5">{t.home.howItWorksKicker}</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {t.home.howItWorksTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl camcall-surface border">
              <p className="font-mono text-xs font-semibold text-[#db2777] mb-3">
                {t.home.step1Code}
              </p>
              <h3 className="font-display text-lg font-bold mb-2">{t.home.step1Title}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{t.home.step1Desc}</p>
            </div>

            <div className="p-6 rounded-2xl camcall-surface border">
              <p className="font-mono text-xs font-semibold text-[#7c3aed] mb-3">
                {t.home.step2Code}
              </p>
              <h3 className="font-display text-lg font-bold mb-2">{t.home.step2Title}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{t.home.step2Desc}</p>
            </div>

            <div className="p-6 rounded-2xl camcall-surface border">
              <p className="font-mono text-xs font-semibold text-[#db2777] mb-3">
                {t.home.step3Code}
              </p>
              <h3 className="font-display text-lg font-bold mb-2">{t.home.step3Title}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{t.home.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY CAMCALL? / ABOUT */}
      <section id="about-section" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="rounded-3xl camcall-surface-soft border p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <p className="text-xs font-semibold text-[#db2777]">{t.home.whyKicker}</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {t.home.whyTitle}
            </h2>
            <p className="text-sm sm:text-base opacity-80 leading-relaxed">{t.home.whyDesc}</p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('photobooth')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl camcall-btn-primary text-sm font-semibold transition-colors cursor-pointer"
              >
                {t.home.openBoothNow}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('collage')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl camcall-surface border hover:border-[#db2777] text-sm font-semibold transition-colors cursor-pointer"
              >
                {t.home.tryCollage}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl camcall-surface border">
              <Heart className="w-5 h-5 text-[#db2777] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold">{t.home.whyBadges.watermarkTitle}</p>
              <p className="text-xs opacity-70 mt-1">{t.home.whyBadges.watermarkDesc}</p>
            </div>
            <div className="p-4 rounded-2xl camcall-surface border">
              <ShieldCheck className="w-5 h-5 text-[#7c3aed] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold">{t.home.whyBadges.noAccountTitle}</p>
              <p className="text-xs opacity-70 mt-1">{t.home.whyBadges.noAccountDesc}</p>
            </div>
            <div className="p-4 rounded-2xl camcall-surface border">
              <ImageIcon className="w-5 h-5 text-[#db2777] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold">{t.home.whyBadges.formatsTitle}</p>
              <p className="text-xs opacity-70 mt-1">{t.home.whyBadges.formatsDesc}</p>
            </div>
            <div className="p-4 rounded-2xl camcall-surface border">
              <Sparkles className="w-5 h-5 text-[#7c3aed] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold">{t.home.whyBadges.mobileTitle}</p>
              <p className="text-xs opacity-70 mt-1">{t.home.whyBadges.mobileDesc}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
