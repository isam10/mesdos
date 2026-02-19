/**
 * ExpressionRow.tsx
 * ─────────────────
 * A single row in the expression panel.
 *
 * Features:
 *   • Color-coded left border
 *   • Visibility toggle (filled circle)
 *   • Inline text input with debounced parsing
 *   • Delete button (appears on hover)
 *   • Derivative / tangent-line toggles (for selected standard exprs)
 *   • Auto-detected parameter sliders
 */

import React, { useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Expression } from '../types';
import { parseExpression, createSliders } from '../engine/mathParser';
import { useDebounce } from '../hooks/useDebounce';
import { SliderControl } from './SliderControl';

interface Props {
  expression: Expression;
  index: number;
}

export const ExpressionRow: React.FC<Props> = ({ expression, index }) => {
  const updateText       = useStore((s) => s.updateExpressionText);
  const remove           = useStore((s) => s.removeExpression);
  const toggleVis        = useStore((s) => s.toggleExpressionVisibility);
  const setError         = useStore((s) => s.setExpressionError);
  const setType          = useStore((s) => s.setExpressionType);
  const toggleDeriv      = useStore((s) => s.toggleDerivative);
  const toggleTan        = useStore((s) => s.toggleTangent);
  const setTanX          = useStore((s) => s.setTangentX);
  const setSliders       = useStore((s) => s.setSliders);
  const selectExpr       = useStore((s) => s.selectExpression);
  const selectedId       = useStore((s) => s.selectedExpressionId);

  const isSelected = selectedId === expression.id;
  const debText = useDebounce(expression.text, 200);

  /* ── Re-parse on debounced text change ── */
  useEffect(() => {
    if (!debText.trim()) {
      setError(expression.id, null);
      setSliders(expression.id, []);
      return;
    }
    const parsed = parseExpression(debText);
    if (parsed.error) {
      setError(expression.id, parsed.error);
    } else {
      setError(expression.id, null);
      setType(expression.id, parsed.type);
      const next = createSliders(parsed.freeVariables, expression.sliders);
      const nameKey = (arr: typeof next) => arr.map((s) => s.name).join(',');
      if (nameKey(next) !== nameKey(expression.sliders)) {
        setSliders(expression.id, next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debText, expression.id]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateText(expression.id, e.target.value),
    [expression.id, updateText],
  );

  /* ── Type badge label ── */
  const typeBadge =
    expression.type === 'polar'       ? 'θ' :
    expression.type === 'parametric'  ? 't' :
    expression.type === 'implicit'    ? '=' : null;

  return (
    <div
      className={`group border-l-4 transition-all duration-150 ${
        isSelected
          ? 'bg-white/10 dark:bg-white/5'
          : 'hover:bg-white/5 dark:hover:bg-white/[0.03]'
      }`}
      style={{ borderLeftColor: expression.color }}
      onClick={() => selectExpr(expression.id)}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Index */}
        <span className="text-[10px] text-gray-400 w-4 text-right font-mono select-none">
          {index + 1}
        </span>

        {/* Visibility toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleVis(expression.id); }}
          className="w-4 h-4 rounded-full flex-shrink-0 transition-all border-2"
          style={{
            backgroundColor: expression.visible ? expression.color : 'transparent',
            borderColor: expression.visible ? expression.color : '#6b7280',
          }}
          title={expression.visible ? 'Hide' : 'Show'}
        />

        {/* Input */}
        <input
          type="text"
          value={expression.text}
          onChange={onChange}
          placeholder="Enter expression…"
          className="flex-1 bg-transparent outline-none text-sm font-mono
            text-gray-800 dark:text-gray-200 placeholder-gray-400
            dark:placeholder-gray-600 min-w-0"
          spellCheck={false}
          autoComplete="off"
        />

        {/* Type badge */}
        {typeBadge && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700
            text-gray-500 dark:text-gray-400 font-bold uppercase select-none flex-shrink-0">
            {typeBadge}
          </span>
        )}

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); remove(expression.id); }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400
            transition-opacity p-0.5 rounded flex-shrink-0"
          title="Remove"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Error ── */}
      {expression.error && (
        <div className="px-3 pb-2 pl-11 text-xs text-red-400 truncate">
          ⚠ {expression.error}
        </div>
      )}

      {/* ── Analysis toggles (standard, selected, no error) ── */}
      {isSelected && expression.text.trim() && !expression.error && expression.type === 'standard' && (
        <div className="px-3 pb-2 pl-11 flex flex-wrap gap-2">
          <button
            onClick={() => toggleDeriv(expression.id)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              expression.showDerivative
                ? 'border-blue-400 bg-blue-400/20 text-blue-300'
                : 'border-gray-600 text-gray-400 hover:border-gray-400'
            }`}
          >
            f′(x)
          </button>
          <button
            onClick={() => toggleTan(expression.id)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              expression.showTangent
                ? 'border-blue-400 bg-blue-400/20 text-blue-300'
                : 'border-gray-600 text-gray-400 hover:border-gray-400'
            }`}
          >
            Tangent
          </button>

          {expression.showTangent && (
            <div className="flex items-center gap-1 w-full mt-1">
              <span className="text-xs text-gray-400 flex-shrink-0">x₀</span>
              <input
                type="range"
                min={-10} max={10} step={0.05}
                value={expression.tangentX}
                onChange={(e) => setTanX(expression.id, parseFloat(e.target.value))}
                className="flex-1 h-1"
              />
              <span className="text-xs text-gray-400 w-10 text-right font-mono">
                {expression.tangentX.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Parameter sliders ── */}
      {expression.sliders.length > 0 && isSelected && (
        <div className="px-3 pb-2 pl-11 space-y-1.5">
          {expression.sliders.map((sl) => (
            <SliderControl key={sl.name} expressionId={expression.id} slider={sl} />
          ))}
        </div>
      )}
    </div>
  );
};
