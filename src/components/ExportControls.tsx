import { Download } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { ExportFormat, ExportOptions } from '../types/studio';

interface ExportControlsProps {
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
  onDownload: () => void;
  disabled?: boolean;
  buttonLabel?: string;
}

export function ExportControls({
  options,
  onChange,
  onDownload,
  disabled = false,
  buttonLabel = 'Download Free',
}: ExportControlsProps) {
  const { lang } = useSettings();

  return (
    <div className="p-4 rounded-2xl camcall-surface-soft border flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">
          {lang === 'id' ? 'Format Ekspor' : 'Export Format'}
        </span>
        <div className="inline-flex p-1 rounded-xl camcall-surface border">
          {(['png', 'jpg'] as ExportFormat[]).map((fmt) => {
            const active = options.format === fmt;
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => onChange({ ...options, format: fmt })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer whitespace-nowrap ${
                  active ? 'bg-[#db2777] text-white' : 'opacity-75 hover:opacity-100'
                }`}
              >
                {fmt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="export-quality-slider" className="font-medium opacity-75">
            {lang === 'id' ? 'Kualitas Gambar' : 'Image Quality'}
          </label>
          <span className="font-mono tabular-nums font-semibold">{options.quality}%</span>
        </div>
        <input
          id="export-quality-slider"
          type="range"
          min={20}
          max={100}
          step={5}
          value={options.quality}
          onChange={(e) => onChange({ ...options, quality: Number(e.target.value) })}
          className="studio-slider w-full"
        />
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onDownload}
        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl camcall-btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-pink-500/20 transition-all active:scale-[0.99] cursor-pointer whitespace-nowrap"
      >
        <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>

      <p className="text-[11px] opacity-70 text-center">
        {lang === 'id'
          ? 'Tanpa watermark · Tanpa login · Diproses lokal'
          : 'No watermark · No login required · Processed locally'}
      </p>
    </div>
  );
}
