import {
  Camera,
  Download,
  Frame,
  Heart,
  Image as ImageIcon,
  Layers,
  Palette,
  Shapes,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sticker,
  Wand2,
} from 'lucide-react';
import { FILTER_PRESETS, PHOTOBOOTH_TEMPLATES } from '../data/presets';
import { HERO_STUDIO_IMAGE, STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type { PhotoboothTemplateId, StudioView } from '../types/studio';

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
  return (
    <div className="flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fdf2f8] via-[#fff8fb] to-[#fffdfe] border-b border-[#f3d5e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 flex flex-col justify-center gap-6">
              <p className="text-sm font-semibold tracking-wide text-[#db2777]">
                CAMCALL Studio · Your Moments, Your Style.
              </p>

              <h1
                className="font-display font-bold tracking-tight text-[#2d1b28] leading-[1.08]"
                style={{
                  fontSize: 'clamp(2.35rem, 4.4vw, 3.75rem)',
                  textWrap: 'balance',
                }}
              >
                Capture Your Cute Moments!
              </h1>

              <p className="text-base sm:text-lg text-[#6e4f62] leading-relaxed max-w-xl">
                Turn your everyday moments into something special. Take photos, explore aesthetic
                filters, create beautiful photostrips, and download your memories for free.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('photobooth')}
                  className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#db2777] hover:bg-[#be185d] text-white text-sm font-semibold inline-flex items-center gap-2.5 shadow-md shadow-pink-500/20 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Start Photobooth</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('filters')}
                  className="min-h-[48px] px-6 py-3 rounded-2xl bg-white hover:bg-[#fce7f3] text-[#2d1b28] border border-[#f3d5e5] text-sm font-semibold inline-flex items-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Wand2 className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
                  <span>Explore Filters</span>
                </button>
              </div>
            </div>

            {/* Right Aesthetic Photostrip & Studio Preview Column */}
            <div className="lg:col-span-6 flex items-center justify-center">
              <div className="relative w-full max-w-xl flex items-center justify-center gap-4 sm:gap-6">
                {/* Main Studio Portrait Card */}
                <div className="flex-1 rounded-3xl bg-white p-3 sm:p-4 border border-[#f3d5e5] shadow-xl shadow-pink-950/5">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#fce7f3]">
                    <img
                      src={HERO_STUDIO_IMAGE}
                      alt="Two friends posing happily in the CAMCALL pink Korean self-photo studio"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="pt-3 px-1 flex items-center justify-between text-xs text-[#6e4f62]">
                    <span className="font-medium text-[#2d1b28]">Seoul Pink Room · Studio Cut</span>
                    <span className="font-mono tabular-nums">4:3 · Free Export</span>
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
          <div className="mt-10 pt-6 border-t border-[#f3d5e5] grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2.5 text-[#2d1b28]">
              <Camera className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
              <span className="font-medium">Live Camera Photobooth</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#2d1b28]">
              <Sparkles className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
              <span className="font-medium">11 Filter Categories</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#2d1b28]">
              <Download className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
              <span className="font-medium">Free PNG & JPG · No Watermark</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#2d1b28]">
              <ShieldCheck className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
              <span className="font-medium">100% Local Browser Privacy</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR FILTERS */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#db2777] mb-1.5">Filter Library</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2d1b28]">
              Popular Aesthetic Filters
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('filters')}
            className="text-sm font-semibold text-[#db2777] hover:text-[#be185d] transition-colors self-start sm:self-auto cursor-pointer"
          >
            Browse all 11 categories →
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
                className="group text-left rounded-2xl bg-white border border-[#f3d5e5] hover:border-[#db2777] p-2.5 transition-all hover:-translate-y-0.5 shadow-sm shadow-pink-950/5 cursor-pointer"
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
                <p className="text-sm font-semibold text-[#2d1b28] truncate">{filter.name}</p>
                <p className="text-xs text-[#6e4f62] truncate">{filter.category}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. PHOTOBOOTH TEMPLATES */}
      <section className="bg-[#fdf2f8]/70 border-y border-[#f3d5e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-[#7c3aed] mb-1.5">Photostrip Frames</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2d1b28]">
                8 Signature Photobooth Templates
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('photobooth')}
              className="text-sm font-semibold text-[#db2777] hover:text-[#be185d] transition-colors self-start sm:self-auto cursor-pointer"
            >
              Open Photobooth Studio →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {PHOTOBOOTH_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onStartWithTemplate(tpl.id)}
                className="group text-left rounded-2xl bg-white border border-[#f3d5e5] hover:border-[#db2777] p-4 transition-all hover:-translate-y-0.5 cursor-pointer flex flex-col gap-3"
              >
                {/* Mini Photostrip Preview */}
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
                  <h3 className="text-sm font-semibold text-[#2d1b28] group-hover:text-[#db2777] transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-[#6e4f62] line-clamp-1">{tpl.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CREATIVE TOOLS (Asymmetric Bento Grid) */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#db2777] mb-1.5">All-in-One Online Studio</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2d1b28]">
            Creative Tools Built for Every Vibe
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Card 1: Photobooth Studio */}
          <button
            type="button"
            onClick={() => onNavigate('photobooth')}
            className="md:col-span-7 text-left rounded-3xl bg-[#fce7f3]/70 border border-[#f3d5e5] hover:border-[#db2777] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2d1b28] mb-2">
                  Live AR Photobooth Studio
                </h3>
                <p className="text-sm text-[#6e4f62] max-w-md leading-relaxed">
                  Real-time MediaPipe Face AR filters, 18 live camera effects, 36 themes, 14 frame
                  shapes, 13 layouts, animated overlays, burst &amp; video modes with instant export.
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white border border-[#f3d5e5] flex items-center justify-center text-[#db2777] shrink-0">
                <Camera className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#db2777] group-hover:underline">
              Launch Photobooth →
            </span>
          </button>

          {/* Card 2: Filter Library */}
          <button
            type="button"
            onClick={() => onNavigate('filters')}
            className="md:col-span-5 text-left rounded-3xl bg-[#ede9fe]/65 border border-[#ddd6fe] hover:border-[#7c3aed] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2d1b28] mb-2">
                  Filter Library
                </h3>
                <p className="text-sm text-[#6e4f62] leading-relaxed">
                  22 real Canvas-powered presets across Korean, Pink, Y2K, Vintage, Film, Polaroid,
                  Dreamy, and B&W categories with live intensity control.
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white border border-[#ddd6fe] flex items-center justify-center text-[#7c3aed] shrink-0">
                <Wand2 className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#7c3aed] group-hover:underline">
              Explore Filters →
            </span>
          </button>

          {/* Card 3: Photo Editor & Stickers */}
          <button
            type="button"
            onClick={() => onNavigate('editor')}
            className="md:col-span-5 text-left rounded-3xl bg-white border border-[#f3d5e5] hover:border-[#db2777] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2d1b28] mb-2">
                  Photo Editor & Stickers
                </h3>
                <p className="text-sm text-[#6e4f62] leading-relaxed">
                  Fine-tune brightness, contrast, exposure, temperature, sharpness, grain, crop,
                  rotate, flip, and decorate with 10 sticker categories.
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] flex items-center justify-center text-[#db2777] shrink-0">
                <Sliders className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#db2777] group-hover:underline">
              Open Photo Editor →
            </span>
          </button>

          {/* Card 4: Collage Maker */}
          <button
            type="button"
            onClick={() => onNavigate('collage')}
            className="md:col-span-7 text-left rounded-3xl bg-[#fdf2f8] border border-[#f3d5e5] hover:border-[#db2777] p-6 sm:p-8 flex flex-col justify-between gap-6 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#2d1b28] mb-2">
                  Digital Scrapbook Collage Maker
                </h3>
                <p className="text-sm text-[#6e4f62] max-w-md leading-relaxed">
                  Combine 2, 3, 4, 6, or 9 memories into custom layouts with adjustable spacing,
                  pastel backgrounds, rounded borders, captions, and cute stickers.
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white border border-[#f3d5e5] flex items-center justify-center text-[#db2777] shrink-0">
                <Layers className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#db2777] group-hover:underline">
              Create a Collage →
            </span>
          </button>
        </div>

        {/* CAMCALL Creative Collection Showcase Card */}
        <div className="mt-6 rounded-3xl bg-gradient-to-r from-[#fce7f3] via-[#fff5f9] to-[#ede9fe] border border-[#f3d5e5] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#db2777] mb-1.5">
              NEW · CAMCALL CREATIVE COLLECTION
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#2d1b28] mb-2">
              22 Shapes, 48 Themes, 15 Frames & Scrapbook Studio
            </h3>
            <p className="text-sm text-[#6e4f62] leading-relaxed mb-4">
              Design custom photo art with Heart, Cloud, Wavy & Ticket shapes, Korean & Y2K aesthetic
              themes, patterned/textured backgrounds, 12 layouts, 15 sticker decoration packs, and a
              full multi-layer Scrapbook Studio.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-medium text-[#2d1b28]">
              <div className="rounded-xl bg-white/85 border border-[#f3d5e5] px-3 py-2 flex items-center gap-2">
                <Shapes className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
                <span>22 Photo Shapes</span>
              </div>
              <div className="rounded-xl bg-white/85 border border-[#f3d5e5] px-3 py-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
                <span>48 Theme Packs</span>
              </div>
              <div className="rounded-xl bg-white/85 border border-[#f3d5e5] px-3 py-2 flex items-center gap-2">
                <Frame className="w-4 h-4 text-[#db2777] shrink-0" aria-hidden="true" />
                <span>15 Aesthetic Frames</span>
              </div>
              <div className="rounded-xl bg-white/85 border border-[#f3d5e5] px-3 py-2 flex items-center gap-2">
                <Sticker className="w-4 h-4 text-[#7c3aed] shrink-0" aria-hidden="true" />
                <span>15 Decor Packs</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('creative')}
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#db2777] hover:bg-[#be185d] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Open Creative Collection</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="bg-[#fff8fb] border-t border-[#f3d5e5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#db2777] mb-1.5">Simple Studio Flow</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2d1b28]">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#f3d5e5]">
              <p className="font-mono text-xs font-semibold text-[#db2777] mb-3">01. Capture or Upload</p>
              <h3 className="font-display text-lg font-bold text-[#2d1b28] mb-2">
                Pose in the Live Booth
              </h3>
              <p className="text-sm text-[#6e4f62] leading-relaxed">
                Start your device camera with a 3s, 5s, or 10s timer, or upload your favorite photos
                directly from your phone or laptop.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#f3d5e5]">
              <p className="font-mono text-xs font-semibold text-[#7c3aed] mb-3">02. Style & Decorate</p>
              <h3 className="font-display text-lg font-bold text-[#2d1b28] mb-2">
                Apply Filters & Stickers
              </h3>
              <p className="text-sm text-[#6e4f62] leading-relaxed">
                Choose Korean or film color grading, pick a photostrip template, adjust lighting,
                and add ribbons, sparkles, frames, and captions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#f3d5e5]">
              <p className="font-mono text-xs font-semibold text-[#db2777] mb-3">03. Download Free</p>
              <h3 className="font-display text-lg font-bold text-[#2d1b28] mb-2">
                Save High-Res PNG or JPG
              </h3>
              <p className="text-sm text-[#6e4f62] leading-relaxed">
                Export crisp photos straight to your device at full quality with zero watermarks, no
                accounts, and zero hidden fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY CAMCALL? / ABOUT */}
      <section id="about-section" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="rounded-3xl bg-gradient-to-br from-[#fce7f3]/80 via-[#fdf2f8] to-[#ede9fe]/70 border border-[#f3d5e5] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <p className="text-xs font-semibold text-[#db2777]">Why CAMCALL?</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2d1b28]">
              A Private, Cute Photo Studio Right in Your Browser
            </h2>
            <p className="text-sm sm:text-base text-[#6e4f62] leading-relaxed">
              Your photos stay with you. Every filter pass, crop, sticker placement, photostrip, and
              collage is processed locally on your device using HTML5 Canvas. We never require a
              login and never upload your private photos to any external server.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('photobooth')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Open Photobooth Now
              </button>
              <button
                type="button"
                onClick={() => onNavigate('collage')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-[#fdf2f8] text-[#2d1b28] border border-[#f3d5e5] text-sm font-semibold transition-colors cursor-pointer"
              >
                Try Collage Maker
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white/90 border border-[#f3d5e5]">
              <Heart className="w-5 h-5 text-[#db2777] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#2d1b28]">Zero Watermarks</p>
              <p className="text-xs text-[#6e4f62] mt-1">Clean studio prints every single time.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/90 border border-[#f3d5e5]">
              <ShieldCheck className="w-5 h-5 text-[#7c3aed] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#2d1b28]">No Account Needed</p>
              <p className="text-xs text-[#6e4f62] mt-1">Open, pose, edit, and download fast.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/90 border border-[#f3d5e5]">
              <ImageIcon className="w-5 h-5 text-[#db2777] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#2d1b28]">PNG & JPG Export</p>
              <p className="text-xs text-[#6e4f62] mt-1">Adjustable image quality slider.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/90 border border-[#f3d5e5]">
              <Sparkles className="w-5 h-5 text-[#7c3aed] mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#2d1b28]">Mobile Ready</p>
              <p className="text-xs text-[#6e4f62] mt-1">Smooth touch controls on any phone.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
