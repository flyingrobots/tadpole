# Systems-Style TypeScript

Tadpole adopts the flyingrobots systems-style TypeScript standard for new
infrastructure code. This is not a formatting guide. It is an execution-truth
standard for TypeScript code that owns domain state, import/export boundaries,
commands, persistence, migration, replay, or long-lived editor behavior.

## Rule 0: Runtime Truth Wins

Trusted values must be created by runtime construction, parsing, or validation.
The type system documents runtime truth; it does not create it.

Authority flows in this order:

1. Runtime domain model: constructors, invariants, methods, error types.
2. Boundary parsers and validators.
3. Tests and browser witnesses.
4. TypeScript types.
5. Static tooling and IDEs.
6. Design docs.

## Immediate Repo Policy

The current Svelte workbench predates this standard and is explicitly migration
debt. New TypeScript infrastructure must follow this standard immediately.

Audited paths:

- `backend/src/**/*.ts`
- `frontend/src/**/*.ts`, except the current legacy `frontend/src/App.svelte`
- `frontend/vite.config.ts`
- future Vue files under `frontend/src/**/*.vue`

Run:

```bash
npm run lint:systems
npm run typecheck:systems
```

## Banned Constructs

- No `any`.
- No `unknown`.
- No type assertions with `as`, except literal `as const` declarations.
- No TypeScript `enum`.
- No interfaces for domain concepts. `interface` is reserved for ports.
- No branching on error messages.
- No host-specific APIs in browser-portable core logic.

## Required Modeling Discipline

Use runtime-backed forms:

- Value objects for meaningful values with invariants.
- Entities for identity and lifecycle.
- Result/outcome classes for runtime dispatch.
- Domain error classes for expected failures.
- Boundary parser functions for untrusted payloads.

Plain objects may carry decoded payloads, logs, or view models. They do not own
trusted domain meaning.

## Boundary Policy

Untrusted data enters through parser functions that produce concrete values or
throw typed errors. Raw JSON, SVG, file input, generated output, and external
APIs are boundaries.

Core editor modules should prefer browser-portable primitives such as
`TextEncoder`, `Uint8Array`, `URL`, and DOM APIs. Node APIs belong in adapters.

## Compiler Policy

Backend TypeScript and new frontend systems TypeScript must keep these flags
enabled:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noPropertyAccessFromIndexSignature`
- `noUnusedLocals`
- `noUnusedParameters`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`

Today this is enforced by `backend/tsconfig.json` and
`frontend/tsconfig.systems.json`. The legacy `frontend/tsconfig.json` remains
compatible with the current Svelte component until that component is split into
runtime-backed modules.

## Lint Policy

Lint is part of the contract:

- `npm run lint:systems` must pass before PR.
- `npm run check` includes the systems lint and typecheck gates.
- Suppressions require a specific justification and should be rare.

## Review Checklist

- Is this a real domain concept? Where is its runtime-backed class?
- Does construction establish the invariant?
- Does behavior live on the type that owns it?
- Is untrusted input parsed at the boundary?
- Are there any `any`, `unknown`, non-const `as`, or `enum` uses?
- Is an `interface` modeling a domain concept instead of a port?
- Could this core logic run in a browser?
- Is the proof executable through tests or browser witnesses?
