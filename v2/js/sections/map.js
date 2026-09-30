// Footprint (plan section 1.3, item 5): the dot-matrix world map from v2/data/dotmap.json, and the
// countries from data/footprint.json (Lewis supplies and signs off). Until that file exists the
// section shows a visible [FIGURE NEEDED] notice; ?footprint=sample loads the review sample, marked
// as such. With motion the nodes light in order once the map is in view; without, they show.

import { equalEarth } from "../projection.js";

const NS = "http://www.w3.org/2000/svg";
const MISSING = "[FIGURE NEEDED: footprint data. data/footprint.json has not yet been supplied and signed off by Lewis, so no countries are shown.]";
const SAMPLE = "Sample data for review only: countries named on the current site's locations graphic, anchors approximate, no years. These are not FLI records.";

export async function mountMap({ gsap, reduced }) {
  const section = document.querySelector("[data-footprint]");
  if (!section) return;
  const land = section.querySelector(".footprint__land");
  const nodesG = section.querySelector(".footprint__nodes");
  const notice = section.querySelector("[data-footprint-notice]");
  const list = section.querySelector("[data-footprint-list]");

  const map = await fetch("data/dotmap.json").then((r) => r.json());
  land.setAttribute("d", map.dots.map(([x, y]) => `M${(x - 0.9).toFixed(1)} ${(y - 0.9).toFixed(1)}h1.8v1.8h-1.8z`).join(""));

  const sample = new URLSearchParams(window.location.search).get("footprint") === "sample";
  let data = null;
  try {
    const r = await fetch(sample ? "../data/footprint.sample.json" : "../data/footprint.json");
    if (r.ok) data = await r.json();
  } catch (e) { /* no data: the notice below says so */ }
  if (!data || !Array.isArray(data.countries) || !data.countries.length) {
    notice.textContent = MISSING;
    notice.hidden = false;
    return;
  }
  if (data.sample) {
    notice.textContent = SAMPLE;
    notice.hidden = false;
  }
  const countries = data.countries
    .map((c, i) => ({ ...c, i }))
    .sort((a, b) => (a.first_year ?? Infinity) - (b.first_year ?? Infinity) || a.i - b.i);
  const nodes = countries.map((c) => {
    const [x, y] = equalEarth(c.anchor[0], c.anchor[1], map);
    const g = document.createElementNS(NS, "g");
    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const halo = document.createElementNS(NS, "circle");
    halo.setAttribute("class", "halo");
    halo.setAttribute("r", "8");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", "3.6");
    g.append(halo, dot);
    nodesG.appendChild(g);
    const li = document.createElement("li");
    li.textContent = c.first_year ? `${c.country}, from ${c.first_year}` : c.country;
    list.appendChild(li);
    return g;
  });
  if (!reduced && gsap) {
    const inner = nodes.map((g) => g.children);
    gsap.set(inner, { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" });
    gsap.to(inner, {
      opacity: (i, el) => (el.classList.contains("halo") ? 0.5 : 1), scale: 1, duration: 0.6, ease: "back.out(2)", stagger: 0.06,
      scrollTrigger: { trigger: section.querySelector(".footprint__map"), start: "top 75%", once: true },
    });
  }
}
