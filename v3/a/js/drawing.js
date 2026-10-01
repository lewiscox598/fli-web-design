// Direction A: scroll progress (0 to 1) to the drawing's view. Pure, so it is unit-tested.
// Units are sheet units (the SVG viewBox). Detail A has the sheet's aspect ratio, so the zoom never stretches.
export const SHEET = { w: 1600, h: 1000 };
export const DETAIL = { x: 980, y: 300, w: 400, h: 250 };
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function view(p) {
  const zin = ease(clamp01((p - 0.15) / 0.3));
  const zout = ease(clamp01((p - 0.75) / 0.25));
  const t = zin * (1 - zout);
  return {
    box: { x: lerp(0, DETAIL.x, t), y: lerp(0, DETAIL.y, t), w: lerp(SHEET.w, DETAIL.w, t), h: lerp(SHEET.h, DETAIL.h, t) },
    profiles: clamp01((p - 0.4) / 0.15),
    cloud: clamp01((p - 0.55) / 0.1),
    callout: p >= 0.62,
    revision: p >= 0.65,
    titleBlock: clamp01((p - 0.85) / 0.15),
  };
}

// The elevation view spans x = 200 to 1400 and shows an illustrative 3 m of line.
const X0 = 200, X1 = 1400, M0 = 1283.0, M1 = 1286.0;
export const chainageAt = (x) => lerp(M0, M1, clamp01((x - X0) / (X1 - X0)));
export const formatChainage = (m) => `${m.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
