/**
 * mathParser.ts
 * ─────────────
 * Parses user-entered expression strings into compiled math.js objects.
 * Detects expression type (standard / polar / parametric / implicit),
 * identifies free variables for automatic slider creation, and adds
 * light-weight implicit-multiplication pre-processing so that inputs
 * like `2x` or `3sin(x)` Just Work™.
 */

import { compile, parse, MathNode, EvalFunction } from 'mathjs';
import { ExpressionType, SliderParam } from '../types';

/* ────────────────────────────────────────────────────────── */
/*  Constants                                                  */
/* ────────────────────────────────────────────────────────── */

/** Names that are NOT free variables (math built-ins & variables). */
const BUILTIN_NAMES = new Set([
  // coordinates
  'x', 'y', 't', 'theta',
  // constants
  'e', 'pi', 'i', 'Infinity', 'NaN', 'E', 'PI',
  // trig
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'sec', 'csc', 'cot',
  // logarithms / exponentials
  'log', 'log2', 'log10', 'ln', 'exp',
  // powers / roots
  'sqrt', 'cbrt', 'pow', 'nthRoot',
  // rounding
  'abs', 'ceil', 'floor', 'round', 'sign',
  // misc
  'min', 'max', 'mod', 'factorial', 'gamma', 'random',
]);

/* ────────────────────────────────────────────────────────── */
/*  Public types                                               */
/* ────────────────────────────────────────────────────────── */

export interface ParsedExpression {
  type: ExpressionType;
  /** Compiled evaluator for standard / polar / implicit expressions. */
  compiled: EvalFunction | null;
  /** For parametric — compiled x(t). */
  compiledX?: EvalFunction;
  /** For parametric — compiled y(t). */
  compiledY?: EvalFunction;
  /** Free variable names (candidates for sliders). */
  freeVariables: string[];
  /** Human-readable parse error, or null if valid. */
  error: string | null;
}

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                    */
/* ────────────────────────────────────────────────────────── */

/**
 * Light-weight implicit-multiplication pre-processor.
 *
 * Handles the most common shortcuts:
 *   2x  →  2*x      3sin(x)  →  3*sin(x)
 *   )(  →  )*(       )x       →  )*x
 *   2(  →  2*(       )2       →  )*2
 *
 * Also normalises unicode symbols: θ → theta, π → pi.
 */
function preprocess(raw: string): string {
  let s = raw;
  // Unicode aliases
  s = s.replace(/θ/g, 'theta');
  s = s.replace(/π/g, 'pi');

  // Implicit multiplication
  s = s.replace(/(\d)([a-zA-Z])/g, '$1*$2');   // 2x  → 2*x
  s = s.replace(/\)\(/g, ')*(');                // )(  → )*(
  s = s.replace(/\)(\d)/g, ')*$1');             // )2  → )*2
  s = s.replace(/\)([a-zA-Z])/g, ')*$1');       // )x  → )*x
  s = s.replace(/(\d)\(/g, '$1*(');             // 2(  → 2*(
  return s;
}

/** Walk a math.js AST and collect names not in BUILTIN_NAMES. */
function findFreeVariables(node: MathNode): string[] {
  const vars = new Set<string>();
  node.traverse((n: MathNode) => {
    if (n.type === 'SymbolNode' && !BUILTIN_NAMES.has((n as any).name)) {
      vars.add((n as any).name);
    }
  });
  return Array.from(vars);
}

/**
 * Split a parametric string like `(exprX, exprY)` at the top-level
 * comma, respecting nested parentheses.
 */
function splitParametric(text: string): [string, string] | null {
  const inner = text.slice(1, -1).trim();
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++;
    else if (inner[i] === ')') depth--;
    else if (inner[i] === ',' && depth === 0) {
      return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()];
    }
  }
  return null;
}

/** Return true if the AST contains a SymbolNode named `y`. */
function usesY(node: MathNode): boolean {
  let found = false;
  node.traverse((n: MathNode) => {
    if (n.type === 'SymbolNode' && (n as any).name === 'y') found = true;
  });
  return found;
}

