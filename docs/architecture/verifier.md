# Verifier architecture

## Verification is re-entrant

Verification is not a one-time pipeline stage. The same safety-critical
properties are checked at two trust boundaries:

```text
source -> parser -> source verifier -> compiler -> IR
                                                |
                                         runtime verifier
                                                |
                                         execution engine
```

Source verification provides fast diagnostics and AI repair signals. Runtime
verification provides the guarantee against malformed, hand-written, stale, or
tampered IR.

## Source verifier

The source verifier:

- resolves operations against the provider catalog;
- enforces observation/action kind;
- checks declared grants;
- enforces unique stable labels;
- tracks whole-value provenance;
- rejects tainted action input;
- rejects tainted or unstable provider identity;
- checks recovery against catalog evidence;
- requires reconciliation grants;
- emits a blocker for `recovery unknown`.

It returns separate `ok` and `executable` statuses. An unknown-recovery workflow
may be structurally admissible (`ok: true`) but forbidden to execute.

## Compiler

The compiler runs source verification, then lowers accepted syntax into a small
IR. It assigns structural sites and retains the expression and validation graph
needed for runtime re-verification.

The compiler does not:

- grant provider authority;
- certify provider claims;
- make blocked workflows executable;
- seal IR against modification.

## Runtime IR verifier

The runtime verifier treats IR as untrusted input. It checks:

- IR and step shape;
- version;
- workflow and label identity;
- compiler-assigned structural sites;
- provider operation kind;
- identity presence and provenance;
- recovery presence and catalog match;
- validation evidence path;
- declared grants;
- host-supplied runtime grants.

It reconstructs a semantic program from IR rather than trusting serialized
analysis results.

Compiler and runtime currently share semantic verification code. This avoids
drift in the implementation, while production assurance should add differential
tests, an independently specified IR schema, and adversarial IR fuzzing.

## Diagnostics as an AI interface

Diagnostics are repair directives, not prose logs. Each one has:

- stable code;
- severity;
- precise message;
- source location where available;
- concrete repair;
- structured evidence details where useful.

The generate-check-repair harness returns the full prior diagnostic set to the
model. A provider recovery mismatch says what the catalog requires; an unknown
contract says that execution is blocked rather than suggesting a guess.

## Threat model

The verifier assumes source and IR may be model-generated or malicious. It does
not assume the catalog, host grant set, provider implementation, or journal are
untrusted in v0.1. Those trusted inputs become separate verification surfaces in
later milestones.

See [ADR-0005](../adr/0005-runtime-reverifies-ir.md).
