import { ArrowLeft, Camera, Home } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { StudioView } from '../types/studio';
import { CamcallLogo } from './CamcallLogo';

interface NotFoundPageProps {
  onNavigate: (view: StudioView) => void;
}

export function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  const { t } = useSettings();

  return (
    <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 flex-1 flex items-center justify-center">
      <div className="camcall-surface rounded-3xl border p-7 sm:p-12 text-center shadow-xl w-full">
        <div className="flex justify-center mb-5">
          <CamcallLogo variant="splash" size="xl" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf2f8] border border-[#f3d5e5] text-[#db2777] text-xs font-mono font-bold tracking-wider uppercase">
          {t.notFound.code}
        </span>

        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-4 tracking-tight">
          {t.notFound.title}
        </h1>
        <p className="text-sm sm:text-base opacity-80 mt-3 max-w-md mx-auto leading-relaxed">
          {t.notFound.description}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#db2777] hover:bg-[#be185d] text-white font-semibold text-sm shadow-md shadow-[#db2777]/25 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t.notFound.backHome}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('photobooth')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl camcall-surface-soft border font-semibold text-sm transition-all cursor-pointer hover:border-[#db2777]"
          >
            <Camera className="w-4 h-4 text-[#db2777]" />
            {t.notFound.openBooth}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 hover:text-[#db2777] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          CAMCALL Studio
        </button>
      </div>
    </section>
  );
}
