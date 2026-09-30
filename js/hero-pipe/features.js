// Illustrative data for the pipe hero. Invented for the website: it describes no real pipeline,
// client or inspection run, and carries no assessment values.
//
// Units mm. s runs along the pipe from its open end (s = 0), a is arc length from 12:00 clockwise
// looking downstream (pipespace.js), depths are fractions of wall thickness.

// start < 0: the pipe runs 12 m to the left of the logo too, so it spans the page (Lewis, 28 Sep).
export const PIPE = { od: 610, wt: 12.7, start: -12000, length: 24000 };
export const R = PIPE.od / 2;
export const C = Math.PI * PIPE.od;
export const WELDS = [300, 3300];   // either side of the logo (centre 1800), both in the opening view
export const DEPTH_EXAGGERATION = 3;         // pockets are drawn 3x deep so they read at hero scale
export const LOG_ORIGIN_M = 1280.4;          // log distance of s = 0, used only for the info box
export const SHIFT_2019 = { s: -35, a: 10 }; // the 2019 run's registration offset

export function arcOf(h, m = 0) {
  return ((((h % 12) * 60 + m) / 720) * C);
}

// The logo decal sits on the 3:00 face near the open end, where the side view looks, centred at
// s = 1800 mm. Phones use a compact decal so the side view can frame the pipe closer (review item 3).
const LOGO_CENTRE = 1800;
function logoBox(length) {
  const height = length * (26.788 / 133.978);
  return { s0: LOGO_CENTRE - length / 2, s1: LOGO_CENTRE + length / 2, a0: arcOf(3) - height / 2, a1: arcOf(3) + height / 2 };
}
export const LOGO = logoBox(1600);
export const LOGO_COMPACT = logoBox(680);   // fits a 360px phone with the pipe a third of the screen tall

function f(id, side, s, [h, m], length, width, d2019, d2024, extra = {}) {
  return { id, side, s, a: arcOf(h, m), clock: `${h}:${String(m).padStart(2, "0")}`, length, width, d2019, d2024, ...extra };
}

// Internal features sit just past the logo, where the bore camera comes in through the wall, so
// the matched pair is a couple of metres ahead rather than a ride down the pipe. External
// features sit beyond the opening side view.
export const FEATURES = [
  f("I1", "INT", 2600, [7, 0], 60, 50, 0.1, 0.11),
  f("I2", "INT", 3100, [4, 0], 50, 40, null, 0.09),
  f("I3", "INT", 3500, [6, 30], 80, 60, 0.14, 0.16),
  f("I5", "INT", 3800, [7, 30], 60, 50, 0.09, 0.1),
  f("H", "INT", 4200, [5, 30], 180, 130, 0.18, 0.23, { highlight: true }),   // larger: the subject at p = 0.6
  f("I6", "INT", 4900, [4, 30], 70, 50, 0.12, 0.13),
  f("I4", "INT", 5500, [5, 0], 100, 70, 0.16, 0.19),
  f("E2", "EXT", 5600, [10, 30], 120, 80, 0.15, 0.17),
  f("I7", "INT", 6400, [6, 0], 60, 60, 0.1, 0.12),
  f("E1", "EXT", 6500, [2, 0], 90, 70, 0.12, 0.14),
  f("E3", "EXT", 9300, [3, 30], 70, 70, 0.11, 0.12),
  f("E4", "EXT", 14500, [9, 0], 90, 60, 0.13, 0.15),
];

export const highlight = FEATURES.find((x) => x.highlight);

export function box(feature, run) {
  const sh = run === 2019 ? SHIFT_2019 : { s: 0, a: 0 };
  const s = feature.s + sh.s;
  const a = feature.a + sh.a;
  return { x1: s - feature.length / 2, x2: s + feature.length / 2, ya: a - feature.width / 2, yb: a + feature.width / 2 };
}

// The pocket's colour patch spans exactly its 2024 box. It is drawn as its own geometry (scene.js),
// so its edges stay crisp at any distance rather than blending across a surface mesh cell.
export function pocketPatch(feature) {
  const b = box(feature, 2024);
  return { s0: b.x1, s1: b.x2, a0: b.ya, a1: b.yb };
}

const pct = (d) => Math.round(d * 100);

export function infoFor(feature) {
  const m = (LOG_ORIGIN_M + feature.s / 1000).toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return {
    title: `${feature.side === "INT" ? "Internal" : "External"} metal loss`,
    position: `${feature.clock} o'clock, ${m} m`,
    depth: `Depth ${pct(feature.d2019)}% wt (2019) to ${pct(feature.d2024)}% wt (2024)`,
    status: "Matched across runs",
    footer: "Illustrative data",
  };
}