/* ────────────────────────────────────────────────────────── */
/*  Main parser                                                */
/* ────────────────────────────────────────────────────────── */

/**
 * Parse a raw expression string and return a `ParsedExpression`.
 *
 * Detection rules (evaluated in order):
 *   1. `r = <expr>`          → **polar**  (variable: theta)
 *   2. `(<exprX>, <exprY>)`  → **parametric** (variable: t)
 *   3. `y = <expr>`          → **standard** or implicit if RHS uses y
 *   4. `<LHS> = <RHS>`       → **implicit** (LHS − RHS = 0)
 *   5. bare expression       → **standard** f(x), or implicit if it uses y
 */
export function parseExpression(text: string): ParsedExpression {
  const trimmed = text.trim();
  if (!trimmed) {
    return { type: 'standard', compiled: null, freeVariables: [], error: null };
  }

  try {
    const processed = preprocess(trimmed);

    /* ── 1. Polar ── */
    const polarMatch = processed.match(/^r\s*=\s*(.+)$/);
    if (polarMatch) {
      const rhs = polarMatch[1];
      const node = parse(rhs);
      return {
        type: 'polar',
        compiled: compile(rhs),
        freeVariables: findFreeVariables(node).filter((v) => v !== 'theta'),
        error: null,
      };
    }

    /* ── 2. Parametric ── */
    if (processed.startsWith('(') && processed.endsWith(')')) {
      const parts = splitParametric(processed);
      if (parts) {
        const nodeX = parse(parts[0]);
        const nodeY = parse(parts[1]);
        const freeX = findFreeVariables(nodeX).filter((v) => v !== 't');
        const freeY = findFreeVariables(nodeY).filter((v) => v !== 't');
        return {
          type: 'parametric',
          compiled: null,
          compiledX: compile(parts[0]),
          compiledY: compile(parts[1]),
          freeVariables: [...new Set([...freeX, ...freeY])],
          error: null,
        };
      }
    }

    /* ── 3 & 4. Equation with `=` ── */
    const eqMatch = processed.match(/^(.+?)\s*=\s*(.+)$/);
    if (eqMatch) {
      const lhs = eqMatch[1].trim();
      const rhs = eqMatch[2].trim();

      // y = f(x) — standard, unless RHS also contains y
      if (lhs === 'y') {
        const node = parse(rhs);
        if (usesY(node)) {
          const impExpr = `(${lhs}) - (${rhs})`;
          return {
            type: 'implicit',
            compiled: compile(impExpr),
            freeVariables: findFreeVariables(parse(impExpr)).filter((v) => v !== 'y'),
            error: null,
          };
        }
        return {
          type: 'standard',
          compiled: compile(rhs),
          freeVariables: findFreeVariables(node),
          error: null,
        };
      }

      // Anything else with `=` → implicit
      const impExpr = `(${lhs}) - (${rhs})`;
      const impNode = parse(impExpr);
      return {
        type: 'implicit',
        compiled: compile(impExpr),
        freeVariables: findFreeVariables(impNode).filter((v) => v !== 'y'),
        error: null,
      };
    }

    /* ── 5. Bare expression ── */
    const node = parse(processed);
    if (usesY(node)) {
      return {
        type: 'implicit',
        compiled: compile(processed),
        freeVariables: findFreeVariables(node).filter((v) => v !== 'y'),
        error: null,
      };
    }
    return {
      type: 'standard',
      compiled: compile(processed),
      freeVariables: findFreeVariables(node),
      error: null,
    };
  } catch (err: any) {
    return {
      type: 'standard',
      compiled: null,
      freeVariables: [],
      error: err.message || 'Parse error',
    };
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Slider helpers                                             */
/* ────────────────────────────────────────────────────────── */

/** Build a SliderParam array, reusing existing slider state where possible. */
export function createSliders(
  freeVars: string[],
  existing: SliderParam[],
): SliderParam[] {
  return freeVars.map((name) => {
    const prev = existing.find((s) => s.name === name);
    if (prev) return prev;
    return {
      name,
      value: 1,
      min: -10,
      max: 10,
      step: 0.1,
      animating: false,
      animationSpeed: 1,
    };
  });
}
