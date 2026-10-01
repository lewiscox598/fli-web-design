export const prefersMotion = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export function onReady(fn) {
  const go = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    window.gsap.registerPlugin(window.ScrollTrigger);
    fn(window.gsap);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go, { once: true });
  else go();
}
