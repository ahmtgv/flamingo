// Classify a getUserMedia failure into an actionable, user-facing bucket. Pure & testable;
// kept out of the component so the mapping can be unit-tested without a real camera.
//
// getUserMedia rejects with a DOMException whose `name` identifies the cause. We collapse
// those into a small set of states, each with its own ru copy + a Retry that re-acquires.

export type CameraErrorKind = 'denied' | 'notFound' | 'inUse' | 'generic';

/** Map a getUserMedia rejection (DOMException, or anything) to a CameraErrorKind. */
export function classifyMediaError(err: unknown): CameraErrorKind {
  const name =
    typeof err === 'object' && err !== null && 'name' in err
      ? String((err as { name: unknown }).name)
      : '';
  switch (name) {
    case 'NotAllowedError': // user/OS blocked camera or mic permission
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError': // no camera/mic device at all
    case 'OverconstrainedError': // requested device/constraints unavailable
      return 'notFound';
    case 'NotReadableError': // device busy / held by another app, or a hardware error
    case 'AbortError':
      return 'inUse';
    default:
      return 'generic';
  }
}
