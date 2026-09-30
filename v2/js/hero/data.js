// Illustrative inspection run for the v2 hero. Generated here from a seed: it is not taken from any
// real run, from pipe3d, or from v1's features.js, and it carries no assessment values.
//
// A run is a set of feature calls: position along the line (kp, km), clock position (0 to 12 h) and
// depth (fraction of wall thickness). The seven deepest are the "few that matter".
// Pure: no DOM, no three.js, so it is unit-tested (tests/v2/hero-data.test.mjs).

export const KP_MAX = 120;
export const CRITICAL_COUNT = 7;

// mulberry32: small, fast, seeded PRNG
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRun({ count, seed = 20260928 }) {
  const rand = rng(seed);
  const kp = new Float32Array(count);
  const clock = new Float32Array(count);
  const depth = new Float32Array(count);
  const mu = Math.log(0.05);   // median depth 5% wt
  const sigma = 0.55;
  for (let i = 0; i < count; i++) {
    kp[i] = rand() * KP_MAX;
    clock[i] = rand() * 12;
    const z = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());   // Box-Muller
    depth[i] = Math.min(0.6, Math.exp(mu + sigma * z));
  }
  const critical = new Uint8Array(count);
  const order = Array.from({ length: count }, (_, i) => i).sort((p, q) => depth[q] - depth[p]);
  for (let k = 0; k < Math.min(CRITICAL_COUNT, count); k++) critical[order[k]] = 1;
  // Staged: the deepest call sits at KP 36 in every run size, so the threshold line passes it
  // (about p = 0.43) before the callout window opens at p = 0.5.
  if (count) kp[order[0]] = 36;
  return { kp, clock, depth, critical, deepest: order[0] };
}

export function mostCritical(run) {
  return run.deepest;
}

// Band geometry shared by the band and trace layouts: x from kp across 70 percent of the width.
function bandX(kp, width) {
  return (kp / KP_MAX - 0.5) * width * 0.7;
}

// An A-scan-like line: an initial pulse at the left end, a back-wall echo at the right end, one
// ringing echo at the deepest call, and low noise elsewhere. Pure function of x.
export function traceY(x, run, { width, height }) {
  const g = (d, s) => Math.exp(-(d * d) / (2 * s * s));
  const w = width * 0.7;
  const x0 = -0.35 * width;
  const x1 = 0.35 * width;
  const xm = bandX(run.kp[run.deepest], width);
  const s = w * 0.006;
  let y = 0.1 * height * g(x - x0, s) * Math.cos((x - x0) / s * 2.2)
        + 0.06 * height * g(x - x1, s) * Math.cos((x - x1) / s * 2.2)
        + 0.09 * height * g(x - xm, s) * Math.cos((x - xm) / s * 2.6);
  y += 0.004 * height * (Math.sin(x * 53) + 0.5 * Math.sin(x * 97.3 + 1.7));
  return Math.max(-height / 2, Math.min(height / 2, y));
}

export function layouts(run, { width, height }) {
  const n = run.kp.length;
  const field = new Float32Array(3 * n);
  const band = new Float32Array(3 * n);
  const trace = new Float32Array(3 * n);
  const rand = rng(911);   // field scatter has its own seed, independent of the run
  for (let i = 0; i < n; i++) {
    const o = 3 * i;
    field[o] = (rand() - 0.5) * width * 0.98;
    field[o + 1] = (rand() - 0.5) * height * 0.98;
    field[o + 2] = (rand() - 0.5) * height;
    const x = Math.fround(bandX(run.kp[i], width));   // the x actually stored, so the trace y matches it
    band[o] = x;
    band[o + 1] = (run.clock[i] / 12 - 0.5) * height * 0.18;
    band[o + 2] = 0;
    trace[o] = x;
    trace[o + 1] = traceY(x, run, { width, height });
    trace[o + 2] = 0;
  }
  return { field, band, trace };
}
