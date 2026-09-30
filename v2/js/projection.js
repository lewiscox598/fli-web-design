// Equal Earth projection, matching d3-geo's geoEqualEarth for a given scale and translate, so the
// browser can place footprint nodes on the pre-built dot map without loading d3.
// Pure, unit-tested against d3-geo (tests/v2/projection.test.mjs).

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
const RAD = Math.PI / 180;

export function equalEarth(lon, lat, { scale, translate }) {
  const lambda = lon * RAD;
  const l = Math.asin(M * Math.sin(lat * RAD));
  const l2 = l * l;
  const l6 = l2 * l2 * l2;
  const x = (lambda * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
  const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
  return [x * scale + translate[0], -y * scale + translate[1]];
}
