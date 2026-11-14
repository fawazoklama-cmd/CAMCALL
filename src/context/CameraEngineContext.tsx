import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CAMERA_RESOLUTIONS } from '../data/photoboothPresets';
import { STUDIO_SAMPLE_PHOTOS } from '../data/sampleMedia';
import type { CameraResolutionId } from '../types/photobooth';
import { loadHtmlImage } from '../utils/canvasRenderer';
import { classifyCameraError, type CameraErrorKind } from '../utils/cameraErrors';
import { useSettings } from './SettingsContext';

export type CameraEngineState = 'idle' | 'requesting' | 'active' | 'demo-live' | 'error';
export { classifyCameraError, type CameraErrorKind };

export interface HardwareZoomRange {
  min: number;
  max: number;
  step: number;
}

interface CameraEngineContextValue {
  cameraState: CameraEngineState;
  setCameraState: (state: CameraEngineState) => void;
  errorKind: CameraErrorKind;
  facingMode: 'user' | 'environment';
  setFacingMode: (mode: 'user' | 'environment') => void;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  resolution: CameraResolutionId;
  setResolution: (res: CameraResolutionId) => void;
  hardwareZoomRange: HardwareZoomRange | null;
  demoModelIndex: number;
  setDemoModelIndex: (fn: number | ((prev: number) => number)) => void;
  getActiveStream: () => MediaStream | null;
  getDemoImage: () => HTMLImageElement | null;
  attachVideoElement: (el: HTMLVideoElement | null) => void;
  startCamera: (
    nextFacing?: 'user' | 'environment',
    deviceId?: string,
    resId?: CameraResolutionId
  ) => Promise<boolean>;
  stopStream: () => void;
  applyHardwareZoom: (zoomLevel: number) => void;
}

const CameraEngineContext = createContext<CameraEngineContextValue | null>(null);

export function CameraEngineProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();

  const [cameraState, setCameraState] = useState<CameraEngineState>('idle');
  const [errorKind, setErrorKind] = useState<CameraErrorKind>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(settings.defaultFacing);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [resolution, setResolution] = useState<CameraResolutionId>(settings.resolution);
  const [hardwareZoomRange, setHardwareZoomRange] = useState<HardwareZoomRange | null>(null);
  const [demoModelIndex, setDemoModelIndex] = useState<number>(0);

  const streamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const demoImageRef = useRef<HTMLImageElement | null>(null);

  // Sync defaults from Settings when camera is idle
  useEffect(() => {
    if (cameraState === 'idle') {
      setFacingMode(settings.defaultFacing);
      setResolution(settings.resolution);
    }
  }, [settings.defaultFacing, settings.resolution, cameraState]);

  // Preload demo portrait image for Live Studio Model preview
  useEffect(() => {
    const sample = STUDIO_SAMPLE_PHOTOS[demoModelIndex % STUDIO_SAMPLE_PHOTOS.length];
    loadHtmlImage(sample.src)
      .then((img) => {
        demoImageRef.current = img;
      })
      .catch(() => {});
  }, [demoModelIndex]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoElRef.current) {
      videoElRef.current.srcObject = null;
    }
    setHardwareZoomRange(null);
    setCameraState((prev) => (prev === 'active' || prev === 'requesting' ? 'idle' : prev));
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const attachVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch(() => {});
    }
  }, []);

  const applyHardwareZoom = useCallback((zoomLevel: number) => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') return;
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & {
        zoom?: { min: number; max: number; step?: number };
      };
      if (caps.zoom) {
        const clampedZoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min, zoomLevel));
        track
          .applyConstraints({
            advanced: [{ zoom: clampedZoom } as MediaTrackConstraintSet],
          })
          .catch(() => {});
      }
    } catch {
      // Digital zoom fallback runs cleanly in renderLiveCameraFrame
    }
  }, []);

  const startCamera = useCallback(
    async (
      nextFacing: 'user' | 'environment' = facingMode,
      deviceId?: string,
      resId: CameraResolutionId = resolution
    ): Promise<boolean> => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setErrorKind('unsupported');
        return false;
      }

      stopStream();
      setCameraState('requesting');
      setErrorKind(null);

      const resConfig = CAMERA_RESOLUTIONS.find((r) => r.id === resId) || CAMERA_RESOLUTIONS[1];

      try {
        const videoConstraints: MediaTrackConstraints = deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: resConfig.width },
              height: { ideal: resConfig.height },
            }
          : {
              facingMode: { ideal: nextFacing },
              width: { ideal: resConfig.width },
              height: { ideal: resConfig.height },
            };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        streamRef.current = stream;
        if (videoElRef.current) {
          videoElRef.current.srcObject = stream;
          await videoElRef.current.play().catch(() => {});
        }

        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          try {
            const caps = track.getCapabilities() as MediaTrackCapabilities & {
              zoom?: { min: number; max: number; step?: number };
            };
            if (caps.zoom) {
              setHardwareZoomRange({
                min: caps.zoom.min,
                max: caps.zoom.max,
                step: caps.zoom.step || 0.1,
              });
            }
          } catch {
            setHardwareZoomRange(null);
          }
        }

        setCameraState('active');

        if (navigator.mediaDevices.enumerateDevices) {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          setDevices(allDevices.filter((d) => d.kind === 'videoinput'));
        }
        return true;
      } catch (err) {
        setCameraState('error');
        setErrorKind(classifyCameraError(err));
        return false;
      }
    },
    [facingMode, resolution, stopStream]
  );

  const value: CameraEngineContextValue = {
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
    hardwareZoomRange,
    demoModelIndex,
    setDemoModelIndex,
    getActiveStream: () => streamRef.current,
    getDemoImage: () => demoImageRef.current,
    attachVideoElement,
    startCamera,
    stopStream,
    applyHardwareZoom,
  };

  return <CameraEngineContext.Provider value={value}>{children}</CameraEngineContext.Provider>;
}

export function useCameraEngine(): CameraEngineContextValue {
  const ctx = useContext(CameraEngineContext);
  if (!ctx) {
    throw new Error('useCameraEngine must be used inside CameraEngineProvider');
  }
  return ctx;
}
