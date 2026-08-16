# ADR-0002: Start with a standalone whitelist language

- Status: Accepted for v0.1
- Date: 2026-07-25

## Context

A TypeScript-shaped subset offers familiar syntax and better model
distributional familiarity, but it also creates false expectations around
closures, packages, `async`, reflection, `any`, and dynamic behavior. A blacklist
of unsafe TypeScript features is not a sound language definition.

The previous prototype already demonstrated a restricted language, IR, and
runtime.

## Decision

The v0.1 user-test surface is a visibly small standalone `.expresso` language
defined by a whitelist grammar.

No syntax is added merely for narration. There is no `decide` keyword.
Deterministic computation expands only as needed by real tasks.

The generate-check-repair experiment may later compare this surface with a
separately specified restricted TypeScript-shaped grammar. Plain TypeScript is
never inferred or lowered into Expresso semantics.

## Consequences

- The language sets honest capability expectations.
- Parser and toolchain work are explicit.
- Existing TypeScript libraries are not available inside the lane.
- Model familiarity is an empirical risk, measured through repair rounds.

## Rejected alternatives

- TypeScript plus a linter: incomplete against the dynamic language.
- Imported `observe()`/`action()` combinators: annotations, not enforcement.
- Lowering arbitrary code to Expresso: requires unsafe inference of missing
  identity, recovery, and authority facts.

## Review trigger

After M1, compare model and developer results before changing the authoring
surface.
