
(function () {
  "use strict";

  var FLI = window.FLI;
  var hero = document.querySelector(".hero");
  if (!hero || !FLI) return;
  var params = new URLSearchParams(window.location.search);
  var scriptUrl = document.currentScript && document.currentScript.src;

  hero.classList.add("hero--animated");
  var mode = params.get("hero") === "inspect" ? "inspect" : "bore";
  hero.setAttribute("data-hero-mode", mode);
  FLI.heroPipe = { mode: mode, progress: 0, listeners: [] };

  FLI.trackProgress(hero, function (p) {
    var copy = FLI.clamp((p - 0.78) / 0.17, 0, 1);
    hero.style.setProperty("--hero-copy", copy.toFixed(3));
    hero.style.setProperty("--hero-dim", copy.toFixed(3));
    hero.style.setProperty("--hero-cue", (1 - FLI.clamp(p / 0.08, 0, 1)).toFixed(3));
    hero.classList.toggle("is-copy-live", copy > 0.5);
    FLI.heroPipe.progress = p;
    FLI.heroPipe.listeners.forEach(function (fn) { fn(p); });
  }, { mode: "pin" });

  if (!FLI.reducedMotion() && params.get("webgl") !== "0") {
    import(new URL("hero-pipe/mount.js", scriptUrl).href).catch(function () {});
  }
})();
