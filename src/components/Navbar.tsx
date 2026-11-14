import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { CameraModeId, FaceFilterCategory } from '../types/photobooth';
import type { StudioView } from '../types/studio';
import { CamcallLogo } from './CamcallLogo';

export type CreativeModeId =
  | 'scrapbook'
  | 'moodboard'
  | 'magazine'
  | 'polaroid'
  | 'photocard'
  | 'pfp'
  | 'wallpaper'
  | 'calendar'
  | 'journal'
  | 'gif'
  | 'slideshow'
  | 'idcard';

export interface StudioNavigationPayload {
  view: StudioView;
  cameraMode?: CameraModeId;
  boothTab?: 'modes' | 'themes' | 'layouts' | 'shapes' | 'effects' | 'face-ar' | 'overlays' | 'decorate';
  faceCategory?: FaceFilterCategory;
  creativeMode?: CreativeModeId;
}

interface NavbarProps {
  activeView: StudioView;
  onNavigate: (view: StudioView, payload?: Partial<StudioNavigationPayload>) => void;
}

type DropdownId = 'camera' | 'face' | 'creative' | null;

export function Navbar({ activeView, onNavigate }: NavbarProps) {
  const { t, lang, setLanguage } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<DropdownId>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (view: StudioView, payload?: Partial<StudioNavigationPayload>) => {
    setMobileOpen(false);
    setOpenMenu(null);
    onNavigate(view, payload);
  };

  const cameraItems: { label: string; mode: CameraModeId }[] = [
    { label: t.nav.normalCamera, mode: 'photo' },
    { label: t.nav.photobooth, mode: 'photobooth' },
    { label: t.nav.burstMode, mode: 'burst' },
    { label: t.nav.mirrorMode, mode: 'mirror' },
    { label: t.nav.timerMode, mode: 'timer' },
    { label: t.nav.videoMode, mode: 'video' },
    { label: t.nav.randomMode, mode: 'random' },
    { label: t.nav.gestureMode, mode: 'gesture' },
  ];

  const faceItems: { label: string; category: FaceFilterCategory }[] = [
    { label: t.nav.cuteFilters, category: 'Cute' },
    { label: t.nav.animalFilters, category: 'Animal' },
    { label: t.nav.aestheticFilters, category: 'Aesthetic' },
    { label: t.nav.funnyFilters, category: 'Fun' },
  ];

  const creativeItems: {
    label: string;
    view: StudioView;
    creativeMode?: CreativeModeId;
  }[] = [
    { label: t.nav.photoEditor, view: 'editor' },
    { label: t.nav.collageMaker, view: 'collage' },
    { label: t.nav.creativeCollection, view: 'creative' },
    { label: t.nav.scrapbook, view: 'creative' },
    { label: t.nav.magazineCover, view: 'creative-modes', creativeMode: 'magazine' },
    { label: t.nav.polaroidMaker, view: 'creative-modes', creativeMode: 'polaroid' },
    { label: t.nav.gifMaker, view: 'creative-modes', creativeMode: 'gif' },
    { label: t.nav.wallpaperMaker, view: 'creative-modes', creativeMode: 'wallpaper' },
    { label: t.nav.photoCardMaker, view: 'creative-modes', creativeMode: 'photocard' },
    { label: t.nav.allCreativeModes, view: 'creative-modes', creativeMode: 'moodboard' },
  ];

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-40 camcall-surface border-b backdrop-blur-md"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--camcall-surface) 92%, transparent)',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Wordmark + Official Logo */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleSelect('home');
          }}
          className="inline-flex items-center hover:text-[#db2777] transition-colors whitespace-nowrap shrink-0 min-w-0"
          aria-label="CAMCALL Home"
        >
          <CamcallLogo variant="badge" size="sm" showWordmark />
        </a>

        {/* Zone 2: Clean Desktop Navigation Links */}
        <nav aria-label="Primary" className="hidden xl:flex items-center gap-4 2xl:gap-5">
          <button
            type="button"
            onClick={() => handleSelect('home')}
            className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'home' ? 'text-[#db2777]' : 'opacity-80 hover:opacity-100'
            }`}
          >
            {t.nav.home}
          </button>

          {/* Camera Studio Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === 'camera'}
              onClick={() => setOpenMenu((m) => (m === 'camera' ? null : 'camera'))}
              className={`py-1 text-sm font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'photobooth' ? 'text-[#db2777]' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <span>{t.nav.cameraStudio}</span>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {openMenu === 'camera' && (
              <div className="absolute left-0 top-full mt-2 w-52 rounded-2xl camcall-surface border shadow-xl p-1.5 z-50 flex flex-col gap-0.5">
                {cameraItems.map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() =>
                      handleSelect('photobooth', {
                        cameraMode: item.mode,
                        boothTab: 'modes',
                      })
                    }
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#fce7f3] hover:text-[#be185d] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Face Studio Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === 'face'}
              onClick={() => setOpenMenu((m) => (m === 'face' ? null : 'face'))}
              className="py-1 text-sm font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 opacity-80 hover:opacity-100 cursor-pointer"
            >
              <span>{t.nav.faceStudio}</span>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {openMenu === 'face' && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl camcall-surface border shadow-xl p-1.5 z-50 flex flex-col gap-0.5">
                {faceItems.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() =>
                      handleSelect('photobooth', {
                        boothTab: 'face-ar',
                        faceCategory: item.category,
                      })
                    }
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#fce7f3] hover:text-[#be185d] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSelect('filters')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#7c3aed] hover:bg-[#ede9fe] transition-colors cursor-pointer border-t mt-1 pt-2"
                >
                  {t.nav.filters}
                </button>
              </div>
            )}
          </div>

          {/* Creative Studio Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === 'creative'}
              onClick={() => setOpenMenu((m) => (m === 'creative' ? null : 'creative'))}
              className={`py-1 text-sm font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'editor' ||
                activeView === 'collage' ||
                activeView === 'creative' ||
                activeView === 'creative-modes'
                  ? 'text-[#db2777]'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <span>{t.nav.creativeStudio}</span>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {openMenu === 'creative' && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl camcall-surface border shadow-xl p-1.5 z-50 grid grid-cols-1 gap-0.5">
                {creativeItems.map((item, idx) => (
                  <button
                    key={`${item.view}-${item.creativeMode || idx}`}
                    type="button"
                    onClick={() =>
                      handleSelect(item.view, { creativeMode: item.creativeMode })
                    }
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#fce7f3] hover:text-[#be185d] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSelect('templates')}
            className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'templates' ? 'text-[#db2777]' : 'opacity-80 hover:opacity-100'
            }`}
          >
            {t.nav.templates}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('gallery')}
            className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'gallery' ? 'text-[#db2777]' : 'opacity-80 hover:opacity-100'
            }`}
          >
            {t.nav.gallery}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('settings')}
            className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'settings' ? 'text-[#db2777]' : 'opacity-80 hover:opacity-100'
            }`}
          >
            {t.nav.settings}
          </button>
        </nav>

        {/* Zone 3: Primary CTA + Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setLanguage(lang === 'en' ? 'id' : 'en')}
            aria-label={lang === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
            className="hidden sm:inline-flex min-h-[38px] px-2.5 py-1.5 rounded-xl camcall-surface-soft border text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            {lang === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
          </button>

          <button
            type="button"
            onClick={() => handleSelect('photobooth', { cameraMode: 'photobooth' })}
            className="hidden min-[360px]:inline-flex px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl camcall-btn-primary text-xs sm:text-sm font-semibold tracking-wide shadow-sm transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.startCreating}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="xl:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border camcall-surface-soft transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile"
          className="xl:hidden border-t camcall-surface px-4 py-3 flex flex-col gap-1 max-h-[75vh] overflow-y-auto"
        >
          {(
            [
              { label: t.nav.home, view: 'home' as StudioView },
              { label: t.nav.photobooth, view: 'photobooth' as StudioView },
              { label: t.nav.filters, view: 'filters' as StudioView },
              { label: t.nav.photoEditor, view: 'editor' as StudioView },
              { label: t.nav.collageMaker, view: 'collage' as StudioView },
              { label: t.nav.allCreativeModes, view: 'creative-modes' as StudioView },
              { label: t.nav.creativeCollection, view: 'creative' as StudioView },
              { label: t.nav.templates, view: 'templates' as StudioView },
              { label: t.nav.gallery, view: 'gallery' as StudioView },
              { label: t.nav.settings, view: 'settings' as StudioView },
            ]
          ).map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleSelect(item.view)}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                  isActive ? 'bg-[#fce7f3] text-[#be185d]' : 'hover:bg-[#fdf2f8]/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-xs opacity-75">{t.settings.languageLabel}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  lang === 'id' ? 'bg-[#db2777] text-white' : 'camcall-surface-soft border'
                }`}
              >
                🇮🇩 ID
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  lang === 'en' ? 'bg-[#db2777] text-white' : 'camcall-surface-soft border'
                }`}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelect('photobooth', { cameraMode: 'photobooth' })}
            className="mt-2 w-full min-h-[44px] px-4 py-2.5 rounded-xl camcall-btn-primary text-xs font-semibold tracking-wide shadow-sm cursor-pointer"
          >
            {t.nav.startCreating}
          </button>
        </nav>
      )}
    </header>
  );
}
