# Recovery and review

## Recovery modes

Recovery is a provider fact, not a model choice:

- `idempotent_retry`: redispatch only when provider deduplication for the same
  identity is evidenced.
- `reconcile`: query an authoritative observation before any redispatch.
- `manual`: stop and require an operator to determine the outcome.
- `unknown`: fail closed; the workflow is not executable.

The workflow declaration must exactly match the provider catalog. If evidence
is absent, keep recovery `unknown` and report the blocked assumption.

## Review checklist

For every observation:

- Is the operation a read or externally determined judgment?
- Is its result sensitive?
- What happens when the provider returns but the result is not committed?

For every action:

- What external state changes?
- Is its stable label unique?
- Is provider identity derived only from input or validated data?
- Does action input pass through deterministic validation when it uses observed
  data?
- Does recovery match catalog evidence?
- Is the reconciliation operation granted when required?

For the workflow:

- Does the source declare every provider operation?
- Are approvals and manual recovery points explicit?
- Which business-policy checks remain assumptions?
- Which provider guarantees are documentation-backed, conformance-tested, or
  still unknown?

Compiler verification does not prove observation truth, business-policy
completeness, provider honesty, credential isolation, or deployment approval.
