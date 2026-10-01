// Scroll progress to scene pose for the pipe hero (spec section 5). Pure: no three.js
// and no DOM, so every pose is unit-tested.
//
// Pipe space as pipespace.js: the pipe runs along +X from its open end at x = 0, 12:00 is +Y and
// 3:00 is +Z. Unrolled (u = 1), the strip faces +Z at z = R.

import { R, PIPE, LOGO_COMPACT, highlight } from "./features.js";
import { pipeToWorld } from "./pipespace.js";

export const FOV = 30;   // vertical field of view in degrees; scene.js uses the same camera
export const INFO_OPEN = 0.55;
export const INFO_CLOSE = 0.78;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
export function smooth(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Portrait screens need the camera further back to keep the same length of pipe across the width.
export function reach(aspect) {
  return Math.max(1, 1.6 / aspect);
}

// Where the highlighted pair sits on the bore wall (u = 0), for aiming the bore camera at it.
const PAIR = pipeToWorld(highlight.s, highlight.a, -PIPE.wt, 0, R);

const LOGO_X = 1800;   // the logo decal's centre (features.js)

// compact (phones): frame the pipe close, just wide enough for the compact logo.
function side(p, aspect, compact) {
  const tan = Math.tan(((FOV / 2) * Math.PI) / 180);
  // Width is fitted at the logo's surface (3:00 face, R nearer the camera), not at the axis.
  const d = compact ? R + ((LOGO_COMPACT.s1 - LOGO_COMPACT.s0) * 1.08) / (2 * tan * aspect) : 4200 * reach(aspect);
  // Held still and centred on the logo: no drift, so the page stays balanced (Lewis, 28 Sep).
  return { cam: [LOGO_X, 150, d], look: [LOGO_X, 0, 0] };
}

function base(p, aspect, compact) {
  return {
    ...side(p, aspect, compact),
    u: 0, wall: 1, dim: 0,
    highlight: smooth(0.52, 0.58, p),
    info: p >= INFO_OPEN && p <= INFO_CLOSE,
  };
}

// Bore (Lewis, 28 September 2026): the camera moves straight in through the wall behind the logo,
// turns inside to look along the bore, and finds the matched pair about 1.9 m ahead. It is never
// driven along the pipeline, and never moves sideways while outside.
export function bore(pIn, aspect = 16 / 9, compact = false) {
  const p = clamp01(pIn);
  const pose = base(p, aspect, compact);
  if (p <= 0.12) return pose;
  const s0 = pose.cam;
  // Aimed at the logo on the way in, so the pipe stays centred; the view starts turning downstream
  // as the camera passes through the wall, so inside it opens onto the bore, not the far wall.
  const turn = smooth(0.3, 0.46, p);
  if (p <= 0.4) {
    const t = smooth(0.12, 0.4, p);
    pose.cam = [LOGO_X, lerp(150, 0, t), lerp(s0[2], 0, t)];
    pose.look = lerp3([LOGO_X, 0, 0], [LOGO_X + 2500, -60, 0], turn);
    return pose;
  }
  const hs = highlight.s;
  let x;
  if (p <= 0.55) x = lerp(LOGO_X, hs - 1900, smooth(0.4, 0.55, p));
  else if (p <= 0.8) x = lerp(hs - 1900, hs - 1700, (p - 0.55) / 0.25);
  else x = lerp(hs - 1700, hs - 1400, (p - 0.8) / 0.2);
  pose.cam = [x, -40 * smooth(0.4, 0.55, p), 0];
  const ahead = lerp3([x, 0, 0], [x + 2500, -60, 0], turn);
  const aim = smooth(0.48, 0.58, p) * (1 - smooth(0.72, 0.8, p));
  pose.look = lerp3(ahead, [hs, PAIR[1] * 0.7, PAIR[2] * 0.7], aim);
  pose.wall = 1 - smooth(0.8, 0.95, p);
  pose.dim = smooth(0.85, 1, p);
  return pose;
}
