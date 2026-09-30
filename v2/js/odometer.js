// Odometer figures for the v2 console: each digit rolls in its own column to its final value, and
// separators (commas, %, units) stay fixed. Pure, unit-tested (tests/v2/odometer.test.mjs); the
// DOM and the roll live in sections/console.js.

export function odometerColumns(text) {
  return [...text].map((ch) => (ch >= "0" && ch <= "9" ? { type: "digit", value: Number(ch) } : { type: "sep", value: ch }));
}
