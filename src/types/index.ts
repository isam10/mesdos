/* ─── Slider parameter attached to an expression ─── */
export interface SliderParam {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  animating: boolean;
  animationSpeed: number;
}

/* ─── Supported expression types ─── */
export type ExpressionType = 'standard' | 'polar' | 'parametric' | 'implicit';

/* ─── A single expression row ─── */
export interface Expression {
  id: string;
  text: string;
  color: string;
  visible: boolean;
  type: ExpressionType;
  error: string | null;
  showDerivative: boolean;
  showTangent: boolean;
  tangentX: number;
  sliders: SliderParam[];
}

/* ─── Visible window bounds ─── */
export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/* ─── Simple 2‑D point ─── */
export interface Point {
  x: number;
  y: number;
}
