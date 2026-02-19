/**
 * graphEngine.ts
 * ──────────────
 * The core Canvas 2-D rendering engine.
 *
 * Draws in this order:
 *   1. Background
 *   2. Grid lines
 *   3. Axes + labels
 *   4. Expression curves (standard / polar / parametric / implicit)
 *   5. Derivative overlays, tangent lines, root markers
 *   6. Intersection markers
 */

import { Point, Viewport, Expression } from '../types';
import { getGridSpacing, formatAxisLabel, isPlottable } from '../utils/math';
import { ParsedExpression } from './mathParser';
import {
  evaluateStandard,
  evaluatePolar,
  evaluateParametric,
  evaluateImplicit,
  evaluateDerivative,
  evaluateTangentLine,
  EvalScope,
} from './evaluator';
import { findRoots, findIntersections } from './analysis';

/* ────────────────────────────────────────────────────────── */
/*  Internal render context                                    */
/* ────────────────────────────────────────────────────────── */

interface RC {
  ctx: CanvasRenderingContext2D;
  w: number;       // CSS width
  h: number;       // CSS height
  vp: Viewport;
  dark: boolean;
}

/* ────────────────────────────────────────────────────────── */
/*  Coordinate conversion                                      */
/* ────────────────────────────────────────────────────────── */

function toScreen(rc: RC, wx: number, wy: number): [number, number] {
  const sx = ((wx - rc.vp.xMin) / (rc.vp.xMax - rc.vp.xMin)) * rc.w;
  const sy = ((rc.vp.yMax - wy) / (rc.vp.yMax - rc.vp.yMin)) * rc.h;
  return [sx, sy];
}

/* ────────────────────────────────────────────────────────── */
/*  Grid                                                       */
/* ────────────────────────────────────────────────────────── */

