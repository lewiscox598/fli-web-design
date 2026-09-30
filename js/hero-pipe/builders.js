// Copied from cga-redesign proto/pipe3d:prototypes/pipe3d/src/scene/builders.js (pipe3d prototype,
// 24 September 2026). Kept byte-identical below this header; change it here only with a reason.

// Pure pipe-space geometry builders. No three.js: each returns typed arrays, so every shape is
// unit-tested in node. Vertex layout PIPE5 = (s, a, r0, rk, rg); drawn radius offset
// r = r0 + k*rk + gap*rg (pipespace.radial).

export const PIPE5 = 5;
export const WALL_SHADE = 0.68;

function pushV(arr, s, a, rc) {
  arr.push(s, a, rc[0], rc[1], rc[2]);
  return arr.length / PIPE5 - 1;
}

// Grid over s in [s0, s1] and a in [a0, a1] at the radial profile rcAt(s, a). outward = true winds
// the triangles so the front face points to +r. uv carries (s, a) so a ray hit can be tested
// against the holes.
export function grid({ s0, s1, nS = 1, a0, a1, nA, rcAt, outward = true }) {
  const v = [];
  const uv = [];
  const index = [];
  for (let i = 0; i <= nS; i++) {
    const s = s0 + ((s1 - s0) * i) / nS;
    for (let j = 0; j <= nA; j++) {
      const a = a0 + ((a1 - a0) * j) / nA;
      pushV(v, s, a, rcAt(s, a));
      uv.push(s, a);
    }
  }
  const row = nA + 1;
  for (let i = 0; i < nS; i++) {
    for (let j = 0; j < nA; j++) {
      const p = i * row + j;
      const q = p + row;
      if (outward) index.push(p, p + 1, q, q, p + 1, q + 1);
      else index.push(p, q, p + 1, q, q + 1, p + 1);
    }
  }
  return { coords: new Float64Array(v), uv: new Float32Array(uv), index: new Uint32Array(index) };
}

// End face of a tube at s, from the outer profile to the inner. facing +1 points downstream (+X).
export function annulus({ s, a0, a1, nA, rcOut, rcIn, facing }) {
  const v = [];
  const index = [];
  for (let j = 0; j <= nA; j++) {
    const a = a0 + ((a1 - a0) * j) / nA;
    pushV(v, s, a, rcOut);
    pushV(v, s, a, rcIn);
  }
  for (let j = 0; j < nA; j++) {
    const o0 = 2 * j, i0 = 2 * j + 1, o1 = 2 * j + 2, i1 = 2 * j + 3;
    if (facing > 0) index.push(o0, o1, i0, i0, o1, i1);
    else index.push(o0, i0, o1, i0, i1, o1);
  }
  return { coords: new Float64Array(v), index: new Uint32Array(index) };
}

// Weld bead centred on s: height * cos^2 across 2 * halfWidth. The height is in fixed mm (r0), NOT
// scaled by the radial exaggeration: at 5x a scaled cap stood 12 mm proud and buried the weld-zone
// pits, and the data must always win over the realism. It sits on the surface it belongs to (base),
// which does move with the exaggeration. sign +1 is the cap (outward), -1 the root bead (into the bore).
export function weldBead({ s, halfWidth, height, nS = 8, a0, a1, nA, base, sign }) {
  return grid({
    s0: s - halfWidth, s1: s + halfWidth, nS, a0, a1, nA, outward: sign > 0,
    rcAt: (ss) => {
      const x = (ss - s) / halfWidth;
      const b = Math.cos(0.5 * Math.PI * x) ** 2;
      return [base[0] + sign * (0.05 + height * b), base[1], base[2]];
    },
  });
}

