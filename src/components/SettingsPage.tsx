import {
  Camera,
  Check,
  Globe,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { BOOTH_ASPECT_RATIOS, CAMERA_MODE_PRESETS, CAMERA_RESOLUTIONS } from '../data/photoboothPresets';
import type { CameraModeId, CameraResolutionId } from '../types/photobooth';
import type { AppThemeId, TextSizeScale } from '../types/settings';
import { clearHistoryDb, clearPhotosFromDb, clearProjectsFromDb } from '../utils/localDb';
import { CamcallLogo } from './CamcallLogo';

interface SettingsPageProps {
  onClearSessionPhotos: () => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

const THEME_OPTIONS: { id: AppThemeId; swatch: string; accent: string }[] = [
  { id: 'pink', swatch: '#FCE7F3', accent: '#DB2777' },
  { id: 'soft-pink', swatch: '#FFF1F7', accent: '#EC4899' },
  { id: 'lavender', swatch: '#EDE9FE', accent: '#7C3AED' },
  { id: 'white-minimalist', swatch: '#F4F4F5', accent: '#18181B' },
  { id: 'dark', swatch: '#1D1520', accent: '#F472B6' },
];

export function SettingsPage({ onClearSessionPhotos, onNotify }: SettingsPageProps) {
  const { settings, t, lang, updateSettings, setLanguage, setTheme, resetSettings } = useSettings();
  const [confirmKind, setConfirmKind] = useState<'temp' | 'projects' | 'reset' | null>(null);

  const handleConfirmAction = async () => {
    if (confirmKind === 'temp') {
      await clearPhotosFromDb();
      await clearHistoryDb();
      onClearSessionPhotos();
      onNotify(t.notifications.tempCleared, 'info');
    } else if (confirmKind === 'projects') {
      await clearProjectsFromDb();
      onNotify(t.notifications.projectsCleared, 'info');
    } else if (confirmKind === 'reset') {
      resetSettings();
      onNotify(t.notifications.settingsReset, 'info');
    }
    setConfirmKind(null);
  };

  useEffect(() => {
    if (!confirmKind) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmKind(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmKind]);

  return (
    <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <CamcallLogo variant="badge" size="md" className="mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[#db2777] mb-1">{t.settings.kicker}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.settings.title}
          </h1>
          <p className="text-sm opacity-75 mt-1">{t.settings.subtitle}</p>
          <p className="text-xs text-[#7c3aed] font-medium mt-2">{t.settings.savedNotice}</p>
        </div>
      </div>

      {/* A. LANGUAGE SETTINGS */}
      <div className="rounded-3xl camcall-surface border p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-[#db2777]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold">{t.settings.sections.language}</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-sm font-medium opacity-85">{t.settings.languageLabel}</span>
          <div className="grid grid-cols-2 gap-2.5 sm:w-80">
            <button
              type="button"
              onClick={() => {
                setLanguage('id');
                onNotify('Bahasa berhasil diubah ke Bahasa Indonesia!');
              }}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl border text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${
                lang === 'id'
                  ? 'bg-[#db2777] text-white border-[#db2777] shadow-sm'
                  : 'camcall-surface-soft hover:border-[#db2777]'
              }`}
            >
              <span>🇮🇩 Bahasa Indonesia</span>
              {lang === 'id' && <Check className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                onNotify('Language switched to English!');
              }}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl border text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${
                lang === 'en'
                  ? 'bg-[#db2777] text-white border-[#db2777] shadow-sm'
                  : 'camcall-surface-soft hover:border-[#db2777]'
              }`}
            >
              <span>🇬🇧 English</span>
              {lang === 'en' && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* B. APPEARANCE SETTINGS */}
      <div className="rounded-3xl camcall-surface border p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Palette className="w-5 h-5 text-[#7c3aed]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold">{t.settings.sections.appearance}</h2>
        </div>

        <div>
          <p className="text-xs font-semibold opacity-75 mb-2.5">{t.settings.themeLabel}</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {THEME_OPTIONS.map((opt) => {
              const active = settings.theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-2 cursor-pointer transition-all ${
                    active ? 'border-[#db2777] ring-2 ring-[#fce7f3]' : 'camcall-surface-soft'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-7 h-7 rounded-full border"
                      style={{ backgroundColor: opt.swatch, borderColor: opt.accent }}
                    />
                    {active && <Check className="w-4 h-4 text-[#db2777]" />}
                  </div>
                  <span className="text-xs font-semibold leading-tight">
                    {t.settings.themes[opt.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-current/10">
          {/* Light / Dark Mode */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t.settings.colorModeLabel}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    colorMode: 'light',
                    theme: settings.theme === 'dark' ? 'pink' : settings.theme,
                  })
                }
                className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  settings.colorMode === 'light'
                    ? 'bg-[#db2777] text-white border-[#db2777]'
                    : 'camcall-surface-soft'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t.settings.lightMode}</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ colorMode: 'dark' })}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  settings.colorMode === 'dark'
                    ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                    : 'camcall-surface-soft'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t.settings.darkMode}</span>
              </button>
            </div>
          </div>

          {/* Text Size */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t.settings.textSizeLabel}</span>
            <div className="flex gap-1.5">
              {(['sm', 'md', 'lg'] as TextSizeScale[]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => updateSettings({ textSize: sz })}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                    settings.textSize === sz
                      ? 'bg-[#db2777] text-white border-[#db2777]'
                      : 'camcall-surface-soft'
                  }`}
                >
                  {t.settings.textSizes[sz]}
                </button>
              ))}
            </div>
          </div>

          {/* UI Animations */}
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-medium">{t.settings.animationsLabel}</span>
            <input
              type="checkbox"
              checked={settings.animationsEnabled}
              onChange={(e) => updateSettings({ animationsEnabled: e.target.checked })}
              className="w-5 h-5 accent-[#db2777]"
            />
          </label>

          {/* Reduce Motion */}
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-medium">{t.settings.reduceMotionLabel}</span>
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
              className="w-5 h-5 accent-[#7c3aed]"
            />
          </label>
        </div>

        {/* Transparency */}
        <label className="flex items-center justify-between gap-4 text-sm pt-2 border-t border-current/10">
          <span className="font-medium">
            {t.settings.glassLabel} ({settings.glassTransparency}%)
          </span>
          <input
            type="range"
            min={65}
            max={100}
            value={settings.glassTransparency}
            onChange={(e) => updateSettings({ glassTransparency: Number(e.target.value) })}
            className="studio-slider w-48"
          />
        </label>
      </div>

      {/* C. CAMERA SETTINGS */}
      <div className="rounded-3xl camcall-surface border p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Camera className="w-5 h-5 text-[#db2777]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold">{t.settings.sections.camera}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default Camera */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t.settings.defaultCameraLabel}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => updateSettings({ defaultFacing: 'user' })}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                  settings.defaultFacing === 'user'
                    ? 'bg-[#db2777] text-white border-[#db2777]'
                    : 'camcall-surface-soft'
                }`}
              >
                {t.settings.frontCamera}
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ defaultFacing: 'environment' })}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                  settings.defaultFacing === 'environment'
                    ? 'bg-[#db2777] text-white border-[#db2777]'
                    : 'camcall-surface-soft'
                }`}
              >
                {t.settings.rearCamera}
              </button>
            </div>
          </div>

          {/* Camera Resolution */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t.settings.resolutionLabel}</span>
            <select
              aria-label={t.settings.resolutionLabel}
              value={settings.resolution}
              onChange={(e) => updateSettings({ resolution: e.target.value as CameraResolutionId })}
              className="px-3 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold"
            >
              {CAMERA_RESOLUTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t.settings.aspectRatioLabel}</span>
            <div className="flex gap-1">
              {BOOTH_ASPECT_RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updateSettings({ aspectRatio: r })}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
                    settings.aspectRatio === r
                      ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                      : 'camcall-surface-soft'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Default Countdown */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t.settings.timerLabel}</span>
            <div className="flex gap-1">
              {([0, 3, 5, 10] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => updateSettings({ countdownSeconds: sec })}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
                    settings.countdownSeconds === sec
                      ? 'bg-[#db2777] text-white border-[#db2777]'
                      : 'camcall-surface-soft'
                  }`}
                >
                  {sec === 0 ? 'Off' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Save Format */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t.settings.saveFormatLabel}</span>
            <div className="flex gap-1.5">
              {(['png', 'jpg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => updateSettings({ saveFormat: fmt })}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold uppercase cursor-pointer ${
                    settings.saveFormat === fmt
                      ? 'bg-[#db2777] text-white border-[#db2777]'
                      : 'camcall-surface-soft'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Default Camera Mode */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t.settings.defaultModeLabel}</span>
            <select
              aria-label={t.settings.defaultModeLabel}
              value={settings.defaultCameraMode}
              onChange={(e) => updateSettings({ defaultCameraMode: e.target.value as CameraModeId })}
              className="px-3 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold"
            >
              {CAMERA_MODE_PRESETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Zoom */}
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">
              {t.settings.zoomLabel} ({settings.defaultZoom.toFixed(1)}×)
            </span>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.1}
              value={settings.defaultZoom}
              onChange={(e) => updateSettings({ defaultZoom: Number(e.target.value) })}
              className="studio-slider w-40"
            />
          </label>

          {/* Mirror, Flash, Sound toggles */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mirrorPreview}
                onChange={(e) => updateSettings({ mirrorPreview: e.target.checked })}
                className="w-4 h-4 accent-[#db2777]"
              />
              <span>{t.settings.mirrorLabel}</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.flashEnabled}
                onChange={(e) => updateSettings({ flashEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#db2777]"
              />
              <span>{t.settings.flashLabel}</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.cameraSoundEnabled}
                onChange={(e) => updateSettings({ cameraSoundEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#7c3aed]"
              />
              <Volume2 className="w-4 h-4 text-[#7c3aed]" aria-hidden="true" />
              <span>{t.settings.soundLabel}</span>
            </label>
          </div>
        </div>
      </div>

      {/* D. PRIVACY SETTINGS */}
      <div className="rounded-3xl camcall-surface border p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#7c3aed]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold">{t.settings.sections.privacy}</h2>
        </div>

        <ul className="flex flex-col gap-2 text-sm opacity-85 list-disc pl-5">
          {t.settings.privacyBullets.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-current/10">
          <button
            type="button"
            onClick={() => setConfirmKind('temp')}
            className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface-soft border hover:border-rose-400 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>{t.settings.clearTempPhotos}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmKind('projects')}
            className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface-soft border hover:border-rose-400 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>{t.settings.clearLocalProjects}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmKind('reset')}
            className="min-h-[42px] px-4 py-2 rounded-xl camcall-surface-soft border hover:border-[#db2777] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#db2777]" />
            <span>{t.settings.resetSettings}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmKind && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmKind(null)}
        >
          <div
            className="max-w-md w-full rounded-3xl camcall-surface border p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">{t.settings.confirmAction}</h3>
            <p className="text-sm opacity-80">
              {confirmKind === 'temp'
                ? t.settings.confirmTempDesc
                : confirmKind === 'projects'
                  ? t.settings.confirmProjectsDesc
                  : t.settings.confirmResetDesc}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmKind(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold cursor-pointer"
              >
                {t.gallery.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                {t.gallery.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
