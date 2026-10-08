# VPlusBridge AI

A local-only React + TypeScript research prototype for deterministic legacy Adept/V+ program analysis and virtual modernization evaluation.

## Run locally

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

## Pages

1. **Legacy Modernization Workspace** (`/`)
   - Editable illustrative V+ source
   - Deterministic parsing for `.PROGRAM`, `.END`, `MOVE`, `MOVES`, `SPEED`, `SIGNAL`, and `DELAY`
   - Source-linked analysis, documentation, target-neutral draft, and tests
   - Explicit unsupported-syntax and assumption handling
   - Local engineer review, copy, and JSON export actions

2. **Virtual Verification & Evaluation** (`/verification`)
   - Animated SVG robot workcell
   - Reference/draft playback, pause, reset, and path comparison
   - Motion events, I/O states, and verification outcomes
   - Editable manual vs AI-assisted effort model with Recharts visualization
   - Failure pattern explorer, research summary, and result export

## Deterministic parser

The parser is implemented in `src/parser.ts`. It uses an intentionally narrow grammar and never sends source code to an API. Statements outside the supported grammar are preserved as unsupported findings and become explicit TODOs in the generated draft.

## Scope and safety

All programs, poses, results, and effort estimates are synthetic. The prototype does not connect to hardware, perform safety validation, certify behavior, or produce a production migration.
