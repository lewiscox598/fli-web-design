// PointField: the v2 hero scene (plan section 1.3). One THREE.Points draw call; a shader mixes three
// layouts (field, band, trace) by the scroll pose, greys what the threshold line has passed, turns
// the critical calls orange, and brightens points near the probe. Draws into its canvas only: no
// other page DOM, so a page or a scripted demo can drive it.

import * as THREE from "three";
import { layouts } from "./data.js";

const VERT = /* glsl */ `
attribute vec3 aField;
attribute vec3 aBand;
attribute vec3 aTrace;
attribute float aDepth;
attribute float aCritical;
attribute float aSeed;
attribute float aDeepest;
uniform float uGather, uCollapse, uDock, uSweepX, uSweepOn, uTime, uDrift, uPixelRatio, uWidth;
uniform vec2 uProbe;
uniform float uProbeOn;
varying float vAlpha;
varying float vPassed;
varying float vCritical;
varying float vProbe;
varying float vDeepest;
void main() {
  vec3 p = mix(aField, aBand, uGather);
  p = mix(p, aTrace, uCollapse);
  float free = (1.0 - uGather) * uDrift;
  p.xy += free * 0.012 * vec2(sin(uTime * 0.31 + aSeed * 6.2831), cos(uTime * 0.27 + aSeed * 9.117));
  p.x = mix(p.x, -0.5 * uWidth + 0.018 * uWidth, uDock);          // squeeze into the left margin
  float passed = uSweepOn * step(p.x, uSweepX);
  float probe = uProbeOn * (1.0 - smoothstep(0.0, 0.16, distance(p.xy, uProbe)));
  float depthCue = 1.0 + aField.z * 0.45 * (1.0 - uGather);      // nearer points in the field read larger
  float size = (2.1 + 9.0 * aDepth) * depthCue;
  size = mix(size, 22.0, passed * aCritical);                        // criticals, with a halo
  size = mix(size, 2.2, uCollapse * (1.0 - aCritical));
  size *= 1.0 + 1.2 * probe;
  gl_PointSize = size * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  float a = min(0.9, 0.3 + 2.4 * aDepth) * mix(1.0, 0.7, uGather);
  a = mix(a, 0.32, passed * (1.0 - aCritical));                    // reviewed, not deleted
  a = mix(a, 1.0, passed * aCritical);
  a = max(a, probe);
  vAlpha = a * (1.0 - uDock);
  vPassed = passed;
  vCritical = aCritical;
  vProbe = probe;
  vDeepest = aDeepest;
}`;

const FRAG = /* glsl */ `
uniform vec3 uTeal, uGrey, uOrange, uWhite;
uniform float uCollapse;
varying float vDeepest;
varying float vAlpha;
varying float vPassed;
varying float vCritical;
varying float vProbe;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float edge = 1.0 - smoothstep(0.3, 0.5, d);
  // criticals: a bright core inside a soft halo
  float core = 1.0 - smoothstep(0.12, 0.2, d);
  edge = mix(edge, max(core, 0.5 * (1.0 - smoothstep(0.18, 0.5, d))), vPassed * vCritical);
  vec3 col = uTeal;
  col = mix(col, uGrey, vPassed * (1.0 - vCritical));
  // on the trace only the deepest call stays orange: its echo is the one highlighted spike
  col = mix(col, uOrange, vPassed * vCritical * (1.0 - uCollapse * (1.0 - vDeepest)));
  col = mix(col, uWhite, vProbe * 0.55);
  gl_FragColor = vec4(col, vAlpha * edge);
}`;

