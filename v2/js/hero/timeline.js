// Scroll progress to hero pose for v2 (plan section 1.3). Pure, unit-tested
// (tests/v2/hero-timeline.test.mjs).
//   0.06 to 0.20  headline lifts away
//   0.08 to 0.35  the field gathers into the inspection band
//   0.35 to 0.62  the threshold line sweeps (no value, no label)
//   0.50 to 0.80  the callout on the deepest call
//   0.62 to 0.85  the band collapses into the trace
//   0.85 to 1     the trace docks into the margin motif

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const linear = (e0, e1, x) => clamp01((x - e0) / (e1 - e0));

const STILL = Object.freeze({ gather: 0, sweep: 0, collapse: 0, dock: 0, headline: 1, callout: false, probe: false });

export function pose(pIn, { reduced = false } = {}) {
  if (reduced) return { ...STILL };
  const p = clamp01(pIn);
  const gather = smooth(0.08, 0.35, p);
  return {
    gather,
    sweep: linear(0.35, 0.62, p),   // linear: the line sweeps at a steady speed
    collapse: smooth(0.62, 0.85, p),
    dock: smooth(0.85, 1, p),
    headline: 1 - smooth(0.06, 0.2, p),
    callout: p >= 0.5 && p <= 0.8,
    probe: gather <= 0.05,
  };
}
