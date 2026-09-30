// Page glue for the v2 hero (plan section 1.3 and 1.5). Loaded by main.js only when motion is
// allowed and WebGL is wanted. Scroll drives the pose through ScrollTrigger; a pointer probes the
// field, and without a fine pointer an automatic scan does. A pause button stops the drift and
// the scan (WCAG 2.2.2). ?poster=1 renders p = 0 without chrome for v2/tools/render-poster.py.

import { makeRun, mostCritical } from "./data.js";
import { pose as poseAt } from "./timeline.js";
import { readout, callout } from "./format.js";
import { PointField } from "./field.js";

const PAUSE_KEY = "fli-v2-motion";

export function mountHero({ ScrollTrigger }) {
  const hero = document.querySelector(".hero");
  const stage = hero && hero.querySelector(".hero__stage");
  if (!hero || !stage) return;
  const params = new URLSearchParams(window.location.search);
  const posterMode = params.get("poster") === "1";
  if (posterMode) hero.classList.add("hero--poster");

  const lite = window.matchMedia("(max-width: 639.98px)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const run = makeRun({ count: lite ? 8000 : 30000 });
  const deepest = mostCritical(run);

  const canvas = document.createElement("canvas");
  canvas.className = "hero__canvas";
  stage.appendChild(canvas);
  const css = getComputedStyle(document.documentElement);
  const field = new PointField(canvas, {
    run, lite,
    colours: { canvas: css.getPropertyValue("--hero-canvas").trim(), data: css.getPropertyValue("--fli-teal").trim(), grey: "#7C8DA3", critical: css.getPropertyValue("--fli-orange").trim() },
  });
  field.resize();

  const title = hero.querySelector(".hero__copy");
  const readoutEl = hero.querySelector(".hero__readout");
  const calloutEl = hero.querySelector(".hero__callout");
  const pauseBtn = hero.querySelector(".hero__pause");
  const thresholdEl = hero.querySelector(".hero__threshold");
  const c = callout(run, deepest);
  calloutEl.querySelector("[data-callout=title]").textContent = c.title;
  calloutEl.querySelectorAll("[data-callout=line]").forEach((el, k) => { el.textContent = c.lines[k]; });
  calloutEl.querySelector("[data-callout=footer]").textContent = c.footer;

  let p = 0;
  let q = poseAt(0);
  let paused = false;
  try { paused = localStorage.getItem(PAUSE_KEY) === "paused"; } catch (e) { /* storage blocked */ }
  let inView = true;
  let pointer = null;          // CSS px within the stage, or null
  let t = 0;
  let frame = 0;
  let lastTick = 0;
  let ready = false;

  // Above the point if it fits, otherwise below: never over the band it labels.
  function placeAbove(el, x, y, gap) {
    const w = el.offsetWidth, h = el.offsetHeight, sw = stage.clientWidth, sh = stage.clientHeight;
    const left = Math.min(Math.max(x - w / 2, 12), sw - w - 12);
    let top = y - gap - h;
    if (top < 76) top = Math.min(y + gap, sh - h - 12);
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function place(el, x, y, gap) {
    const w = el.offsetWidth, h = el.offsetHeight, sw = stage.clientWidth, sh = stage.clientHeight;
    let left = x + gap;
    if (left + w > sw - 12) left = x - gap - w;
    left = Math.min(Math.max(left, 12), sw - w - 12);
    const top = Math.min(Math.max(y - h / 2, 76), sh - h - 12);
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function probePosition() {
    if (pointer) return field.toWorld(pointer[0], pointer[1]);
    // automatic scan: a slow Lissajous path across the field
    return [0.38 * field.width * Math.sin(0.23 * t), 0.36 * field.height * Math.sin(0.31 * t + 1.3)];
  }

  function draw() {
    frame = 0;
    const probing = q.probe && !posterMode && (pointer || !finePointer);
    const [wx, wy] = probing ? probePosition() : [99, 99];
    field.setTime(t, !paused && !posterMode);
    field.setProbe(wx, wy, probing);
    field.render();
    if (probing) {
      const i = field.nearest(wx, wy);
      readoutEl.querySelector("[data-readout=value]").textContent = readout(run, i);
      const [sx, sy] = field.toScreen(wx, wy);
      place(readoutEl, sx, sy, 18);
    }
    readoutEl.classList.toggle("is-on", probing);
    let showCallout = false;
    if (q.callout && !posterMode) {
      const [x, y] = field.pointAt(deepest);
      if (x <= field.sweepLineX()) {
        const [sx, sy] = field.toScreen(x, y);
        // above the band's top edge (band half-height is 9 percent of the scene height), not the point
        const [, bandTop] = field.toScreen(0, 0.09 * field.height * (1 - q.collapse) + Math.max(0, y) * q.collapse);
        placeAbove(calloutEl, sx, Math.min(sy, bandTop), 16);
        showCallout = true;
      }
    }
    calloutEl.classList.toggle("is-on", showCallout);
    // the threshold line: no value, no label (plan, illustrative data rules)
    const sweeping = q.sweep > 0 && q.sweep < 1 && !posterMode;
    if (sweeping) {
      const [lx, ly] = field.toScreen(field.sweepLineX(), 0);
      thresholdEl.style.transform = `translate(${Math.round(lx)}px, ${Math.round(ly)}px)`;
    }
    thresholdEl.classList.toggle("is-on", sweeping);
    title.style.opacity = String(q.headline);
    title.style.transform = `translateY(${(-(1 - q.headline) * 3).toFixed(2)}rem)`;
    hero.style.setProperty("--hero-dock", String(q.dock));
    if (!ready) { ready = true; hero.classList.add("hero3d-ready"); }
  }
  function request() { if (!frame) frame = requestAnimationFrame(draw); }

  // Drift and scan tick at 30 fps while there is something to move and nobody asked it to stop.
  function tick(now) {
    const moving = !paused && !posterMode && inView && !document.hidden && q.gather < 1;
    if (!moving) { lastTick = 0; return; }
    if (now - lastTick >= 33) {
      t += lastTick ? (now - lastTick) / 1000 : 0;
      lastTick = now;
      draw();
    }
    requestAnimationFrame(tick);
  }
  function startTicking() { requestAnimationFrame(tick); }

  function apply(progress) {
    p = progress;
    const before = q.gather < 1;
    q = poseAt(p);
    field.setPose(q);
    request();
    if (!before && q.gather < 1) startTicking();
  }

  if (!posterMode) {
    ScrollTrigger.create({
      trigger: hero,
      start: () => `top ${document.querySelector(".site-header").offsetHeight}px`,
      end: "bottom bottom",
      onUpdate: (self) => apply(self.progress),
      invalidateOnRefresh: true,
    });
    if (finePointer) {
      hero.addEventListener("pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        pointer = [e.clientX - r.left, e.clientY - r.top];
        request();
      });
      hero.addEventListener("pointerleave", () => { pointer = null; request(); });
    }
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) startTicking();
    }).observe(hero);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) startTicking(); });

    const syncPause = () => {
      pauseBtn.setAttribute("aria-pressed", String(paused));
      pauseBtn.textContent = paused ? "Play motion" : "Pause motion";
      document.documentElement.classList.toggle("motion-paused", paused);   // the marquee follows it
    };
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      try { localStorage.setItem(PAUSE_KEY, paused ? "paused" : "playing"); } catch (e) { /* storage blocked */ }
      syncPause();
      if (!paused) startTicking();
      request();
    });
    syncPause();
  }

  new ResizeObserver(() => { field.resize(); field.setPose(q); request(); }).observe(stage);
  field.setPose(q);
  draw();
  startTicking();
}
