// Review tool: a small dropdown, fixed bottom-right, that switches between the design versions
// served from this repo on the same localhost port. Loaded by / (v1) and /v2/. Remove the script
// tags before launch (see v2/README.md).
//
// Hidden when the URL has ?poster=1 (poster renders) or ?switcher=0 (clean screenshots).

const VERSIONS = [
  { label: "v1 Pipe (bore)", path: "/", params: {} },
  { label: "v1 Pipe (inspect)", path: "/", params: { hero: "inspect" } },
  { label: "v2 Signal", path: "/v2/", params: {} },
];
const CARRY = ["footprint"];   // review params kept when switching

// Base path (deploy plan 2026-09-30-deploy-github-pages.md, D2; exception (b) as extended). The
// site root is worked out from this script's own URL, one folder above shared/, so the switcher
// works at "/" on the local server and under "/<repo>/" on GitHub Pages. Every path below is
// site-relative ("/", "/v2/about/"); rel() and abs() convert at the edges. In Node (the unit tests)
// the base is "/", so nothing changes there.
const BASE = (() => {
  try { return typeof document !== "undefined" ? new URL("../", import.meta.url).pathname : "/"; } catch (e) { return "/"; }
})();
export const rel = (pathname, base = BASE) => (pathname.startsWith(base) ? "/" + pathname.slice(base.length) : pathname);
export const abs = (sitePath, base = BASE) => base + sitePath.replace(/^\//, "");

function isCurrent(v, url) {
  const onV2 = url.pathname.startsWith("/v2");
  if (v.path === "/v2/") return onV2;
  if (onV2) return false;
  return (url.searchParams.get("hero") === "inspect") === (v.params.hero === "inspect");
}

// Inner pages (plan 2026-09-30-inner-pages.md, exception (b)): each v1 page at /<path> has a v2
// counterpart at /v2/<path>, and back. The homepages keep the options above unchanged.
const HOMES = new Set(["/", "/index.html", "/v2", "/v2/", "/v2/index.html"]);

export function counterpartPath(pathname, base = BASE) {
  const r = rel(pathname, base);
  const p = r.replace(/index\.html$/, "");
  if (HOMES.has(r) || HOMES.has(p)) return abs(p.startsWith("/v2") ? "/" : "/v2/", base);
  return abs(p.startsWith("/v2/") ? p.slice(3) : `/v2${p}`, base);
}

// Review settings survive browsing (Lewis and the reviewer, 30 September 2026, Part A item 3).
// Once a CARRY setting such as ?footprint=sample has been given, it is kept for the browser session
// and added back to links that lead to a homepage, so the map still shows the sample after a visit
// to the inner pages. When no setting was ever given, nothing is stored and nothing changes.
const REVIEW_KEY = "fli-review";

// The settings to carry: those in the URL, else those remembered this session.
export function reviewSettings(url, remembered = {}) {
  const out = {};
  for (const k of CARRY) {
    if (url.searchParams.has(k)) out[k] = url.searchParams.get(k);
    else if (remembered[k] != null) out[k] = remembered[k];
  }
  return out;
}

// A link's href with the review settings added, if it leads to a homepage on this site and does not
// already set them. Anything else is returned unchanged.
export function withReview(href, pageUrl, settings, base = BASE) {
  if (!Object.keys(settings).length) return href;
  let u;
  try { u = new URL(href, pageUrl); } catch (e) { return href; }
  if (u.origin !== new URL(pageUrl).origin || !HOMES.has(rel(u.pathname, base))) return href;
  for (const [k, v] of Object.entries(settings)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  return u.pathname + u.search + u.hash;
}

function innerOptions(url, remembered = {}, base = BASE) {
  const onV2 = rel(url.pathname, base).startsWith("/v2/");
  const v1 = onV2 ? counterpartPath(url.pathname, base) : url.pathname.replace(/index\.html$/, "");
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(reviewSettings(url, remembered))) q.set(k, v);
  const qs = q.toString() ? `?${q}` : "";
  // Both v1 hero variants share the same inner pages, so both v1 options lead to the v1 page.
  return VERSIONS.map((v, i) => ({
    label: v.label,
    href: (v.path === "/v2/" ? counterpartPath(v1, base) : v1) + qs,
    selected: onV2 ? v.path === "/v2/" : i === 0,
  }));
}

export function switcherOptions(url, remembered = {}, base = BASE) {
  const site = new URL(url.href);
  site.pathname = rel(url.pathname, base);
  if (!HOMES.has(site.pathname)) return innerOptions(url, remembered, base);
  return VERSIONS.map((v) => {
    const q = new URLSearchParams(v.params);
    for (const k of CARRY) if (url.searchParams.has(k)) q.set(k, url.searchParams.get(k));
    const qs = q.toString();
    return { label: v.label, href: abs(v.path, base) + (qs ? `?${qs}` : ""), selected: isCurrent(v, site) };
  });
}

export function shouldShow(url) {
  return url.searchParams.get("poster") !== "1" && url.searchParams.get("switcher") !== "0";
}

function rememberReview(url) {
  let remembered = {};
  try { remembered = JSON.parse(sessionStorage.getItem(REVIEW_KEY) || "{}"); } catch (e) { /* storage blocked */ }
  const given = {};
  for (const k of CARRY) if (url.searchParams.has(k)) given[k] = url.searchParams.get(k);
  if (Object.keys(given).length) {
    remembered = { ...remembered, ...given };
    try { sessionStorage.setItem(REVIEW_KEY, JSON.stringify(remembered)); } catch (e) { /* storage blocked */ }
  }
  // Inner pages only: links back to a homepage keep the setting. Homepage links are left alone.
  const settings = reviewSettings(url, remembered);
  if (!HOMES.has(rel(url.pathname)) && Object.keys(settings).length) {
    for (const a of document.querySelectorAll("a[href]")) {
      const next = withReview(a.getAttribute("href"), url.href, settings);
      if (next !== a.getAttribute("href")) a.setAttribute("href", next);
    }
  }
  return remembered;
}

function mount() {
  const url = new URL(window.location.href);
  const remembered = rememberReview(url);
  if (!shouldShow(url) || document.querySelector(".vsw")) return;
  const style = document.createElement("style");
  style.textContent = `
.vsw { position: fixed; right: 12px; bottom: 12px; z-index: 2147483000; display: inline-flex; align-items: center;
  font: 500 12px/1 "Martian Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.02em; }
.vsw__label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.vsw select { appearance: none; min-height: 44px; padding: 0 34px 0 14px; border: 1px solid rgb(255 255 255 / 0.22);
  border-radius: 999px; background: rgb(7 15 26 / 0.88) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23F2F5F8' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat right 14px center;
  color: #F2F5F8; font: inherit; cursor: pointer; backdrop-filter: blur(6px); }
.vsw select:focus-visible { outline: 2px solid #5EC3E7; outline-offset: 2px; }
.vsw option { color: #142C47; background: #FFFFFF; }
@media print { .vsw { display: none; } }`;
  const label = document.createElement("label");
  label.className = "vsw";
  const text = document.createElement("span");
  text.className = "vsw__label";
  text.textContent = "Design version";
  const select = document.createElement("select");
  for (const o of switcherOptions(url, remembered)) {
    const opt = document.createElement("option");
    opt.value = o.href;
    opt.textContent = o.label;
    opt.selected = o.selected;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => { window.location.href = select.value; });
  label.append(text, select);
  // v1's hero has a "Skip intro" link in this corner: sit above it rather than cover it.
  if (document.querySelector(".hero__skip")) label.style.bottom = "108px";
  document.head.appendChild(style);
  document.body.appendChild(label);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
}
