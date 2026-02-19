/**
 * SliderControl.tsx
 * ─────────────────
 * A single parameter slider with play/pause animation button.
 */

import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { SliderParam } from '../types';

interface Props {
  expressionId: string;
  slider: SliderParam;
}

export const SliderControl: React.FC<Props> = ({ expressionId, slider }) => {
  const update = useStore((s) => s.updateSliderValue);
  const toggleAnim = useStore((s) => s.toggleSliderAnimation);
  const raf = useRef(0);

  /* ── Animation loop ── */
  useEffect(() => {
    if (!slider.animating) return;

    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let next = slider.value + slider.animationSpeed * dt;
      if (next > slider.max) next = slider.min;
      update(expressionId, slider.name, next);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [slider.animating, slider.value, slider.min, slider.max,
      slider.animationSpeed, expressionId, slider.name, update]);

  return (
    <div className="flex items-center gap-2">
      {/* Label */}
      <span className="text-xs text-gray-400 font-mono w-5 flex-shrink-0">
        {slider.name}
      </span>

      {/* Play / pause */}
      <button
        onClick={() => toggleAnim(expressionId, slider.name)}
        className={`flex-shrink-0 p-0.5 rounded transition-colors ${
          slider.animating ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
        }`}
        title={slider.animating ? 'Pause' : 'Animate'}
      >
        {slider.animating ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Range slider */}
      <input
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={slider.value}
        onChange={(e) => update(expressionId, slider.name, parseFloat(e.target.value))}
        className="flex-1 h-1"
      />

      {/* Value readout */}
      <span className="text-xs text-gray-400 font-mono w-10 text-right flex-shrink-0">
        {slider.value.toFixed(1)}
      </span>
    </div>
  );
};
