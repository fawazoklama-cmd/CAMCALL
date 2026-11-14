export type CameraErrorKind = 'permission' | 'not-found' | 'in-use' | 'unsupported' | null;

export function classifyCameraError(err: unknown): Exclude<CameraErrorKind, null> {
  if (!(err instanceof Error)) return 'not-found';
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return 'permission';
  }
  if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    return 'in-use';
  }
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return 'not-found';
  }
  if (err.name === 'OverconstrainedError') {
    return 'not-found';
  }
  return 'unsupported';
}
