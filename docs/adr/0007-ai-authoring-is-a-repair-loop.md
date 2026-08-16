# ADR-0007: Treat AI authoring as generate-check-repair

- Status: Accepted
- Date: 2026-07-25

## Context

Strict semantic obligations are tedious for human authors but cheap for coding
agents when the required facts are available. A model can still make grammar,
identity, provenance, grant, and recovery errors.

The value is not a novel generate-and-check paradigm. The useful property is
that core obligations are structural and decidable without a user-authored
theorem.

## Decision

AI authoring uses a bounded loop:

```text
task + provider catalog
  -> generate
  -> parse and verify
  -> structured repair diagnostics
  -> repair
  -> verify
  -> human review
```

The loop stops only on executable verification, round limit, or an explicit
unknown that requires external evidence.

## Consequences

- Diagnostic quality outranks syntax elegance.
- Every diagnostic needs stable codes and repair directives.
- Experiment results record repair rounds and error classes.
- A verified source still requires review and runtime verification.
- Model commands receive minimized provider facts, not credentials.

## Rejected alternatives

- One-shot generation followed by execution.
- Allowing the model to invent provider semantics.
- Treating checker success as business-policy approval.
