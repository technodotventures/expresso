# Expresso v1 language specification

Status: current specification
Version: 0.1

This document specifies the implemented whitelist language. Features not listed
here do not exist.

## Design rule

Syntax is admitted only when it carries an enforced semantic or is required for
deterministic computation around that semantic. Expresso is not a TypeScript
subset.

## File shape

A file contains exactly one workflow:

```expresso
workflow Name {
  input { ... }
  grants { ... }
  <statements>
}
```

`input` and `grants` may each appear once. In v0.1 they must precede statements
for predictable authoring, although the parser currently accepts either order.

## Types

Input schemas support:

- `string`
- `integer`
- `boolean`
- `secret`
- `any`

The current parser records these types but the verifier does not yet perform
complete schema checking. `any` is an explicit escape hatch and should not be
used for action-sensitive data.

## Values and expressions

Supported values:

- strings;
- safe integer literals;
- booleans;
- closed records.

Supported expressions:

- workflow input and prior binding references;
- property access;
- record construction;
- `==`, `!=`, `<`, `<=`, `>`, and `>=`.

There are no arbitrary function calls, imports, package access, mutation,
exceptions, loops, concurrency, filesystem, network, clock, randomness,
reflection, processes, or dynamic evaluation.

## `observe`

```expresso
let proposal = observe "propose-refund" ai.propose_refund {
  case_id: input.case_id
}
```

Requirements:

- the label is a string literal and is unique in the workflow;
- the operation exists in the provider catalog;
- the operation kind is `observation`;
- the operation appears in the workflow's declared grants;
- the host independently grants it at runtime.

Semantics:

1. A structural identity is derived from execution ID, workflow, kind, and
   stable label.
2. A previously committed result is replayed from the journal.
3. Otherwise the trusted provider is called.
4. The result is committed before it becomes visible to later steps.
5. The bound value carries `observed` uncertainty provenance.

An observation may be repeated only according to its provider contract and only
before a result has committed.

## `validate`

```expresso
let refund = validate proposal {
  require proposal.amount > 0
  require proposal.amount <= input.remaining_paid
  return {
    refund_id: input.case_id
    amount: proposal.amount
  }
}
```

Requirements:

- the source binding already exists;
- at least one deterministic `require` is present;
- all requirements evaluate to true at runtime;
- the returned value uses only available deterministic expressions.

Semantics:

- `validate` is an information-flow boundary, not decorative syntax;
- its output carries deterministic-validation evidence and is untainted;
- failure stops execution before downstream actions;
- it proves that declared checks ran, not that the checks express complete or
  correct business policy.

v0.1 discharges provenance for the returned value as a whole. Field-sensitive
evidence policies are deferred.

## `action`

```expresso
action "issue-refund" payments.refund {
  identity refund.refund_id
  recovery reconcile
  input {
    refund_id: refund.refund_id
    amount: refund.amount
  }
}
```

Requirements:

- the label is stable and unique;
- the operation exists and has kind `action`;
- declared and runtime grants cover the action;
- `identity` is present, stable, and untainted;
- action input is untainted;
- recovery is `idempotent_retry`, `reconcile`, `manual`, or `unknown`;
- recovery exactly matches the provider contract;
- reconciliation operations are also declared and runtime-granted.

`recovery unknown` is syntactically and semantically admissible but blocks
execution. It exists so missing provider knowledge cannot be converted into a
plausible model guess.

## Identity

Every action has two identities:

1. **Structural execution identity** — compiler/runtime generated from workflow
   instance and action site. It identifies one logical occurrence.
2. **Provider/business identity** — supplied by `identity`, recorded before
   dispatch, and reused on every recovery path.

The provider identity may depend on workflow input or validated values. It may
not depend directly on tainted observed data. Once `ActionPlanned` commits, its
provider identity is immutable; runtime recomputation that differs is
`R200_IDENTITY_DRIFT`.

## Grants

```expresso
grants {
  ai.propose_refund
  payments.refund
  payments.lookup_refund
}
```

This block declares required authority for review and verification. It does not
grant authority. The trusted host supplies runtime grants independently, and the
runtime rejects missing grants even when the source and IR declare them.

## Grammar

The implemented grammar is approximately:

```ebnf
program        = "workflow" identifier "{" input? grants? statement* "}" ;
input          = "input" "{" (identifier ":" identifier ","?)* "}" ;
grants         = "grants" "{" (path ","?)* "}" ;
statement      = observation | validation | action ;
observation    = "let" identifier "=" "observe" string path record ;
validation     = "let" identifier "=" "validate" identifier "{"
                   requirement+ "return" expression
                 "}" ;
requirement    = "require" expression ;
action         = "action" string path "{"
                   "identity" expression
                   "recovery" identifier
                   "input" record
                 "}" ;
record         = "{" (identifier ":" expression ","?)* "}" ;
expression     = primary (comparison primary)? ;
primary        = string | integer | boolean | path | record ;
comparison     = "==" | "!=" | "<" | "<=" | ">" | ">=" ;
path           = identifier ("." identifier)* ;
```

The parser accepts action properties in any order but the formatter and examples
use identity, recovery, input.

## Diagnostic contract

Diagnostics are stable, structured output. A verifier result contains:

```json
{
  "ok": false,
  "executable": false,
  "diagnostics": [
    {
      "code": "E203",
      "severity": "error",
      "message": "Observed data reaches action 'issue-refund' without validation.",
      "repair": "Pass the observed value through validate before using it as action input."
    }
  ]
}
```

- `error` means the program or IR is inadmissible.
- `blocker` means structurally admissible but forbidden to execute.
- `warning` preserves executability but requires review.
- `info` reports evidence without affecting status.

## Deliberate omissions

No `decide` construct exists. Deterministic branching and computation should
remain ordinary language semantics when introduced. No keyword is added merely
to narrate a workflow.
