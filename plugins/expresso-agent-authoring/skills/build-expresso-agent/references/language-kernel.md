# Expresso language kernel

Expresso version 0.1 contains one workflow per file:

```expresso
workflow Name {
  input {
    request_id: string
  }

  grants {
    example.lookup
    example.change
  }

  let proposal = observe "lookup" example.lookup {
    request_id: input.request_id
  }

  let approved = validate proposal {
    require proposal.request_id == input.request_id
    return {
      request_id: input.request_id
      value: proposal.value
    }
  }

  action "change" example.change {
    identity approved.request_id
    recovery manual
    input {
      request_id: approved.request_id
      value: approved.value
    }
  }
}
```

## Constructs

- `observe` obtains an externally determined result. The result is journalled
  before later steps may use it and carries uncertain provenance.
- `validate` runs deterministic `require` expressions and returns an untainted,
  stable value when every requirement succeeds.
- `action` requests an external state change. It requires a stable label,
  provider identity, untainted input, a declared grant, and recovery matching
  the provider catalog.

Supported input types are `string`, `integer`, `boolean`, `secret`, and `any`.
Supported values are strings, safe integers, booleans, records, references, and
comparisons using `==`, `!=`, `<`, `<=`, `>`, or `>=`.

There are no imports, arbitrary calls, mutation, exceptions, loops,
concurrency, filesystem, network, clock, randomness, processes, reflection, or
dynamic evaluation.

## Identity and grants

Every observe/action label must be a unique string literal. Every action also
has a provider identity derived from workflow input or validated data. It may
not depend directly on observed data.

The `grants` block lists every observation, action, and reconciliation
operation the workflow requests. It does not itself confer runtime authority.

## Diagnostics

- `VERIFIED` means the source is admissible and executable against the catalog.
- `ADMISSIBLE BUT BLOCKED` means the source is reviewable but cannot execute,
  commonly because recovery is unknown.
- `REJECTED` means one or more language or semantic invariants failed.

Use `--json` for structured diagnostics.
