// How we work (plan section 1.3, item 3). Desktop with motion: the section pins and the three
// stages slide horizontally while each stage's line diagram draws across its share of the scroll.
// Phones: stacked, each diagram draws once in view. Without motion the diagrams are simply drawn.

export function mountStages({ gsap }) {
  const section = document.querySelector("[data-stages]");
  if (!section) return;
  const viewport = section.querySelector(".stages__viewport");
  const list = section.querySelector(".stages__list");
  const stages = [...section.querySelectorAll(".stage")];
  const header = () => document.querySelector(".site-header").offsetHeight;

  const prime = (els) => els.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
  });

  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    stages.forEach((st) => prime([...st.querySelectorAll(".draw")]));
    gsap.set(section.querySelectorAll(".dot"), { scale: 0, transformOrigin: "50% 50%" });
    const distance = () => Math.max(0, list.scrollWidth - viewport.clientWidth);
    // On short windows the whole section is taller than the space under the header, so pin it
    // further down by the overflow: the stages stay fully in view, the heading rises out instead.
    // Never by more than the heading's own depth, so the stages never slide under the header.
    const shift = () => {
      const top = section.getBoundingClientRect().top;
      const vp = viewport.getBoundingClientRect();
      const overflow = vp.bottom - top + 24 - (window.innerHeight - header());
      return Math.round(Math.min(Math.max(0, overflow), vp.top - top));
    };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: () => `top+=${shift()} ${header()}px`, end: () => `+=${distance() + window.innerHeight * 0.5}`,
        scrub: 0.6, pin: true, invalidateOnRefresh: true,
      },
    });
    tl.to(list, { x: () => -distance(), ease: "none", duration: 1 }, 0);
    stages.forEach((st, i) => {
      const at = i * 0.33;
      tl.to(st.querySelectorAll(".draw"), { strokeDashoffset: 0, ease: "none", duration: 0.24, stagger: 0.03 }, at);
      const dot = st.querySelector(".dot");
      if (dot) tl.to(dot, { scale: 1, ease: "back.out(3)", duration: 0.06 }, at + 0.24);
    });
    return () => stages.forEach((st) => st.querySelectorAll(".draw").forEach((p) => { p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; }));
  });
  mm.add("(max-width: 899.98px)", () => {
    stages.forEach((st) => {
      const paths = [...st.querySelectorAll(".draw")];
      prime(paths);
      gsap.to(paths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: st, start: "top 80%", once: true } });
    });
  });
}
