import {
  Camera,
  CameraOff,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  SwitchCamera,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FILTER_PRESETS, PHOTOBOOTH_TEMPLATES } from '../data/presets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type {
  ExportOptions,
  PhotoboothAspect,
  PhotoboothFrameCount,
  PhotoboothTemplateId,
} from '../types/studio';
import { downloadCanvasAsImage, renderPhotostripToCanvas } from '../utils/canvasRenderer';
import { ExportControls } from './ExportControls';

interface PhotoboothStudioProps {
  initialTemplateId?: PhotoboothTemplateId;
  onEditFrame: (imageSrc: string) => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

const FRAME_COUNTS: PhotoboothFrameCount[] = [2, 3, 4, 6];
const TIMER_OPTIONS = [3, 5, 10] as const;
const ASPECT_OPTIONS: PhotoboothAspect[] = ['4:3', '1:1', '3:4'];

const BOOTH_FILTERS = [
  { id: 'none', name: 'Original' },
  ...FILTER_PRESETS.filter((f) =>
    ['seoul-milk', 'strawberry-blush', 'y2k-lavender', 'pastel-vintage', 'kodak-blush', 'editorial-mono'].includes(
      f.id
    )
  ).map((f) => ({ id: f.id, name: f.name })),
];

export function PhotoboothStudio({
  initialTemplateId = 'classic-korean',
  onEditFrame,
  onNotify,
}: PhotoboothStudioProps) {
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const [frameCount, setFrameCount] = useState<PhotoboothFrameCount>(4);
  const [timerSeconds, setTimerSeconds] = useState<3 | 5 | 10>(3);
  const [aspect, setAspect] = useState<PhotoboothAspect>('4:3');
  const [twoColumn, setTwoColumn] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<PhotoboothTemplateId>(initialTemplateId);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('seoul-milk');
  const [stripCaption, setStripCaption] = useState<string>('');
  const [showDate, setShowDate] = useState<boolean>(true);
  const [mirrorPreview, setMirrorPreview] = useState<boolean>(true);

  const [frames, setFrames] = useState<(string | null)[]>([null, null, null, null]);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [isShootingBurst, setIsShootingBurst] = useState<boolean>(false);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 95,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stripCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadSlotInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetSlotRef = useRef<number>(0);
  const burstAbortRef = useRef<boolean>(false);

  useEffect(() => {
    setSelectedTemplateId(initialTemplateId);
  }, [initialTemplateId]);

  // Adjust frame slots array when frameCount changes
  useEffect(() => {
    setFrames((prev) => {
      const next: (string | null)[] = Array.from({ length: frameCount }, (_, i) => prev[i] ?? null);
      return next;
    });
  }, [frameCount]);

  const stopStream = useCallback(() => {
    burstAbortRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const startCamera = useCallback(
    async (nextFacing: 'user' | 'environment' = facingMode, deviceId?: string) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setCameraError(
          'Your browser does not support camera access here. You can upload photos or run a Studio Demo Shoot below!'
        );
        return;
      }

      stopStream();
      setCameraState('requesting');
      setCameraError('');

      try {
        const videoConstraints: MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
          : { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 960 } };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setCameraState('active');

        if (navigator.mediaDevices.enumerateDevices) {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
          setDevices(videoInputs);
        }
      } catch (err) {
        setCameraState('error');
        const message =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was declined. Allow camera access in browser settings, or upload photos / use Studio Demo Shoot below.'
            : 'No camera device was detected or it is busy in another app. You can upload photos or try Studio Demo Shoot below.';
        setCameraError(message);
      }
    },
    [facingMode, stopStream]
  );

