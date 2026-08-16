# ADR-0003: Separate structural and provider action identity

- Status: Accepted
- Date: 2026-07-25

## Context

Structural identity is stable by construction but may not represent a business
operation across systems. Data-derived provider identity is useful for domain
deduplication but can drift if derived from regenerable uncertainty.

One overloaded `identity` concept hides this distinction and can create
duplicate effects.

## Decision

Every action has:

1. a structural identity generated from execution ID, workflow, action kind,
   and stable label;
2. a provider/business identity supplied by an expression over stable,
   untainted data.

The runtime commits both identities and action input in `ActionPlanned` before
dispatch. Recovery reuses the frozen values. Recomputed identity mismatch is a
hard error.

## Consequences

- Line numbers never participate in identity.
- Direct observation-derived identity is rejected.
- Validation may make a committed observation eligible for identity use.
- Provider implementations receive the same identity on all recovery attempts.
- Future loops must add an explicit structural occurrence key.

## Rejected alternatives

- Structural identity only: insufficient for cross-system business dedup.
- Data identity only: can drift or collide across workflow sites.
- Recompute on recovery: recreates duplicate-effect risk.

## Runtime obligation

The IR verifier checks identity presence and provenance. The execution engine
freezes and compares the runtime value.
