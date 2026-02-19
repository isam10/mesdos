/**
 * evaluator.ts
 * ────────────
 * Evaluates compiled math.js expressions over ranges of the independent
 * variable, producing arrays of {x,y} Points ready for the renderer.
 *
 * Supports: standard y=f(x), polar r(θ), parametric (x(t),y(t)),
 * implicit f(x,y)=0 via marching squares, numerical derivatives,
 * and tangent-line evaluation.
 */

import { EvalFunction } from 'mathjs';
import { Point, Viewport } from '../types';
import { ParsedExpression } from './mathParser';
import { isPlottable } from '../utils/math';

/* ── Scope type used for evaluation ── */
export interface EvalScope {
  [key: string]: number;
}

/* ────────────────────────────────────────────────────────── */
/*  Safe eval wrapper                                         */
/* ────────────────────────────────────────────────────────── */

function safeEval(fn: EvalFunction, scope: EvalScope): number {
  try {
    const r = fn.evaluate(scope);
    return typeof r === 'number' ? r : NaN;
  } catch {
    return NaN;
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Standard y = f(x)                                         */
/* ────────────────────────────────────────────────────────── */

export function evaluateStandard(
  parsed: ParsedExpression,
  viewport: Viewport,
  sliderScope: EvalScope,
  numPoints = 2000,
): Point[] {
  if (!parsed.compiled) return [];
  const { xMin, xMax } = viewport;
  const dx = (xMax - xMin) / numPoints;
  const pts: Point[] = new Array(numPoints + 1);

  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + i * dx;
    pts[i] = { x, y: safeEval(parsed.compiled, { ...sliderScope, x }) };
  }
  return pts;
}

/* ────────────────────────────────────────────────────────── */
/*  Polar r = f(θ)                                            */
/* ────────────────────────────────────────────────────────── */

export function evaluatePolar(
  parsed: ParsedExpression,
  sliderScope: EvalScope,
  thetaMin = 0,
  thetaMax = 4 * Math.PI,
  numPoints = 3000,
): Point[] {
  if (!parsed.compiled) return [];
  const dTheta = (thetaMax - thetaMin) / numPoints;
  const pts: Point[] = new Array(numPoints + 1);

  for (let i = 0; i <= numPoints; i++) {
    const theta = thetaMin + i * dTheta;
    const r = safeEval(parsed.compiled, { ...sliderScope, theta });
    if (isPlottable(r)) {
      pts[i] = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
    } else {
      pts[i] = { x: NaN, y: NaN };
    }
  }
  return pts;
}

/* ────────────────────────────────────────────────────────── */
/*  Parametric (x(t), y(t))                                   */
/* ────────────────────────────────────────────────────────── */

export function evaluateParametric(
  parsed: ParsedExpression,
  sliderScope: EvalScope,
  tMin = -10,
  tMax = 10,
  numPoints = 2000,
): Point[] {
  if (!parsed.compiledX || !parsed.compiledY) return [];
  const dt = (tMax - tMin) / numPoints;
  const pts: Point[] = new Array(numPoints + 1);

  for (let i = 0; i <= numPoints; i++) {
    const t = tMin + i * dt;
    pts[i] = {
      x: safeEval(parsed.compiledX, { ...sliderScope, t }),
      y: safeEval(parsed.compiledY, { ...sliderScope, t }),
    };
  }
  return pts;
}

/* ────────────────────────────────────────────────────────── */
/*  Implicit f(x,y)=0  — marching squares                    */
/* ────────────────────────────────────────────────────────── */

export function evaluateImplicit(
  parsed: ParsedExpression,
  viewport: Viewport,
  sliderScope: EvalScope,
  resolution = 160,
): Point[][] {
  if (!parsed.compiled) return [];

  const { xMin, xMax, yMin, yMax } = viewport;
  const dx = (xMax - xMin) / resolution;
  const dy = (yMax - yMin) / resolution;

  // Build value grid
  const grid: number[][] = [];
  for (let i = 0; i <= resolution; i++) {
    grid[i] = [];
    for (let j = 0; j <= resolution; j++) {
      const x = xMin + i * dx;
      const y = yMin + j * dy;
      grid[i][j] = safeEval(parsed.compiled, { ...sliderScope, x, y });
    }
  }

  const segments: Point[][] = [];

  const lerp = (a: number, b: number, va: number, vb: number) =>
    Math.abs(va - vb) < 1e-12 ? (a + b) / 2 : a + ((b - a) * -va) / (vb - va);

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x0 = xMin + i * dx;
      const x1 = xMin + (i + 1) * dx;
      const y0 = yMin + j * dy;
      const y1 = yMin + (j + 1) * dy;

      const v00 = grid[i][j];
      const v10 = grid[i + 1][j];
      const v11 = grid[i + 1][j + 1];
      const v01 = grid[i][j + 1];

      if (
        !isPlottable(v00) ||
        !isPlottable(v10) ||
        !isPlottable(v11) ||
        !isPlottable(v01)
      )
        continue;

      let idx = 0;
      if (v00 > 0) idx |= 1;
      if (v10 > 0) idx |= 2;
      if (v11 > 0) idx |= 4;
      if (v01 > 0) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      const B: Point = { x: lerp(x0, x1, v00, v10), y: y0 };
      const R: Point = { x: x1, y: lerp(y0, y1, v10, v11) };
      const T: Point = { x: lerp(x0, x1, v01, v11), y: y1 };
      const L: Point = { x: x0, y: lerp(y0, y1, v00, v01) };

      const add = (p1: Point, p2: Point) => segments.push([p1, p2]);

      // Standard marching-squares 16-case lookup
      switch (idx) {
        case 1: case 14: add(B, L); break;
        case 2: case 13: add(R, B); break;
        case 3: case 12: add(R, L); break;
        case 4: case 11: add(T, R); break;
        case 5: add(B, L); add(T, R); break;   // saddle
        case 6: case 9:  add(T, B); break;
        case 7: case 8:  add(T, L); break;
        case 10: add(R, B); add(L, T); break;  // saddle
      }
    }
  }

  return segments;
}

