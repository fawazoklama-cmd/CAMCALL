import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceAnchorSet } from '../types/photobooth';
import { createDefaultFaceAnchors, landmarksToFaceAnchors } from './photoboothLayout';

let landmarkerInstance: FaceLandmarker | null = null;
let initPromise: Promise<'ready' | 'fallback'> | null = null;
let trackerStatus: 'idle' | 'loading' | 'ready' | 'fallback' = 'idle';
let lastTimestampMs = 0;

export function getFaceTrackerStatus(): 'idle' | 'loading' | 'ready' | 'fallback' {
  return trackerStatus;
}

export async function initFaceTracker(): Promise<'ready' | 'fallback'> {
  if (trackerStatus === 'ready' && landmarkerInstance) return 'ready';
  if (trackerStatus === 'fallback') return 'fallback';
  if (initPromise) return initPromise;

  trackerStatus = 'loading';
  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
      );

      landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 2,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      trackerStatus = 'ready';
      return 'ready';
    } catch {
      // Retry CPU delegate once before falling back
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
        );
        landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
        });
        trackerStatus = 'ready';
        return 'ready';
      } catch {
        trackerStatus = 'fallback';
        return 'fallback';
      }
    }
  })();

  return initPromise;
}

/**
 * Runs real-time face landmark detection on a video or canvas frame,
 * normalizing landmark coordinates into the cropped/mirrored stage space.
 */
export function detectFaceAnchors(
  source: HTMLVideoElement | HTMLCanvasElement,
  options: { mirrorX?: boolean; timeSec: number; allowFallback?: boolean }
): FaceAnchorSet[] {
  const { mirrorX = false, timeSec, allowFallback = true } = options;

  if (trackerStatus === 'ready' && landmarkerInstance) {
    try {
      const nowMs = Math.max(lastTimestampMs + 1, Math.round(performance.now()));
      lastTimestampMs = nowMs;

      const result = landmarkerInstance.detectForVideo(source, nowMs);
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const mapped = result.faceLandmarks
          .map((lms) => landmarksToFaceAnchors(lms, mirrorX))
          .filter((a): a is FaceAnchorSet => a !== null);
        if (mapped.length > 0) {
          return mapped;
        }
      }
    } catch {
      // Fall through cleanly
    }
  }

  return allowFallback ? [createDefaultFaceAnchors(timeSec)] : [];
}

export function disposeFaceTracker() {
  if (landmarkerInstance) {
    try {
      landmarkerInstance.close();
    } catch {
      // Ignore close errors
    }
    landmarkerInstance = null;
  }
  initPromise = null;
  trackerStatus = 'idle';
}
