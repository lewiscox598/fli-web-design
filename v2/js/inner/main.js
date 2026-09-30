// Inner pages (v2): theme toggle, footer clock, case-study filters, and motion. The homepage keeps
// v2/js/main.js; this file never loads the hero.
//
// Motion (plan section 5): the margin trace on every page (the homepage's v2/js/sections/trace.js),
// SplitText on the page title, reveals, and at most one mechanism per page, declared in the markup
// with data-motion: "locator-zoom" (case studies), "stage-draw" (service pages) or "reading-trace"
// (articles). The markup is the final state: without JavaScript, and under reduced motion, nothing
// here changes it (the trace is drawn in full and static).
import { mountClock } from "../sections/clock.js";
import { mountTrace } from "../sections/trace.js";

// Theme: dark by default; the footer toggle opts into light and remembers it (as v2/js/main.js).
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

mountClock();

// Case-study filters: buttons, not inputs. Hidden without JavaScript, so every card shows.
const group = document.querySelector("[data-filters]");
const list = document.querySelector("[data-filter-list]");
if (group && list) {
  const buttons = [...group.querySelectorAll("[data-filter]")];
  const cards = [...list.children];
  const status = document.createElement("p");
  status.className = "inner-filters__status";
  status.setAttribute("role", "status");
  group.after(status);
  const apply = (key) => {
    let shown = 0;
    for (const card of cards) {
      const on = key === "all" || card.dataset.services.split(" ").includes(key);
      card.hidden = !on;
      if (on) shown++;
    }
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.filter === key));
    status.textContent = `Showing ${shown} of ${cards.length} case studies`;
  };
  buttons.forEach((b) => b.addEventListener("click", () => apply(b.dataset.filter)));
  group.hidden = false;
  apply("all");
}

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const { gsap, ScrollTrigger, SplitText } = window;

if (reduced || !(gsap && ScrollTrigger && SplitText)) {
  mountTrace({ reduced: true });
} else {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  root.classList.add("motion");
  mountTrace({ gsap, ScrollTrigger, reduced: false });

  // Page title: masked lines rise once. SplitText's default aria handling keeps the heading's
  // accessible name (aria-label on the h1, the line spans aria-hidden), as on the homepage.
  document.fonts.ready.then(() => {
    SplitText.create(".inner-hero__title", {
      type: "lines", mask: "lines", autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out" }),
    });
  });

  // Reveals: each section's content rises once as it enters.
  for (const el of document.querySelectorAll("[data-reveal]")) {
    gsap.from(el, { y: 24, opacity: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  }

  const mechanism = document.querySelector("[data-motion]:not([data-motion='trace'])");
  const kind = mechanism && mechanism.dataset.motion;

  if (kind === "locator-zoom") {
    // From the whole map to the region box the markup ships with; it stops at the region.
    const svg = mechanism.querySelector("svg");
    const to = svg.getAttribute("viewBox").split(" ").map(Number);
    const from = mechanism.dataset.full.split(" ").map(Number);
    const box = { x: from[0], y: from[1], w: from[2], h: from[3] };
    const set = () => svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
    set();
    gsap.to(box, { x: to[0], y: to[1], w: to[2], h: to[3], duration: 1.8, ease: "expo.inOut", onUpdate: set, scrollTrigger: { trigger: mechanism, start: "top 80%", once: true } });
  }

  if (kind === "stage-draw") {
    // The stage line draws with scroll; each stage lights as the line reaches it.
    mechanism.style.setProperty("--draw", "0");
    ScrollTrigger.create({ trigger: mechanism, start: "top 75%", end: "bottom 60%", scrub: true, onUpdate: (self) => mechanism.style.setProperty("--draw", self.progress.toFixed(3)) });
    for (const stage of mechanism.querySelectorAll("[data-stage]")) {
      gsap.from(stage, { opacity: 0.25, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: stage, start: "top 70%", once: true } });
    }
  }

  if (kind === "reading-trace") {
    // A thin teal line under the header shows how far through the article the reader is.
    const bar = document.createElement("div");
    bar.className = "reading-trace";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    ScrollTrigger.create({ trigger: mechanism, start: "top 4rem", end: "bottom bottom", onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress.toFixed(4)})`; } });
  }
}
