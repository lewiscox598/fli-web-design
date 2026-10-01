// v3 Direction A, "Drawing office": glue between the page and drawing.js (directions section 2A).
// With motion: the sheet plots itself in drafting order (about 1.6 s), then the hero pins and scroll
// drives view(p): zoom into Detail A, the two runs, the cloud, the callout, revision C, and back out.
// Without motion (or without JavaScript) a.css shows the same end state and nothing pins.
// Nothing here changes the opacity of the h1, the lede or the button.

import { view, SHEET, chainageAt, formatChainage } from "./drawing.js";
import { prefersMotion, onReady } from "../../shared/motion.js";

const hero = document.querySelector("[data-hero]");
const svg = hero && hero.querySelector(".dwg");
const root = document.documentElement;
const r2 = (n) => Math.round(n * 100) / 100;
let box = { x: 0, y: 0, ...SHEET };

// --u: user units per screen pixel, so line weights and dash patterns hold in pixels at any zoom
function setUnit() {
  const w = svg.getBoundingClientRect().width;
  if (w) svg.style.setProperty("--u", (box.w / w).toFixed(4));
}

// ---- Partial drawing of a stroke. Solid lines use the dash offset; dashed lines keep their own
// pattern and are revealed by cutting the pattern short, so the dashes never slide.
// Measured once, before anything is written, so the reads never force a fresh style pass each.
const info = new Map();
function measureAll(els) {
  const u = parseFloat(getComputedStyle(svg).getPropertyValue("--u")) || 1;
  for (const el of els) {
    const len = el.dataset.sub ? Number(el.dataset.sub) : el.getTotalLength();
    const css = getComputedStyle(el).strokeDasharray;
    const pattern = css && css !== "none" ? css.split(/[\s,]+/).map(parseFloat).map((n) => n / u) : null;
    info.set(el, { len, pattern });
  }
}
const measure = (el) => info.get(el);
function partial(el, f) {
  const { len, pattern } = measure(el);
  if (f >= 1) { el.style.strokeDasharray = ""; el.style.strokeDashoffset = ""; return; }
  if (!pattern) {
    el.style.strokeDasharray = `${r2(len)} ${r2(len + 2)}`;
    el.style.strokeDashoffset = String(r2(len * (1 - Math.max(0, f))));
    return;
  }
  const u = box.w / (svg.getBoundingClientRect().width || 1);
  const end = Math.max(0, f) * len, out = [];
  let s = 0, i = 0;
  while (s < end && i < 4000) { const seg = Math.min(pattern[i % pattern.length] * u, end - s); out.push(r2(seg)); s += seg; i++; }
  if (out.length % 2 === 0) out.push(0);
  out.push(r2(len + 2));
  el.style.strokeDasharray = out.join(" ");
  el.style.strokeDashoffset = "0";
}

if (hero && svg) {
  setUnit();
  new ResizeObserver(setUnit).observe(svg);
  if (prefersMotion()) onReady(start);
}

