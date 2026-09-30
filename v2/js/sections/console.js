// Console figures: each digit rolls once to its sourced value as the figure scrolls into view.
// The real figure stays in the markup as visually hidden text; the rolling columns are aria-hidden.
// Without motion (reduced motion, no JS) the plain figure shows.

import { odometerColumns } from "../odometer.js";

export function mountConsole({ gsap }) {
  document.querySelectorAll("[data-odometer]").forEach((dd) => {
    const text = dd.textContent.trim();
    const wrap = document.createElement("span");
    wrap.className = "odo";
    wrap.setAttribute("aria-hidden", "true");
    const strips = [];
    for (const c of odometerColumns(text)) {
      if (c.type === "sep") {
        const s = document.createElement("span");
        s.className = "odo__sep";
        s.textContent = c.value;
        wrap.appendChild(s);
        continue;
      }
      const col = document.createElement("span");
      col.className = "odo__col";
      const strip = document.createElement("span");
      strip.className = "odo__strip";
      for (let d = 0; d <= 9; d++) {
        const n = document.createElement("span");
        n.textContent = String(d);
        strip.appendChild(n);
      }
      col.appendChild(strip);
      wrap.appendChild(col);
      strips.push([strip, c.value]);
    }
    const label = document.createElement("span");
    label.className = "visually-hidden";
    label.textContent = text;
    dd.textContent = "";
    dd.append(wrap, label);
    strips.forEach(([strip, v], k) => {
      gsap.fromTo(strip, { yPercent: 0 }, {
        yPercent: -10 * v, duration: 1.6 + k * 0.12, ease: "expo.out",
        scrollTrigger: { trigger: dd, start: "top 88%", once: true },
      });
    });
  });
}
