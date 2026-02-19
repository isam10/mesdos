/**
 * Table.tsx
 * ─────────
 * Numerical evaluation table that shows x / y values
 * for all visible standard expressions.
 */

import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { parseExpression } from '../engine/mathParser';
import { evaluateAt } from '../engine/evaluator';

export const Table: React.FC = () => {
  const expressions = useStore((s) => s.expressions);
  const viewport    = useStore((s) => s.viewport);
  const showTable   = useStore((s) => s.showTable);

  const data = useMemo(() => {
    const visible = expressions.filter(
      (e) => e.visible && e.text.trim() && !e.error && e.type === 'standard',
    );
    if (visible.length === 0) return null;

    const { xMin, xMax } = viewport;
    const step = (xMax - xMin) / 20;
    const parsed = visible.map((e) => ({
      expr: e,
      parsed: parseExpression(e.text),
      scope: Object.fromEntries(e.sliders.map((s) => [s.name, s.value])),
    }));

    const rows: { x: number; vals: string[] }[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = parseFloat((xMin + i * step).toFixed(6));
      const vals = parsed.map(({ parsed: p, scope }) => {
        if (p.error || !p.compiled) return '—';
        const y = evaluateAt(p, x, scope);
        return Number.isFinite(y) ? parseFloat(y.toFixed(6)).toString() : '—';
      });
      rows.push({ x, vals });
    }

    return { exprs: visible, rows };
  }, [expressions, viewport]);

  if (!showTable || !data) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-60 z-10
      bg-white/95 dark:bg-[#14142b]/95 backdrop-blur-sm
      border-t border-gray-200 dark:border-gray-800/60 overflow-auto">
      {/* Header */}
      <table className="w-full text-xs font-mono border-collapse min-w-max">
        <thead className="sticky top-0 bg-white dark:bg-[#14142b] z-10">
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 w-24 font-bold">
              x
            </th>
            {data.exprs.map((e) => (
              <th
                key={e.id}
                className="px-3 py-2 text-left font-bold min-w-[110px]"
                style={{ color: e.color }}
              >
                {e.text.length > 22 ? e.text.slice(0, 22) + '…' : e.text}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800/40
                hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{row.x}</td>
              {row.vals.map((v, j) => (
                <td key={j} className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
