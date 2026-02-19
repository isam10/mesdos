/**
 * App.tsx
 * ───────
 * Root component — bootstraps the layout and loads
 * a handful of pre-seeded example expressions.
 */

import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Toolbar } from './components/Toolbar';
import { ExpressionPanel } from './components/ExpressionPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { Table } from './components/Table';

/** Pre-loaded example equations that showcase different curve types. */
const EXAMPLES = [
  'sin(x)',
  'x^2 / 4',
  'cos(2*x)',
];

const App: React.FC = () => {
  const theme         = useStore((s) => s.theme);
  const addExpression  = useStore((s) => s.addExpression);
  const expressions   = useStore((s) => s.expressions);

  /* ── Seed example expressions on first mount ── */
  useEffect(() => {
    if (expressions.length === 0) {
      EXAMPLES.forEach((t) => addExpression(t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync dark class on <html> ── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden
      bg-white dark:bg-[#0f0f23] text-gray-900 dark:text-gray-100 transition-colors">

      {/* Top bar */}
      <Toolbar />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 overflow-hidden
          max-lg:w-72 max-md:w-64">
          <ExpressionPanel />
        </div>

        {/* Graph + Table */}
        <div className="flex-1 relative min-w-0">
          <GraphCanvas />
          <Table />
        </div>
      </div>
    </div>
  );
};

export default App;
