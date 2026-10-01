// Direction B: two illustrative inspection runs over the same 3 km of line. Seeded and made up for
// v3; not v1's features.js or v2's data. Observations only: KP, clock position, depth in % wt.
export const SPAN = { from: 12, to: 15 };
export const MATCH = { kp: 13.42, clock: "5:30", d2019: 18, d2024: 23 };

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const CLOCKS = ["12:00", "1:30", "3:00", "4:30", "5:30", "6:00", "7:30", "9:00", "10:30"];

export function makeRuns(seed = 7) {
  const r = mulberry32(seed), out = [{ ...MATCH }];
  while (out.length < 40) {
    const kp = Math.round((SPAN.from + 0.02 + r() * (SPAN.to - SPAN.from - 0.04)) * 1000) / 1000;
    if (out.some((f) => Math.abs(f.kp - kp) < 0.03)) continue;
    const d2019 = 5 + Math.floor(r() * 12);
    out.push({ kp, clock: CLOCKS[Math.floor(r() * CLOCKS.length)], d2019, d2024: Math.min(40, d2019 + Math.floor(r() * 4)) });
  }
  return out.sort((a, b) => a.kp - b.kp);
}

export function profile(features, run, n = 600) {
  const out = new Float32Array(n), key = run === "2019" ? "d2019" : "d2024", w = 0.01;
  for (let i = 0; i < n; i++) {
    const kp = SPAN.from + (i / (n - 1)) * (SPAN.to - SPAN.from);
    for (const f of features) { const g = f[key] * Math.exp(-((kp - f.kp) ** 2) / (2 * w * w)); if (g > out[i]) out[i] = g; }
  }
  return out;
}

export function readout(features, kp, window = 0.015) {
  let best = null;
  for (const f of features) if (Math.abs(f.kp - kp) <= window && (!best || Math.abs(f.kp - kp) < Math.abs(best.kp - kp))) best = f;
  return best && { kp: best.kp, clock: best.clock, d2019: best.d2019, d2024: best.d2024, change: best.d2024 - best.d2019 };
}

export const step = (kp, dir, big = false) => Math.min(SPAN.to, Math.max(SPAN.from, Math.round((kp + dir * (big ? 0.1 : 0.005)) * 1000) / 1000));
export const formatKp = (kp) => `KP ${kp.toFixed(3)}`;
