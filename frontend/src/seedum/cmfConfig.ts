// SINGLE source of tunable CMF constants. Every threshold here is a PROVISIONAL first guess,
// to be tuned on a real camera AFTER the build (see SESSION_HANDOFF deferred backlog). Tuning
// is therefore a one-file change. Nothing here affects privacy — all values govern on-device
// math only; the egress payload stays aggregate scalars (see the worker).

export const CMF = {
  // --- cadence ---
  bucketMs: 2_500, // per-student aggregate cadence (was 10_000) → near-live teacher view
  frameIntervalMs: 200, // ~5 fps pump (ample for attention, cheap on CPU)

  // --- smoothing ---
  emaAlpha: 0.4, // EMA on the per-frame engagement (0 = frozen, 1 = no smoothing)

  // --- gaze (blendshape v1): on-screen confidence from the 8 gaze blendshapes ---
  gazeOffScreenSpan: 0.6, // gaze-offset magnitude (≈0..1) at which gaze is fully OFF-screen
  gazeOffScreenConfidence: 0.5, // engagement: gazeOnScreen below this counts as "off-screen"
  gazeBlendshapes: {
    inLeft: 'eyeLookInLeft',
    outLeft: 'eyeLookOutLeft',
    upLeft: 'eyeLookUpLeft',
    downLeft: 'eyeLookDownLeft',
    inRight: 'eyeLookInRight',
    outRight: 'eyeLookOutRight',
    upRight: 'eyeLookUpRight',
    downRight: 'eyeLookDownRight',
  },

  // --- eye openness (EAR) → 0..1 openness ---
  earClosed: 0.15, // EAR at/below → eyes closed (openness 0)
  earOpen: 0.3, // EAR at/above → fully open (openness 1)
  // MediaPipe FaceLandmarker (478) eyelid indices: [horizontal corners], [[vertical lid pairs]]
  eyeLandmarks: {
    left: { h: [33, 133], v: [[159, 145], [158, 153]] },
    right: { h: [362, 263], v: [[386, 374], [385, 380]] },
  },

  // --- head pose tolerance (degrees): within tolerance NEVER penalizes on its own ---
  headYawToleranceDeg: 15,
  headPitchToleranceDeg: 15,
  headOffScreenPenalty: 0.5, // engagement multiplier when head beyond tolerance AND gaze off-screen

  // --- alertness (alert vs drowsy) ---
  alertness: {
    windowMs: 30_000, // rolling window for blink-rate
    blinkClosedOpenness: 0.15, // openness ≤ → eyes "closed" (start of a blink)
    blinkOpenOpenness: 0.5, // openness ≥ after a close → counts one blink (recovery edge)
    drowsyBlinkRatePerMin: 25, // blink rate above → drowsier
    drowsyOpenness: 0.5, // sustained mean openness below → drowsy (heavy lids)
  },
} as const;
