// Credentials marquee pause (WCAG 2.2.2): the marquee runs for more than five seconds, so it has
// its own button. It shares the page's pause state (html.motion-paused, stored as fli-v2-motion)
// with the hero's pause button. Hover and focus also pause it (CSS).

const KEY = "fli-v2-motion";

export function mountMarquee() {
  const btn = document.querySelector(".marquee__pause");
  if (!btn) return;
  const root = document.documentElement;
  let paused = false;
  try { paused = localStorage.getItem(KEY) === "paused"; } catch (e) { /* storage blocked */ }
  const sync = () => {
    root.classList.toggle("motion-paused", paused);
    btn.setAttribute("aria-pressed", String(paused));
    btn.textContent = paused ? "Play marquee" : "Pause marquee";
  };
  btn.addEventListener("click", () => {
    paused = !root.classList.contains("motion-paused");
    try { localStorage.setItem(KEY, paused ? "paused" : "playing"); } catch (e) { /* storage blocked */ }
    sync();
  });
  sync();
}
