// v2 entry. Page-wide behaviour lives here; each section's behaviour is its own module.

import { mountStatement } from "./sections/statement.js";
import { mountConsole } from "./sections/console.js";
import { mountTrace } from "./sections/trace.js";
import { mountStages } from "./sections/stages.js";
import { mountFlow } from "./sections/flow.js";
import { mountMap } from "./sections/map.js";
import { mountClock } from "./sections/clock.js";
import { mountMarquee } from "./sections/marquee.js";

// Theme: dark by default (D4); the footer toggle opts into light and remembers it.
const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");
function syncToggle() {
  const light = root.getAttribute("data-theme") === "light";
  toggle.setAttribute("aria-pressed", String(light));
  toggle.textContent = light ? "Dark scheme" : "Light scheme";
}
if (toggle) {
  toggle.addEventListener("click", () => {
    const light = root.getAttribute("data-theme") !== "light";
    if (light) root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    try { localStorage.setItem("fli-v2-theme", light ? "light" : "dark"); } catch (e) { /* storage blocked */ }
    syncToggle();
  });
  syncToggle();
}

// Motion: everything below runs only when the visitor allows motion. Under reduced motion (and
// without JavaScript) every section already shows its final state from the CSS.
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const { gsap, ScrollTrigger, SplitText } = window;
const params = new URLSearchParams(window.location.search);

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

if (!reduced && gsap && ScrollTrigger && SplitText) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  root.classList.add("motion");

  // Hero headline: masked lines rise once on load. SplitText's default aria handling keeps the
  // heading's accessible name (aria-label on the h1, the line spans aria-hidden).
  const hero = document.querySelector(".hero");
  if (hero && params.get("poster") !== "1") {
    document.fonts.ready.then(() => {
      SplitText.create(".hero__title", {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.1, stagger: 0.09, ease: "expo.out" }),
      });
      gsap.from(".hero__lede", { y: 18, opacity: 0, duration: 1, delay: 0.35, ease: "expo.out" });
    });
  }

  mountStatement({ gsap, SplitText });
  mountConsole({ gsap });
  mountStages({ gsap });
  mountFlow({ gsap });
  mountMap({ gsap, reduced: false });
  mountMarquee();
  mountTrace({ gsap, ScrollTrigger, reduced: false });

  const wantGl = params.get("webgl") !== "0";
  if (wantGl && !webglAvailable()) {
    const hero = document.querySelector(".hero");
    if (hero) hero.dataset.heroError = "WebGL unavailable";
    console.error("v2 hero: WebGL is unavailable; showing the poster.");
  }
  if (wantGl && webglAvailable()) {
    // The poster stays if the 3D cannot start; say why, rather than failing silently.
    import("./hero/mount.js").then((m) => m.mountHero({ gsap, ScrollTrigger })).catch((e) => {
      const hero = document.querySelector(".hero");
      if (hero) hero.dataset.heroError = String((e && e.message) || e);
      console.error("v2 hero: the 3D could not start; showing the poster.", e);
    });
  }
}

if (reduced || !(gsap && ScrollTrigger && SplitText)) {
  if (reduced) mountTrace({ reduced: true });
  mountMap({ reduced: true });
}
mountClock();
