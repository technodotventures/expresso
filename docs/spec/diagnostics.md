# Diagnostic catalog

Codes are stable interfaces for people, tests, and AI repair adapters.

## Parser

| Code | Meaning |
|---|---|
| `P001` | Unterminated string |
| `P002` | Unsupported operator |
| `P003` | Unexpected character |
| `P100`–`P108` | Invalid or unsupported grammar shape |

## Provider catalog

| Code | Meaning |
|---|---|
| `C001`–`C003` | Invalid catalog envelope |
| `C004` | Invalid operation kind |
| `C005`–`C008` | Missing or invalid recovery metadata |
| `C009` | Action capability missing |
| `C010` | Provider identity metadata missing |
| `C011`–`C012` | Invalid reconciliation operation |

## Source semantics

| Code | Meaning |
|---|---|
| `E100` | Duplicate stable operation label |
| `E101` | Unknown provider operation |
| `E102` | Observation/action kind mismatch |
| `E103` | Operation absent from declared grants |
| `E106` | Reconciliation grant missing |
| `E110` | Unknown value |
| `E111` | Unsupported expression node |
| `E200` | Validation has no deterministic requirement |
| `W200` | Validation source is already untainted |
| `E201` | Action provider identity missing |
| `E202` | Provider identity is tainted or unstable |
| `E203` | Observed data reaches action input |
| `E204` | Recovery mode missing or invalid |
| `E205` | Recovery contradicts provider contract |
| `B206` | Recovery unknown; execution blocked |
| `E207` | Action input missing |

## Runtime IR

| Code | Meaning |
|---|---|
| `I001`–`I005` | Invalid IR envelope |
| `I006`–`I015` | Invalid step shape or structural identity |
| `IR_E…` | Source semantic rule failed during re-verification |
| `I100` | Trusted host did not grant required operation |
| `I101` | Trusted host runtime grants were not supplied |

## Execution

| Code | Meaning |
|---|---|
| `R001_IR_REJECTED` | Runtime verifier rejected IR |
| `R002_EXECUTION_ID` | Durable execution ID missing |
| `R003_JOURNAL` | Journal missing |
| `R100_VALIDATION_FAILED` | Deterministic requirement returned false |
| `R200_IDENTITY_DRIFT` | Provider identity differs from frozen plan |
| `R201_MANUAL_RECOVERY` | Pending action requires an operator |
| `R202_OBSERVATION_PLAN_DRIFT` | Observation operation, recovery, or input differs from its frozen plan |
| `R203_OBSERVATION_RECOVERY` | Pending observation is not safe to repeat automatically |
| `R204_ACTION_PLAN_DRIFT` | Action operation or recovery differs from its frozen plan |
| `R205_ACTION_INPUT_DRIFT` | Action input differs from its frozen plan |
| `R300_PROVIDER_UNAVAILABLE` | Trusted host has no implementation |
| `R_OUTCOME_UNKNOWN` | Dispatch may have completed; recover on resume |

Changing the meaning of a published code requires an ADR or a new code. Wording
may improve as long as machine-repair meaning remains compatible.
