/**
 * Math utilities for axis labelling and number formatting.
 */

/** Compute a "nice" number (1, 2, 5 × 10^n) for clean axis ticks. */
export function niceNum(range: number, round: boolean): number {
  if (range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
}

/** Get a clean grid spacing for the given axis range. */
export function getGridSpacing(
  min: number,
  max: number,
  maxTicks: number = 10,
): number {
  const range = niceNum(max - min, false);
  return niceNum(range / (maxTicks - 1), true);
}

/** Format a number for axis labels. */
export function formatAxisLabel(value: number): string {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
    return value.toExponential(1);
  }
  return parseFloat(value.toPrecision(6)).toString();
}

/** Check whether a value can be plotted (finite and not NaN). */
export function isPlottable(v: number): boolean {
  return Number.isFinite(v) && !Number.isNaN(v);
}
