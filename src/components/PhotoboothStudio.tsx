import {
  Camera,
  CameraOff,
  Check,
  Dices,
  Download,
  Film,
  FlipHorizontal,
  FolderHeart,
  Frame,
  LayoutGrid,
  Palette,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Shapes,
  Shuffle,
  Sliders,
  Sparkles,
  Square,
  Sticker,
  SwitchCamera,
  Trash2,
  Type,
  Upload,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCameraEngine } from '../context/CameraEngineContext';
import { useSettings } from '../context/SettingsContext';
import {
  BOOTH_ASPECT_RATIOS,
  BOOTH_DECORATION_PRESETS,
  BOOTH_FRAME_SHAPES,
  BOOTH_LAYOUTS,
  BOOTH_THEMES,
  BOOTH_THEME_CATEGORIES,
  CAMERA_EFFECT_PRESETS,
  CAMERA_MODE_PRESETS,
  CAMERA_OVERLAY_PRESETS,
  CAMERA_RESOLUTIONS,
  FACE_FILTER_CATEGORIES,
  FACE_FILTER_PRESETS,
  HANDWRITTEN_FONTS,
} from '../data/photoboothPresets';
import { FILTER_PRESETS } from '../data/presets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type {
  BoothAspectRatio,
  BoothDecorationItem,
  BoothLayoutId,
  BoothQualityPreset,
  BoothShapeId,
  BoothThemeCategory,
  CameraEffectId,
  CameraModeId,
  CameraOverlayId,
  CameraResolutionId,
  FaceAnchorSet,
  FaceFilterCategory,
  FaceFilterId,
} from '../types/photobooth';
import type { ExportOptions, PhotoboothTemplateId } from '../types/studio';
import { downloadCanvasAsImage } from '../utils/canvasRenderer';
import { detectFaceAnchors, initFaceTracker } from '../utils/faceTracker';
import { prepareCleanTrackingCanvas, renderLiveCameraFrame } from '../utils/liveCameraPipeline';
import { recordHistoryDb, savePhotoToDb } from '../utils/localDb';
import { aspectRatioToNumber, pickRandomBoothConfig } from '../utils/photoboothLayout';
import { renderUltimatePhotoboothToCanvas } from '../utils/photoboothRenderer';
import { playCountdownBeep, playShutterSound } from '../utils/soundEffects';
import { ExportControls } from './ExportControls';

interface PhotoboothStudioProps {
  initialTemplateId?: PhotoboothTemplateId;
  initialMode?: CameraModeId;
  initialTab?: LeftToolTab;
  initialFaceCategory?: FaceFilterCategory;
  initialBoothThemeId?: string;
  initialLayoutId?: BoothLayoutId;
  initialShapeId?: BoothShapeId;
  onEditFrame: (imageSrc: string) => void;
  onNotify: (msg: string, kind?: 'success' | 'info') => void;
}

export type LeftToolTab =
  | 'modes'
  | 'themes'
  | 'layouts'
  | 'shapes'
  | 'effects'
  | 'face-ar'
  | 'overlays'
  | 'decorate';

const DAILY_CHALLENGES = [
  'Pink Coquette Smile + Heart Glasses ♡',
  'Seoul 4-Cut Besties Peace Sign ✌️',
  'Y2K Lavender Dreamy Wink ✦',
  'Retro 1998 Film Mirror Selfie 🎞️',
];

const POSE_GUIDES = [
  { title: '1. Finger Heart', tip: 'Cross thumb & index gently near cheek' },
  { title: '2. Soft Cheek Rest', tip: 'Tilt chin slightly & rest hand lightly' },
  { title: '3. Twin Peace', tip: 'Framing face with upbeat V-signs' },
  { title: '4. Candid Laugh', tip: 'Look slightly away & laugh naturally' },
];

function mapInitialTemplateToThemeId(tplId: PhotoboothTemplateId): string {
  switch (tplId) {
    case 'classic-korean':
      return 'seoul-photobooth';
    case 'pink-love':
      return 'love-diary';
    case 'vintage-film':
      return '90s-film';
    case 'retro-camera':
      return 'retro-camera';
    case 'minimal-white':
      return 'korean-white-studio';
    case 'y2k':
      return 'y2k-pink';
    case 'cute-ribbon':
      return 'pink-ribbon';
    case 'polaroid-style':
      return 'old-memories';
    default:
      return 'korean-pink-studio';
  }
}

