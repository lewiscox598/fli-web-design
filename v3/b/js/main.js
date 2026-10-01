// v3 Direction B, "Run A / Run B": glue between the page and runs.js (directions section 2B).
// The visitor operates the comparison: an axis (role="slider") across two runs' wall-loss strips,
// moved by pointer (mouse, pen or touch, with pointer capture) or by the arrow keys. The readout
// shows observations only: KP, clock position, the two depths and the change, beside "Illustrative data".
// With motion: the axis sweeps once from the left and stops on the matched feature (1.4 s), and on
// scroll the strips compress into a thin band (a scrub, no pin). Without motion, or without
// JavaScript, the markup's state stands: the axis on the matched feature.

import { SPAN, MATCH, makeRuns, profile, readout, step, formatKp } from "./runs.js";
import { prefersMotion, onReady } from "../../shared/motion.js";

const N = 900;          // samples per profile
const MAXD = 25;        // % wt at the top of a strip
const root = document.querySelector("[data-runs]");

if (root) init();

function init() {
  const features = makeRuns(7);
  const runs = { 2019: profile(features, "2019", N), 2024: profile(features, "2024", N) };
  const plot = root.querySelector("[data-plot]");
  const axis = root.querySelector("[role=slider]");
  const cells = Object.fromEntries([...root.querySelectorAll("[data-r]")].map((el) => [el.dataset.r, el]));
  const html = document.documentElement;

  // ---- The paths, from the profiles (the markup carries the same paths for the no-JS state)
  for (const path of root.querySelectorAll("[data-run]")) path.setAttribute("d", pathD(runs[path.dataset.run]));

  // ---- State
  const span = SPAN.to - SPAN.from;
  const frac = (k) => (k - SPAN.from) / span;
  const round = (k) => Math.min(SPAN.to, Math.max(SPAN.from, Math.round(k * 1000) / 1000));
  const depthAt = (arr, k) => {
    const t = frac(k) * (N - 1), i = Math.floor(t), f = t - i;
    return arr[i] * (1 - f) + arr[Math.min(N - 1, i + 1)] * f;
  };
  let kp = MATCH.kp;

  function render(k) {
    kp = k;
    const r = readout(features, k);
    root.style.setProperty("--x", frac(k).toFixed(5));
    root.style.setProperty("--d19", (Math.min(depthAt(runs[2019], k), MAXD) / MAXD).toFixed(4));
    root.style.setProperty("--d24", (Math.min(depthAt(runs[2024], k), MAXD) / MAXD).toFixed(4));
    root.dataset.state = r ? "feature" : "none";
    const at = formatKp(k);
    cells.kp.textContent = at;
    cells.tag.textContent = at;
    if (r) {
      cells.clock.textContent = r.clock;
      cells.d2019.textContent = `${r.d2019}% wt`;
      cells.d2024.textContent = `${r.d2024}% wt`;
      cells.change.textContent = `${r.change > 0 ? "+" : ""}${r.change}% wt`;
      root.style.setProperty("--c", String(Math.max(0, r.change)));
      axis.setAttribute("aria-valuetext", `${at}, ${r.clock}, ${r.d2019}% wt in 2019, ${r.d2024}% wt in 2024`);
    } else {
      cells.clock.textContent = "No feature";
      cells.d2019.textContent = "–";
      cells.d2024.textContent = "–";
      cells.change.textContent = "–";
      axis.setAttribute("aria-valuetext", `${at}, no feature`);
    }
    axis.setAttribute("aria-valuenow", String(k));
  }

  // ---- The sweep, if one is running, stops as soon as the visitor takes the axis
  let sweep = null;
  const takeOver = () => { if (sweep) { sweep.kill(); sweep = null; } };

  // ---- Keyboard: arrows step 5 m, Shift (or Page Up/Down) 100 m, Home and End go to the ends
  axis.addEventListener("keydown", (e) => {
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = step(kp, 1, e.shiftKey);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = step(kp, -1, e.shiftKey);
    else if (e.key === "PageUp") next = step(kp, 1, true);
    else if (e.key === "PageDown") next = step(kp, -1, true);
    else if (e.key === "Home") next = SPAN.from;
    else if (e.key === "End") next = SPAN.to;
    if (next === null) return;
    e.preventDefault();
    takeOver();
    render(next);
  });

  // ---- Pointer: x across the plot maps to KP. The axis takes the pointer at once (with capture);
  // the strips take a mouse or pen at once, and a touch only once it moves sideways, so a vertical
  // swipe over the strips still scrolls the page (touch-action: pan-y).
  const kpAt = (clientX) => {
    const b = plot.getBoundingClientRect();
    return round(SPAN.from + Math.min(1, Math.max(0, (clientX - b.left) / b.width)) * span);
  };
  let drag = null;
  function begin(el, e) {
    takeOver();
    drag = { el, id: e.pointerId };
    try { el.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer has nothing to capture */ }
    root.classList.add("is-dragging");
    render(kpAt(e.clientX));
  }
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    try { drag.el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    drag = null;
    root.classList.remove("is-dragging");
  }
  // The handle: the axis column, and the KP tag that rides it over the scale
  const tag = root.querySelector(".axis__tag");
  const handles = [axis, tag];
  for (const h of handles) h.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    if (e.pointerType === "mouse") e.preventDefault();   // no text selection; focus is given below
    axis.focus({ preventScroll: true });
    begin(h, e);
  });
  let pending = null;
  plot.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    if (e.pointerType === "touch") { pending = { id: e.pointerId, x: e.clientX, y: e.clientY }; return; }
    e.preventDefault();
    axis.focus({ preventScroll: true });
    begin(plot, e);
  });
  for (const el of [...handles, plot]) {
    el.addEventListener("pointermove", (e) => {
      if (drag && e.pointerId === drag.id) { render(kpAt(e.clientX)); return; }
      if (el === plot && pending && e.pointerId === pending.id) {
        const dx = e.clientX - pending.x, dy = e.clientY - pending.y;
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { pending = null; begin(plot, e); }
        else if (Math.abs(dy) > 8) pending = null;
      }
    });
    el.addEventListener("pointerup", (e) => {
      // A tap on the strips (no sideways drag, no scroll) moves the axis there
      if (el === plot && pending && e.pointerId === pending.id) { pending = null; takeOver(); render(kpAt(e.clientX)); return; }
      end(e);
    });
    el.addEventListener("pointercancel", (e) => { pending = null; end(e); });
    el.addEventListener("lostpointercapture", end);
  }
  // A faint line follows a fine pointer over the strips (the system cursor stays)
  if (window.matchMedia("(pointer: fine)").matches) {
    plot.addEventListener("pointermove", (e) => {
      const b = plot.getBoundingClientRect();
      plot.style.setProperty("--gx", `${Math.round(e.clientX - b.left)}px`);
      plot.classList.add("is-hover");
    });
    plot.addEventListener("pointerleave", () => plot.classList.remove("is-hover"));
  }

  render(kp);

  // ---- Motion: the sweep and the scroll compression (gsap and ScrollTrigger, loaded with defer)
  if (!prefersMotion()) return;
  onReady((gsap) => {
    const ScrollTrigger = window.ScrollTrigger;
    // The sweep: once, from the left, to the matched feature
    const proxy = { kp: SPAN.from };
    render(SPAN.from);
    html.classList.remove("js-motion");
    sweep = gsap.to(proxy, {
      kp: MATCH.kp, duration: 1.4, ease: "power3.out", delay: 0.2,
      onUpdate: () => render(round(proxy.kp)),
      onComplete: () => { render(MATCH.kp); sweep = null; window.__fliPlotDone = performance.now(); },
    });

    // The compression: the strips flatten into a thin band as the hero scrolls away. No pin.
    const headerH = () => document.querySelector(".site-header").offsetHeight;
    const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
    // It starts once the strips are in the upper part of the window, so on a phone (where they sit
    // below the fold) they are read at full height first, and it ends as their top meets the header.
    const start = () => Math.max(0, docTop(plot) - headerH() - window.innerHeight * 0.25);
    gsap.fromTo(plot, { scaleY: 1 }, {
      scaleY: 0.06, ease: "none",
      scrollTrigger: {
        id: "runs-compress", trigger: plot, scrub: 0.5, invalidateOnRefresh: true,
        start, end: () => Math.max(start() + 120, docTop(plot) - headerH() + plot.offsetHeight * 0.5),
        onUpdate: (self) => root.style.setProperty("--k", self.progress.toFixed(3)),
      },
    });
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  });
  // gsap failed to load: show the axis where the markup put it
  window.addEventListener("load", () => {
    if (!window.gsap) html.classList.remove("js-motion");
  });
}

// Profile (depth in % wt along the span) to an SVG path in a 1000 x 100 box: depth 0 at the bottom,
// MAXD at the top. Flat runs at the same depth are written as one segment.
function pathD(arr) {
  const n = arr.length, pts = [];
  for (let i = 0; i < n; i++) pts.push([Math.round((i / (n - 1)) * 10000) / 10, Math.round((100 - (Math.min(arr[i], MAXD) / MAXD) * 100) * 10) / 10]);
  const keep = pts.filter((p, i) => i === 0 || i === n - 1 || !(pts[i - 1][1] === p[1] && pts[i + 1][1] === p[1]));
  return "M" + keep.map(([x, y]) => `${x} ${y}`).join("L");
}
