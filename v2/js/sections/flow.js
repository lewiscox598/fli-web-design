// What clients move: the split bar's segments grow from the left once in view. The bar and the
// legend carry the figures as text; without motion the bar shows its final state.

export function mountFlow({ gsap }) {
  const bar = document.querySelector("[data-flow]");
  if (!bar) return;
  gsap.from(bar.querySelectorAll(".flow__seg"), {
    scaleX: 0, duration: 1.3, stagger: 0.14, ease: "expo.out",
    scrollTrigger: { trigger: bar, start: "top 85%", once: true },
  });
}
