/**
 * Toolbar.tsx
 * ───────────
 * Top navigation bar with logo, zoom controls,
 * table toggle, and dark/light theme switch.
 */

import React from 'react';
import { useStore } from '../store/useStore';

export const Toolbar: React.FC = () => {
  const theme          = useStore((s) => s.theme);
  const toggleTheme    = useStore((s) => s.toggleTheme);
  const zoom           = useStore((s) => s.zoom);
  const resetViewport  = useStore((s) => s.resetViewport);
  const viewport       = useStore((s) => s.viewport);
  const toggleTable    = useStore((s) => s.toggleTable);
  const showTable      = useStore((s) => s.showTable);

  const cx = (viewport.xMin + viewport.xMax) / 2;
  const cy = (viewport.yMin + viewport.yMax) / 2;

  return (
    <div className="flex items-center justify-between px-4 py-2
      border-b border-gray-200 dark:border-gray-800/60
      bg-white dark:bg-[#11112a] flex-shrink-0">

      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600
          flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 12 C 6 4, 10 20, 14 8 C 16 4, 20 16, 22 12" />
          </svg>
        </div>
        <span className="font-bold text-gray-800 dark:text-white text-sm tracking-tight select-none">
          GraphCalc
        </span>
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-0.5">
        {/* Table */}
        <ToolBtn
          active={showTable}
          title="Toggle table"
          onClick={toggleTable}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </ToolBtn>

        <Divider />

        {/* Zoom in */}
        <ToolBtn title="Zoom in" onClick={() => zoom(0.8, cx, cy)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="11" y1="8" x2="11" y2="14" />
          </svg>
        </ToolBtn>

        {/* Zoom out */}
        <ToolBtn title="Zoom out" onClick={() => zoom(1.25, cx, cy)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </ToolBtn>

        {/* Reset */}
        <ToolBtn title="Reset view" onClick={resetViewport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </ToolBtn>

        <Divider />

        {/* Theme */}
        <ToolBtn title={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggleTheme}>
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </ToolBtn>
      </div>
    </div>
  );
};

/* ── Small helper components ── */

function ToolBtn({
  children, onClick, title, active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-500/20 text-blue-400'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />;
}