export class PointField {
  constructor(canvas, { run, colours, lite = false }) {
    this.canvas = canvas;
    this.run = run;
    this.lite = lite;
    this.width = 2;
    this.height = 2;

    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
    r.setClearColor(new THREE.Color(colours.canvas), 1);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

    const n = run.kp.length;
    const g = new THREE.BufferGeometry();
    this.geometry = g;
    for (const name of ["position", "aField", "aBand", "aTrace"]) g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(3 * n), 3));
    g.setAttribute("aDepth", new THREE.BufferAttribute(run.depth, 1));
    g.setAttribute("aCritical", new THREE.BufferAttribute(Float32Array.from(run.critical), 1));
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) seed[i] = ((i * 2654435761) % 1000) / 1000;
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const deepest = new Float32Array(n);
    deepest[run.deepest] = 1;
    g.setAttribute("aDeepest", new THREE.BufferAttribute(deepest, 1));

    this.uniforms = {
      uGather: { value: 0 }, uCollapse: { value: 0 }, uDock: { value: 0 },
      uSweepX: { value: -99 }, uSweepOn: { value: 0 },
      uTime: { value: 0 }, uDrift: { value: 1 }, uPixelRatio: { value: r.getPixelRatio() }, uWidth: { value: 2 },
      uProbe: { value: new THREE.Vector2(99, 99) }, uProbeOn: { value: 0 },
      uTeal: { value: new THREE.Color(colours.data) },
      uGrey: { value: new THREE.Color(colours.grey) },
      uOrange: { value: new THREE.Color(colours.critical) },
      uWhite: { value: new THREE.Color("#FFFFFF") },
    };
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.lost = false;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.lost = true; });
  }

  // Layouts depend on the aspect, so they are rebuilt on resize.
  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.height = 2;
    this.width = (2 * w) / h;
    Object.assign(this.camera, { left: -this.width / 2, right: this.width / 2, top: 1, bottom: -1 });
    this.camera.updateProjectionMatrix();
    this.uniforms.uWidth.value = this.width;
    this.L = layouts(this.run, { width: this.width, height: this.height });
    const g = this.geometry;
    g.getAttribute("aField").array.set(this.L.field);
    g.getAttribute("aBand").array.set(this.L.band);
    g.getAttribute("aTrace").array.set(this.L.trace);
    g.getAttribute("position").array.set(this.L.field);
    for (const name of ["aField", "aBand", "aTrace", "position"]) g.getAttribute(name).needsUpdate = true;
  }

  // pose from timeline.js; the sweep runs across the band's 70 percent strip
  setPose(q) {
    const u = this.uniforms;
    u.uGather.value = q.gather;
    u.uCollapse.value = q.collapse;
    u.uDock.value = q.dock;
    u.uSweepOn.value = q.sweep > 0 ? 1 : 0;
    u.uSweepX.value = (-0.35 + 0.7 * q.sweep) * this.width + (q.sweep >= 1 ? 1 : 0);
    this.pose = q;
  }

  sweepLineX() {
    return this.uniforms.uSweepX.value;
  }

  setProbe(x, y, on) {
    this.uniforms.uProbe.value.set(x, y);
    this.uniforms.uProbeOn.value = on ? 1 : 0;
  }

  setTime(t, drift) {
    this.uniforms.uTime.value = t;
    this.uniforms.uDrift.value = drift ? 1 : 0;
  }

  // Screen <-> world for the orthographic camera (CSS px within the canvas).
  toWorld(px, py) {
    return [(px / this.canvas.clientWidth - 0.5) * this.width, (0.5 - py / this.canvas.clientHeight) * this.height];
  }
  toScreen(x, y) {
    return [(x / this.width + 0.5) * this.canvas.clientWidth, (0.5 - y / this.height) * this.canvas.clientHeight];
  }

  // Current world position of point i under the pose (without the tiny drift).
  pointAt(i) {
    const q = this.pose || { gather: 0, collapse: 0, dock: 0 };
    const L = this.L;
    const o = 3 * i;
    const mix = (a, b, t) => a + (b - a) * t;
    let x = mix(mix(L.field[o], L.band[o], q.gather), L.trace[o], q.collapse);
    const y = mix(mix(L.field[o + 1], L.band[o + 1], q.gather), L.trace[o + 1], q.collapse);
    x = mix(x, -0.5 * this.width + 0.018 * this.width, q.dock);
    return [x, y];
  }

  // Nearest point to a world position in the field layout (the probe's readout).
  nearest(x, y) {
    const f = this.L.field;
    let best = 0;
    let bd = Infinity;
    for (let i = 0, o = 0; o < f.length; i++, o += 3) {
      const dx = f[o] - x;
      const dy = f[o + 1] - y;
      const d = dx * dx + dy * dy - this.run.depth[i] * 0.002;   // favour deeper calls slightly
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  render() {
    if (!this.lost) this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.geometry.dispose();
    this.points.material.dispose();
    this.renderer.dispose();
  }
}
