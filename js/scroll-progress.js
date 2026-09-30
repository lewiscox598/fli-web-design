/*
  Shared scroll-progress utility. One requestAnimationFrame loop serves every tracked element,
  and only elements near the viewport are measured.

  FLI.trackProgress(el, onProgress, { mode })
    mode "pin":     0 when el's top reaches the sticky offset, 1 when its bottom reaches the
                    viewport bottom. For tall sections with a sticky child.
    mode "through": 0 when el's top enters at the viewport bottom, 1 when its bottom passes
                    the viewport middle.

  With prefers-reduced-motion: reduce, onProgress(1) is called once and nothing is tracked,
  so each component renders its final state.
*/
(function () {
  "use strict";

  var FLI = (window.FLI = window.FLI || {});
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var tracked = [];
  var ticking = false;

  FLI.reducedMotion = function () { return motionQuery.matches; };
  FLI.clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };

  function stickyOffset() {
    var header = document.querySelector(".site-header");
    return header ? header.getBoundingClientRect().height : 0;
  }

  function measure(t) {
    var r = t.el.getBoundingClientRect();
    var vh = window.innerHeight;
    var p;
    if (t.mode === "pin") {
      var top = stickyOffset();
      var span = r.height - (vh - top);
      p = span > 0 ? (top - r.top) / span : (r.top <= top ? 1 : 0);
    } else {
      p = (vh - r.top) / (vh * 0.5 + r.height);
    }
    p = FLI.clamp(p, 0, 1);
    if (p !== t.last) {
      t.last = p;
      t.onProgress(p);
    }
  }

  function frame() {
    ticking = false;
    for (var i = 0; i < tracked.length; i++) {
      if (tracked[i].visible) measure(tracked[i]);
    }
  }

  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(frame);
    }
  }

  var observer = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          for (var i = 0; i < tracked.length; i++) {
            if (tracked[i].el === entry.target) {
              tracked[i].visible = entry.isIntersecting;
              if (entry.isIntersecting) measure(tracked[i]);
              // Settle to the nearest end when leaving, so fast scrolls never strand a state
              else if (tracked[i].last !== 0 && tracked[i].last !== 1) {
                tracked[i].last = entry.boundingClientRect.top < 0 ? 1 : 0;
                tracked[i].onProgress(tracked[i].last);
              }
            }
          }
        });
      }, { rootMargin: "25% 0px 25% 0px" })
    : null;

  FLI.trackProgress = function (el, onProgress, options) {
    var t = { el: el, onProgress: onProgress, mode: (options && options.mode) || "through", last: -1, visible: !observer };
    if (FLI.reducedMotion()) {
      onProgress(1);
      return;
    }
    tracked.push(t);
    if (observer) observer.observe(el);
    measure(t);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", function () {
    tracked.forEach(function (t) { t.last = -1; });
    request();
  });

  // If the user switches reduced motion on mid-visit, jump everything to its final state
  motionQuery.addEventListener("change", function (e) {
    if (e.matches) {
      tracked.forEach(function (t) { t.onProgress(1); if (observer) observer.unobserve(t.el); });
      tracked = [];
    }
  });
})();
