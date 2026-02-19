import { create } from 'zustand';
import { Expression, Viewport, SliderParam } from '../types';
import { COLORS } from '../utils/colors';

/* ────────────────────────────────────────────────────────── */
/*  Store interface                                           */
/* ────────────────────────────────────────────────────────── */
interface GraphStore {
  /* ── state ── */
  expressions: Expression[];
  viewport: Viewport;
  theme: 'light' | 'dark';
  showTable: boolean;
  selectedExpressionId: string | null;
  colorIndex: number;

  /* ── expression actions ── */
  addExpression: (text?: string) => void;
  removeExpression: (id: string) => void;
  updateExpressionText: (id: string, text: string) => void;
  toggleExpressionVisibility: (id: string) => void;
  setExpressionType: (id: string, type: Expression['type']) => void;
  setExpressionError: (id: string, error: string | null) => void;
  toggleDerivative: (id: string) => void;
  toggleTangent: (id: string) => void;
  setTangentX: (id: string, x: number) => void;
  setSliders: (id: string, sliders: SliderParam[]) => void;
  updateSliderValue: (id: string, name: string, value: number) => void;
  toggleSliderAnimation: (id: string, name: string) => void;
  selectExpression: (id: string | null) => void;

  /* ── viewport actions ── */
  setViewport: (viewport: Viewport) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (factor: number, centerX: number, centerY: number) => void;
  resetViewport: () => void;

  /* ── UI actions ── */
  toggleTheme: () => void;
  toggleTable: () => void;
}

/* ────────────────────────────────────────────────────────── */
/*  Defaults                                                  */
/* ────────────────────────────────────────────────────────── */
const DEFAULT_VIEWPORT: Viewport = {
  xMin: -10,
  xMax: 10,
  yMin: -7,
  yMax: 7,
};

let nextId = 1;
const uid = () => `expr-${nextId++}`;

/* ────────────────────────────────────────────────────────── */
/*  Store                                                     */
/* ────────────────────────────────────────────────────────── */
export const useStore = create<GraphStore>((set, get) => ({
  expressions: [],
  viewport: { ...DEFAULT_VIEWPORT },
  theme: 'dark',
  showTable: false,
  selectedExpressionId: null,
  colorIndex: 0,

  /* ── expression CRUD ── */
  addExpression: (text = '') => {
    const color = COLORS[get().colorIndex % COLORS.length];
    const id = uid();
    set((s) => ({
      expressions: [
        ...s.expressions,
        {
          id,
          text,
          color,
          visible: true,
          type: 'standard' as const,
          error: null,
          showDerivative: false,
          showTangent: false,
          tangentX: 0,
          sliders: [],
        },
      ],
      colorIndex: s.colorIndex + 1,
      selectedExpressionId: id,
    }));
  },

  removeExpression: (id) =>
    set((s) => ({
      expressions: s.expressions.filter((e) => e.id !== id),
      selectedExpressionId:
        s.selectedExpressionId === id ? null : s.selectedExpressionId,
    })),

  updateExpressionText: (id, text) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, text, error: null } : e,
      ),
    })),

  toggleExpressionVisibility: (id) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, visible: !e.visible } : e,
      ),
    })),

  setExpressionType: (id, type) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, type } : e,
      ),
    })),

  setExpressionError: (id, error) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, error } : e,
      ),
    })),

  toggleDerivative: (id) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, showDerivative: !e.showDerivative } : e,
      ),
    })),

  toggleTangent: (id) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, showTangent: !e.showTangent } : e,
      ),
    })),

  setTangentX: (id, x) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, tangentX: x } : e,
      ),
    })),

  setSliders: (id, sliders) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id ? { ...e, sliders } : e,
      ),
    })),

  updateSliderValue: (id, name, value) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id
          ? {
              ...e,
              sliders: e.sliders.map((sl) =>
                sl.name === name ? { ...sl, value } : sl,
              ),
            }
          : e,
      ),
    })),

  toggleSliderAnimation: (id, name) =>
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id
          ? {
              ...e,
              sliders: e.sliders.map((sl) =>
                sl.name === name ? { ...sl, animating: !sl.animating } : sl,
              ),
            }
          : e,
      ),
    })),

  selectExpression: (id) => set({ selectedExpressionId: id }),

  /* ── viewport ── */
  setViewport: (viewport) => set({ viewport }),

  pan: (dx, dy) =>
    set((s) => ({
      viewport: {
        xMin: s.viewport.xMin - dx,
        xMax: s.viewport.xMax - dx,
        yMin: s.viewport.yMin - dy,
        yMax: s.viewport.yMax - dy,
      },
    })),

  zoom: (factor, cx, cy) =>
    set((s) => {
      const { xMin, xMax, yMin, yMax } = s.viewport;
      return {
        viewport: {
          xMin: cx - (cx - xMin) * factor,
          xMax: cx + (xMax - cx) * factor,
          yMin: cy - (cy - yMin) * factor,
          yMax: cy + (yMax - cy) * factor,
        },
      };
    }),

  resetViewport: () => set({ viewport: { ...DEFAULT_VIEWPORT } }),

  /* ── UI ── */
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

  toggleTable: () => set((s) => ({ showTable: !s.showTable })),
}));