  const handleToggleFacing = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setMirrorPreview(next === 'user');
    setSelectedDeviceId('');
    if (cameraState === 'active') {
      startCamera(next);
    }
  };

  const activeFilter =
    selectedFilterId === 'none'
      ? null
      : FILTER_PRESETS.find((f) => f.id === selectedFilterId) || null;

  const activeTemplate =
    PHOTOBOOTH_TEMPLATES.find((t) => t.id === selectedTemplateId) || PHOTOBOOTH_TEMPLATES[0];

  const triggerFlash = () => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 260);
  };

  const captureFromVideo = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    const targetRatio = aspect === '4:3' ? 4 / 3 : aspect === '1:1' ? 1 : 3 / 4;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const videoRatio = vw / vh;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = Math.round(960 / targetRatio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    if (mirrorPreview && facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL('image/png');
  }, [aspect, facingMode, mirrorPreview]);

  const placeCapturedFrame = useCallback(
    (dataUrl: string, targetIdx: number | null) => {
      setFrames((prev) => {
        const next = [...prev];
        if (targetIdx !== null && targetIdx >= 0 && targetIdx < next.length) {
          next[targetIdx] = dataUrl;
          return next;
        }
        const firstEmpty = next.findIndex((item) => item === null);
        if (firstEmpty !== -1) {
          next[firstEmpty] = dataUrl;
        } else {
          next[next.length - 1] = dataUrl;
        }
        return next;
      });
      setRetakeIndex(null);
    },
    []
  );

  const runCountdown = (seconds: number): Promise<boolean> => {
    return new Promise((resolve) => {
      let current = seconds;
      setCountdown(current);
      const timer = setInterval(() => {
        if (burstAbortRef.current) {
          clearInterval(timer);
          setCountdown(null);
          resolve(false);
          return;
        }
        current -= 1;
        if (current <= 0) {
          clearInterval(timer);
          setCountdown(null);
          resolve(true);
        } else {
          setCountdown(current);
        }
      }, 1000);
    });
  };

  const handleSingleCapture = async () => {
    if (countdown !== null || isShootingBurst) return;
    burstAbortRef.current = false;

    const ok = await runCountdown(timerSeconds);
    if (!ok) return;

    triggerFlash();
    const captured = captureFromVideo();
    if (captured) {
      placeCapturedFrame(captured, retakeIndex);
    }
  };

  const handleBurstCapture = async () => {
    if (countdown !== null || isShootingBurst) return;
    burstAbortRef.current = false;
    setIsShootingBurst(true);

    const startIndex = Math.max(
      0,
      frames.findIndex((f) => f === null)
    );

    for (let idx = startIndex; idx < frameCount; idx++) {
      if (burstAbortRef.current) break;
      const waitSec = idx === startIndex ? timerSeconds : Math.min(2, timerSeconds);
      const ok = await runCountdown(waitSec);
      if (!ok || burstAbortRef.current) break;
      triggerFlash();
      const captured = captureFromVideo();
      if (captured) {
        placeCapturedFrame(captured, idx);
      }
    }

    setIsShootingBurst(false);
  };

  const handleDemoShoot = () => {
    triggerFlash();
    const filled = Array.from({ length: frameCount }, (_, i) => {
      return STUDIO_SAMPLE_PHOTOS[i % STUDIO_SAMPLE_PHOTOS.length].src;
    });
    setFrames(filled);
    setRetakeIndex(null);
    onNotify('Studio sample frames loaded! Customize your template and download.', 'info');
  };

  const handleSlotUploadTrigger = (idx: number) => {
    uploadTargetSlotRef.current = idx;
    uploadSlotInputRef.current?.click();
  };

  const handleSlotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        placeCapturedFrame(reader.result, uploadTargetSlotRef.current);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Re-render final HTML5 Canvas photostrip whenever frames, template, aspect, or filter changes
  useEffect(() => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    renderPhotostripToCanvas(canvas, {
      frames,
      frameCount,
      aspect,
      template: activeTemplate,
      filter: activeFilter,
      caption: stripCaption,
      showDate,
      twoColumn,
    }).catch(() => {});
  }, [frames, frameCount, aspect, activeTemplate, activeFilter, stripCaption, showDate, twoColumn]);

  const capturedCount = frames.filter(Boolean).length;

  const handleDownloadStrip = () => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    downloadCanvasAsImage(canvas, `camcall-${activeTemplate.id}`, exportOptions);
    onNotify(`Photostrip saved as ${exportOptions.format.toUpperCase()}!`);
  };

  const aspectClass =
    aspect === '4:3' ? 'aspect-[4/3]' : aspect === '1:1' ? 'aspect-square' : 'aspect-[3/4]';

  const liveCssFilter = activeFilter
    ? `brightness(${activeFilter.brightness}) contrast(${activeFilter.contrast}) saturate(${activeFilter.saturation}) sepia(${activeFilter.sepia}) hue-rotate(${activeFilter.hueRotate}deg)`
    : 'none';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <input
        ref={uploadSlotInputRef}
        type="file"
        accept="image/*"
        onChange={handleSlotFileChange}
        className="hidden"
      />

      {/* Top Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#db2777] mb-1">
            Korean Self-Photo Booth
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2d1b28]">
            CAMCALL Photobooth Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono tabular-nums text-xs font-semibold text-[#6e4f62] px-3 py-1.5 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5]">
            {capturedCount} / {frameCount} Frames Ready
          </span>
          {capturedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFrames(Array.from({ length: frameCount }, () => null));
                setRetakeIndex(null);
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-[#f3d5e5] hover:border-rose-300 text-xs font-semibold text-[#6e4f62] hover:text-rose-600 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear Strip</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Booth Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center: Camera Viewfinder + Settings + Captured Slots */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Booth Configuration Strip */}
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 flex flex-wrap items-center gap-4 justify-between">
            {/* Frame Count */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6e4f62]">Frames:</span>
              <div className="inline-flex p-1 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5]">
                {FRAME_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setFrameCount(count)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      frameCount === count
                        ? 'bg-[#db2777] text-white'
                        : 'text-[#6e4f62] hover:text-[#2d1b28]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6e4f62]">Timer:</span>
              <div className="inline-flex p-1 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5]">
                {TIMER_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTimerSeconds(sec)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      timerSeconds === sec
                        ? 'bg-[#db2777] text-white'
                        : 'text-[#6e4f62] hover:text-[#2d1b28]'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6e4f62]">Ratio:</span>
              <div className="inline-flex p-1 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5]">
                {ASPECT_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspect(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      aspect === r
                        ? 'bg-[#7c3aed] text-white'
                        : 'text-[#6e4f62] hover:text-[#2d1b28]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Camera Stage */}
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 shadow-sm shadow-pink-950/5 flex flex-col gap-4">
            <div
              className={`relative w-full ${aspectClass} max-h-[480px] mx-auto rounded-2xl overflow-hidden bg-[#2d1b28] flex items-center justify-center`}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  transform: mirrorPreview && facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  filter: liveCssFilter,
                }}
                className={`w-full h-full object-cover ${
                  cameraState === 'active' ? 'block' : 'hidden'
                }`}
              />

              {/* Visual Flash Effect */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${
                  flashActive ? 'opacity-95' : 'opacity-0'
                }`}
              />

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-[#2d1b28]/35 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                  <span className="font-display text-7xl sm:text-8xl font-bold tabular-nums drop-shadow-lg">
                    {countdown}
                  </span>
                  <span className="text-sm font-medium mt-2">
                    {retakeIndex !== null
                      ? `Retaking Frame ${retakeIndex + 1}`
                      : 'Smile for CAMCALL!'}
                  </span>
                </div>
              )}

              {/* Idle Privacy Prompt */}
              {cameraState === 'idle' && (
                <div className="p-6 text-center max-w-md flex flex-col items-center gap-4 text-white">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-pink-200" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">Ready to Pose?</h2>
                    <p className="text-xs sm:text-sm text-pink-100/90 mt-1.5 leading-relaxed">
                      We only ask for camera access when you start the booth. Photos stay privately
                      in your browser.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>Enable Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDemoShoot}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      <span>Studio Demo Shoot</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Requesting State */}
              {cameraState === 'requesting' && (
                <div className="p-6 text-center text-white flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-pink-300" aria-hidden="true" />
                  <p className="text-sm font-medium">Opening studio camera...</p>
                </div>
              )}

              {/* Camera Error / Unavailable Fallback */}
              {cameraState === 'error' && (
                <div className="p-6 text-center max-w-md flex flex-col items-center gap-4 text-white">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                    <CameraOff className="w-6 h-6 text-pink-200" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold">Camera Unavailable</h2>
                    <p className="text-xs sm:text-sm text-pink-100/90 mt-1 leading-relaxed">
                      {cameraError}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSlotUploadTrigger(0)}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDemoShoot}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Studio Demo Shoot</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFacing}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#2d1b28] border border-[#f3d5e5] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <SwitchCamera className="w-4 h-4 text-[#db2777]" aria-hidden="true" />
                  <span>{facingMode === 'user' ? 'Front Cam' : 'Rear Cam'}</span>
                </button>

                {devices.length > 1 && (
                  <select
                    aria-label="Select camera device"
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      startCamera(facingMode, e.target.value);
                    }}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] text-xs text-[#2d1b28] max-w-[170px]"
                  >
                    <option value="">Default Camera</option>
                    {devices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setMirrorPreview((prev) => !prev)}
                  className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    mirrorPreview
                      ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                      : 'bg-white border-[#f3d5e5] text-[#6e4f62]'
                  }`}
                >
                  Mirror {mirrorPreview ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {cameraState === 'active' ? (
                  <>
                    <button
                      type="button"
                      disabled={countdown !== null || isShootingBurst}
                      onClick={handleSingleCapture}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#db2777] hover:bg-[#be185d] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-pink-500/20"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {retakeIndex !== null ? `Retake #${retakeIndex + 1}` : 'Capture Photo'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={countdown !== null || isShootingBurst}
                      onClick={handleBurstCapture}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-4 h-4" aria-hidden="true" />
                      <span>Burst ({frameCount})</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleDemoShoot}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#db2777] border border-[#f3d5e5] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    <span>Fill Demo Shots</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Booth Filter Quick Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
              <span className="text-xs font-semibold text-[#6e4f62] shrink-0">Booth Filter:</span>
              {BOOTH_FILTERS.map((f) => {
                const active = selectedFilterId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilterId(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#db2777] text-white'
                        : 'bg-[#fdf2f8] text-[#6e4f62] hover:text-[#2d1b28]'
                    }`}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Frame Slots (Retake / Upload / Edit) */}
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#2d1b28]">
                Captured Frames ({capturedCount}/{frameCount})
              </h2>
              <span className="text-xs text-[#6e4f62]">Click Retake or Upload to swap any frame</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {frames.map((frameSrc, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-2 flex flex-col gap-2 ${
                    retakeIndex === idx
                      ? 'border-[#db2777] bg-[#fdf2f8]'
                      : 'border-[#f3d5e5] bg-white'
                  }`}
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#fdf2f8] flex items-center justify-center">
                    {frameSrc ? (
                      <img
                        src={frameSrc}
                        alt={`Captured frame ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-xs text-[#6e4f62]">#{idx + 1}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {cameraState === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setRetakeIndex(idx)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#db2777] text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>Retake</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSlotUploadTrigger(idx)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#2d1b28] text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" aria-hidden="true" />
                        <span>Upload</span>
                      </button>
                    )}

                    {frameSrc && (
                      <button
                        type="button"
                        aria-label={`Edit frame ${idx + 1} in Photo Editor`}
                        onClick={() => onEditFrame(frameSrc)}
                        className="p-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Photostrip Template Selector, Live Canvas Strip Preview & Download */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 8 Templates Picker */}
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#2d1b28]">
                Photobooth Templates (8)
              </h2>
              {(frameCount === 4 || frameCount === 6) && (
                <button
                  type="button"
                  onClick={() => setTwoColumn((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-[#fdf2f8] border border-[#f3d5e5] text-xs font-semibold text-[#db2777] cursor-pointer"
                >
                  {twoColumn ? '2-Column Grid' : '1-Column Strip'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              {PHOTOBOOTH_TEMPLATES.map((tpl) => {
                const active = tpl.id === selectedTemplateId;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      active
                        ? 'border-[#db2777] bg-[#fdf2f8] ring-2 ring-[#fce7f3]'
                        : 'border-[#f3d5e5] bg-white hover:border-[#f472b6]'
                    }`}
                  >
                    <span
                      className="w-6 h-8 rounded-md border shrink-0"
                      style={{
                        backgroundColor: tpl.backgroundColor,
                        borderColor: tpl.borderColor,
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#2d1b28] truncate">{tpl.name}</p>
                      <p className="text-[11px] text-[#6e4f62] truncate">{tpl.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Strip Caption & Date Toggle */}
            <div className="pt-2 border-t border-[#f3d5e5] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <input
                type="text"
                aria-label="Custom photostrip caption"
                value={stripCaption}
                onChange={(e) => setStripCaption(e.target.value)}
                placeholder="Optional strip caption (e.g., Girls Day ♡)"
                className="flex-1 px-3 py-2 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5] text-xs text-[#2d1b28] focus:outline-none focus:border-[#db2777]"
              />
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#6e4f62] cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="accent-[#db2777]"
                />
                Date stamp
              </label>
            </div>
          </div>

          {/* Live Photostrip Canvas Output */}
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-5 flex flex-col items-center gap-4">
            <h2 className="font-display text-base font-bold text-[#2d1b28] self-start">
              Live Photostrip Preview
            </h2>
            <div className="w-full flex justify-center bg-[#fdf2f8] rounded-2xl p-4 border border-[#f3d5e5] max-h-[520px] overflow-auto studio-scroll">
              <canvas
                ref={stripCanvasRef}
                data-testid="photostrip-preview-canvas"
                className="max-w-full max-h-[460px] w-auto h-auto rounded-lg shadow-md"
              />
            </div>

            <div className="w-full">
              <ExportControls
                options={exportOptions}
                onChange={setExportOptions}
                onDownload={handleDownloadStrip}
                buttonLabel="Download Photostrip Free"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
