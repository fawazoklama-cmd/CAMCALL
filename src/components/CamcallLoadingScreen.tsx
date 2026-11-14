import { useSettings } from '../context/SettingsContext';
import { CamcallLogo } from './CamcallLogo';

interface CamcallLoadingScreenProps {
  message?: string;
}

export function CamcallLoadingScreen({ message }: CamcallLoadingScreenProps) {
  const { t } = useSettings();

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="camcall-surface rounded-3xl border px-8 py-10 max-w-sm w-full shadow-lg flex flex-col items-center">
        <div className="animate-pulse">
          <CamcallLogo variant="splash" size="xl" />
        </div>
        <h2 className="font-display text-xl font-bold mt-5 tracking-tight">
          {t.brand.name}
        </h2>
        <p className="text-xs font-medium opacity-75 mt-1">{t.brand.tagline}</p>
        <div className="mt-5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#db2777] animate-bounce [animation-delay:-0.25s]" />
          <span className="w-2 h-2 rounded-full bg-[#ec4899] animate-bounce [animation-delay:-0.12s]" />
          <span className="w-2 h-2 rounded-full bg-[#a855f7] animate-bounce" />
        </div>
        <p className="text-xs font-medium opacity-80 mt-3">
          {message || t.loading.studioReady}
        </p>
      </div>
    </div>
  );
}
