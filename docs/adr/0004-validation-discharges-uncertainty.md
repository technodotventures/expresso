# ADR-0004: Make `validate` an information-flow boundary

- Status: Accepted
- Date: 2026-07-25

## Context

A keyword that merely groups deterministic checks is decorative and does not
justify a language. Observation-derived values need a compiler-recognized path
before they can enter action-sensitive fields.

## Decision

Observation results are tainted. Action input and provider identity must be
untainted. `validate` runs deterministic requirements and discharges taint for
its returned value.

Human approval, cryptographic verification, and trusted-source assertion may
become alternative discharge mechanisms, but are not implemented in v0.1.

## Consequences

- Direct observe-to-action flow is rejected.
- `validate` must contain at least one requirement.
- The verifier establishes that checks ran, not that they are sufficient.
- v0.1 uses whole-value provenance; field-sensitive evidence is deferred.
- The semantic model becomes an information-flow system, not a workflow
  annotation scheme.

## Rejected alternatives

- A `decide` or `validate` narration keyword with no type transition.
- Globally trusting all committed observations.
- Treating model output as safe based on confidence alone.

## Review trigger

Real tasks requiring mixed evidence within one action input may justify
field-sensitive provenance.
