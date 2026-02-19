/**
 * analysis.ts
 * ───────────
 * Higher-level mathematical analysis: root-finding and
 * intersection detection via bisection.
 */

import { ParsedExpression } from './mathParser';
import { evaluateAt, EvalScope } from './evaluator';
import { Point, Viewport } from '../types';
import { isPlottable } from '../utils/math';

/* ────────────────────────────────────────────────────────── */
/*  Root finding  f(x) = 0                                    */
/* ────────────────────────────────────────────────────────── */

export function findRoots(
  parsed: ParsedExpression,
  viewport: Viewport,
  sliderScope: EvalScope,
  numSamples = 400,
  tolerance = 1e-10,
): Point[] {
  if (!parsed.compiled) return [];

  const roots: Point[] = [];
  const { xMin, xMax } = viewport;
  const dx = (xMax - xMin) / numSamples;

  let prevY = evaluateAt(parsed, xMin, sliderScope);

  for (let i = 1; i <= numSamples; i++) {
    const x = xMin + i * dx;
    const y = evaluateAt(parsed, x, sliderScope);

    if (!isPlottable(prevY) || !isPlottable(y)) {
      prevY = y;
      continue;
    }

    if (prevY * y < 0) {
      // Bisection
      let lo = x - dx;
      let hi = x;
      for (let j = 0; j < 50; j++) {
        const mid = (lo + hi) / 2;
        const mv = evaluateAt(parsed, mid, sliderScope);
        if (Math.abs(mv) < tolerance) {
          roots.push({ x: mid, y: 0 });
          break;
        }
        if (evaluateAt(parsed, lo, sliderScope) * mv < 0) hi = mid;
        else lo = mid;
        if (j === 49) roots.push({ x: (lo + hi) / 2, y: 0 });
      }
    }

    prevY = y;
  }

  return roots;
}

/* ────────────────────────────────────────────────────────── */
/*  Intersection detection  f(x) = g(x)                      */
/* ────────────────────────────────────────────────────────── */

export function findIntersections(
  p1: ParsedExpression,
  p2: ParsedExpression,
  viewport: Viewport,
  scope1: EvalScope,
  scope2: EvalScope,
  numSamples = 400,
  tolerance = 1e-10,
): Point[] {
  if (!p1.compiled || !p2.compiled) return [];

  const pts: Point[] = [];
  const { xMin, xMax } = viewport;
  const dx = (xMax - xMin) / numSamples;

  let prevDiff =
    evaluateAt(p1, xMin, scope1) - evaluateAt(p2, xMin, scope2);

  for (let i = 1; i <= numSamples; i++) {
    const x = xMin + i * dx;
    const diff = evaluateAt(p1, x, scope1) - evaluateAt(p2, x, scope2);

    if (!isPlottable(prevDiff) || !isPlottable(diff)) {
      prevDiff = diff;
      continue;
    }

    if (prevDiff * diff < 0) {
      let lo = x - dx;
      let hi = x;
      for (let j = 0; j < 50; j++) {
        const mid = (lo + hi) / 2;
        const md =
          evaluateAt(p1, mid, scope1) - evaluateAt(p2, mid, scope2);
        if (Math.abs(md) < tolerance) {
          pts.push({ x: mid, y: evaluateAt(p1, mid, scope1) });
          break;
        }
        const ld =
          evaluateAt(p1, lo, scope1) - evaluateAt(p2, lo, scope2);
        if (ld * md < 0) hi = mid;
        else lo = mid;
        if (j === 49) {
          const fm = (lo + hi) / 2;
          pts.push({ x: fm, y: evaluateAt(p1, fm, scope1) });
        }
      }
    }

    prevDiff = diff;
  }

  return pts;
}
