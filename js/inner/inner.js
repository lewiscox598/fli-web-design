/* Inner pages (v1): case-study filters and the About timeline line. Loaded after site.js by the
   generated v1 pages only; reveals come from site.js ([data-reveal]).
   Without JavaScript the filters stay hidden and every card shows; the timeline line is complete. */
(function () {
  "use strict";

  // Case-study filters: buttons, not inputs (no forms on the mockups). "all" shows every card.
  var group = document.querySelector("[data-filters]");
  var list = document.querySelector("[data-filter-list]");
  if (group && list) {
    var buttons = Array.prototype.slice.call(group.querySelectorAll("[data-filter]"));
    var cards = Array.prototype.slice.call(list.children);
    var status = document.createElement("p");
    status.className = "inner-filters__status";
    status.setAttribute("role", "status");
    group.after(status);
    var apply = function (key) {
      var shown = 0;
      cards.forEach(function (card) {
        var on = key === "all" || (" " + card.getAttribute("data-services") + " ").indexOf(" " + key + " ") >= 0;
        card.hidden = !on;
        if (on) shown++;
      });
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === key)); });
      status.textContent = "Showing " + shown + " of " + cards.length + " case studies";
    };
    buttons.forEach(function (b) { b.addEventListener("click", function () { apply(b.getAttribute("data-filter")); }); });
    group.hidden = false;
    apply("all");
  }

  // Signature moment (plan section 5): the About timeline's teal line draws as it scrolls through.
  // FLI.trackProgress reports 1 at once under reduced motion, so the line is then complete.
  var FLI = window.FLI;
  var timeline = document.querySelector("[data-timeline]");
  if (timeline && FLI && FLI.trackProgress) {
    timeline.setAttribute("data-live", "");
    FLI.trackProgress(timeline, function (p) { timeline.style.setProperty("--tl", String(p)); });
  }
})();
