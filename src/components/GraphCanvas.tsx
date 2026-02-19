/**
 * GraphCanvas.tsx
 * ───────────────
 * The main Canvas component. Handles:
 *   • HiDPI rendering (devicePixelRatio)
 *   • Mouse pan / wheel zoom / touch pinch-zoom
 *   • Cursor coordinate readout
 *   • Bridges the rendering engine to React state
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { render } from '../engine/graphEngine';
import { parseExpression, ParsedExpression } from '../engine/mathParser';

export const GraphCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Interaction refs (don't trigger re-render) ── */
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const touchDist = useRef<number | null>(null);

  /* ── Cursor readout ── */
  const [cursor, setCursor] = useState<{ wx: number; wy: number } | null>(null);

  /* ── Zustand selectors ── */
  const expressions  = useStore((s) => s.expressions);
  const viewport     = useStore((s) => s.viewport);
  const theme        = useStore((s) => s.theme);
  const selectedId   = useStore((s) => s.selectedExpressionId);
  const pan          = useStore((s) => s.pan);
  const zoom         = useStore((s) => s.zoom);

  /* ── Stable refs for pan/zoom/viewport (avoids re-attaching listeners) ── */
  const vpRef   = useRef(viewport);  vpRef.current   = viewport;
  const panRef  = useRef(pan);       panRef.current  = pan;
  const zoomRef = useRef(zoom);      zoomRef.current = zoom;

  /* ── Parse expressions — only re-runs when expression texts change ── */
  const parseKey = expressions.map((e) => `${e.id}:${e.text}`).join('|');

  const parsedMap = useMemo(() => {
    const m = new Map<string, ParsedExpression>();
    for (const e of expressions) {
      if (e.text.trim()) m.set(e.id, parseExpression(e.text));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseKey]);

  /* ────────────────────────────────────────────────────── */
  /*  Render to canvas                                      */
  /* ────────────────────────────────────────────────────── */

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const box = containerRef.current;
    if (!canvas || !box) return;

    const rect = box.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width  = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width  = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    render(ctx, rect.width, rect.height, viewport, expressions, parsedMap, theme, selectedId);
  }, [viewport, expressions, parsedMap, theme, selectedId]);

  useEffect(() => { paint(); }, [paint]);

  /* ── Resize observer ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(paint));
    ro.observe(el);
    return () => ro.disconnect();
  }, [paint]);

  /* ────────────────────────────────────────────────────── */
  /*  Coordinate helpers                                    */
  /* ────────────────────────────────────────────────────── */

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { wx: 0, wy: 0 };
    const v = vpRef.current;
    return {
      wx: v.xMin + (sx / rect.width)  * (v.xMax - v.xMin),
      wy: v.yMax - (sy / rect.height) * (v.yMax - v.yMin),
    };
  }, []);

  /* ────────────────────────────────────────────────────── */
  /*  Mouse handlers                                        */
  /* ────────────────────────────────────────────────────── */

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setCursor(screenToWorld(e.clientX - rect.left, e.clientY - rect.top));

    if (!dragging.current || !rect) return;
    const v = vpRef.current;
    const dx = ((e.clientX - lastPos.current.x) / rect.width)  * (v.xMax - v.xMin);
    const dy = ((e.clientY - lastPos.current.y) / rect.height) * (v.yMax - v.yMin);
    panRef.current(-dx, dy);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [screenToWorld]);

  const onMouseUp   = useCallback(() => { dragging.current = false; }, []);
  const onMouseLeave = useCallback(() => { dragging.current = false; setCursor(null); }, []);

  /* ── Wheel (non-passive so preventDefault works) ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const { wx, wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      zoomRef.current(e.deltaY > 0 ? 1.1 : 0.9, wx, wy);
    };

    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [screenToWorld]);

  /* ────────────────────────────────────────────────────── */
  /*  Touch handlers                                        */
  /* ────────────────────────────────────────────────────── */

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchDist.current = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchDist.current = Math.hypot(dx, dy);
      lastPos.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const v = vpRef.current;

    if (e.touches.length === 1 && dragging.current) {
      const dx = ((e.touches[0].clientX - lastPos.current.x) / rect.width)  * (v.xMax - v.xMin);
      const dy = ((e.touches[0].clientY - lastPos.current.y) / rect.height) * (v.yMax - v.yMin);
      panRef.current(-dx, dy);
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && touchDist.current !== null) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.hypot(dx, dy);
      const factor = touchDist.current / newDist;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const { wx, wy } = screenToWorld(cx, cy);
      zoomRef.current(factor, wx, wy);
      touchDist.current = newDist;
    }
  }, [screenToWorld]);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    touchDist.current = null;
  }, []);

  /* ────────────────────────────────────────────────────── */
  /*  JSX                                                   */
  /* ────────────────────────────────────────────────────── */

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ cursor: dragging.current ? 'grabbing' : 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {/* Cursor coordinate readout */}
      {cursor && (
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md text-xs font-mono
          bg-black/60 text-white dark:bg-white/15 dark:text-gray-200
          pointer-events-none select-none backdrop-blur-sm">
          ({cursor.wx.toFixed(3)}, {cursor.wy.toFixed(3)})
        </div>
      )}
    </div>
  );
};
