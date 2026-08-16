# Semantic model

## Purpose

Expresso enforces the boundary between externally determined information and
consequential effects. The model has three effect-bearing constructs:

```text
observe -> validate -> action
```

The model does not claim that every workflow must contain all three. It claims
that when uncertain information reaches a protected action, the required
evidence must be explicit and checkable.

## Provenance lattice

The current implementation tracks whole-value provenance:

| Provenance | Tainted | Stable | Meaning |
|---|---:|---:|---|
| literal | no | yes | Source literal |
| input | no | yes | Durable workflow input |
| observed | yes | yes after commit | External result, replayed after commit |
| validated | no | yes | Observed value passed deterministic requirements |
| derived | inherited | inherited | Record or comparison over other values |
| unknown | yes | no | Verifier cannot establish origin |

Taint means “requires an explicit discharge before protected use,” not
“malicious.” Stability and uncertainty are independent properties.

## Information-flow invariant

For every action `a`:

```text
untainted(input(a))
and stable(provider_identity(a))
and untainted(provider_identity(a))
```

In v0.1, `validate` discharges taint for its entire return value. Future versions
may require field-sensitive evidence:

```text
amount       requires validated
recipient    requires verified
email_body   may accept observed
```

That extension requires an ADR and tests; it is not implied by the current
implementation.

## Observation commit invariant

An observation result is invisible to later steps until
`ObservationCommitted` is durable. On resume:

- committed observations replay exactly;
- uncommitted repeatable observations may run again;
- uncommitted manual/unknown observations stop for intervention.

The current in-memory journal demonstrates ordering but is not crash-durable.

## Dual identity invariant

Structural identity:

```text
execution_id / workflow / action_label
```

is compiler/runtime assigned and independent of line numbers.

Provider identity:

```text
identity <stable, untainted expression>
```

is domain data passed to the provider or reconciliation operation.

The lifecycle is:

```text
derive structural identity
evaluate provider identity from stable provenance
commit ActionPlanned with both identities and input
dispatch
complete or recover using the frozen plan
```

No recovery path may recompute a different provider identity. A mismatch is a
hard runtime error, not an automatic re-plan.

## Recovery semantics

Recovery belongs to the provider contract:

| Mode | Meaning after ambiguous dispatch |
|---|---|
| `idempotent_retry` | Redispatch with identical identities only when provider deduplication is evidenced |
| `reconcile` | Query an authoritative observation before considering redispatch |
| `manual` | Stop and require an operator |
| `unknown` | Fail closed; program is non-executable |

The language declaration must match the catalog. This repetition is deliberate:
it makes author intent reviewable while preventing a generator from overriding
provider knowledge.

## Evidence and authority are separate

A source grant is a declaration. A runtime grant is authority.

A provider recovery mode is a claim. Evidence explains how the claim is known.

These must not be collapsed:

```text
declared != granted
asserted != verified
compiled != authorized
```

## Guarantee boundary

Given valid source, valid IR, runtime grants, a controlled host, and a provider
that satisfies its evidenced contract, Expresso aims to guarantee path
integrity:

- the exact committed observation is used;
- required deterministic checks execute;
- action planning freezes identity and input;
- runtime authority covers the operation;
- recovery follows the declared provider contract.

It does not prove observation truth, business-policy completeness, provider
honesty beyond evidence, or non-bypassability outside a controlled host.
