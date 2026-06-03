---
title: "{GOAL}-{ID} - {Short Title}"
lane: "design"
goal: "Goal {number}"
issue: "https://github.com/flyingrobots/tadpole/issues/{number}"
pr: "https://github.com/flyingrobots/tadpole/pull/{number}"
status: "draft|active|landed|superseded"
owners:
  - "@flyingrobots"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---

<!-- markdownlint-disable-next-line MD025 -->
# {GOAL}-{ID} - {Short Title}

## Linked Issue

- [{issue URL}](https://github.com/flyingrobots/tadpole/issues/{number})

## Roadmap Gate

Name the roadmap gate this work advances.

Example:

- Goal 5: Export And Reopen Rough Projects

## Cycle Start

- [ ] `git fetch origin` completed.
- [ ] Local merge target branch synced to `origin/main` or the named merge
      target without rebase or force operations.
- [ ] Cycle branch checked out from the synced merge target.
- [ ] GitHub issue created from the `Tadpole Task` issue form.
- [ ] `work-in-progress` label applied to the GitHub issue.
- [ ] Design doc, issue link, and initial cycle scaffold staged and committed.
- [ ] Branch pushed and non-draft PR opened to the merge target.

## Decision Summary

One short paragraph describing the decision this document is making.

Be specific enough that a reviewer can decide whether the proposed
implementation matches the design. Avoid roadmap language here. Say what will
exist, what it will do, and what boundary it owns.

## Sponsored Human

A `{type of user}` wants `{capability/outcome}` so that `{reason}`, without
having to `{current pain or unsafe workaround}`.

## Sponsored Agent

An agent needs `{inspectable contract/tool/surface}` so it can `{operation}`,
without inferring `{unstable/private/visual-only state}`.

## Hill

By the end of this cycle, `{user/agent}` can `{observable outcome}` through
`{surface/API/command}`, and the repo proves it with `{tests/witnesses}`.

## Current Truth

Describe what exists today. This section is factual, not aspirational.

Include concrete anchors where relevant:

- files
- commands
- exported APIs
- current docs and METHOD surfaces
- current failure mode
- related GitHub issues or PRs
- known test or witness coverage

Draft docs may cite repo-relative paths and commands. Active or PR-ready docs
must use commit-pinned GitHub permalinks for critical current-truth claims.

Use this format for pinned source or test evidence:

```text
[<path>#<line>:<full-commit-sha>](https://github.com/flyingrobots/tadpole/blob/<full-commit-sha>/<path>#L<line>)
```

## Problem

State the actual problem. Name the failure mode, missing contract, or user
workaround.

Good:

- "Project export contains timeline tracks but not the SVG source, so a
  reopened session cannot reconstruct the edited SVG."

Bad:

- "Persistence would be useful."

## Scope

This cycle includes:

- ...

## Non-Goals

This cycle does not include:

- ...

Non-goals prevent the design from silently expanding while the PR is in flight.

## User Experience / Product Shape

Required for rendered UI changes. If the work is not a rendered surface, say
"Not applicable" and explain why.

Answer:

- What is the user trying to do?
- What communicates system state, success, failure, undo, or retry?
- What keyboard and screen-reader paths are expected?
- What animations or transitions matter?
- What localization or directionality assumptions exist?

Mockups and Mermaid user journeys are optional, but required when prose is not
specific enough to make the intended interaction reviewable.

## Runtime / API Contract

Required for project format, import/export, commands, app state, persistence,
or generated output.

Name the software contract and include only relevant subsections:

- exported functions or types
- project schema input/output
- command intents
- emitted facts or metadata
- state transitions
- layout, focus, or input boundaries
- error behavior
- compatibility aliases or migration behavior

This is the section tests should be able to compile or assert against.

## Data / State / Schema Model

Required when state persists, mutates, or crosses boundaries.

Summarize:

- source of truth
- derived state
- invalid states
- reset behavior
- serialization
- schema versioning or migration behavior
- deterministic clock/runtime assumptions

Use Mermaid diagrams only when they clarify complex state, entity, or data
flows.

## Security / Trust Boundary

Required for SVG or project import, generated output, filesystem/network
surfaces, or user-provided content.

Describe:

- trusted and untrusted inputs
- sanitizer or validator boundaries
- script, URL, style, or external-reference handling
- failure behavior for unsafe data
- regression tests or witnesses that prove the boundary

## Accessibility Posture

Required for interactive or rendered UI changes.

| Surface | Requirement |
| ------- | ----------- |
| Semantic labels or facts | ... |
| Focus order or ownership | ... |
| Visual-only information with non-visual equivalent | ... |
| Keyboard behavior | ... |
| Secret or redaction behavior, if relevant | ... |

## Localization / Directionality Posture

Required when visible strings are added or changed.

| String or surface | Requirement |
| ----------------- | ----------- |
| User-visible strings | ... |
| Catalog or source location | ... |
| Directionality assumptions | ... |
| Locale updates, if any | ... |

## Agent Inspectability

Describe how an agent can inspect the result without scraping pixels or
inferring from prose.

Examples:

- stable element ids
- JSON schema fields
- deterministic command output
- browser witness assertions
- machine-readable test fixtures
- emitted metadata

## Linked Invariants

List repo and product invariants this work must preserve.

Examples:

- Runtime behavior is the proof.
- Imported SVG and project data are untrusted until sanitized or validated.
- Timeline state must remain deterministic under async input.
- Docs describe evidence; they do not replace evidence.
- Browser witness coverage is required for visual editor workflows.

## Alternatives Considered

### Option A: {name}

Pros:

- ...

Cons:

- ...

### Option B: {name}

Pros:

- ...

Cons:

- ...

## Decision

State the chosen option and why. If the decision is temporary, name the
expiration, migration window, or follow-on issue.

## Implementation Slices

- [ ] Slice 1:
- [ ] Slice 2:
- [ ] Slice 3:

Each slice should be small enough to commit or review independently and should
correspond to one test case, witness assertion, or user story.

## Tests To Write First

Behavior tests required:

- [ ] ...

Documentation or process tests, only if relevant:

- [ ] ...

Rule: documentation tests cannot be the only proof for product or runtime work.

## Proof Matrix

| Claim | Required proof |
| ----- | -------------- |
| `{behavior exists}` | `{test/witness/command}` |

## Acceptance Criteria

The work is done when:

- [ ] Behavior test proves the core contract.
- [ ] Rendered output or runtime API proves the user-visible outcome.
- [ ] Project/schema compatibility is documented when persistence changes.
- [ ] Accessibility is preserved when UI changes.
- [ ] New strings are accounted for when copy changes.
- [ ] Docs, changelog, witness, and issue links are updated when behavior
      changes.
- [ ] CI and local validation are green.

## Validation Plan

Commands expected before PR:

```bash
npm run check
npm run build
```

Trim commands that do not apply. Add focused test, witness, lint, schema, or
browser-smoke commands when needed.

## Playback / Witness

Describe what a reviewer can run or inspect.

Examples:

```bash
npm run dev
node docs/method/witness/<cycle>/<script>.mjs
```

If there is a visual result, include the route, viewport, interaction sequence,
or terminal size needed to reproduce it.

## Open Questions

| Question | Owner | Resolution |
| -------- | ----- | ---------- |
| ... | ... | ... |

## Follow-On Issues

Create GitHub issues for deferred work. Do not hide required future work in
prose.

- ...

## Retrospective

Fill this in after implementation.

What changed from the design:

- ...

What the tests proved:

- ...

What remains open:

- ...

PR:

- [{pull request URL}](https://github.com/flyingrobots/tadpole/pull/{number})
