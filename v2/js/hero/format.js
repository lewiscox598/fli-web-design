// Readout and callout text for the v2 hero: observations only (position, clock position, depth).
// No assessment values. Pure, unit-tested (tests/v2/hero-data.test.mjs).

const pad = (n) => String(n).padStart(2, "0");

export function clockText(hours) {
  let total = Math.round(hours * 60);
  if (total >= 720) total -= 720;
  const h = Math.floor(total / 60);
  return `${pad(h === 0 ? 12 : h)}:${pad(total % 60)}`;
}

export function readout(run, i) {
  return `KP ${run.kp[i].toFixed(3)} · ${clockText(run.clock[i])} · ${Math.round(run.depth[i] * 100)}% wt`;
}

export function callout(run, i) {
  return {
    title: "Deepest call in this run",
    lines: [`KP ${run.kp[i].toFixed(3)}`, `${clockText(run.clock[i])} o'clock`, `Depth ${Math.round(run.depth[i] * 100)}% wt`],
    footer: "Illustrative data",
  };
}