export function PhotoboothStudio({
  initialTemplateId = 'classic-korean',
  initialMode,
  initialTab,
  initialFaceCategory,
  initialBoothThemeId,
  initialLayoutId,
  initialShapeId,
  onEditFrame,
  onNotify,
}: PhotoboothStudioProps) {
  const { settings, updateSettings, t } = useSettings();
  const engine = useCameraEngine();
  const {
    cameraState,
    setCameraState,
    errorKind,
    facingMode,
    setFacingMode,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    resolution,
    setResolution,
    demoModelIndex,
    setDemoModelIndex,
    attachVideoElement,
    startCamera,
    stopStream,
    applyHardwareZoom,
    getDemoImage,
  } = engine;

  // Left Panel Tab & Category Filters
  const [activeToolTab, setActiveToolTab] = useState<LeftToolTab>(initialTab || 'themes');
  const [themeCategory, setThemeCategory] = useState<BoothThemeCategory>('Korean Studio');
  const [faceCategory, setFaceCategory] = useState<FaceFilterCategory>(initialFaceCategory || 'Animal');

  // Camera Settings
  const [mirrorPreview, setMirrorPreview] = useState<boolean>(settings.mirrorPreview);
  const [flashEnabled, setFlashEnabled] = useState<boolean>(settings.flashEnabled);
  const [zoomLevel, setZoomLevel] = useState<number>(settings.defaultZoom);
  const [aspectRatio, setAspectRatio] = useState<BoothAspectRatio>(settings.aspectRatio);
  const [countdownSeconds, setCountdownSeconds] = useState<0 | 3 | 5 | 10>(settings.countdownSeconds);

  // Camera Mode & Creative Booth Selections
  const [cameraMode, setCameraMode] = useState<CameraModeId>(initialMode || settings.defaultCameraMode);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    () => initialBoothThemeId || mapInitialTemplateToThemeId(initialTemplateId)
  );
  const [selectedLayoutId, setSelectedLayoutId] = useState<BoothLayoutId>(initialLayoutId || 'strip-4');
  const [selectedShapeId, setSelectedShapeId] = useState<BoothShapeId>(initialShapeId || 'rounded');
  const [selectedFilterId, setSelectedFilterId] = useState<string>('seoul-milk');
  const [filterIntensity, setFilterIntensity] = useState<number>(100);
  const [faceIntensity, setFaceIntensity] = useState<number>(100);
  const [activeEffects, setActiveEffects] = useState<CameraEffectId[]>(['soft-glow']);
  const [activeFaceFilters, setActiveFaceFilters] = useState<FaceFilterId[]>([]);
  const [activeOverlays, setActiveOverlays] = useState<CameraOverlayId[]>([]);

  // Burst & Gesture Controls
  const [burstCount, setBurstCount] = useState<number>(4);
  const [burstIntervalMs, setBurstIntervalMs] = useState<number>(700);
  const [burstShots, setBurstShots] = useState<string[]>([]);
  const [smileLevel, setSmileLevel] = useState<number>(0);

  // Interactive Fun Drawer
  const [showFunDrawer, setShowFunDrawer] = useState<boolean>(false);
  const [spinningFilter, setSpinningFilter] = useState<boolean>(false);
  const [challengeIndex, setChallengeIndex] = useState<number>(0);

  // Capture & Strip Outputs
  const [frames, setFrames] = useState<(string | null)[]>([null, null, null, null]);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [isShootingSequence, setIsShootingSequence] = useState<boolean>(false);

  // Video Recording State (supports Pause & Resume)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordingSec, setRecordingSec] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  // Post-Capture Decorations & Overrides
  const [stripCaption, setStripCaption] = useState<string>('');
  const [showDate, setShowDate] = useState<boolean>(true);
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [customBorderColor, setCustomBorderColor] = useState<string | null>(null);
  const [decorations, setDecorations] = useState<BoothDecorationItem[]>([]);
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState<string>('Cute Day ♡');
  const [textFont, setTextFont] = useState<string>('Playfair Display');
  const [textColor, setTextColor] = useState<string>('#DB2777');

  // Export Quality
  const [qualityPreset, setQualityPreset] = useState<BoothQualityPreset>('high');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: settings.saveFormat,
    quality: 96,
  });

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stripCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const anchorsRef = useRef<FaceAnchorSet[]>([]);
  const lastDetectTsRef = useRef<number>(0);
  const lastGestureSnapRef = useRef<number>(0);
  const burstAbortRef = useRef<boolean>(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const uploadSlotInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetSlotRef = useRef<number>(0);
  const draggingDecorRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const activeLayout = useMemo(
    () => BOOTH_LAYOUTS.find((l) => l.id === selectedLayoutId) || BOOTH_LAYOUTS[3],
    [selectedLayoutId]
  );

  const activeTheme = useMemo(
    () => BOOTH_THEMES.find((tItem) => tItem.id === selectedThemeId) || BOOTH_THEMES[0],
    [selectedThemeId]
  );

  const activeFilter = useMemo(
    () => (selectedFilterId === 'none' ? null : FILTER_PRESETS.find((f) => f.id === selectedFilterId) || null),
    [selectedFilterId]
  );

  // Sync external navigation props
  useEffect(() => {
    if (initialMode) setCameraMode(initialMode);
    if (initialTab) setActiveToolTab(initialTab);
    if (initialFaceCategory) setFaceCategory(initialFaceCategory);
  }, [initialMode, initialTab, initialFaceCategory]);

  useEffect(() => {
    if (initialBoothThemeId) {
      setSelectedThemeId(initialBoothThemeId);
      const theme = BOOTH_THEMES.find((tItem) => tItem.id === initialBoothThemeId);
      if (theme) setThemeCategory(theme.category);
    } else {
      const mappedId = mapInitialTemplateToThemeId(initialTemplateId);
      setSelectedThemeId(mappedId);
      const theme = BOOTH_THEMES.find((tItem) => tItem.id === mappedId);
      if (theme) setThemeCategory(theme.category);
    }
    if (initialLayoutId) setSelectedLayoutId(initialLayoutId);
    if (initialShapeId) setSelectedShapeId(initialShapeId);
  }, [initialTemplateId, initialBoothThemeId, initialLayoutId, initialShapeId]);

  // Attach shared video ref
  useEffect(() => {
    attachVideoElement(videoRef.current);
  }, [attachVideoElement]);

  // Adjust frame slots array whenever layout changes
  useEffect(() => {
    setFrames((prev) => Array.from({ length: activeLayout.slotCount }, (_, i) => prev[i] ?? null));
    setRetakeIndex(null);
  }, [activeLayout.slotCount]);

  // Initialize MediaPipe Face Landmarker lazily when Face AR, Gesture, or live stage turns on
  useEffect(() => {
    if (
      activeFaceFilters.length > 0 ||
      cameraMode === 'gesture' ||
      cameraState === 'active' ||
      cameraState === 'demo-live'
    ) {
      initFaceTracker().catch(() => {});
    }
  }, [activeFaceFilters.length, cameraMode, cameraState]);

  useEffect(() => {
    return () => {
      burstAbortRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // Ignore stop error
        }
      }
      stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  // Apply hardware zoom if supported
  useEffect(() => {
    applyHardwareZoom(zoomLevel);
  }, [zoomLevel, applyHardwareZoom]);

  const cameraError =
    errorKind === 'permission'
      ? t.camera.permissionRequiredDesc
      : errorKind === 'in-use'
        ? t.camera.cameraInUseDesc
        : errorKind === 'unsupported'
          ? t.camera.browserUnsupportedDesc
          : errorKind === 'not-found'
            ? t.camera.cameraNotFoundDesc
            : '';

  // Real-time 30fps+ Live Camera & Face Tracking Render Loop
  useEffect(() => {
    if (cameraState !== 'active' && cameraState !== 'demo-live') return;

    let rafId = 0;
    if (!prevFrameCanvasRef.current) {
      prevFrameCanvasRef.current = document.createElement('canvas');
    }

    const tick = (nowMs: number) => {
      const canvas = liveCanvasRef.current;
      const source = cameraState === 'active' ? videoRef.current : getDemoImage();

      const sourceReady =
        source instanceof HTMLVideoElement
          ? source.readyState >= 2 && source.videoWidth > 0
          : Boolean(source && source.complete && source.naturalWidth > 0);

      if (!trackingCanvasRef.current) {
        trackingCanvasRef.current = document.createElement('canvas');
      }

      if (canvas && source && sourceReady) {
        const timeSec = nowMs / 1000;
        const aspectNum = aspectRatioToNumber(aspectRatio);
        const shouldMirror =
          cameraState === 'active'
            ? mirrorPreview && (facingMode === 'user' || cameraMode === 'mirror')
            : mirrorPreview && cameraMode === 'mirror';

        if ((activeFaceFilters.length > 0 || cameraMode === 'gesture') && nowMs - lastDetectTsRef.current > 65) {
          lastDetectTsRef.current = nowMs;
          const trackCanvas = trackingCanvasRef.current;
          if (
            trackCanvas &&
            prepareCleanTrackingCanvas(trackCanvas, source, aspectNum, shouldMirror, zoomLevel)
          ) {
            anchorsRef.current = detectFaceAnchors(trackCanvas, {
              mirrorX: false,
              timeSec,
              allowFallback: true,
            });
            const score = anchorsRef.current[0]?.smileScore ?? 0;
            setSmileLevel(Math.round(score * 100));

            // Gesture Camera: auto-snap when smile/open mouth gesture exceeds threshold
            if (
              cameraMode === 'gesture' &&
              cameraState === 'active' &&
              score >= 0.72 &&
              nowMs - lastGestureSnapRef.current > 3200 &&
              countdown === null &&
              !isShootingSequence
            ) {
              lastGestureSnapRef.current = nowMs;
              const shot = canvas.toDataURL('image/png');
              if (shot && canvas.width > 0) {
                if (flashEnabled) {
                  setFlashActive(true);
                  setTimeout(() => setFlashActive(false), 200);
                }
                if (settings.cameraSoundEnabled) playShutterSound();
                setFrames((prev) => {
                  const next = [...prev];
                  const idx = next.findIndex((i) => i === null);
                  next[idx === -1 ? next.length - 1 : idx] = shot;
                  return next;
                });
                onNotify('Gesture Camera auto-captured smile!');
              }
            }
          }
        }

        renderLiveCameraFrame(canvas, source, {
          aspectRatio: aspectNum,
          mirror: shouldMirror,
          zoom: zoomLevel,
          filter: activeFilter,
          filterIntensity,
          faceIntensity,
          activeEffects,
          activeFaceFilters,
          activeOverlays,
          anchors: anchorsRef.current,
          timeSec,
          prevFrameCanvas: prevFrameCanvasRef.current,
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    cameraState,
    aspectRatio,
    mirrorPreview,
    facingMode,
    cameraMode,
    zoomLevel,
    activeFilter,
    filterIntensity,
    faceIntensity,
    activeEffects,
    activeFaceFilters,
    activeOverlays,
    getDemoImage,
    countdown,
    isShootingSequence,
    flashEnabled,
    settings.cameraSoundEnabled,
    onNotify,
  ]);

  // Re-render final Photostrip / Layout Canvas whenever slots, theme, shape, layout, filter, or decorations change
  useEffect(() => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    renderUltimatePhotoboothToCanvas(canvas, {
      frames,
      layoutId: selectedLayoutId,
      shapeId: selectedShapeId,
      theme: activeTheme,
      filter: activeFilter,
      caption: stripCaption,
      showDate,
      customBgColor,
      customBorderColor,
      decorations,
      quality: qualityPreset,
    }).catch(() => {});
  }, [
    frames,
    selectedLayoutId,
    selectedShapeId,
    activeTheme,
    activeFilter,
    stripCaption,
    showDate,
    customBgColor,
    customBorderColor,
    decorations,
    qualityPreset,
  ]);

  const handleSelectTheme = (themeId: string) => {
    const theme = BOOTH_THEMES.find((tItem) => tItem.id === themeId);
    if (!theme) return;
    setSelectedThemeId(theme.id);
    setSelectedShapeId(theme.defaultShapeId);
    setSelectedFilterId(theme.recommendedFilterId);
    setActiveEffects(theme.recommendedEffects);
    setCustomBgColor(null);
    setCustomBorderColor(null);
    onNotify(`Applied "${theme.name}" theme!`);
  };

  const handleToggleFacing = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setMirrorPreview(next === 'user');
    setSelectedDeviceId('');
    if (cameraState === 'active') {
      startCamera(next, undefined, resolution);
    }
  };

  const handleModeSelect = (mode: CameraModeId) => {
    setCameraMode(mode);
    if (mode === 'mirror') {
      setMirrorPreview(true);
      onNotify('Mirror Mode activated!');
    } else if (mode === 'timer') {
      setCountdownSeconds((prev) => (prev === 0 ? 3 : prev));
      onNotify('Timer Mode active — choose 3s, 5s, or 10s!');
    } else if (mode === 'gesture') {
      onNotify(t.camera.gestureHint, 'info');
    } else if (mode === 'random') {
      const cfg = pickRandomBoothConfig();
      const theme = BOOTH_THEMES.find((tItem) => tItem.id === cfg.themeId);
      setSelectedThemeId(cfg.themeId);
      if (theme) {
        setThemeCategory(theme.category);
        setSelectedShapeId(theme.defaultShapeId);
      }
      setSelectedFilterId(cfg.filterId);
      setActiveEffects(cfg.effectIds);
      setActiveFaceFilters(cfg.faceFilterIds);
      setActiveOverlays(cfg.overlayIds);
      setCustomBgColor(null);
      setCustomBorderColor(null);
      onNotify('Randomized Theme, Filter, Effects, Face AR & Overlay!');
    }
  };

  const handleSpinFilterWheel = () => {
    if (spinningFilter) return;
    setSpinningFilter(true);
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      const randF = FILTER_PRESETS[Math.floor(Math.random() * FILTER_PRESETS.length)];
      setSelectedFilterId(randF.id);
      if (ticks >= 10) {
        clearInterval(id);
        setSpinningFilter(false);
        onNotify(`Filter Wheel landed on "${randF.name}"!`);
      }
    }, 90);
  };

  const triggerFlash = () => {
    if (!flashEnabled) return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 240);
  };

  const captureLiveCanvasFrame = useCallback((): string | null => {
    const liveCanvas = liveCanvasRef.current;
    if (!liveCanvas || liveCanvas.width === 0) return null;
    if (settings.cameraSoundEnabled) playShutterSound();
    return liveCanvas.toDataURL('image/png');
  }, [settings.cameraSoundEnabled]);

  const placeCapturedFrame = useCallback((dataUrl: string, targetIdx: number | null) => {
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
  }, []);

  const runCountdown = (seconds: number): Promise<boolean> => {
    if (seconds <= 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      let curr = seconds;
      setCountdown(curr);
      if (settings.cameraSoundEnabled) playCountdownBeep(false);
      const timer = setInterval(() => {
        if (burstAbortRef.current) {
          clearInterval(timer);
          setCountdown(null);
          resolve(false);
          return;
        }
        curr -= 1;
        if (curr <= 0) {
          clearInterval(timer);
          setCountdown(null);
          if (settings.cameraSoundEnabled) playCountdownBeep(true);
          resolve(true);
        } else {
          setCountdown(curr);
          if (settings.cameraSoundEnabled) playCountdownBeep(false);
        }
      }, 1000);
    });
  };

  const handlePrimaryCapture = async () => {
    if (cameraState !== 'active' && cameraState !== 'demo-live') {
      setCameraState('demo-live');
      onNotify('Started Live Studio Model preview — click Capture again to snap!', 'info');
      return;
    }

    if (cameraMode === 'video') {
      handleToggleVideoRecording();
      return;
    }

    if (countdown !== null || isShootingSequence) return;
    burstAbortRef.current = false;

    if (
      retakeIndex !== null ||
      cameraMode === 'photo' ||
      cameraMode === 'mirror' ||
      cameraMode === 'timer' ||
      cameraMode === 'random' ||
      cameraMode === 'gesture'
    ) {
      const wait = cameraMode === 'timer' ? Math.max(3, countdownSeconds) : countdownSeconds;
      const ok = await runCountdown(wait);
      if (!ok) return;
      triggerFlash();
      const shot = captureLiveCanvasFrame();
      if (shot) {
        placeCapturedFrame(shot, retakeIndex);
        onNotify(
          retakeIndex !== null
            ? `Retook frame #${retakeIndex + 1}!`
            : 'Frame captured with live effects & AR!'
        );
      }
      return;
    }

    // Burst Mode -> rapid capture N frames with burstIntervalMs + allow Pick Best Shot
    if (cameraMode === 'burst') {
      setIsShootingSequence(true);
      const captured: string[] = [];
      for (let i = 0; i < burstCount; i++) {
        if (burstAbortRef.current) break;
        if (i === 0 && countdownSeconds > 0) {
          const ok = await runCountdown(Math.min(2, countdownSeconds));
          if (!ok) break;
        } else if (i > 0) {
          await new Promise((r) => setTimeout(r, burstIntervalMs));
        }
        triggerFlash();
        const shot = captureLiveCanvasFrame();
        if (shot) {
          captured.push(shot);
          if (i < activeLayout.slotCount) {
            placeCapturedFrame(shot, i);
          }
        }
      }
      setBurstShots(captured);
      setIsShootingSequence(false);
      onNotify(`Captured ${captured.length} burst shots — pick your best shot below!`);
      return;
    }

    // Photobooth Mode -> fill remaining slots
    setIsShootingSequence(true);
    const total = activeLayout.slotCount;
    const firstEmpty = frames.findIndex((f) => f === null);
    const startIdx = firstEmpty === -1 ? 0 : firstEmpty;

    for (let i = startIdx; i < total; i++) {
      if (burstAbortRef.current) break;
      const waitSec =
        i === startIdx ? Math.max(1, countdownSeconds) : Math.min(3, Math.max(1, countdownSeconds));
      const ok = await runCountdown(waitSec);
      if (!ok || burstAbortRef.current) break;
      triggerFlash();
      const shot = captureLiveCanvasFrame();
      if (shot) {
        placeCapturedFrame(shot, i);
      }
    }
    setIsShootingSequence(false);
    onNotify(`Captured ${total}-shot photobooth sequence!`);
  };

  // Video Recording using MediaRecorder on the real-time live Canvas (supports Pause/Resume)
  const handleToggleVideoRecording = () => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      setIsPaused(false);
      return;
    }

    const canvas = liveCanvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      onNotify('Video recording is not supported in this browser.', 'info');
      return;
    }

    try {
      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        onNotify('Video clip recorded with live filters & AR! Ready to download.');
      };
      recorderRef.current = recorder;
      recorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSec(0);
    } catch {
      onNotify('Could not start video recording on this device.', 'info');
    }
  };

  const handlePauseResumeVideo = () => {
    const rec = recorderRef.current;
    if (!rec || !isRecording) return;
    if (isPaused) {
      if (typeof rec.resume === 'function') rec.resume();
      setIsPaused(false);
    } else {
      if (typeof rec.pause === 'function') rec.pause();
      setIsPaused(true);
    }
  };

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const timer = setInterval(() => {
      setRecordingSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  const handleDemoFillAll = () => {
    triggerFlash();
    const filled = Array.from({ length: activeLayout.slotCount }, (_, i) => {
      return STUDIO_SAMPLE_PHOTOS[i % STUDIO_SAMPLE_PHOTOS.length].src;
    });
    setFrames(filled);
    setRetakeIndex(null);
    onNotify(`Filled ${activeLayout.slotCount} studio sample shots!`);
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

  const toggleEffect = (id: CameraEffectId) => {
    setActiveEffects((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const toggleFaceFilter = (id: FaceFilterId) => {
    setActiveFaceFilters((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const toggleOverlay = (id: CameraOverlayId) => {
    setActiveOverlays((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  };

  const addDecoration = (
    item: Omit<BoothDecorationItem, 'id' | 'x' | 'y' | 'scale' | 'rotation' | 'opacity'>
  ) => {
    const id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setDecorations((prev) => [
      ...prev,
      {
        ...item,
        id,
        x: 0.5 + (Math.random() - 0.5) * 0.25,
        y: 0.45 + (Math.random() - 0.5) * 0.25,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
    ]);
    setSelectedDecorId(id);
  };

  const selectedDecor = decorations.find((d) => d.id === selectedDecorId) || null;

  const handleStripPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (decorations.length === 0) return;
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    for (let i = decorations.length - 1; i >= 0; i--) {
      const dec = decorations[i];
      if (Math.hypot(nx - dec.x, ny - dec.y) <= 0.1) {
        setSelectedDecorId(dec.id);
        draggingDecorRef.current = { id: dec.id, dx: nx - dec.x, dy: ny - dec.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }
    setSelectedDecorId(null);
  };

  const handleStripPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = draggingDecorRef.current;
    const canvas = stripCanvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / rect.width - drag.dx));
    const ny = Math.min(0.95, Math.max(0.05, (e.clientY - rect.top) / rect.height - drag.dy));
    setDecorations((prev) => prev.map((d) => (d.id === drag.id ? { ...d, x: nx, y: ny } : d)));
  };

  const handleStripPointerUp = () => {
    draggingDecorRef.current = null;
  };

  const handleDownloadOutput = () => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    downloadCanvasAsImage(canvas, `camcall-${activeTheme.id}-${selectedLayoutId}`, exportOptions);
    recordHistoryDb('template', activeTheme.id, activeTheme.name).catch(() => {});
    onNotify(t.notifications.downloaded);
  };

  const handleSaveStripToGallery = async () => {
    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    await savePhotoToDb({
      title: `Photobooth · ${activeTheme.name}`,
      dataUrl: canvas.toDataURL('image/png'),
      source: 'photobooth',
      format: 'png',
      favorite: false,
    });
    await recordHistoryDb('template', activeTheme.id, activeTheme.name);
    onNotify(t.notifications.savedGallery);
  };

  const handleDownloadVideo = () => {
    if (!recordedVideoUrl) return;
    const link = document.createElement('a');
    link.download = `camcall-live-${Date.now()}.webm`;
    link.href = recordedVideoUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify(t.notifications.downloaded);
  };

  const capturedCount = frames.filter(Boolean).length;
  const stageAspectClass =
    aspectRatio === '1:1'
      ? 'aspect-square'
      : aspectRatio === '3:4'
        ? 'aspect-[3/4]'
        : aspectRatio === '4:3'
          ? 'aspect-[4/3]'
          : aspectRatio === '9:16'
            ? 'aspect-[9/16]'
            : 'aspect-[16/9]';

  const LEFT_TABS: { id: LeftToolTab; label: string; Icon: typeof Camera }[] = [
    { id: 'modes', label: 'Modes', Icon: Camera },
    { id: 'themes', label: 'Themes', Icon: Palette },
    { id: 'layouts', label: 'Layouts', Icon: LayoutGrid },
    { id: 'shapes', label: 'Shapes', Icon: Shapes },
    { id: 'effects', label: 'Effects', Icon: Sparkles },
    { id: 'face-ar', label: 'Face AR', Icon: Wand2 },
    { id: 'overlays', label: 'Overlays', Icon: Frame },
    { id: 'decorate', label: 'Decorate', Icon: Sticker },
  ];

  return (
    <section className="max-w-[1440px] mx-auto w-full px-3 sm:px-5 lg:px-6 py-4 sm:py-6 flex flex-col gap-4">
      <input
        ref={uploadSlotInputRef}
        type="file"
        accept="image/*"
        onChange={handleSlotFileChange}
        className="hidden"
      />
      {/* Hidden raw video element driving live Canvas pipeline */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      {/* TOP: Studio Control Strip */}
      <div className="rounded-2xl camcall-surface border px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <p className="text-[11px] font-semibold text-[#db2777] uppercase tracking-wider">
            {t.camera.studioKicker}
          </p>
          <h1 className="font-display text-xl sm:text-2xl font-bold">{t.camera.studioTitle}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick 2 / 3 / 4 / 6 / 8 Photobooth Frame Selector */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl camcall-surface-soft border">
            {(
              [
                { count: 2, id: 'double' as BoothLayoutId },
                { count: 3, id: 'triple' as BoothLayoutId },
                { count: 4, id: 'strip-4' as BoothLayoutId },
                { count: 6, id: 'strip-6' as BoothLayoutId },
                { count: 8, id: 'strip-8' as BoothLayoutId },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedLayoutId(opt.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer ${
                  selectedLayoutId === opt.id
                    ? 'bg-[#db2777] text-white'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                {opt.count}-Cut
              </button>
            ))}
          </div>

          <span className="font-mono tabular-nums text-xs font-semibold px-3 py-1.5 rounded-xl camcall-surface-soft border">
            {capturedCount}/{activeLayout.slotCount} · {activeTheme.name}
          </span>

          <button
            type="button"
            onClick={() => setShowFunDrawer((v) => !v)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#fce7f3] text-[#be185d] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.camera.interactiveTools}</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSelect('random')}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#ede9fe] hover:bg-[#ddd6fe] text-[#6d28d9] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.camera.randomizeVibe}</span>
          </button>

          {capturedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFrames(Array.from({ length: activeLayout.slotCount }, () => null));
                setRetakeIndex(null);
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-xl camcall-surface-soft border hover:border-rose-300 text-xs font-semibold hover:text-rose-600 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.camera.clearShots}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Features Drawer */}
      {showFunDrawer && (
        <div className="rounded-3xl camcall-surface border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl camcall-surface-soft border p-3.5 flex flex-col gap-2">
            <p className="text-xs font-bold text-[#db2777]">🎡 {t.camera.spinFilter} &amp; {t.camera.photoRoulette}</p>
            <p className="text-xs opacity-75">
              {DAILY_CHALLENGES[challengeIndex % DAILY_CHALLENGES.length]}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                disabled={spinningFilter}
                onClick={handleSpinFilterWheel}
                className="px-3 py-1.5 rounded-xl bg-[#db2777] text-white text-xs font-semibold cursor-pointer"
              >
                {spinningFilter ? 'Spinning...' : t.camera.spinFilter}
              </button>
              <button
                type="button"
                onClick={() => {
                  const cfg = pickRandomBoothConfig();
                  handleSelectTheme(cfg.themeId);
                }}
                className="px-3 py-1.5 rounded-xl camcall-surface border text-xs font-semibold cursor-pointer"
              >
                {t.camera.mysteryTheme}
              </button>
              <button
                type="button"
                onClick={() => setChallengeIndex((i) => i + 1)}
                className="px-3 py-1.5 rounded-xl camcall-surface border text-xs font-semibold cursor-pointer"
              >
                Next Challenge
              </button>
            </div>
          </div>

          <div className="rounded-2xl camcall-surface-soft border p-3.5 flex flex-col gap-2">
            <p className="text-xs font-bold text-[#7c3aed]">✨ {t.camera.poseGuide}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {POSE_GUIDES.map((p) => (
                <div key={p.title} className="rounded-xl camcall-surface border p-2 text-[11px]">
                  <p className="font-bold">{p.title}</p>
                  <p className="opacity-70 leading-tight mt-0.5">{p.tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl camcall-surface-soft border p-3.5 flex flex-col gap-2">
            <p className="text-xs font-bold text-[#db2777]">👯 {t.camera.duoBooth} &amp; {t.camera.timerChallenge}</p>
            <p className="text-xs opacity-75">
              Quick presets for duo 2x2 photo sessions, Photo Roulette, or fast 3s Timer Challenge.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedLayoutId('grid-2x2');
                  setSelectedShapeId('heart');
                  setCameraMode('photobooth');
                  onNotify('Duo Photobooth 2x2 Heart preset ready!');
                }}
                className="px-3 py-1.5 rounded-xl bg-[#7c3aed] text-white text-xs font-semibold cursor-pointer"
              >
                {t.camera.duoBooth}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleModeSelect('random');
                  setCameraMode('photobooth');
                }}
                className="px-3 py-1.5 rounded-xl camcall-surface border text-xs font-semibold cursor-pointer"
              >
                {t.camera.photoRoulette}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCountdownSeconds(3);
                  setCameraMode('timer');
                  onNotify('3s Timer Challenge activated!');
                }}
                className="px-3 py-1.5 rounded-xl camcall-surface border text-xs font-semibold cursor-pointer"
              >
                {t.camera.timerChallenge}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN 3-COLUMN STUDIO WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Modes, Themes, Layouts, Shapes, Effects, Face AR, Overlays, Decorate */}
        <aside className="lg:col-span-3 order-2 lg:order-1 rounded-3xl camcall-surface border p-3.5 flex flex-col gap-3">
          <div className="grid grid-cols-4 lg:grid-cols-2 gap-1.5">
            {LEFT_TABS.map(({ id, label, Icon }) => {
              const active = activeToolTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveToolTab(id)}
                  className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center lg:justify-start cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#db2777] text-white shadow-xs'
                      : 'camcall-surface-soft opacity-80 hover:opacity-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-current/10 max-h-[540px] overflow-y-auto studio-scroll pr-1">
            {/* TAB: CAMERA MODES */}
            {activeToolTab === 'modes' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold opacity-75">
                  Camera Modes ({CAMERA_MODE_PRESETS.length})
                </p>
                {CAMERA_MODE_PRESETS.map((m) => {
                  const active = cameraMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModeSelect(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-[#db2777] bg-[#fdf2f8] text-[#2d1b28]'
                          : 'camcall-surface-soft hover:border-[#f472b6]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{m.name}</span>
                        {active && <Check className="w-3.5 h-3.5 text-[#db2777]" />}
                      </div>
                      <p className="text-[11px] opacity-75 mt-0.5">{m.description}</p>
                    </button>
                  );
                })}

                {cameraMode === 'burst' && (
                  <div className="p-3 rounded-2xl camcall-surface-soft border flex flex-col gap-2 mt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{t.camera.burstCount}</span>
                      <span className="font-mono">{burstCount}</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={6}
                      value={burstCount}
                      onChange={(e) => setBurstCount(Number(e.target.value))}
                      className="studio-slider w-full"
                    />
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{t.camera.burstInterval}</span>
                      <span className="font-mono">{burstIntervalMs}ms</span>
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={1500}
                      step={100}
                      value={burstIntervalMs}
                      onChange={(e) => setBurstIntervalMs(Number(e.target.value))}
                      className="studio-slider w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB: PHOTOBOOTH THEMES (36 Themes across 6 Collections) */}
            {activeToolTab === 'themes' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {BOOTH_THEME_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setThemeCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                        themeCategory === cat
                          ? 'bg-[#7c3aed] text-white'
                          : 'bg-[#fdf2f8] text-[#6e4f62] hover:text-[#2d1b28]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {BOOTH_THEMES.filter((t) => t.category === themeCategory).map((theme) => {
                    const active = selectedThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 cursor-pointer transition-all ${
                          active
                            ? 'border-[#db2777] bg-[#fdf2f8] ring-2 ring-[#fce7f3]'
                            : 'border-[#f3d5e5] bg-white hover:border-[#f472b6]'
                        }`}
                      >
                        <span
                          className="w-8 h-10 rounded-lg border shrink-0 flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: theme.backgroundGradient || theme.backgroundColor,
                            borderColor: theme.borderColor,
                            color: theme.textColor,
                          }}
                        >
                          Aa
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#2d1b28] truncate">
                            {theme.name}
                          </p>
                          <p className="text-[10px] text-[#6e4f62] truncate">
                            {theme.defaultShapeId} · {theme.recommendedEffects[0] || 'clean'}
                          </p>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 text-[#db2777] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: PHOTOBOOTH LAYOUTS (13 Layouts with visual preview) */}
            {activeToolTab === 'layouts' && (
              <div className="grid grid-cols-2 gap-2">
                {BOOTH_LAYOUTS.map((layout) => {
                  const active = selectedLayoutId === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => setSelectedLayoutId(layout.id)}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        active
                          ? 'border-[#db2777] bg-[#fdf2f8]'
                          : 'border-[#f3d5e5] bg-white hover:border-[#f472b6]'
                      }`}
                    >
                      <div className="relative w-12 h-14 rounded-lg bg-[#fff8fb] border border-[#f3d5e5] overflow-hidden">
                        {layout.slots.map((s, idx) => (
                          <div
                            key={idx}
                            className="absolute rounded-[2px]"
                            style={{
                              left: `${s.x * 100}%`,
                              top: `${s.y * 100}%`,
                              width: `${s.w * 100}%`,
                              height: `${s.h * 100}%`,
                              backgroundColor: active ? '#db2777' : '#f472b6',
                              opacity: 0.78,
                              transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
                            }}
                          />
                        ))}
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-[#2d1b28] leading-tight">
                          {layout.name}
                        </p>
                        <p className="text-[10px] text-[#6e4f62]">{layout.slotCount} shots</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB: PHOTO FRAME SHAPES (14 Shapes) */}
            {activeToolTab === 'shapes' && (
              <div className="grid grid-cols-2 gap-2">
                {BOOTH_FRAME_SHAPES.map((shape) => {
                  const active = selectedShapeId === shape.id;
                  return (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setSelectedShapeId(shape.id)}
                      className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        active
                          ? 'border-[#db2777] bg-[#fdf2f8]'
                          : 'border-[#f3d5e5] bg-white hover:border-[#f472b6]'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#2d1b28]">{shape.name}</p>
                      <p className="text-[10px] text-[#6e4f62] mt-0.5 line-clamp-2">
                        {shape.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB: REAL-TIME CAMERA EFFECTS (18 Effects) */}
            {activeToolTab === 'effects' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#6e4f62]">
                    Live Effects ({activeEffects.length} active)
                  </p>
                  {activeEffects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveEffects([])}
                      className="text-[11px] font-semibold text-[#db2777] cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CAMERA_EFFECT_PRESETS.map((eff) => {
                    const active = activeEffects.includes(eff.id);
                    return (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => toggleEffect(eff.id)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          active
                            ? 'border-[#db2777] bg-[#fdf2f8]'
                            : 'border-[#f3d5e5] bg-white hover:border-[#f472b6]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-[#2d1b28] leading-tight">
                            {eff.name}
                          </span>
                          {active && <Check className="w-3 h-3 text-[#db2777] shrink-0" />}
                        </div>
                        <p className="text-[10px] text-[#6e4f62] mt-0.5 truncate">
                          {eff.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: REAL-TIME FACE FILTERS (MediaPipe AR Filters) */}
            {activeToolTab === 'face-ar' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {FACE_FILTER_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFaceCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        faceCategory === cat
                          ? 'bg-[#db2777] text-white'
                          : 'camcall-surface-soft border'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <label className="flex flex-col gap-1 text-[11px] font-semibold">
                  <div className="flex justify-between">
                    <span>{t.camera.faceIntensity}</span>
                    <span className="font-mono text-[#7c3aed]">{faceIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={faceIntensity}
                    onChange={(e) => setFaceIntensity(Number(e.target.value))}
                    className="studio-slider w-full"
                  />
                </label>

                {activeFaceFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFaceFilters([])}
                    className="self-end text-[11px] font-semibold text-[#db2777] cursor-pointer"
                  >
                    Clear Face AR ({activeFaceFilters.length})
                  </button>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  {FACE_FILTER_PRESETS.filter((f) => f.category === faceCategory).map((filter) => {
                    const active = activeFaceFilters.includes(filter.id);
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => toggleFaceFilter(filter.id)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          active
                            ? 'border-[#7c3aed] bg-[#ede9fe]/60 text-[#2d1b28]'
                            : 'camcall-surface-soft hover:border-[#a78bfa]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: filter.swatchColor }}
                        />
                        <span className="text-[11px] font-semibold truncate">{filter.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: ANIMATED CAMERA OVERLAYS (9 Overlays) */}
            {activeToolTab === 'overlays' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#6e4f62]">
                    Live Overlays ({activeOverlays.length})
                  </p>
                  {activeOverlays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveOverlays([])}
                      className="text-[11px] font-semibold text-[#db2777] cursor-pointer"
                    >
                      Off
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {CAMERA_OVERLAY_PRESETS.map((ov) => {
                    const active = activeOverlays.includes(ov.id);
                    return (
                      <button
                        key={ov.id}
                        type="button"
                        onClick={() => toggleOverlay(ov.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          active
                            ? 'border-[#db2777] bg-[#fdf2f8]'
                            : 'border-[#f3d5e5] bg-white hover:border-[#f472b6]'
                        }`}
                      >
                        <span className="text-xs font-semibold text-[#2d1b28]">
                          {ov.symbol} {ov.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            active ? 'bg-[#db2777] text-white' : 'bg-[#fdf2f8] text-[#6e4f62]'
                          }`}
                        >
                          {active ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: POST-CAPTURE PHOTO DECORATION */}
            {activeToolTab === 'decorate' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-[#6e4f62]">Add Stickers &amp; Doodles</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BOOTH_DECORATION_PRESETS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        addDecoration({
                          kind: d.kind,
                          label: d.label,
                          symbol: d.symbol,
                          color: d.color,
                        })
                      }
                      className="p-2 rounded-xl border border-[#f3d5e5] hover:border-[#db2777] bg-white text-xs font-medium text-[#2d1b28] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{d.symbol}</span>
                      <span className="truncate">{d.label}</span>
                    </button>
                  ))}
                </div>

                {/* Add Text / Handwritten Font / Timestamp */}
                <div className="pt-2 border-t border-[#f3d5e5] flex flex-col gap-2">
                  <p className="text-xs font-semibold text-[#6e4f62]">Text &amp; Timestamp</p>
                  <input
                    type="text"
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    placeholder="Custom text..."
                    className="px-2.5 py-1.5 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5] text-xs text-[#2d1b28]"
                  />
                  <div className="flex gap-1.5">
                    <select
                      aria-label="Handwritten font"
                      value={textFont}
                      onChange={(e) => setTextFont(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-xl bg-white border border-[#f3d5e5] text-xs text-[#2d1b28]"
                    >
                      {HANDWRITTEN_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="color"
                      aria-label="Text color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-9 h-8 rounded-lg border border-[#f3d5e5] cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        addDecoration({
                          kind: 'text',
                          label: 'Text',
                          symbol: textDraft.trim() || 'CAMCALL ♡',
                          color: textColor,
                          fontFamily: textFont,
                        })
                      }
                      className="py-2 px-2 rounded-xl bg-[#db2777] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>Add Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addDecoration({
                          kind: 'timestamp',
                          label: 'Timestamp',
                          symbol: new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          }),
                          color: textColor,
                          fontFamily: 'JetBrains Mono',
                        })
                      }
                      className="py-2 px-2 rounded-xl bg-[#fdf2f8] border border-[#f3d5e5] text-[#2d1b28] text-xs font-semibold cursor-pointer"
                    >
                      + Date Stamp
                    </button>
                  </div>
                </div>

                {/* Borders & Background Overrides */}
                <div className="pt-2 border-t border-[#f3d5e5] flex flex-col gap-2">
                  <p className="text-xs font-semibold text-[#6e4f62]">Custom Background &amp; Border</p>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5">
                      <span>Bg:</span>
                      <input
                        type="color"
                        value={customBgColor || activeTheme.backgroundColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="w-7 h-7 rounded border border-[#f3d5e5] cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span>Border:</span>
                      <input
                        type="color"
                        value={customBorderColor || activeTheme.borderColor}
                        onChange={(e) => setCustomBorderColor(e.target.value)}
                        className="w-7 h-7 rounded border border-[#f3d5e5] cursor-pointer"
                      />
                    </label>
                    {(customBgColor || customBorderColor) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomBgColor(null);
                          setCustomBorderColor(null);
                        }}
                        className="text-[11px] text-[#db2777] font-semibold cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Decoration Scale / Rotate / Delete */}
                {selectedDecor && (
                  <div className="pt-2 border-t border-[#f3d5e5] flex flex-col gap-2 bg-[#fdf2f8] p-2.5 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2d1b28]">
                        Edit: {selectedDecor.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDecorations((prev) => prev.filter((d) => d.id !== selectedDecor.id));
                          setSelectedDecorId(null);
                        }}
                        className="text-rose-600 text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                    <label className="text-[11px] text-[#6e4f62] flex items-center justify-between gap-2">
                      <span>Size</span>
                      <input
                        type="range"
                        min={0.4}
                        max={2.4}
                        step={0.1}
                        value={selectedDecor.scale}
                        onChange={(e) =>
                          setDecorations((prev) =>
                            prev.map((d) =>
                              d.id === selectedDecor.id ? { ...d, scale: Number(e.target.value) } : d
                            )
                          )
                        }
                        className="studio-slider flex-1"
                      />
                    </label>
                    <label className="text-[11px] text-[#6e4f62] flex items-center justify-between gap-2">
                      <span>Rotate</span>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={selectedDecor.rotation}
                        onChange={(e) =>
                          setDecorations((prev) =>
                            prev.map((d) =>
                              d.id === selectedDecor.id
                                ? { ...d, rotation: Number(e.target.value) }
                                : d
                            )
                          )
                        }
                        className="studio-slider flex-1"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: Live Camera Preview + BOTTOM Camera Dock & Gallery */}
        <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col gap-4">
          <div className="rounded-3xl camcall-surface border p-3.5 sm:p-4 shadow-sm shadow-pink-950/5 flex flex-col gap-3">
            {/* Gesture Mode Indicator */}
            {cameraMode === 'gesture' && (
              <div className="px-3 py-2 rounded-xl camcall-surface-soft border flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#db2777]">{t.camera.gestureActive}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-full bg-[#db2777] transition-all"
                      style={{ width: `${Math.min(100, smileLevel)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px]">{smileLevel}%</span>
                </div>
              </div>
            )}

            {/* Live Camera Stage */}
            <div className="relative w-full min-h-[300px] max-h-[500px] rounded-2xl bg-[#2d1b28] flex items-center justify-center overflow-hidden p-2">
              {(cameraState === 'active' || cameraState === 'demo-live') && (
                <canvas
                  ref={liveCanvasRef}
                  data-testid="live-camera-canvas"
                  className={`${stageAspectClass} max-h-[470px] max-w-full w-auto h-auto rounded-xl object-contain shadow-lg`}
                />
              )}

              {/* Visual Flash Effect */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${
                  flashActive ? 'opacity-95' : 'opacity-0'
                }`}
              />

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-mono font-bold inline-flex items-center gap-2 shadow-md">
                  <span
                    className={`w-2 h-2 rounded-full bg-white ${isPaused ? '' : 'animate-pulse'}`}
                  />
                  <span>
                    {isPaused ? 'PAUSED' : 'REC'} 00:{String(recordingSec).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-[#2d1b28]/35 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                  <span className="font-display text-7xl sm:text-8xl font-bold tabular-nums drop-shadow-lg">
                    {countdown}
                  </span>
                  <span className="text-sm font-medium mt-2">
                    {retakeIndex !== null ? `Retaking #${retakeIndex + 1}` : 'Pose for CAMCALL!'}
                  </span>
                </div>
              )}

              {/* Idle State */}
              {cameraState === 'idle' && (
                <div className="p-5 text-center max-w-sm flex flex-col items-center gap-3.5 text-white">
                  <div className="w-13 h-13 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-pink-200" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold">Start CAMCALL Studio</h2>
                    <p className="text-xs text-pink-100/90 mt-1 leading-relaxed">
                      {t.camera.permissionRequiredDesc}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{t.camera.enableCamera}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraState('demo-live')}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{t.camera.liveModel}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Requesting State */}
              {cameraState === 'requesting' && (
                <div className="p-6 text-center text-white flex flex-col items-center gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-pink-300" />
                  <p className="text-xs font-medium">{t.camera.openingCamera}</p>
                </div>
              )}

              {/* Error State */}
              {cameraState === 'error' && (
                <div className="p-5 text-center max-w-sm flex flex-col items-center gap-3 text-white">
                  <CameraOff className="w-7 h-7 text-pink-200" />
                  <p className="text-xs text-pink-100/90 leading-relaxed">{cameraError}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer"
                    >
                      {t.camera.retryCamera}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraState('demo-live')}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold cursor-pointer"
                    >
                      {t.camera.liveModel}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Demo Model Switcher */}
            {cameraState === 'demo-live' && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl camcall-surface-soft border text-xs">
                <span className="font-medium opacity-75">Live Studio AR Model:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDemoModelIndex((i) => (i + 1) % STUDIO_SAMPLE_PHOTOS.length)}
                    className="px-2.5 py-1 rounded-lg camcall-surface border font-semibold cursor-pointer"
                  >
                    Switch Model
                  </button>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-2.5 py-1 rounded-lg bg-[#db2777] text-white font-semibold cursor-pointer"
                  >
                    Use Real Camera
                  </button>
                </div>
              </div>
            )}

            {/* BOTTOM BAR: Filter Carousel + Filter Intensity */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 studio-scroll">
                {[{ id: 'none', name: 'Original' }, ...FILTER_PRESETS].map((f) => {
                  const active = selectedFilterId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFilterId(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#db2777] text-white'
                          : 'camcall-surface-soft border opacity-80 hover:opacity-100'
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
              {selectedFilterId !== 'none' && (
                <div className="flex items-center gap-2 text-[11px] px-1">
                  <span className="opacity-75">{t.filters.intensity}</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={filterIntensity}
                    onChange={(e) => setFilterIntensity(Number(e.target.value))}
                    className="studio-slider flex-1"
                  />
                  <span className="font-mono font-semibold text-[#db2777]">{filterIntensity}%</span>
                </div>
              )}
            </div>

            {/* Capture & Camera Action Dock */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleToggleFacing}
                className="min-h-[44px] px-3.5 py-2 rounded-xl camcall-surface-soft border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4 text-[#db2777]" />
                <span>{facingMode === 'user' ? t.camera.frontCam : t.camera.rearCam}</span>
              </button>

              {isRecording && (
                <button
                  type="button"
                  onClick={handlePauseResumeVideo}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? t.camera.resumeRecording : t.camera.pauseRecording}</span>
                </button>
              )}

              <button
                type="button"
                disabled={countdown !== null || isShootingSequence}
                onClick={handlePrimaryCapture}
                className={`min-h-[48px] flex-1 px-5 py-2.5 rounded-2xl text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : cameraMode === 'video'
                      ? 'bg-[#7c3aed] hover:bg-[#6d28d9]'
                      : 'bg-[#db2777] hover:bg-[#be185d]'
                } disabled:opacity-50`}
              >
                {cameraMode === 'video' ? (
                  isRecording ? (
                    <>
                      <Square className="w-4 h-4" />
                      <span>{t.camera.stopRecording}</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>{t.camera.recordVideo}</span>
                    </>
                  )
                ) : cameraMode === 'burst' || cameraMode === 'photobooth' ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>
                      {retakeIndex !== null
                        ? `${t.camera.retakeFrame}${retakeIndex + 1}`
                        : cameraMode === 'burst'
                          ? `Burst (${burstCount})`
                          : `Shoot Booth (${activeLayout.slotCount})`}
                    </span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>
                      {retakeIndex !== null
                        ? `${t.camera.retakeFrame}${retakeIndex + 1}`
                        : t.camera.capturePhoto}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDemoFillAll}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#ede9fe] hover:bg-[#ddd6fe] text-[#6d28d9] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.camera.demoFill}</span>
              </button>
            </div>

            {/* Burst Candidate Best-Shot Picker */}
            {burstShots.length > 0 && (
              <div className="pt-2 border-t border-current/10 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#db2777]">Burst Captures — Click to set Slot #1</span>
                  <button
                    type="button"
                    onClick={() => setBurstShots([])}
                    className="text-[11px] opacity-70 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {burstShots.map((bSrc, bIdx) => (
                    <button
                      key={bIdx}
                      type="button"
                      onClick={() => {
                        placeCapturedFrame(bSrc, 0);
                        onNotify(`Picked burst shot #${bIdx + 1} as best shot!`);
                      }}
                      className="w-16 h-16 rounded-xl overflow-hidden border-2 border-transparent hover:border-[#db2777] shrink-0 cursor-pointer"
                    >
                      <img src={bSrc} alt={`Burst ${bIdx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM GALLERY PREVIEW STRIP */}
          <div className="rounded-3xl bg-white border border-[#f3d5e5] p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#2d1b28]">
                Gallery Shots ({capturedCount}/{activeLayout.slotCount})
              </h2>
              <span className="text-[11px] text-[#6e4f62]">Retake, Upload, or Edit any shot</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {frames.map((frameSrc, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-1.5 flex flex-col gap-1.5 ${
                    retakeIndex === idx ? 'border-[#db2777] bg-[#fdf2f8]' : 'border-[#f3d5e5]'
                  }`}
                >
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#fdf2f8] flex items-center justify-center">
                    {frameSrc ? (
                      <img
                        src={frameSrc}
                        alt={`Booth frame ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-[#6e4f62]">#{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {cameraState === 'active' || cameraState === 'demo-live' ? (
                      <button
                        type="button"
                        onClick={() => setRetakeIndex(idx)}
                        className="flex-1 py-1 px-1.5 rounded-md bg-[#fdf2f8] text-[#db2777] text-[10px] font-semibold inline-flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Retake</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSlotUploadTrigger(idx)}
                        className="flex-1 py-1 px-1.5 rounded-md bg-[#fdf2f8] text-[#2d1b28] text-[10px] font-semibold inline-flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>Upload</span>
                      </button>
                    )}

                    {frameSrc && (
                      <button
                        type="button"
                        aria-label={`Edit shot ${idx + 1}`}
                        onClick={() => onEditFrame(frameSrc)}
                        className="p-1 rounded-md bg-violet-50 text-violet-700 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Camera Settings, Selected Effects, Live Result Canvas & Export */}
        <aside className="lg:col-span-4 order-3 flex flex-col gap-4">
          {/* Camera Settings Card */}
          <div className="rounded-3xl camcall-surface border p-4 flex flex-col gap-3">
            <h2 className="font-display text-sm font-bold">{t.camera.settingsTitle}</h2>

            {/* Aspect Ratio */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold opacity-75">{t.camera.aspectRatio}</span>
              <div className="grid grid-cols-5 gap-1">
                {BOOTH_ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 rounded-lg text-[11px] font-mono font-semibold cursor-pointer ${
                      aspectRatio === ratio
                        ? 'bg-[#7c3aed] text-white'
                        : 'camcall-surface-soft border'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Countdown Timer & Resolution */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold opacity-75">{t.camera.timer}</span>
                <div className="grid grid-cols-4 gap-1">
                  {([0, 3, 5, 10] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setCountdownSeconds(sec)}
                      className={`py-1.5 rounded-lg text-[11px] font-mono font-semibold cursor-pointer ${
                        countdownSeconds === sec
                          ? 'bg-[#db2777] text-white'
                          : 'camcall-surface-soft border'
                      }`}
                    >
                      {sec === 0 ? 'Off' : `${sec}s`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold opacity-75">{t.camera.resolution}</span>
                <select
                  aria-label="Camera resolution"
                  value={resolution}
                  onChange={(e) => {
                    const nextRes = e.target.value as CameraResolutionId;
                    setResolution(nextRes);
                    if (cameraState === 'active') startCamera(facingMode, selectedDeviceId || undefined, nextRes);
                  }}
                  className="px-2.5 py-1.5 rounded-xl camcall-surface-soft border text-xs"
                >
                  {CAMERA_RESOLUTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mirror, Flash & Sound */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMirrorPreview((p) => !p)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  mirrorPreview ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]' : 'camcall-surface-soft'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{mirrorPreview ? t.camera.mirrorOn : t.camera.mirrorOff}</span>
              </button>

              <button
                type="button"
                onClick={() => setFlashEnabled((p) => !p)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  flashEnabled ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]' : 'camcall-surface-soft'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{flashEnabled ? t.camera.flashOn : t.camera.flashOff}</span>
              </button>

              <button
                type="button"
                onClick={() => updateSettings({ cameraSoundEnabled: !settings.cameraSoundEnabled })}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  settings.cameraSoundEnabled
                    ? 'bg-[#ede9fe] border-[#7c3aed] text-[#6d28d9]'
                    : 'camcall-surface-soft'
                }`}
              >
                {settings.cameraSoundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span>{settings.cameraSoundEnabled ? t.camera.soundOn : t.camera.soundOff}</span>
              </button>

              {devices.length > 1 && (
                <select
                  aria-label="Select camera device"
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCamera(facingMode, e.target.value, resolution);
                  }}
                  className="flex-1 min-w-[120px] px-2 py-1.5 rounded-xl camcall-surface-soft border text-xs"
                >
                  <option value="">Default Cam</option>
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Cam ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="flex items-center justify-between gap-3 text-xs opacity-80">
              <span className="font-semibold">
                {t.camera.zoom} ({zoomLevel.toFixed(1)}×)
              </span>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.1}
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="studio-slider flex-1"
              />
            </label>

            {/* Active Effects & AR Summary */}
            <div className="pt-2 border-t border-current/10 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-[#fdf2f8] text-[#db2777] font-semibold">
                {activeLayout.name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#ede9fe] text-[#6d28d9] font-semibold">
                {BOOTH_FRAME_SHAPES.find((s) => s.id === selectedShapeId)?.name}
              </span>
              {activeEffects.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleEffect(e)}
                  className="px-2 py-0.5 rounded-md bg-[#fce7f3] text-[#831843] font-medium cursor-pointer"
                >
                  {e} ×
                </button>
              ))}
              {activeFaceFilters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFaceFilter(f)}
                  className="px-2 py-0.5 rounded-md bg-[#ede9fe] text-[#4c1d95] font-medium cursor-pointer"
                >
                  AR:{f} ×
                </button>
              ))}
            </div>
          </div>

          {/* Live Rendered Photostrip / Collage Result + Free Export */}
          <div className="rounded-3xl camcall-surface border p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Photostrip &amp; Collage Preview</h2>
              <select
                aria-label="Export resolution preset"
                value={qualityPreset}
                onChange={(e) => setQualityPreset(e.target.value as BoothQualityPreset)}
                className="px-2 py-1 rounded-lg camcall-surface-soft border text-[11px] font-semibold"
              >
                <option value="standard">Standard</option>
                <option value="high">High Quality</option>
                <option value="original">Original Res</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                aria-label="Custom photostrip caption"
                value={stripCaption}
                onChange={(e) => setStripCaption(e.target.value)}
                placeholder="Caption (e.g. Besties Seoul Day ♡)"
                className="flex-1 px-3 py-1.5 rounded-xl camcall-surface-soft border text-xs"
              />
              <label className="inline-flex items-center gap-1.5 text-xs opacity-80 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="accent-[#db2777]"
                />
                <span>Date</span>
              </label>
            </div>

            <div className="w-full flex justify-center camcall-surface-soft rounded-2xl p-3 border max-h-[440px] overflow-auto studio-scroll">
              <canvas
                ref={stripCanvasRef}
                data-testid="photostrip-preview-canvas"
                onPointerDown={handleStripPointerDown}
                onPointerMove={handleStripPointerMove}
                onPointerUp={handleStripPointerUp}
                onPointerCancel={handleStripPointerUp}
                className="max-w-full max-h-[400px] w-auto h-auto rounded-lg shadow-md touch-none cursor-grab active:cursor-grabbing"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveStripToGallery}
              className="w-full min-h-[40px] px-4 py-2 rounded-xl camcall-surface-soft border hover:border-[#db2777] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FolderHeart className="w-4 h-4 text-[#db2777]" />
              <span>{t.camera.saveToGallery}</span>
            </button>

            <ExportControls
              options={exportOptions}
              onChange={setExportOptions}
              onDownload={handleDownloadOutput}
              buttonLabel={`Download ${exportOptions.format.toUpperCase()} Free`}
            />

            {recordedVideoUrl && (
              <div className="pt-2 border-t border-[#f3d5e5] flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#6d28d9] inline-flex items-center gap-1.5">
                  <Film className="w-4 h-4" />
                  Recorded Live Clip Ready
                </span>
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="px-3 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Video</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
