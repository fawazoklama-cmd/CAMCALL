import { Download } from 'lucide-react';
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
  return (
    <div className="p-4 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#2d1b28]">Export Format</span>
        <div className="inline-flex p-1 rounded-xl bg-white border border-[#f3d5e5]">
          {(['png', 'jpg'] as ExportFormat[]).map((fmt) => {
            const active = options.format === fmt;
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => onChange({ ...options, format: fmt })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#db2777] text-white'
                    : 'text-[#6e4f62] hover:text-[#2d1b28]'
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
          <label htmlFor="export-quality-slider" className="font-medium text-[#6e4f62]">
            Image Quality
          </label>
          <span className="font-mono tabular-nums font-semibold text-[#2d1b28]">
            {options.quality}%
          </span>
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
        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#db2777] hover:bg-[#be185d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-pink-500/20 transition-all active:scale-[0.99] cursor-pointer whitespace-nowrap"
      >
        <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>

      <p className="text-[11px] text-[#6e4f62] text-center">
        No watermark · No login required · Processed locally
      </p>
    </div>
  );
}
