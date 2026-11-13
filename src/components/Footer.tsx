import type { StudioView } from '../types/studio';

interface FooterProps {
  onNavigate: (view: StudioView) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="mt-auto border-t border-[#f3d5e5] bg-[#fff8fb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-lg font-bold text-[#2d1b28]">CAMCALL</p>
            <p className="text-xs text-[#6e4f62] mt-1">
              Your Moments, Your Style. · 100% Free & Local Browser Photo Studio
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#6e4f62]">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'photobooth', label: 'Photobooth' },
                { id: 'filters', label: 'Filters' },
                { id: 'editor', label: 'Photo Editor' },
                { id: 'collage', label: 'Collage' },
                { id: 'creative', label: 'Creative' },
                { id: 'about', label: 'About' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="hover:text-[#db2777] transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-[#f3d5e5]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#6e4f62]">
          <p>All photo processing happens privately in your browser without server uploads.</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[#6e4f62]">
            <span>Created &amp; Developed by @wazzz.dotcom</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>Website requested by Callysta</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