// A recessed pocket: floor at rcFloor, four walls up to the rim at rcTop. shade is 1 on the floor and
// WALL_SHADE on the walls, so an unlit fill still reads as a recess.
export function pocket({ x1, x2, ya, yb, rcTop, rcFloor, step = 8 }) {
  const nA = Math.max(2, Math.ceil((yb - ya) / step));
  const nS = Math.max(1, Math.ceil((x2 - x1) / 200));
  const v = [];
  const shade = [];
  const index = [];
  const add = (s, a, rc, sh) => { shade.push(sh); return pushV(v, s, a, rc); };
  const row = nA + 1;
  for (let i = 0; i <= nS; i++) {
    for (let j = 0; j <= nA; j++) add(x1 + ((x2 - x1) * i) / nS, ya + ((yb - ya) * j) / nA, rcFloor, 1);
  }
  for (let i = 0; i < nS; i++) {
    for (let j = 0; j < nA; j++) {
      const p = i * row + j;
      const q = p + row;
      index.push(p, p + 1, q, q, p + 1, q + 1);
    }
  }
  const rim = [];
  for (let j = 0; j <= nA; j++) rim.push([x1, ya + ((yb - ya) * j) / nA]);
  for (let i = 1; i <= nS; i++) rim.push([x1 + ((x2 - x1) * i) / nS, yb]);
  for (let j = nA - 1; j >= 0; j--) rim.push([x2, ya + ((yb - ya) * j) / nA]);
  for (let i = nS - 1; i >= 1; i--) rim.push([x1 + ((x2 - x1) * i) / nS, ya]);
  const w0 = v.length / PIPE5;
  for (const [s, a] of rim) {
    add(s, a, rcTop, WALL_SHADE);
    add(s, a, rcFloor, WALL_SHADE);
  }
  const n = rim.length;
  for (let k = 0; k < n; k++) {
    const t0 = w0 + 2 * k, b0 = t0 + 1;
    const t1 = w0 + 2 * ((k + 1) % n), b1 = t1 + 1;
    index.push(t0, t1, b0, b0, t1, b1);
  }
  return { coords: new Float64Array(v), shade: new Float32Array(shade), index: new Uint32Array(index) };
}

// Closed outline of a box in (s, a) at rc, subdivided along a so it hugs the curve. The last point
// repeats the first, so it draws as a THREE.Line (dashed materials need that).
export function rectOutline({ x1, x2, ya, yb, rc, step = 8 }) {
  const nA = Math.max(2, Math.ceil((yb - ya) / step));
  const v = [];
  for (let j = 0; j <= nA; j++) pushV(v, x1, ya + ((yb - ya) * j) / nA, rc);
  for (let j = nA; j >= 0; j--) pushV(v, x2, ya + ((yb - ya) * j) / nA, rc);
  pushV(v, x1, ya, rc);
  return { coords: new Float64Array(v) };
}

export function segment(p, q) {
  return { coords: new Float64Array([...p, ...q]) };
}

// Where a feature's rim, floor, outlines and pin sit. Recent features live in the wall; Previous 1
// floats on its own layer (outward for EXT, inward for INT) by the layer gap. out is the direction
// off the surface into open space. Depth is clamped to 95 percent of the wall so a pit never
// pierces the other skin.
export function featureProfile(f, wtJoint) {
  const isInt = f.int_ext === 'INT';
  const hasDepth = f.depth_mm != null;
  const d = hasDepth ? Math.min(f.depth_mm, 0.95 * wtJoint) : 0;
  const layer = f.run === 'Recent' ? 0 : isInt ? -1 : 1;
  const topRk = isInt ? -wtJoint : 0;
  const floorRk = isInt ? -wtJoint + d : 0 - d;   // 0 - d, not -d: a blank depth gives +0, equal to top
  const out = isInt ? -1 : 1;
  return {
    top: [0, topRk, layer],
    floor: [0, floorRk, layer],
    rim: [0.2 * out, topRk, layer],
    outline: [0.5 * out, topRk, layer],
    halo: [0.8 * out, topRk, layer],
    pin: [3 * out, topRk, layer],
    out,
    hasDepth,
  };
}
