# ADR-0006: Source provider semantics and fail closed on unknowns

- Status: Accepted
- Date: 2026-07-25

## Context

Identity transport, idempotency, reconciliation, and recovery behavior are facts
about providers. They cannot be inferred reliably from a caller's source, and a
mandatory field without a verified source becomes a hallucination magnet for
coding models.

## Decision

Provider contracts are inputs to generation and verification. Every recovery
claim carries provenance. The language admits `recovery unknown`; unknown
semantics make a workflow admissible for review but non-executable.

The source declaration must match the catalog. A model cannot strengthen or
replace a provider contract.

## Consequences

- The grammar never forces invented certainty.
- AI authoring is gated by catalog coverage.
- The reference catalog uses only synthetic conformance-tested actions.
- Real provider support requires versioned evidence and drift handling.
- `check` separates structural acceptance from executability.

## Rejected alternatives

- Guess recovery from operation names.
- Trust documentation without recording provenance.
- Treat sending an idempotency key as proof the provider honors it.
- Default unknown actions to retry.
