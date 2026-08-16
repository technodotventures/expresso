# Provider contracts

Provider contracts are trusted inputs to authoring and verification. They are
not generated from call-site source and must not be guessed by a model.

## Contract shape

The reference catalog stores:

```json
{
  "kind": "action",
  "capability": "finance.refund",
  "providerIdentity": {
    "source": "workflow",
    "field": "refund_id",
    "transmittedAs": "providerIdentity"
  },
  "recovery": {
    "mode": "reconcile",
    "operation": "payments.lookup_refund",
    "evidence": {
      "level": "conformance_tested",
      "source": "Local synthetic test suite."
    }
  }
}
```

## Evidence levels

From weakest to strongest:

1. `unknown`
2. `inferred`
3. `developer_asserted`
4. `documentation_backed`
5. `conformance_tested`
6. `provider_verified`

These are provenance labels, not universal safety grades. The evidence source,
scope, provider/API version, and last-tested date are required before real
provider integration.

## Authoring rule

The model receives a minimized catalog containing kind, capability, identity,
and recovery data. It may select those facts but may not synthesize alternatives.

When the catalog says `unknown`, the language can express:

```expresso
recovery unknown
```

The program remains reviewable and non-executable.

## Verification is still required

Metadata alone cannot establish that:

- the implementation transmits the provider identity;
- the remote provider honors it;
- reconciliation is authoritative;
- retention windows cover actual retries;
- direct bypass routes do not exist;
- provider behavior has not drifted.

Later milestones add customer-run conformance tests and runtime transmission
evidence. The v0.1 catalog contains synthetic claims only.
