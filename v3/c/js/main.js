// v3 Direction C, "Steel, close up": glue between the page and aperture.js (directions section 2C).
// On load the hero photo opens once from a thin horizontal slit to full bleed (1.4 s), settling from
// 115% to 100% scale, while the headline (on screen from first paint) settles into place. From
// 640px up the hero then pins for +=160% and the scroll shrinks the photo into a framed card on the
// right half, while the lede and the button hold the left half. Below 640px there is no shrink and
// no pin (a pin with nothing moving would only hold the page still). The photo bands below open
// through a clip-path as they enter, once. Without motion, or without JavaScript, the markup's
// state stands: the photo full bleed and nothing pinned.

import { aperture } from "./aperture.js";
import { prefersMotion, onReady } from "../../shared/motion.js";

const root = document.documentElement;
const hero = document.querySelector("[data-hero]");

if (hero && prefersMotion()) onReady(start);
else root.classList.remove("js-motion");

function start(gsap) {
  const ScrollTrigger = window.ScrollTrigger;
  const title = hero.querySelector("[data-split]");
  const state = { open: 0, shrink: 0 };
  const pct = (n) => `${Math.round(n * 1000) / 1000}%`;

  // ---- Write the aperture into the hero's custom properties
  function apply() {
    const a = aperture(state.open, state.shrink);
    const s = hero.style;
    s.setProperty("--t", pct(a.top));
    s.setProperty("--r", pct(a.right));
    s.setProperty("--b", pct(a.bottom));
    s.setProperty("--l", pct(a.left));
    s.setProperty("--rad", `${Math.round(a.radius * 10) / 10}px`);
    // The photo settles from 115% to 100% as it opens, then moves in a little closer inside the card
    s.setProperty("--sc", (a.scale * (1 + 0.08 * state.shrink)).toFixed(4));
    s.setProperty("--op", state.open.toFixed(4));
    s.setProperty("--sh", state.shrink.toFixed(4));
    // The scrim stays at full strength while any of the photo is under the copy, then fades
    s.setProperty("--scrim-o", Math.min(1, Math.max(0, (0.85 - state.shrink) / 0.25)).toFixed(3));
  }
  apply();

  // ---- The headline is on screen from first paint (never hidden); it settles 0.12em into place
  // with the photo, from the offset c.css gave it before first paint
  if (title) gsap.fromTo(title, { y: "0.12em" }, { y: 0, duration: 1.4, ease: "expo.out", delay: 0.2 });
  // From here main.js owns the hero: lift the pre-paint slit and its 3 s fallback
  root.classList.remove("js-motion");

  // ---- On load: the aperture opens once
  const opening = gsap.to(state, {
    open: 1, duration: 1.4, ease: "expo.inOut", onUpdate: apply,
    onComplete: () => { window.__fliPlotDone = performance.now(); },
  });

  // ---- On scroll, from 640px up: pin the hero and shrink the photo into the card
  const headerH = () => document.querySelector(".site-header").offsetHeight;
  const mm = gsap.matchMedia();
  mm.add("(min-width: 640px)", () => {
    const fits = () => hero.offsetHeight <= window.innerHeight - headerH() + 1;
    if (!fits()) return;
    gsap.to(state, {
      shrink: 1, ease: "none",
      scrollTrigger: {
        trigger: hero, start: () => `top ${headerH()}px`, end: "+=160%",
        pin: true, scrub: 0.5, invalidateOnRefresh: true, refreshPriority: 1,
      },
      onUpdate() {
        // Scrolling during the opening finishes it at once: the shrink starts from a fully open photo
        if (state.shrink > 0.002 && opening.progress() < 1) opening.progress(1);
        apply();
      },
    });
    return () => { state.shrink = 0; apply(); };
  });

  // ---- The photo bands: open once as they enter (a slit for the cracks, a widening circle for the bore)
  for (const band of document.querySelectorAll("[data-band]")) {
    const photo = band.querySelector(".band__photo");
    const img = photo.querySelector("img");
    const circle = band.dataset.band === "bore";
    const from = circle ? "circle(0% at 50% 50%)" : "inset(48% 0% 48% 0%)";
    const to = circle ? "circle(75% at 50% 50%)" : "inset(0% 0% 0% 0%)";
    const tl = gsap.timeline({ scrollTrigger: { trigger: band, start: "top 78%", once: true } });
    tl.fromTo(photo, { clipPath: from }, { clipPath: to, duration: 1.3, ease: "expo.out" })
      .fromTo(img, { scale: 1.15 }, { scale: 1, duration: 1.6, ease: "expo.out" }, 0);
  }

  // A short wait for the fonts, then remeasure the pin
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
}
