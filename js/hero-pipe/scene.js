// PipeHero: the pipe hero scene (spec section 4). It draws into its canvas and touches no other page
// DOM, so js/hero-pipe/mount.js (or, later, a scripted website demo) drives it through setProgress.

import * as THREE from "three";
import { RoomEnvironment } from "three";
import { pipeToWorld, wrapArc } from "./pipespace.js";
import { grid, annulus, weldBead, rectOutline, segment } from "./builders.js";
import { PipeObject } from "./remap.js";
import { PIPE, R, C, WELDS, FEATURES, LOGO, LOGO_COMPACT, DEPTH_EXAGGERATION, box, highlight, pocketPatch } from "./features.js";
import { bore, inspect, FOV } from "./timelines.js";

const TIMELINES = { bore, inspect };
const WT = PIPE.wt;
const LOGO_W = 133.978;
const LOGO_H = 26.788;

// 1 inside the central 55 percent of a half-width, easing to 0 at its edge: a flat-bottomed dish.
function dish(d, half) {
  const x = Math.abs(d) / half;
  const t = Math.min(1, Math.max(0, (1 - x) / 0.45));
  return t * t * (3 - 2 * t);
}
function weightAt(f, s, a) {
  return dish(s - f.s, f.length / 2) * dish(wrapArc(a - f.a, C), f.width / 2);
}
// Radial position of a surface point: EXT pockets press into the coating, INT pockets into the
// wall from the bore. Depth is exaggerated and capped at 95 percent of the wall.
function surfaceR(side, depth, w) {
  const d = Math.min(0.95, depth * DEPTH_EXAGGERATION) * WT * w;
  return side === "EXT" ? -d : -WT + d;
}

function linear(hex) {
  return new THREE.Color(hex);   // ColorManagement converts sRGB hex to the linear working space
}

