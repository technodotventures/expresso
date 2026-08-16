# ADR-0001: Execute consequential workflows in a closed lane

- Status: Accepted
- Date: 2026-07-25

## Context

Wrappers cannot enforce semantic boundaries when arbitrary code retains raw
credentials, network egress, dynamic imports, or direct provider SDK access.
The original Expresso guarantees require an environment where unsafe
alternatives are unavailable.

## Decision

Expresso workflows run in a restricted consequential lane. Workflow code has no
ambient clock, randomness, network, filesystem, process, dynamic evaluation,
arbitrary imports, or credentials.

The trusted host exposes only registered, capability-scoped operations.
Production hosts must also deny consequential credentials and provider egress
to any adjacent open-agent lane.

## Consequences

- Enforcement comes from runtime and deployment architecture, not syntax.
- Expresso is not a safe wrapper for arbitrary TypeScript or Python.
- The closed lane spends flexibility to obtain guarantees.
- Open agents may propose action parameters but cannot execute protected
  operations directly.
- Production readiness requires infrastructure tests beyond language tests.

## Rejected alternatives

- Advisory SDK combinators: visible but bypassable.
- Wrapper-only enforcement: cannot close raw network or credential paths.
- Whole-platform restriction: unnecessarily removes flexibility from
  non-consequential work.

## Review trigger

Revisit only if an alternative execution substrate can prove equivalent
non-bypassability.
