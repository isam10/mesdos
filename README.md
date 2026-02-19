# mesdos

### **[▶ Try it live](https://isam10.github.io/mesdos/)**

A Desmos-inspired graphing calculator built with React, TypeScript, and HTML Canvas.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?logo=tailwindcss)

## Features

- **Multiple expression types** — standard `y = f(x)`, polar `r = f(θ)`, parametric `(x(t), y(t))`, and implicit equations
- **Interactive graph** — pan, zoom (scroll wheel), and pinch-to-zoom with HiDPI canvas rendering
- **Automatic sliders** — free parameters are detected and sliders are generated automatically, with animation support
- **Derivative overlays** — toggle derivative curves and tangent lines for any expression
- **Root & intersection detection** — finds and marks zeros and curve intersections via bisection
- **Implicit multiplication** — type `2x` or `3sin(x)` and it just works
- **Dark / light theme** — toggle between themes with full Tailwind CSS support
- **Expression panel** — add, edit, reorder, and color-code expressions
- **Coordinate readout** — hover over the graph to see exact coordinates
- **Data table** — view tabulated values for your expressions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + Tailwind CSS |
| Language | TypeScript 5 |
| Math engine | [math.js](https://mathjs.org/) |
| State management | [Zustand](https://github.com/pmndrs/zustand) |
| Build tool | Vite 5 |
| Rendering | HTML Canvas 2D |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18

### Install & Run

```bash
# Clone the repo
git clone https://github.com/isam10/mesdos.git
cd mesdos

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/       # React UI components
│   ├── ExpressionPanel.tsx   # Side panel with expression list
│   ├── ExpressionRow.tsx     # Individual expression input row
│   ├── GraphCanvas.tsx       # Main canvas with pan/zoom
│   ├── SliderControl.tsx     # Parameter slider widget
│   ├── Table.tsx             # Data table overlay
│   └── Toolbar.tsx           # Top toolbar (theme toggle, etc.)
├── engine/           # Math & rendering engine
│   ├── mathParser.ts         # Expression parsing & type detection
│   ├── evaluator.ts          # Numerical evaluation for all curve types
│   ├── graphEngine.ts        # Canvas 2D rendering pipeline
│   └── analysis.ts           # Root-finding & intersection detection
├── hooks/
│   └── useDebounce.ts        # Debounce hook for performance
├── store/
│   └── useStore.ts           # Zustand global state
├── types/
│   └── index.ts              # TypeScript interfaces
└── utils/
    ├── colors.ts             # Expression color palette
    └── math.ts               # Grid spacing & number formatting
```

## License

MIT