/* ────────────────────────────────────────────────────────── */
/*  Numerical derivative  (central difference, h=1e-7)        */
/* ────────────────────────────────────────────────────────── */

export function evaluateDerivative(
  parsed: ParsedExpression,
  viewport: Viewport,
  sliderScope: EvalScope,
  numPoints = 2000,
): Point[] {
  if (!parsed.compiled) return [];
  const { xMin, xMax } = viewport;
  const dx = (xMax - xMin) / numPoints;
  const h = 1e-7;
  const pts: Point[] = new Array(numPoints + 1);

  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + i * dx;
    const fp = safeEval(parsed.compiled, { ...sliderScope, x: x + h });
    const fm = safeEval(parsed.compiled, { ...sliderScope, x: x - h });
    pts[i] = { x, y: (fp - fm) / (2 * h) };
  }
  return pts;
}

/* ────────────────────────────────────────────────────────── */
/*  Tangent line at x = a                                     */
/* ────────────────────────────────────────────────────────── */

export function evaluateTangentLine(
  parsed: ParsedExpression,
  a: number,
  viewport: Viewport,
  sliderScope: EvalScope,
): { linePoints: Point[]; contactPoint: Point } | null {
  if (!parsed.compiled) return null;
  const h = 1e-7;
  const ya = safeEval(parsed.compiled, { ...sliderScope, x: a });
  const fp = safeEval(parsed.compiled, { ...sliderScope, x: a + h });
  const fm = safeEval(parsed.compiled, { ...sliderScope, x: a - h });
  const slope = (fp - fm) / (2 * h);

  if (!isPlottable(ya) || !isPlottable(slope)) return null;

  const { xMin, xMax } = viewport;
  return {
    linePoints: [
      { x: xMin, y: ya + slope * (xMin - a) },
      { x: xMax, y: ya + slope * (xMax - a) },
    ],
    contactPoint: { x: a, y: ya },
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Point evaluation                                          */
/* ────────────────────────────────────────────────────────── */

export function evaluateAt(
  parsed: ParsedExpression,
  x: number,
  sliderScope: EvalScope,
): number {
  if (!parsed.compiled) return NaN;
  return safeEval(parsed.compiled, { ...sliderScope, x });
}
