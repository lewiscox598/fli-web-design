/* Site behaviour: mobile menu, theme toggle, section reveals, statement words, service stages. */
(function () {
  "use strict";

  var FLI = window.FLI;
  var root = document.documentElement;

  // Mobile menu
  var toggle = document.querySelector(".site-nav__toggle");
  var list = document.getElementById("site-nav-list");
  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    list.classList.remove("is-open");
  }
  if (toggle && list) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      list.classList.toggle("is-open", open);
    });
    list.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && list.classList.contains("is-open")) { closeMenu(); toggle.focus(); }
    });
  }

  // Theme toggle (footer): follows the system until the visitor chooses, then remembers it
  var themeButton = document.querySelector(".theme-toggle");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  function isDark() {
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : systemDark.matches;
  }
  function syncThemeButton() {
    if (!themeButton) return;
    themeButton.setAttribute("aria-pressed", String(isDark()));
    themeButton.textContent = isDark() ? "Light mode" : "Dark mode";
  }
  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("fli-theme", next); } catch (e) {}
      syncThemeButton();
    });
    systemDark.addEventListener("change", syncThemeButton);
    syncThemeButton();
  }

  if (!FLI) return;

  // Reveals: headings, cards and figures fade and rise once as they enter the viewport
  var revealables = document.querySelectorAll("[data-reveal]");
  if (FLI.reducedMotion() || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    revealables.forEach(function (el) { io.observe(el); });
  }

  // Statement: "Trust. Commitment. Innovation." lights word by word as the band scrolls through
  var statement = document.querySelector("[data-statement]");
  if (statement) {
    var words = Array.prototype.slice.call(statement.querySelectorAll(".statement__words span"));
    FLI.trackProgress(statement, function (p) {
      words.forEach(function (w, i) {
        w.classList.toggle("is-lit", p >= 0.18 + i * 0.12);
      });
    });
  }

  // Service stages: the sticky photo's counter follows the stage in view
  var stages = document.querySelector("[data-stages]");
  if (stages) {
    var items = Array.prototype.slice.call(stages.querySelectorAll("[data-stage]"));
    var counter = stages.querySelector("[data-stage-current]");
    FLI.trackProgress(stages, function () {
      var mid = window.innerHeight * 0.55;
      var active = 0;
      items.forEach(function (item, i) {
        if (item.getBoundingClientRect().top < mid) active = i;
      });
      items.forEach(function (item, i) { item.classList.toggle("is-active", i === active); });
      if (counter) counter.textContent = "0" + (active + 1);
    });
  }
})();
