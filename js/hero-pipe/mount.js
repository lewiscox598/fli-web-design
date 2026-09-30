// Page glue for the pipe hero (spec section 3). Loaded by js/hero.js only when motion is allowed and
// WebGL is wanted. Creates the canvas and PipeHero, feeds it scroll progress (one render per
// animation frame), and marks the hero ready after the first frame.

import { PipeHero } from "./scene.js";
import { highlight, infoFor } from "./features.js";

const FLI = window.FLI;
const hero = document.querySelector(".hero");
const stage = hero && hero.querySelector(".hero__stage");

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

function colours() {
  const css = getComputedStyle(document.documentElement);
  const t = (name) => css.getPropertyValue(name).trim();
  return {
    coating: t("--navy-line"),      // #3E5268, spec section 4 (D1, option a)
    steel: "#8E969E",
    weld: "#A9B0B7",
    teal: t("--fli-teal"),
    orange: t("--fli-orange"),
    navy: t("--fli-navy"),
    white: t("--white"),
    muted: t("--navy-muted"),
    deep: t("--navy-deep"),
  };
}

// The header logo carries the same brand paths the hero used to inline.
function logoPaths() {
  return [...document.querySelectorAll(".site-header__logo svg path")].map((p) => {
    const g = p.closest("g");
    const cls = g ? g.getAttribute("class") : "";
    return { d: p.getAttribute("d"), part: cls.includes("frontline") ? "frontline" : cls.includes("integrity") ? "integrity" : "lines" };
  });
}

if (FLI && FLI.heroPipe && stage && webglAvailable()) start();

function start() {
  const gl = document.createElement("div");
  gl.className = "hero__gl";
  const canvas = document.createElement("canvas");
  canvas.className = "hero__canvas";
  gl.appendChild(canvas);
  stage.appendChild(gl);

  // ?poster=1 renders p = 0 without page chrome for tools/render-poster.py; ?nologo=1 also drops
  // the logo so the script can measure the logo's rendered contrast against the bare coating.
  const params = new URLSearchParams(window.location.search);
  const posterMode = params.get("poster") === "1";
  if (posterMode) hero.classList.add("hero--poster");
  const lite = window.matchMedia("(max-width: 639.98px)").matches;
  const scene = new PipeHero(canvas, {
    mode: FLI.heroPipe.mode, colours: colours(), lite,
    logo: posterMode && params.get("nologo") === "1" ? [] : logoPaths(),
  });
  const info = hero.querySelector(".hero-info");
  if (info) {
    const text = infoFor(highlight);
    info.querySelectorAll("[data-info]").forEach((el) => { el.textContent = text[el.getAttribute("data-info")]; });
  }
  const GAP = 28;
  const EDGE = 16;
  function placeInfo(pose) {
    if (!info) return;
    const a = scene.anchor();
    const open = pose.info && a.visible;
    info.classList.toggle("is-open", open);
    if (!open) return;
    const w = info.offsetWidth;
    const h = info.offsetHeight;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const clampX = (x) => Math.min(Math.max(x, EDGE), sw - w - EDGE);
    const clampY = (y) => Math.min(Math.max(y, EDGE), sh - h - EDGE);
    // Beside the pair if it fits (right, then left), otherwise below or above it: never on it.
    let x, y;
    if (a.right + GAP + w <= sw - EDGE) { x = a.right + GAP; y = clampY(a.y - h / 2); }
    else if (a.left - GAP - w >= EDGE) { x = a.left - GAP - w; y = clampY(a.y - h / 2); }
    else if (a.bottom + GAP + h <= sh - EDGE) { x = clampX(a.x - w / 2); y = a.bottom + GAP; }
    else { x = clampX(a.x - w / 2); y = clampY(a.top - GAP - h); }
    info.style.setProperty("--info-x", `${Math.round(x)}px`);
    info.style.setProperty("--info-y", `${Math.round(y)}px`);
  }
  let latest = posterMode ? 0 : FLI.heroPipe.progress;
  let frame = 0;
  let ready = false;

  function draw() {
    frame = 0;
    const pose = scene.setProgress(latest);
    placeInfo(pose);
    hero.style.setProperty("--hero-scene", (1 - pose.dim).toFixed(3));
    if (!ready) {
      ready = true;
      hero.classList.add("hero3d-ready");
    }
  }
  function request() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  if (!posterMode) FLI.heroPipe.listeners.push((p) => { latest = p; request(); });
  new ResizeObserver(() => { scene.resize(); request(); }).observe(stage);
  scene.resize();
  draw();
}
