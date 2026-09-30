// Copied from cga-redesign proto/pipe3d:prototypes/pipe3d/src/scene/pipespace.js (pipe3d prototype,
// 24 September 2026). Kept byte-identical below this header; change it here only with a reason.

// Pipe space -> world: the single mapping every layer of the scene goes through.
//
// Units mm. s axial (recent frame, minus the scene origin), a arc on the OD circumference from 12:00
// (clockwise looking downstream), r radial from the OD surface (outward +). u in [0, 1]: 0 is the
// pipe, 1 is the unrolled sheet. World at u = 0: +X downstream, 12:00 = +Y, 3:00 = +Z. At u = 1 the
// sheet faces +Z with s to the right and a running downward (12:00 top edge, 6:00 on y = 0), which is
// the Plotly joint view's layout (its y axis is reversed, drawn at scaleratio 1).
//
// The unbend is isometric: curvature (1 - u)/R about the 6:00 line, arc length preserved for every u.
// A rotation about the axis, also driven by u, turns the 6:00 face towards the unroll camera.

export function pipeToWorld(s, a, r, u, R, out = [0, 0, 0]) {
  const C = 2 * Math.PI * R;
  const t = a - C / 2;                 // arc from the 6:00 line
  const k = (1 - u) / R;               // curvature
  const phi = t * k;
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  const oneMinusCosOverK = k > 1e-12 ? (2 * Math.sin(phi / 2) ** 2) / k : 0;
  const sinOverK = k > 1e-12 ? sn / k : t;
  const y = -R + oneMinusCosOverK - r * c;
  const z = -sinOverK - r * sn;
  const th = -0.5 * Math.PI * u;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  out[0] = s;
  out[1] = y * ct - z * st;
  out[2] = y * st + z * ct;
  return out;
}

// Drawn radial offset from a profile [r0, rk, rg]: fixed mm, mm scaled by the radial exaggeration,
// and a multiple of the layer gap.
export function radial(rc, k, gap) {
  return rc[0] + k * rc[1] + gap * rc[2];
}

// The same test the skin's fragment shader uses to cut holes (pipeBody.js). wrap is true only while
// the pipe is closed (u = 0): an open sheet has a seam, and a feature placed beyond it hangs off the
// edge exactly as Plotly draws it in its grey band.
export function insideHole(s, a, hole, C, wrap) {
  if (s < hole.x1 || s > hole.x2) return false;
  const da = wrap ? (((a - hole.ya) % C) + C) % C : a - hole.ya;
  return da >= 0 && da <= hole.yb - hole.ya;
}

export function wrapArc(d, C) {
  return ((((d + C / 2) % C) + C) % C) - C / 2;
}

// Screen-space pin opacity from the feature's on-screen size in px: every feature stays findable
// from the three-joint overview, and the pin gets out of the way once the pocket itself is visible.
export function pinAlpha(px) {
  if (px <= 8) return 1;
  if (px >= 16) return 0;
  return (16 - px) / 8;
}
