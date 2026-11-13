import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { StudioView } from '../types/studio';

interface NavbarProps {
  activeView: StudioView;
  onNavigate: (view: StudioView) => void;
}

const NAV_ITEMS: { id: StudioView; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'photobooth', label: 'Photobooth' },
  { id: 'filters', label: 'Filters' },
  { id: 'editor', label: 'Photo Editor' },
  { id: 'collage', label: 'Collage' },
  { id: 'creative', label: 'Creative' },
  { id: 'about', label: 'About' },
];

export function Navbar({ activeView, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (view: StudioView) => {
    setMobileOpen(false);
    onNavigate(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#fffdfe]/90 backdrop-blur-md border-b border-[#f3d5e5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single clean text element) */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleSelect('home');
          }}
          className="font-display text-2xl font-bold tracking-tight text-[#2d1b28] hover:text-[#db2777] transition-colors whitespace-nowrap shrink-0"
        >
          CAMCALL
        </a>

        {/* Zone 2: Clean single-line text links */}
        <nav aria-label="Primary" className="hidden lg:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#db2777]'
                    : 'text-[#6e4f62] hover:text-[#2d1b28]'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full bg-[#db2777] transition-transform duration-200 origin-left ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('photobooth')}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs sm:text-sm font-semibold tracking-wide shadow-sm shadow-pink-500/20 transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            START CREATING
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#f3d5e5] text-[#2d1b28] hover:bg-[#fdf2f8] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile"
          className="lg:hidden border-t border-[#f3d5e5] bg-[#fffdfe] px-4 py-3 flex flex-col gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-[#fce7f3] text-[#be185d]'
                    : 'text-[#2d1b28] hover:bg-[#fdf2f8]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
