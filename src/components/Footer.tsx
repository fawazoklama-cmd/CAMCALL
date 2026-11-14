import { useSettings } from '../context/SettingsContext';
import type { StudioView } from '../types/studio';
import { CamcallLogo } from './CamcallLogo';

interface FooterProps {
  onNavigate: (view: StudioView) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { t } = useSettings();

  return (
    <footer className="mt-auto border-t camcall-surface-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CamcallLogo variant="badge" size="md" />
            <div>
              <p className="font-display text-lg font-bold leading-tight">{t.brand.name}</p>
              <p className="text-xs opacity-75 mt-0.5">
                {t.brand.tagline} · {t.brand.freeLocal}
              </p>
            </div>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center gap-5 text-xs font-medium opacity-80">
            {(
              [
                { id: 'home', label: t.nav.home },
                { id: 'photobooth', label: t.nav.photobooth },
                { id: 'filters', label: t.nav.filters },
                { id: 'editor', label: t.nav.photoEditor },
                { id: 'collage', label: t.nav.collageMaker },
                { id: 'creative-modes', label: t.nav.creativeStudio },
                { id: 'templates', label: t.nav.templates },
                { id: 'gallery', label: t.nav.gallery },
                { id: 'settings', label: t.nav.settings },
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

        <div className="mt-8 pt-6 border-t border-current/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs opacity-75">
          <p>{t.brand.privacyFooter}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span>{t.brand.creatorCredit}</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span>{t.brand.requestedCredit}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