export class PipeHero {
  constructor(canvas, { mode = "bore", colours, logo = [], lite = false }) {
    this.canvas = canvas;
    this.mode = TIMELINES[mode] ? mode : "bore";
    this.colours = colours;
    this.lite = lite;
    this.nA = lite ? 96 : 192;
    this.u = 0;
    this.objects = [];
    this.wallMaterials = [];

    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.setClearColor(linear(colours.deep), 1);
    this.renderer = r;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;   // reflections, not flood light: keep the coating its own colour
    pmrem.dispose();
    // Key light mostly from above: the 3:00 face the side view looks at (and the logo on it) sits
    // near its own slate colour, so the teal letters keep their contrast.
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-0.3, 1, 0.15);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd8f0, 0.9);
    rim.position.set(0.3, -0.2, -1);
    this.scene.add(rim);
    this.scene.add(new THREE.HemisphereLight(0xcfe3ff, linear(colours.deep), 0.4));

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 10, 60000);
    this.camera.add(new THREE.PointLight(0xffffff, 0.8, 9000, 0));   // headlamp for the bore; brighter blew out close walls
    this.scene.add(this.camera);

    this._buildPipe();
    this._buildLogo(logo);
    this._buildFeatures();
    this._buildInspect();
    this._remap(0);
  }

  _add(obj, group = this.scene) {
    this.objects.push(obj);
    group.add(obj.object);
    return obj;
  }

  _wall(material) {
    material.transparent = true;
    this.wallMaterials.push(material);
    return material;
  }

  _mesh(built, material) {
    const geom = new THREE.BufferGeometry();
    geom.setIndex(new THREE.BufferAttribute(built.index, 1));
    return new PipeObject(new THREE.Mesh(geom, material), built.coords, R, { normals: true });
  }

  _line(built, material) {
    return new PipeObject(new THREE.Line(new THREE.BufferGeometry(), material), built.coords, R);
  }

  // One skin (coating or bore) in s-segments: coarse between features, fine (8 mm) where a 2024
  // pocket dishes the surface. Neighbouring segments share their boundary s and the same nA, so
  // they meet without cracks.
  _skin(side, material) {
    const list = FEATURES.filter((f) => f.side === side);
    const ranges = list.map((f) => [f.s - f.length / 2 - 10, f.s + f.length / 2 + 10]).sort((p, q) => p[0] - q[0]);
    const segs = [];
    let s = PIPE.start;
    for (const [a, b] of ranges) {
      if (a > s) segs.push([s, a, false]);
      segs.push([a, b, true]);
      s = b;
    }
    if (s < PIPE.length) segs.push([s, PIPE.length, false]);
    const rBase = side === "EXT" ? 0 : -WT;
    for (const [s0, s1, fine] of segs) {
      const rcAt = fine
        ? (ss, aa) => {
            let best = null, w = 0;
            for (const f of list) { const k = weightAt(f, ss, aa); if (k > w) { w = k; best = f; } }
            return [best ? surfaceR(side, best.d2024, w) : rBase, 0, 0];
          }
        : () => [rBase, 0, 0];
      const built = grid({ s0, s1, nS: fine ? Math.ceil((s1 - s0) / 8) : 1, a0: 0, a1: C, nA: this.nA, rcAt, outward: side === "EXT" });
      this._add(this._mesh(built, material));
    }
  }

  _buildPipe() {
    const c = this.colours;
    const coating = this._wall(new THREE.MeshStandardMaterial({ color: linear(c.coating), roughness: 0.55, metalness: 0.1 }));
    const boreMat = this._wall(new THREE.MeshStandardMaterial({ color: linear(c.steel), roughness: 0.42, metalness: 0.6, side: THREE.DoubleSide }));
    const steel = this._wall(new THREE.MeshStandardMaterial({ color: linear(c.steel), roughness: 0.38, metalness: 0.7, side: THREE.DoubleSide }));
    const weld = this._wall(new THREE.MeshStandardMaterial({ color: linear(c.weld), roughness: 0.3, metalness: 0.8 }));
    this._skin("EXT", coating);
    this._skin("INT", boreMat);
    for (const [s, facing] of [[PIPE.start, -1], [PIPE.length, 1]]) {
      this._add(this._mesh(annulus({ s, a0: 0, a1: C, nA: this.nA, rcOut: [0, 0, 0], rcIn: [-WT, 0, 0], facing }), steel));
    }
    for (const s of WELDS) {
      this._add(this._mesh(weldBead({ s, halfWidth: 14, height: 3, nS: 10, a0: 0, a1: C, nA: this.nA, base: [0, 0, 0], sign: 1 }), weld));
      this._add(this._mesh(weldBead({ s, halfWidth: 6, height: 1.5, nS: 6, a0: 0, a1: C, nA: this.nA, base: [-WT, 0, 0], sign: -1 }), weld));
    }
  }

  // The logo as a decal 0.5 mm proud of the coating on the 3:00 face, drawn from the brand's own
  // vector paths, like a stencilled line marking.
  _buildLogo(paths) {
    if (!paths.length) return;
    const W = 2048;
    const H = Math.round((W * LOGO_H) / LOGO_W);
    const cv = new OffscreenCanvas(W, H);
    const ctx = cv.getContext("2d");
    ctx.scale(W / LOGO_W, H / LOGO_H);
    for (const { d, part } of paths) {
      ctx.fillStyle = part === "frontline" ? this.colours.teal : this.colours.white;
      ctx.fill(new Path2D(d));
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;               // canvas y runs down, as arc a does on the 3:00 face
    tex.anisotropy = 4;
    // Unlit and not tone-mapped, so the letters render in the exact brand colours whatever the light
    // (a lit, bump-mapped decal washed FRONTLINE out to pale cyan under ACES).
    const mat = this._wall(new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.02, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2,
    }));
    const L = this.lite ? LOGO_COMPACT : LOGO;
    const built = grid({ s0: L.s0, s1: L.s1, nS: 8, a0: L.a0, a1: L.a1, nA: 24, rcAt: () => [0.5, 0, 0] });
    const obj = this._mesh(built, mat);
    const n = built.coords.length / 5;
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      uv[i * 2] = (built.coords[i * 5] - L.s0) / (L.s1 - L.s0);
      uv[i * 2 + 1] = (built.coords[i * 5 + 1] - L.a0) / (L.a1 - L.a0);
    }
    obj.object.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    this._add(obj);
  }

  // 2019 outlines on the surfaces (colour per surface, spec section 4), and the highlighted pair's
  // glow, rim and link line in the bore. Task 7 adds the inspect data boxes.
  _buildFeatures() {
    const c = this.colours;
    this.surfaceOutlines = new THREE.Group();
    this.boreHighlight = new THREE.Group();
    this.scene.add(this.surfaceOutlines, this.boreHighlight);
    // 2024 pockets: a teal patch per feature, following the dish just proud of the surface, with
    // edges exactly on the box (pocketPatch), so they stay sharp however close the camera comes.
    const pocketMat = this._wall(new THREE.MeshStandardMaterial({
      color: linear(c.teal), roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    }));
    for (const f of FEATURES) {
      if (f.highlight) continue;   // the highlighted pocket's colour is its orange glow (below)
      const pp = pocketPatch(f);
      const lift = f.side === "EXT" ? 1 : -1;   // towards open space, clear of the surface mesh
      const built = grid({
        s0: pp.s0, s1: pp.s1, nS: Math.ceil(f.length / 5), a0: pp.a0, a1: pp.a1, nA: Math.ceil(f.width / 5),
        rcAt: (ss, aa) => [surfaceR(f.side, f.d2024, weightAt(f, ss, aa)) + lift, 0, 0], outward: f.side === "EXT",
      });
      this._add(this._mesh(built, pocketMat), this.surfaceOutlines);
    }
    const onCoating = new THREE.LineBasicMaterial({ color: linear(c.muted), transparent: true });
    const onSteel = new THREE.LineBasicMaterial({ color: linear(c.navy), transparent: true });
    this.outlineMaterials = [onCoating, onSteel];
    for (const f of FEATURES) {
      if (f.d2019 === null) continue;
      const ext = f.side === "EXT";
      this._add(this._line(rectOutline({ ...box(f, 2019), rc: [ext ? 0.8 : -WT - 0.8, 0, 0], step: 6 }), ext ? onCoating : onSteel), this.surfaceOutlines);
    }
    const h = highlight;
    const b = box(h, 2024);
    const glow = new THREE.MeshBasicMaterial({ color: linear(c.orange), transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const glowBuilt = grid({
      s0: b.x1, s1: b.x2, nS: Math.ceil(h.length / 8), a0: b.ya, a1: b.yb, nA: Math.ceil(h.width / 8),
      rcAt: (ss, aa) => [surfaceR("INT", h.d2024, weightAt(h, ss, aa)) - 1.2, 0, 0], outward: false,
    });
    this._add(this._mesh(glowBuilt, glow), this.boreHighlight);
    const rimMat = new THREE.MeshBasicMaterial({ color: linear(c.navy), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    for (const part of this._ribbon(b, 6, -WT - 0.6)) this._add(this._mesh(part, rimMat), this.boreHighlight);
    const b19 = box(h, 2019);
    const linkMat = new THREE.LineBasicMaterial({ color: linear(c.white), transparent: true, opacity: 0 });
    const r = -WT - 1;
    this._add(this._line(segment([(b19.x1 + b19.x2) / 2, (b19.ya + b19.yb) / 2, r, 0, 0], [(b.x1 + b.x2) / 2, (b.ya + b.yb) / 2, r, 0, 0]), linkMat), this.boreHighlight);
    this.highlightMaterials = [glow, rimMat, linkMat];
    // The wall materials are transparent (so the wall can dissolve), so draw order decides overlap:
    // outlines and the highlight draw after the wall, or the wall paints over them.
    this.surfaceOutlines.traverse((o) => { o.renderOrder = 1; });
    this.boreHighlight.traverse((o) => { o.renderOrder = 2; });
  }

  // A rectangular frame of width w round box b at radius r, as four thin grids.
  _ribbon(b, w, r) {
    const rc = () => [r, 0, 0];
    const strip = (s0, s1, a0, a1) => grid({ s0, s1, nS: 1, a0, a1, nA: Math.max(1, Math.ceil((a1 - a0) / 6)), rcAt: rc });
    return [
      strip(b.x1 - w, b.x2 + w, b.ya - w, b.ya),
      strip(b.x1 - w, b.x2 + w, b.yb, b.yb + w),
      strip(b.x1 - w, b.x1, b.ya, b.yb),
      strip(b.x2, b.x2 + w, b.ya, b.yb),
    ];
  }

  _remap(u) {
    this.u = u;
    for (const o of this.objects) o.remap({ u, k: 1, gap: 0 });
  }

  setMode(mode) {
    if (TIMELINES[mode]) this.mode = mode;
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setProgress(p) {
    const pose = TIMELINES[this.mode](p, this.camera.aspect, this.lite);
    if (Math.abs(pose.u - this.u) > 1e-4) this._remap(pose.u);
    this.camera.position.set(...pose.cam);
    this.camera.lookAt(...pose.look);
    for (const m of this.wallMaterials) m.opacity = pose.wall;
    const surf = pose.wall * (1 - pose.boxes);
    for (const m of this.outlineMaterials) m.opacity = surf;
    for (const m of this.highlightMaterials) m.opacity = pose.highlight * surf;
    this._applyExtras(pose);
    this.renderer.render(this.scene, this.camera);
    this.pose = pose;
    return pose;
  }

  // Inspect version: the ILI tool, its scan ring on the coating, and the flat data boxes that sit
  // just above the coating so they read on the unrolled strip (spec sections 4 and 5).
  _buildInspect() {
    const c = this.colours;
    this.tool = new THREE.Group();
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x2a3440, roughness: 0.5, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R - WT - 60, R - WT - 60, 900, 48), toolMat);
    body.rotation.z = Math.PI / 2;
    this.tool.add(body);
    for (const x of [-420, 420]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(R - WT - 2, R - WT - 2, 30, 64), toolMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.x = x;
      this.tool.add(cup);
    }
    const sensor = new THREE.Mesh(
      new THREE.TorusGeometry(R - WT - 20, 12, 12, 96),
      new THREE.MeshBasicMaterial({ color: linear(c.teal), toneMapped: false }),
    );
    sensor.rotation.y = Math.PI / 2;
    this.tool.add(sensor);
    this.tool.visible = false;
    this.scene.add(this.tool);

    this.scanRing = new THREE.Mesh(
      new THREE.TorusGeometry(R + 6, 5, 8, 160),
      new THREE.MeshBasicMaterial({ color: linear(c.teal), toneMapped: false, transparent: true, opacity: 0.9 }),
    );
    this.scanRing.rotation.y = Math.PI / 2;
    this.scanRing.visible = false;
    this.scene.add(this.scanRing);

    this.dataBoxes = new THREE.Group();
    this.scene.add(this.dataBoxes);
    const fill = new THREE.MeshBasicMaterial({ color: linear(c.teal), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const outline = new THREE.LineBasicMaterial({ color: linear(c.muted), transparent: true, opacity: 0 });
    const hot = new THREE.MeshBasicMaterial({ color: linear(c.orange), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const hotRim = new THREE.MeshBasicMaterial({ color: linear(c.white), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const link = new THREE.LineBasicMaterial({ color: linear(c.white), transparent: true, opacity: 0 });
    const flat = (b, r) => grid({ s0: b.x1, s1: b.x2, nS: 1, a0: b.ya, a1: b.yb, nA: Math.max(2, Math.ceil((b.yb - b.ya) / 20)), rcAt: () => [r, 0, 0] });
    for (const f of FEATURES) {
      const b24 = box(f, 2024);
      this._add(this._mesh(flat(b24, 2), f.highlight ? hot : fill), this.dataBoxes);
      if (f.d2019 !== null) this._add(this._line(rectOutline({ ...box(f, 2019), rc: [2.3, 0, 0], step: 6 }), outline), this.dataBoxes);
    }
    const hb = box(highlight, 2024);
    for (const part of this._ribbon(hb, 8, 2.4)) this._add(this._mesh(part, hotRim), this.dataBoxes);
    const h19 = box(highlight, 2019);
    this._add(this._line(segment([(h19.x1 + h19.x2) / 2, (h19.ya + h19.yb) / 2, 2.5, 0, 0], [(hb.x1 + hb.x2) / 2, (hb.ya + hb.yb) / 2, 2.5, 0, 0]), link), this.dataBoxes);
    this.dataBoxes.traverse((o) => { o.renderOrder = 3; });
    this.boxMaterials = { fill, outline, hot, hotRim, link };
  }

  _applyExtras(pose) {
    const onPipe = pose.u < 0.01;
    this.tool.visible = pose.tool !== null && onPipe;
    if (this.tool.visible) this.tool.position.set(pose.tool, 0, 0);
    this.scanRing.visible = pose.scan !== null && onPipe;
    if (this.scanRing.visible) this.scanRing.position.set(pose.scan, 0, 0);
    const m = this.boxMaterials;
    this.dataBoxes.visible = pose.boxes > 0;
    m.fill.opacity = 0.85 * pose.boxes;
    m.outline.opacity = pose.boxes;
    m.hot.opacity = pose.boxes * 0.85 * pose.highlight;
    m.hotRim.opacity = pose.boxes * pose.highlight;
    m.link.opacity = pose.boxes * pose.highlight;
  }

  // The highlighted pair on screen, in CSS px within the canvas: its centre, whether that centre is
  // in view, and the bounding box of both runs' footprints, so a label can sit beside it, not on it.
  anchor() {
    const h = highlight;
    const r = this.u > 0 ? 2.1 : -WT;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    const v = new THREE.Vector3();
    const toScreen = (s, a) => {
      const w = pipeToWorld(s, a, r, this.u, R);
      v.set(w[0], w[1], w[2]).project(this.camera);
      return [((v.x + 1) / 2) * cw, ((1 - v.y) / 2) * ch, v.z];
    };
    const [x, y, z] = toScreen(h.s, h.a);
    let left = x, right = x, top = y, bottom = y;
    for (const run of [2019, 2024]) {
      const b = box(h, run);
      for (const [s, a] of [[b.x1, b.ya], [b.x1, b.yb], [b.x2, b.ya], [b.x2, b.yb]]) {
        const [px, py] = toScreen(s, a);
        left = Math.min(left, px); right = Math.max(right, px);
        top = Math.min(top, py); bottom = Math.max(bottom, py);
      }
    }
    return { x, y, left, right, top, bottom, visible: z > -1 && z < 1 && x >= 0 && x <= cw && y >= 0 && y <= ch };
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    this.renderer.dispose();
  }
}
