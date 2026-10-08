# VPlusBridge AI

VPlusBridge AI is a polished research prototype for modernizing and verifying illustrative legacy Adept/V+ robot programs.

**Live demo:** https://vplusbridge-ai.pages.dev/

## Features

### Legacy Modernization Workspace

- Editable synthetic Adept/V+ pick-and-place program
- Deterministic parser for:
- `.PROGRAM`
- `.END`
- `MOVE`
- `MOVES`
- `SPEED`
- `SIGNAL`
- `DELAY`
- Source-linked control-flow analysis
- Dependency and assumption detection
- Functional and technical documentation
- Target-neutral pseudocode with explicit TODOs
- Verification test cases traced to source lines
- Unsupported syntax warnings
- Engineer review, copy, and JSON export actions

### Virtual Verification & Evaluation

- Interactive SVG robot workcell
- Reference and draft sequence playback
- Run, pause, reset, and trajectory comparison controls
- Motion-event timeline and live I/O states
- Verification outcomes and deviation indicators
- Editable manual versus AI-assisted effort model
- Automatic time-saved, rework, and quality calculations
- Recharts effort visualization
- Failure-pattern explorer and research summary
- Evaluation result export

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide React
- Cloudflare Pages
- Wrangler
