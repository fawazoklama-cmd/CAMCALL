import {
  Camera,
  CameraOff,
  Check,
  FlipHorizontal,
  RefreshCw,
  RotateCcw,
  Sparkles,
  SwitchCamera,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCameraEngine } from '../context/CameraEngineContext';
import { useSettings } from '../context/SettingsContext';
import { FILTER_PRESETS } from '../data/presets';
import type { BoothAspectRatio, BoothShapeId } from '../types/photobooth';
import { renderLiveCameraFrame } from '../utils/liveCameraPipeline';
import { aspectRatioToNumber } from '../utils/photoboothLayout';
import { playCountdownBeep, playShutterSound } from '../utils/soundEffects';
import { CamcallLogo } from './CamcallLogo';

interface LiveCameraCaptureModalProps {
  open: boolean;
  title?: string;
  initialAspectRatio?: BoothAspectRatio;
  previewShapeId?: BoothShapeId | null;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function LiveCameraCaptureModal({
  open,
  title,
  initialAspectRatio,
  previewShapeId = null,
  onCapture,
  onClose,
}: LiveCameraCaptureModalProps) {
  const { settings, t } = useSettings();
  const engine = useCameraEngine();

  const [mirror, setMirror] = useState<boolean>(settings.mirrorPreview);
  const [aspectRatio, setAspectRatio] = useState<BoothAspectRatio>(
    initialAspectRatio || settings.aspectRatio
  );
  const [timerSec, setTimerSec] = useState<0 | 3 | 5>(settings.countdownSeconds > 5 ? 5 : (settings.countdownSeconds as 0 | 3 | 5));
  const [filterId, setFilterId] = useState<string>('seoul-milk');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCapturedPreview(null);
      setCountdown(null);
      engine.stopStream();
      return;
    }
    setMirror(settings.mirrorPreview);
    if (initialAspectRatio) setAspectRatio(initialAspectRatio);
  }, [open, initialAspectRatio, settings.mirrorPreview]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (open && videoRef.current) {
      engine.attachVideoElement(videoRef.current);
    }
  }, [open, engine]);

  useEffect(() => {
    if (!open || capturedPreview) return;
    if (engine.cameraState !== 'active' && engine.cameraState !== 'demo-live') return;

    let rafId = 0;
    const activeFilter =
      filterId === 'none' ? null : FILTER_PRESETS.find((f) => f.id === filterId) || null;

    const tick = (nowMs: number) => {
      const canvas = canvasRef.current;
      const source =
        engine.cameraState === 'active' ? videoRef.current : engine.getDemoImage();
      const ready =
        source instanceof HTMLVideoElement
          ? source.readyState >= 2 && source.videoWidth > 0
          : Boolean(source && source.complete && source.naturalWidth > 0);

      if (canvas && source && ready) {
        renderLiveCameraFrame(canvas, source, {
          aspectRatio: aspectRatioToNumber(aspectRatio),
          mirror: engine.cameraState === 'active' ? mirror && engine.facingMode === 'user' : mirror,
          zoom: settings.defaultZoom,
          filter: activeFilter,
          activeEffects: [],
          activeFaceFilters: [],
          activeOverlays: [],
          anchors: [],
          timeSec: nowMs / 1000,
          previewShapeId,
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    open,
    capturedPreview,
    engine.cameraState,
    engine.facingMode,
    aspectRatio,
    mirror,
    filterId,
    settings.defaultZoom,
    previewShapeId,
  ]);

  if (!open) return null;

  const snapNow = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    if (settings.flashEnabled) {
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 200);
    }
    if (settings.cameraSoundEnabled) {
      playShutterSound();
    }
    setCapturedPreview(canvas.toDataURL('image/png'));
  };

  const handleCaptureClick = () => {
    if (engine.cameraState !== 'active' && engine.cameraState !== 'demo-live') {
      engine.setCameraState('demo-live');
      return;
    }
    if (timerSec <= 0) {
      snapNow();
      return;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    let rem = timerSec;
    setCountdown(rem);
    if (settings.cameraSoundEnabled) playCountdownBeep(false);
    countdownTimerRef.current = setInterval(() => {
      rem -= 1;
      if (rem <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);
        snapNow();
      } else {
        setCountdown(rem);
        if (settings.cameraSoundEnabled) playCountdownBeep(false);
      }
    }, 1000);
  };

  const errorMessage =
    engine.errorKind === 'permission'
      ? t.camera.permissionRequiredDesc
      : engine.errorKind === 'in-use'
        ? t.camera.cameraInUseDesc
        : engine.errorKind === 'unsupported'
          ? t.camera.browserUnsupportedDesc
          : t.camera.cameraNotFoundDesc;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || t.camera.captureFromCamera}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full rounded-3xl camcall-surface border p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <video ref={videoRef} playsInline muted autoPlay className="hidden" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CamcallLogo variant="badge" size="sm" />
            <div>
              <h2 className="font-display text-lg font-bold">
                {title || t.camera.captureFromCamera}
              </h2>
              <p className="text-xs opacity-75">
                CAMCALL Shared Camera Engine · {aspectRatio}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.camera.cancel}
            className="min-h-[40px] min-w-[40px] rounded-xl camcall-surface-soft border flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Stage or Captured Preview */}
        <div className="relative rounded-2xl bg-[#1f131b] min-h-[280px] max-h-[440px] flex items-center justify-center overflow-hidden p-2">
          {capturedPreview ? (
            <img
              src={capturedPreview}
              alt="Captured preview"
              className="max-h-[410px] w-auto rounded-xl object-contain"
            />
          ) : (engine.cameraState === 'active' || engine.cameraState === 'demo-live') ? (
            <canvas
              ref={canvasRef}
              className="max-h-[410px] max-w-full w-auto h-auto rounded-xl object-contain"
            />
          ) : engine.cameraState === 'requesting' ? (
            <div className="py-12 text-white flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-pink-300" />
              <p className="text-xs">{t.camera.openingCamera}</p>
            </div>
          ) : engine.cameraState === 'error' ? (
            <div className="p-6 text-center text-white max-w-sm flex flex-col items-center gap-3">
              <CameraOff className="w-7 h-7 text-pink-300" />
              <p className="text-xs leading-relaxed text-pink-100">{errorMessage}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => engine.startCamera()}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold cursor-pointer"
                >
                  {t.camera.retryCamera}
                </button>
                <button
                  type="button"
                  onClick={() => engine.setCameraState('demo-live')}
                  className="px-4 py-2 rounded-xl bg-[#db2777] text-white text-xs font-semibold cursor-pointer"
                >
                  {t.camera.liveModel}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-white max-w-sm flex flex-col items-center gap-3">
              <Camera className="w-8 h-8 text-pink-300" />
              <p className="text-xs text-pink-100">{t.camera.permissionRequiredDesc}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => engine.startCamera()}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t.camera.enableCamera}</span>
                </button>
                <button
                  type="button"
                  onClick={() => engine.setCameraState('demo-live')}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t.camera.liveModel}</span>
                </button>
              </div>
            </div>
          )}

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-150 ${
              flashActive ? 'opacity-90' : 'opacity-0'
            }`}
          />

          {countdown !== null && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
              <span className="font-display text-7xl font-bold tabular-nums">{countdown}</span>
            </div>
          )}
        </div>

        {/* Filter Strip */}
        {!capturedPreview && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 studio-scroll">
            {[{ id: 'none', name: 'Original' }, ...FILTER_PRESETS.slice(0, 10)].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterId(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                  filterId === f.id
                    ? 'bg-[#db2777] text-white'
                    : 'camcall-surface-soft border text-xs'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* Action Controls */}
        {capturedPreview ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCapturedPreview(null)}
              className="min-h-[44px] px-4 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.camera.retake}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onCapture(capturedPreview);
                onClose();
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t.camera.useThisPhoto}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = engine.facingMode === 'user' ? 'environment' : 'user';
                  engine.setFacingMode(next);
                  setMirror(next === 'user');
                  if (engine.cameraState === 'active') engine.startCamera(next);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-[#db2777]" />
                <span>{engine.facingMode === 'user' ? t.camera.frontCam : t.camera.rearCam}</span>
              </button>
              <button
                type="button"
                onClick={() => setMirror((m) => !m)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{mirror ? t.camera.mirrorOn : t.camera.mirrorOff}</span>
              </button>
              <button
                type="button"
                onClick={() => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 5 : 0))}
                className="min-h-[40px] px-3 py-1.5 rounded-xl camcall-surface-soft border text-xs font-mono font-semibold cursor-pointer"
              >
                {timerSec === 0 ? '0s' : `${timerSec}s`}
              </button>
              {engine.cameraState === 'demo-live' && (
                <button
                  type="button"
                  onClick={() => engine.setDemoModelIndex((i) => i + 1)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl camcall-surface-soft border text-xs font-semibold cursor-pointer"
                >
                  Model #{(engine.demoModelIndex % 4) + 1}
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={countdown !== null}
              onClick={handleCaptureClick}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{t.camera.capturePhoto}</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
