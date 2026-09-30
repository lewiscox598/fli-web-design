// Statement and section headings: masked line reveals on entry (SplitText keeps each heading's
// accessible name), and headings widen subtly on entry (Mona Sans wdth 100 to 112). Only runs
// when motion is allowed; otherwise the CSS final state (wdth 100) stands.

export function mountStatement({ gsap, SplitText }) {
  document.querySelectorAll("[data-reveal-lines]").forEach((el) => {
    SplitText.create(el, {
      type: "lines", mask: "lines", autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 105, duration: 1.1, stagger: 0.08, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      }),
    });
  });
  document.querySelectorAll(".section-title, .statement__text").forEach((el) => {
    gsap.fromTo(el, { "--wdth": 100 }, {
      "--wdth": 112, duration: 1.6, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}
