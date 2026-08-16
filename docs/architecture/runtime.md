# Runtime architecture

## Trust zones

A production Expresso deployment has three zones:

```text
open agent zone
  flexible reasoning and code generation
  no consequential credentials or provider egress
              |
              v
workflow zone
  verified IR, no ambient powers
              |
              v
trusted provider zone
  least-privilege operation handlers
  credentials and controlled egress
```

The reference runtime implements the workflow state machine and synthetic
provider zone in one process. A production host must enforce operating-system
isolation around that runtime boundary.

## Execution lifecycle

At load:

1. Validate IR structure.
2. Re-run semantic checks.
3. compare required operations with host grants.
4. Reject blockers and errors.

At runtime:

1. Bind durable workflow input.
2. Replay or commit observations.
3. execute deterministic requirements.
4. evaluate and freeze action identities and input in `ActionPlanned`.
5. dispatch through a trusted provider handler.
6. append completion, failure, or leave the plan pending on unknown outcome.
7. on resume, recover from the frozen plan.

## Journal state machine

```text
Observation
  absent -> ObservationPlanned -> ObservationCommitted
                              \-> pending -> repeat/manual

Action
  absent -> ActionPlanned -> ActionCompleted
                         \-> ActionFailed
                         \-> pending/unknown -> reconcile/retry/manual
```

Planning occurs before dispatch. Observation input and recovery, plus action
provider identity, input, and recovery, are immutable.

The in-memory journal is deterministic and testable but not crash-safe. A
production journal needs transactional append, durability, integrity controls,
secret redaction, and retention policy.

## Recovery

For a pending action:

- `idempotent_retry` redispatches the frozen plan with identical identities;
- `reconcile` calls the catalog's observation and records a recovered
  completion when found;
- `manual` stops;
- `unknown` never reaches execution because load verification blocks it.

The synthetic refund provider deliberately performs the action and then loses
its response. Resume performs authoritative lookup and completes without a
second dispatch.

## Authority

Workflow `grants` are requests. The trusted host supplies an independent set of
runtime grants. The runtime requires both.

Provider handlers must also be least-privilege. A refund handler should not hold
email or CRM authority. Provider-to-provider effects must be separate actions or
explicit compound contracts; otherwise the trusted provider becomes a confused
deputy.

## Non-bypassability

The language cannot establish whole-system exclusivity. Production deployment
must prove:

- open agents do not receive consequential credentials;
- raw provider SDKs are absent from workflow code;
- protected provider endpoints are unreachable from open/workflow zones;
- action-host identities are separately scoped;
- metadata services cannot mint broader credentials;
- provider implementations cannot call undeclared consequential providers.

Until these checks pass, Expresso can verify a workflow but cannot claim it is
the only path to the provider.