function drawGrid(rc: RC) {
  const { ctx, vp, w, h, dark } = rc;
  const xs = getGridSpacing(vp.xMin, vp.xMax);
  const ys = getGridSpacing(vp.yMin, vp.yMax);

  ctx.lineWidth = 1;
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  // Vertical
  for (let x = Math.ceil(vp.xMin / xs) * xs; x <= vp.xMax; x += xs) {
    const [sx] = toScreen(rc, x, 0);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }
  // Horizontal
  for (let y = Math.ceil(vp.yMin / ys) * ys; y <= vp.yMax; y += ys) {
    const [, sy] = toScreen(rc, 0, y);
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Axes + labels                                              */
/* ────────────────────────────────────────────────────────── */

function drawAxes(rc: RC) {
  const { ctx, vp, w, h, dark } = rc;
  const axisCol = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const labelCol = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = axisCol;

  // X-axis
  if (vp.yMin <= 0 && vp.yMax >= 0) {
    const [, sy] = toScreen(rc, 0, 0);
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
  }
  // Y-axis
  if (vp.xMin <= 0 && vp.xMax >= 0) {
    const [sx] = toScreen(rc, 0, 0);
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
  }

  // Labels
  const xs = getGridSpacing(vp.xMin, vp.xMax);
  const ys = getGridSpacing(vp.yMin, vp.yMax);
  ctx.fillStyle = labelCol;
  ctx.font = '11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

  // X labels
  const [, osy] = toScreen(rc, 0, 0);
  const ly = Math.min(Math.max(osy + 14, 14), h - 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let x = Math.ceil(vp.xMin / xs) * xs; x <= vp.xMax; x += xs) {
    if (Math.abs(x) < xs * 0.01) continue;
    const [sx] = toScreen(rc, x, 0);
    ctx.fillText(formatAxisLabel(x), sx, ly);
  }

  // Y labels
  const [osx] = toScreen(rc, 0, 0);
  const lx = Math.min(Math.max(osx - 6, 28), w - 4);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = Math.ceil(vp.yMin / ys) * ys; y <= vp.yMax; y += ys) {
    if (Math.abs(y) < ys * 0.01) continue;
    const [, sy] = toScreen(rc, 0, y);
    ctx.fillText(formatAxisLabel(y), lx, sy);
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Curve drawing                                              */
/* ────────────────────────────────────────────────────────── */

function drawCurve(
  rc: RC,
  pts: Point[],
  color: string,
  lineWidth = 2.5,
  dashed = false,
) {
  const { ctx, vp } = rc;
  const yRange = vp.yMax - vp.yMin;
  const threshold = yRange * 5;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dashed ? [8, 5] : []);

  let pen = false;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const { x, y } = pts[i];
    if (!isPlottable(x) || !isPlottable(y)) { pen = false; continue; }

    // Discontinuity detection
    if (pen && i > 0) {
      const py = pts[i - 1].y;
      if (isPlottable(py) && Math.abs(y - py) > threshold) pen = false;
    }

    const [sx, sy] = toScreen(rc, x, y);
    if (!pen) { ctx.moveTo(sx, sy); pen = true; }
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawImplicit(rc: RC, segs: Point[][], color: string, lw = 2.5) {
  const { ctx } = rc;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  for (const s of segs) {
    if (s.length !== 2) continue;
    const [ax, ay] = toScreen(rc, s[0].x, s[0].y);
    const [bx, by] = toScreen(rc, s[1].x, s[1].y);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Marker                                                     */
/* ────────────────────────────────────────────────────────── */

function drawMarker(
  rc: RC,
  pt: Point,
  color: string,
  radius = 5,
  label?: string,
) {
  const { ctx, dark } = rc;
  const [sx, sy] = toScreen(rc, pt.x, pt.y);

  // ring
  ctx.beginPath();
  ctx.arc(sx, sy, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = dark ? '#0f0f23' : '#ffffff';
  ctx.fill();
  // dot
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (label) {
    ctx.fillStyle = dark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    // Background for readability
    const metrics = ctx.measureText(label);
    const pad = 3;
    ctx.fillStyle = dark ? 'rgba(15,15,35,0.85)' : 'rgba(255,255,255,0.85)';
    ctx.fillRect(sx + 8 - pad, sy - 18 - pad, metrics.width + pad * 2, 16 + pad * 2);
    ctx.fillStyle = dark ? '#e2e8f0' : '#1e293b';
    ctx.fillText(label, sx + 8, sy - 6);
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Build slider scope from expression                         */
/* ────────────────────────────────────────────────────────── */

function buildScope(expr: Expression): EvalScope {
  const s: EvalScope = {};
  for (const sl of expr.sliders) s[sl.name] = sl.value;
  return s;
}

/* ────────────────────────────────────────────────────────── */
/*  MAIN RENDER                                                */
/* ────────────────────────────────────────────────────────── */

export function render(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
  expressions: Expression[],
  parsedMap: Map<string, ParsedExpression>,
  theme: 'light' | 'dark',
  selectedId: string | null,
) {
  const rc: RC = { ctx, w: width, h: height, vp: viewport, dark: theme === 'dark' };

  // 1. Background
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = rc.dark ? '#0f0f23' : '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2 & 3. Grid + Axes
  drawGrid(rc);
  drawAxes(rc);

  // 4–5. Curves & overlays
  const standardList: { expr: Expression; parsed: ParsedExpression }[] = [];

  for (const expr of expressions) {
    if (!expr.visible || !expr.text.trim()) continue;
    const parsed = parsedMap.get(expr.id);
    if (!parsed || parsed.error) continue;

    const scope = buildScope(expr);

    switch (parsed.type) {
      case 'standard': {
        const pts = evaluateStandard(parsed, viewport, scope);
        drawCurve(rc, pts, expr.color);
        standardList.push({ expr, parsed });

        // Derivative overlay
        if (expr.showDerivative) {
          const dPts = evaluateDerivative(parsed, viewport, scope);
          drawCurve(rc, dPts, expr.color, 1.5, true);
        }

        // Tangent line
        if (expr.showTangent) {
          const tl = evaluateTangentLine(parsed, expr.tangentX, viewport, scope);
          if (tl) {
            drawCurve(rc, tl.linePoints, expr.color, 1.5, true);
            drawMarker(rc, tl.contactPoint, expr.color, 5);
          }
        }

        // Roots (only for selected expression to avoid clutter)
        if (expr.id === selectedId) {
          const roots = findRoots(parsed, viewport, scope);
          for (const r of roots) {
            drawMarker(rc, r, expr.color, 4, `(${r.x.toFixed(3)}, 0)`);
          }
        }
        break;
      }

      case 'polar': {
        const pts = evaluatePolar(parsed, scope);
        drawCurve(rc, pts, expr.color);
        break;
      }

      case 'parametric': {
        const pts = evaluateParametric(parsed, scope);
        drawCurve(rc, pts, expr.color);
        break;
      }

      case 'implicit': {
        const segs = evaluateImplicit(parsed, viewport, scope);
        drawImplicit(rc, segs, expr.color);
        break;
      }
    }
  }

  // 6. Intersections between visible standard curves (max 6 expressions)
  if (standardList.length >= 2 && standardList.length <= 6) {
    for (let i = 0; i < standardList.length; i++) {
      for (let j = i + 1; j < standardList.length; j++) {
        const a = standardList[i];
        const b = standardList[j];
        const ixns = findIntersections(
          a.parsed,
          b.parsed,
          viewport,
          buildScope(a.expr),
          buildScope(b.expr),
        );
        for (const pt of ixns) {
          drawMarker(rc, pt, rc.dark ? '#e2e8f0' : '#334155', 4,
            `(${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`);
        }
      }
    }
  }
}
