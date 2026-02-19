/**
 * ExpressionPanel.tsx
 * ───────────────────
 * Left-hand side panel that lists all expression rows
 * and provides an "Add Expression" button.
 */

import React from 'react';
import { useStore } from '../store/useStore';
import { ExpressionRow } from './ExpressionRow';

export const ExpressionPanel: React.FC = () => {
  const expressions   = useStore((s) => s.expressions);
  const addExpression  = useStore((s) => s.addExpression);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#14142b]
      border-r border-gray-200 dark:border-gray-800/60">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800/60 flex-shrink-0">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400
          tracking-widest uppercase select-none">
          Expressions
        </h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {expressions.map((e, i) => (
          <ExpressionRow key={e.id} expression={e} index={i} />
        ))}

        {expressions.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-600 text-xs mt-10 px-6 select-none">
            No expressions yet. Click the button below to get started.
          </p>
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800/60 flex-shrink-0">
        <button
          onClick={() => addExpression()}
          className="w-full py-2 rounded-lg border-2 border-dashed
            border-gray-300 dark:border-gray-700
            text-gray-400 dark:text-gray-500
            hover:border-blue-400 hover:text-blue-400
            dark:hover:border-blue-500 dark:hover:text-blue-400
            transition-colors text-sm font-medium active:scale-[0.98]"
        >
          + Add Expression
        </button>
      </div>
    </div>
  );
};