function start(gsap) {
  const ScrollTrigger = window.ScrollTrigger;
  const q = (sel) => [...svg.querySelectorAll(sel)];
  measureAll(q(".plot"));
  hero.classList.add("motion");

  // ---- The scroll-driven parts, primed to their p = 0 state
  const run24 = svg.querySelector(".run-2024"), run19 = svg.querySelector(".run-2019");
  const loss = svg.querySelector(".fill-loss");
  const cloudLines = q(".cloud .plot"), cloudText = q(".cloud text");
  const calloutLine = q(".callout .plot"), calloutRest = q(".callout circle, .callout__text");
  const revLines = q(".rev-c .plot"), revText = q(".rev-c__text");
  const titleblock = hero.querySelector(".titleblock");
  const revField = hero.querySelector("[data-rev]");
  const scrollDriven = new Set([run24, run19, ...cloudLines, ...calloutLine, ...revLines]);

  // ---- Intro: the sheet plots itself in drafting order, then the lettering fades in
  // [lines, start (s), span (s)]: about 1.45 s in all, lettering included
  const groups = [
    [".frame .plot, .revtable > .plot", 0, 0.42],
    [".centre .plot", 0.24, 0.3],
    [".elevation .plot", 0.4, 0.42],
    [".section .plot, .legend .plot", 0.64, 0.34],
    [".detail .plot", 0.84, 0.34],
  ];
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  const introLines = new Set();
  for (const [sel, at, span] of groups) {
    const els = q(sel).filter((el) => !scrollDriven.has(el) && !introLines.has(el));
    els.forEach((el) => introLines.add(el));
    if (!els.length) continue;
    const solid = els.filter((el) => !measure(el).pattern), dashed = els.filter((el) => measure(el).pattern);
    const each = Math.max(0.18, span * 0.55), stagger = els.length > 1 ? (span - each) / (els.length - 1) : 0;
    solid.forEach((el) => partial(el, 0));
    if (solid.length) tl.to(solid, { strokeDashoffset: 0, duration: each, stagger }, at);
    const proxies = dashed.map((el) => ({ el, f: 0 }));
    proxies.forEach((pr) => partial(pr.el, 0));
    if (proxies.length) tl.to(proxies, { f: 1, duration: each, stagger, onUpdate() { this.targets().forEach((pr) => partial(pr.el, pr.f)); } }, at);
  }
  const fades = q(".fade");
  gsap.set(fades, { opacity: 0 });
  tl.to(fades, { opacity: 1, duration: 0.3, stagger: { amount: 0.15 }, ease: "power1.out" }, 1.0);
  tl.eventCallback("onComplete", () => {
    introLines.forEach((el) => partial(el, 1));
    window.__fliPlotDone = performance.now();
  });

  // ---- Scroll: view(p) on the drawing
  const flags = { callout: null, revision: null };
  const toggles = {
    callout: { f: 1, set: (f) => { calloutLine.forEach((el) => partial(el, f)); calloutRest.forEach((el) => (el.style.opacity = String(f))); } },
    revision: { f: 1, set: (f) => { revLines.forEach((el) => partial(el, f)); revText.forEach((el) => (el.style.opacity = String(f))); } },
  };
  function flip(name, on, instant) {
    if (flags[name] === on) return;
    flags[name] = on;
    const t = toggles[name];
    gsap.killTweensOf(t);
    if (instant) { t.f = on ? 1 : 0; t.set(t.f); }
    else gsap.to(t, { f: on ? 1 : 0, duration: on ? 0.55 : 0.25, ease: "power2.out", onUpdate: () => t.set(t.f) });
  }
  const note = hero.querySelector(".hero__note");
  function apply(p, instant = false) {
    const v = view(p);
    box = v.box;
    svg.setAttribute("viewBox", `${r2(box.x)} ${r2(box.y)} ${r2(box.w)} ${r2(box.h)}`);
    setUnit();
    partial(run24, v.profiles);
    partial(run19, v.profiles);
    loss.style.opacity = String(v.profiles);
    cloudLines.forEach((el) => partial(el, v.cloud));
    cloudText.forEach((el) => (el.style.opacity = String(v.cloud >= 1 ? 1 : 0)));
    flip("callout", v.callout, instant);
    flip("revision", v.revision, instant);
    if (note) note.style.opacity = v.callout ? "1" : "0";
    if (revField) revField.textContent = v.revision ? "C" : "B";
    titleblock.style.setProperty("--tb", String(v.titleBlock));
  }

  const headerH = () => document.querySelector(".site-header").offsetHeight;
  const fits = () => hero.offsetHeight <= window.innerHeight - headerH() + 1;
  root.classList.remove("js-motion");

  if (!fits()) {
    // A window too short for the pinned sheet: plot it, then show the end state without pinning
    apply(1, true);
    tl.play(0);
    return;
  }
  apply(0, true);
  const state = { p: 0 };
  const small = window.matchMedia("(max-width: 639.98px)");
  gsap.to(state, {
    p: 1, ease: "none",
    scrollTrigger: {
      trigger: hero, start: () => `top ${headerH()}px`, end: () => (small.matches ? "+=180%" : "+=220%"),
      pin: true, scrub: 0.6, invalidateOnRefresh: true,
    },
    onUpdate: () => {
      // Scrolling on during the intro finishes the plot at once, so nothing is half drawn at a zoom
      if (state.p > 0.02 && tl.progress() < 1) tl.progress(1);
      apply(state.p);
    },
  });
  tl.play(0);
  // A short wait for the fonts, then remeasure the pin
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  crosshair();
  belowTheHero(gsap);
}

// ---- Crosshair: fine pointers only, an overlay on the sheet; the system cursor stays
function crosshair() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const h = svg.querySelector(".crosshair__h"), v = svg.querySelector(".crosshair__v");
  const sheet = hero.querySelector(".sheet");
  const readout = hero.querySelector(".readout"), value = readout.querySelector("[data-readout]");
  svg.addEventListener("pointermove", (e) => {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    h.setAttribute("x1", r2(box.x)); h.setAttribute("x2", r2(box.x + box.w)); h.setAttribute("y1", r2(pt.y)); h.setAttribute("y2", r2(pt.y));
    v.setAttribute("y1", r2(box.y)); v.setAttribute("y2", r2(box.y + box.h)); v.setAttribute("x1", r2(pt.x)); v.setAttribute("x2", r2(pt.x));
    svg.classList.add("is-crosshair");
    const inElevation = pt.x >= 200 && pt.x <= 1400 && pt.y >= 96 && pt.y <= 290;
    readout.hidden = !inElevation;
    if (!inElevation) return;
    value.textContent = formatChainage(chainageAt(pt.x));
    const r = sheet.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const flipX = x > r.width - 190;
    readout.style.transform = `translate(${flipX ? x - 14 - readout.offsetWidth : x + 14}px, ${y + 14}px)`;
  });
  svg.addEventListener("pointerleave", () => { svg.classList.remove("is-crosshair"); readout.hidden = true; });
}

// ---- Below the hero: dimension lines draw out from their centres, thumbnails plot, once each
function belowTheHero(gsap) {
  for (const el of document.querySelectorAll(".dimline, .fig__dim")) {
    gsap.fromTo(el, { "--dim": 0 }, { "--dim": 1, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  }
  for (const thumb of document.querySelectorAll(".thumb")) {
    const paths = [...thumb.querySelectorAll(".plot")];
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = p.classList.contains("t-cl") ? "" : `${len} ${len + 2}`;
      p.style.strokeDashoffset = p.classList.contains("t-cl") ? "" : String(len);
    });
    const fills = thumb.querySelectorAll(".t-fill, .t-cl");
    gsap.set(fills, { opacity: 0 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: thumb, start: "top 85%", once: true } });
    tl.to(paths.filter((p) => !p.classList.contains("t-cl")), { strokeDashoffset: 0, duration: 0.7, stagger: 0.06, ease: "power2.inOut" });
    tl.to(fills, { opacity: 1, duration: 0.4 }, "-=0.3");
  }
}
