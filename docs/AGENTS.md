---
tags:
  - master
  - gic-lang
  - gic
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**gic** (Gestalten In Code) is a minimal visual programming language for education, AI art generation, and artistic commentary. Inspired by Design by Numbers (John Maeda) and Processing (Ben Fry, Casey Reas).

## Current State

This project is in the **specification phase**. No implementation exists yet. The specification documents are:

- `Language specification.md` - Current specification (use this)
- `deprecated/Language specification rev 2.1.md` - Previous revision
- `deprecated/Language specification rev 2.md` - Earlier revision
- `deprecated/Language specification rev 1.md` - Earlier revision
- `deprecated/Language specification rev 0.md` - Initial draft

## Key Language Design Decisions

### Simplicity Constraints

- Fixed 100x100 pixel canvas (geometric center at 50,50)
- Three data types only: Number, Boolean, String
- No arrays, objects, null, or undefined
- One loop construct: `repeat(i, start, end)`
- No switch, while, for, break, or continue

### Explicit Over Implicit

- No hoisting: variables and functions must be declared before use
- No shadowing: visible names cannot be reused, and global names are reserved program-wide
- All functions require explicit `return` or `return;`
- Braces always required for control flow

### Animation Model

- `loop { }` block for animation (similar to Arduino)
- Code before `loop` runs once (setup)
- Code inside `loop` runs every frame
- `frameCount` constant tracks current frame

### Color System

- OKLCH color space: L (0-100), C (0-100), H (0-360)
- Also accepts hex values and CSS color names

## Project Structure

Single package, no monorepo:

```
gic/
├── src/
│   ├── lexer.ts        # Source → tokens
│   ├── parser.ts       # Tokens → AST
│   ├── analyzer.ts     # Semantic validation
│   ├── interpreter.ts  # AST → execution
│   ├── types.ts        # Shared types (Token, AST nodes, etc.)
│   └── index.ts        # Entry point
├── tests/
├── examples/           # .gic example programs
├── package.json
└── tsconfig.json
```

Backends, CLI, and LSP will be added later.

## Implementation Order

1. **Lexer** - string → tokens
2. **Parser** - tokens → AST
3. **Interpreter** - AST → execution (basic)
4. **Analyzer** - add semantic validation
5. **Backend** - connect to canvas

## Implementation Approach

This is a learning project. The human implements with Claude's guidance. Every piece of code should be understood, not just copied.

## Reference

"Crafting Interpreters" by Bob Nystrom (craftinginterpreters.com) - primary implementation guide.

## Possible execution environments

https://labs.leaningtech.com/blog/browserpod-10
