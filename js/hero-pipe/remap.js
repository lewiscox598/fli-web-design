// Copied from cga-redesign proto/pipe3d:prototypes/pipe3d/src/scene/remap.js (pipe3d prototype,
// 24 September 2026). Kept byte-identical below this header; change it here only with a reason.

import * as THREE from 'three';
import { pipeToWorld } from './pipespace.js';
import { PIPE5 } from './builders.js';

// A mesh or line whose vertices live in pipe space. remap() writes world positions from the
// (s, a, r0, rk, rg) coords through pipeToWorld, so the function the tests check is the one that draws.
export class PipeObject {
  constructor(object3d, coords, R, { normals = false, dashed = false } = {}) {
    this.object = object3d;
    this.coords = coords;
    this.R = R;
    this.normals = normals;
    this.dashed = dashed;
    const n = coords.length / PIPE5;
    object3d.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  }

  remap({ u, k, gap }) {
    const c = this.coords;
    const geom = this.object.geometry;
    const pos = geom.getAttribute('position');
    const arr = pos.array;
    const tmp = [0, 0, 0];
    for (let i = 0, n = c.length / PIPE5; i < n; i++) {
      const o = i * PIPE5;
      pipeToWorld(c[o], c[o + 1], c[o + 2] + k * c[o + 3] + gap * c[o + 4], u, this.R, tmp);
      arr[i * 3] = tmp[0];
      arr[i * 3 + 1] = tmp[1];
      arr[i * 3 + 2] = tmp[2];
    }
    pos.needsUpdate = true;
    if (this.normals) geom.computeVertexNormals();
    if (this.dashed) this.object.computeLineDistances();
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
  }
}

// A single object (a label sprite) placed at one pipe-space point.
export class PipePoint {
  constructor(object3d, coord, R) {
    this.object = object3d;
    this.coord = coord;
    this.R = R;
  }

  remap({ u, k, gap }) {
    const c = this.coord;
    const p = pipeToWorld(c[0], c[1], c[2] + k * c[3] + gap * c[4], u, this.R);
    this.object.position.set(p[0], p[1], p[2]);
  }
}
