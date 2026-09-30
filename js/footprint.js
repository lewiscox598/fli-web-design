/*
  Footprint map. Reads data/footprint.json (Lewis supplies and signs off; schema in README).
  ?footprint=sample loads data/footprint.sample.json instead, for review only.

  An abstract Catmull-Rom curve runs through the country anchors in order of first year,
  drawn with stroke-dashoffset as the pinned section scrolls. Each node scales in with one
  halo pulse when the line reaches it, and the caption (an aria-live region) shows the year,
  country and running count. Stroke widths are set per breakpoint in user units; the route
  never uses non-scaling-stroke, so getTotalLength() and the dash pattern share one unit.
*/
(function () {
  "use strict";

  var FLI = window.FLI;
  var section = document.getElementById("footprint");
  if (!section || !FLI) return;
  var svg = section.querySelector(".map__svg");
  if (!svg) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var route = svg.querySelector(".map__route");
  var nodeGroup = svg.querySelector(".map__nodes");
  var yearEl = section.querySelector("[data-map-year]");
  var countryEl = section.querySelector("[data-map-country]");
  var countEl = section.querySelector("[data-map-count]");
  var notice = section.querySelector("[data-map-notice]");
  var list = section.querySelector("[data-map-list]");
  var mobile = window.matchMedia("(max-width: 639.98px)");
  var TENSION = 0.1;   // below Catmull-Rom's 1/6, so the curve never overshoots a node

  var useSample = new URLSearchParams(location.search).get("footprint") === "sample";
  var url = useSample ? "data/footprint.sample.json" : "data/footprint.json";

  function showNotice(text) {
    notice.textContent = text;
    notice.hidden = false;
  }

  // Equal Earth, matching d3-geo's geoEqualEarth (checked in tools/build-map.mjs)
  var scale = parseFloat(svg.getAttribute("data-scale"));
  var translate = svg.getAttribute("data-translate").split(" ").map(parseFloat);
  function project(lon, lat) {
    var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
    var lambda = lon * Math.PI / 180, phi = lat * Math.PI / 180;
    var l = Math.asin(M * Math.sin(phi)), l2 = l * l, l6 = l2 * l2 * l2;
    var x = lambda * Math.cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
    var y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
    return [translate[0] + scale * x, translate[1] - scale * y];
  }

  function segment(p0, p1, p2, p3) {
    var c1 = [p1[0] + (p2[0] - p0[0]) * TENSION, p1[1] + (p2[1] - p0[1]) * TENSION];
    var c2 = [p2[0] - (p3[0] - p1[0]) * TENSION, p2[1] - (p3[1] - p1[1]) * TENSION];
    return "C " + c1.map(f).join(" ") + " " + c2.map(f).join(" ") + " " + p2.map(f).join(" ");
  }
  function f(n) { return n.toFixed(2); }

  function yearText(c) { return c.first_year ? String(c.first_year) : "Year TBC"; }

  function build(countries) {
    var n = countries.length;
    var pts = countries.map(function (c) { return project(c.anchor[0], c.anchor[1]); });

    // Route and cumulative length at each node
    var d = "M " + pts[0].map(f).join(" ");
    var cum = [0];
    var probe = document.createElementNS(SVG_NS, "path");
    probe.setAttribute("visibility", "hidden");
    svg.appendChild(probe);
    for (var i = 0; i < n - 1; i++) {
      d += " " + segment(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(n - 1, i + 2)]);
      probe.setAttribute("d", d);
      cum.push(probe.getTotalLength());
    }
    svg.removeChild(probe);
    route.setAttribute("d", d);
    var total = cum[n - 1] || 0;
    route.style.strokeDasharray = total + " " + total;

    // Nodes
    var nodes = pts.map(function (p, i) {
      var g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "map__node");
      ["map__halo", "map__dot"].forEach(function (cls) {
        var c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("class", cls);
        c.setAttribute("cx", f(p[0]));
        c.setAttribute("cy", f(p[1]));
        g.appendChild(c);
      });
      nodeGroup.appendChild(g);
      var li = document.createElement("li");
      li.textContent = countries[i].country + ", first project " + yearText(countries[i]);
      list.appendChild(li);
      return g;
    });

    function sizeNodes() {
      var r = getComputedStyle(document.documentElement).getPropertyValue("--map-node-r").trim() || "4.5";
      svg.querySelectorAll(".map__node circle").forEach(function (c) { c.setAttribute("r", r); });
      svg.setAttribute("viewBox", svg.getAttribute(mobile.matches ? "data-viewbox-mobile" : "data-viewbox-desktop"));
    }
    sizeNodes();
    mobile.addEventListener("change", sizeNodes);

    section.style.setProperty("--pin-height", "calc(100svh + " + (n * 26) + "svh)");

    var current = -1;
    FLI.trackProgress(section, function (p) {
      var drawn = FLI.clamp(p / 0.9, 0, 1) * total;
      route.style.strokeDashoffset = (total - drawn).toFixed(2);
      var reached = 0;
      for (var i = 0; i < n; i++) {
        var hit = cum[i] <= drawn + 0.5;
        nodes[i].classList.toggle("is-reached", hit);
        if (hit) reached = i;
      }
      if (reached !== current) {
        current = reached;
        var c = countries[reached];
        yearEl.textContent = yearText(c);
        countryEl.textContent = c.country;
        countEl.textContent = (reached + 1) + " of " + n + " countries";
      }
    }, { mode: "pin" });
  }

  function validate(data) {
    var countries = data && Array.isArray(data.countries) ? data.countries : null;
    if (!countries || !countries.length) throw new Error("no countries");
    countries.forEach(function (c) {
      if (typeof c.country !== "string" || !Array.isArray(c.anchor) || c.anchor.length !== 2) throw new Error("bad entry");
    });
    // Chronological order; equal or missing years keep file order (stable sort)
    return countries
      .map(function (c, i) { return { c: c, i: i }; })
      .sort(function (a, b) {
        var ya = a.c.first_year || Infinity, yb = b.c.first_year || Infinity;
        return ya === yb ? a.i - b.i : ya - yb;
      })
      .map(function (x) { return x.c; });
  }

  fetch(url, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function (data) {
      build(validate(data));
      if (useSample || data.sample) {
        showNotice("Sample data for review only: countries are read from the current site's locations graphic, anchor points are approximate and years are not yet supplied. These are not FLI records.");
      }
    })
    .catch(function () {
      section.classList.add("map--empty");
      showNotice("[FIGURE NEEDED: footprint data. data/footprint.json has not yet been supplied and signed off by Lewis, so no countries are shown.]");
    });
})();
