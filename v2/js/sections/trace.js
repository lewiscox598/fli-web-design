// The trace motif (plan section 1.4): a 1px teal line in the left margin that draws down as the
// page scrolls, with a small signal blip at each section start. It takes over from the hero's
// trace as the hero docks. aria-hidden; hidden below 900px (CSS); a full static line when motion
// is reduced.

const NS = "http://www.w3.org/2000/svg";
const BLIP = [[0, 0], [3, -4], [6, 5], [9, -8], [12, 3], [15, -2], [18, 0]];   // [dy, dx] along 18px

export function mountTrace({ gsap, ScrollTrigger, reduced }) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "trace-motif");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS(NS, "path");
  svg.appendChild(path);
  document.body.appendChild(svg);

  let length = 0;
  function build() {
    const h = Math.max(1, window.innerHeight - 64);
    const doc = document.documentElement.scrollHeight;
    const starts = [...document.querySelectorAll("main > .band")].map((s) => s.getBoundingClientRect().top + window.scrollY);
    const ys = starts.map((top) => Math.min(h - 20, Math.max(0, (top / doc) * h))).sort((a, b) => a - b);
    let d = "M6 0";
    for (const y of ys) {
      d += ` L6 ${y.toFixed(1)}`;
      for (const [dy, dx] of BLIP) d += ` L${6 + dx} ${(y + dy).toFixed(1)}`;
    }
    d += ` L6 ${h}`;
    svg.setAttribute("viewBox", `0 0 12 ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    path.setAttribute("d", d);
    length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
  }
  build();

  if (reduced || !gsap) {
    path.style.strokeDashoffset = "0";
    svg.style.opacity = "1";
    return;
  }
  const hero = document.querySelector(".hero");
  const draw = (progress) => { path.style.strokeDashoffset = String(length * (1 - progress)); };
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => draw(self.progress), onRefresh: (self) => { build(); draw(self.progress); } });
  if (hero) {
    // fade in as the hero's trace docks into the margin (hero progress 0.85 to 1)
    ScrollTrigger.create({
      trigger: hero, start: () => `top ${document.querySelector(".site-header").offsetHeight}px`, end: "bottom bottom",
      onUpdate: (self) => { svg.style.opacity = String(Math.max(0, (self.progress - 0.85) / 0.15)); },
      onLeave: () => { svg.style.opacity = "1"; },
      onEnterBack: (self) => { svg.style.opacity = String(Math.max(0, (self.progress - 0.85) / 0.15)); },
    });
  } else {
    svg.style.opacity = "1";
  }
  draw(0);
}
