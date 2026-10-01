// Direction C: the hero photo's mask as CSS inset() percentages. Pure, so it is unit-tested.
// open: 0 is a thin centred slit (an inspection aperture), 1 is full bleed. shrink: 0 is full bleed, 1 is the card.
export const SLIT = 3;
export const CARD = { top: 14, right: 6, bottom: 14, left: 52 };
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - Math.pow(1 - t, 3);

export function aperture(open, shrink) {
  const o = ease(clamp01(open)), s = ease(clamp01(shrink));
  const v = lerp(50 - SLIT, 0, o);
  return {
    top: lerp(v, CARD.top, s), right: lerp(0, CARD.right, s), bottom: lerp(v, CARD.bottom, s), left: lerp(0, CARD.left, s),
    radius: lerp(0, 12, s), scale: lerp(1.15, 1, o),
  };
}
