# Architecture decision records

ADRs capture semantic and trust-boundary decisions that should not drift through
implementation convenience.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-closed-consequential-lane.md) | Closed consequential lane | Accepted |
| [0002](0002-whitelist-language-surface.md) | Standalone whitelist language for v0.1 | Accepted |
| [0003](0003-dual-action-identity.md) | Structural and provider identity are separate | Accepted |
| [0004](0004-validation-discharges-uncertainty.md) | `validate` is an information-flow boundary | Accepted |
| [0005](0005-runtime-reverifies-ir.md) | Runtime distrusts and re-verifies IR | Accepted |
| [0006](0006-provider-contracts-fail-closed.md) | Provider semantics are sourced; unknown blocks | Accepted |
| [0007](0007-ai-authoring-is-a-repair-loop.md) | AI authoring uses generate-check-repair | Accepted |

New ADRs should include context, decision, consequences, rejected alternatives,
and a falsification or review trigger.
