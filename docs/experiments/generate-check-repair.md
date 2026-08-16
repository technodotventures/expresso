# Generate–check–repair experiment

## Question

Can a coding model produce executable Expresso workflows from natural-language
tasks when provider facts are supplied, and can structured diagnostics close
the loop without inviting hallucinated safety claims?

The experiment is not a runtime benchmark and does not execute real actions.

## Hypotheses

H1. At least 80% of representative tasks verify within three repair rounds.

H2. Identity, taint, grant, and grammar failures decrease after one diagnostic
round.

H3. When provider recovery is `unknown`, models preserve `unknown` or escalate
rather than inventing a stronger mode.

H4. A small standalone grammar is usable enough for AI authoring. A
restricted-TypeScript-shaped alternative is tested only if M1 results justify
the implementation.

## Implemented harness

```text
task + minimized provider catalog
                |
                v
          model adapter
                |
                v
        parse + source verify
          |            |
       verified     diagnostics
          |            |
          +----- bounded repair loop
```

Run the deterministic fixture:

```bash
npm run experiment
```

The first fixture attempt intentionally violates four rules. The second repairs
them. This verifies harness mechanics; it is not model evidence.

## Model adapter contract

Run:

```bash
node src/cli.mjs experiment experiments/tasks.json \
  --model-command /absolute/path/to/model-adapter
```

The executable receives one JSON request on standard input:

```json
{
  "task": {
    "id": "refund-lost-response",
    "surface": "expresso",
    "prompt": "..."
  },
  "attempt": 2,
  "diagnostics": [
    {
      "code": "E203",
      "message": "...",
      "repair": "..."
    }
  ],
  "catalog": {
    "catalogVersion": "1",
    "operations": {}
  }
}
```

It returns:

```json
{
  "source": "workflow RefundCustomer { ... }",
  "metadata": {
    "model": "model-name",
    "inputTokens": 1000,
    "outputTokens": 500,
    "latencyMs": 1200
  }
}
```

The harness uses direct process spawning with no shell. Adapters must not log
secrets to standard output because stdout is the JSON protocol. `metadata` is
optional and is copied into the experiment round.

## Task suite

M1 should contain at least:

- uncertain content transformed into a customer email;
- refund proposal with amount and recipient constraints;
- account provisioning with human approval;
- calendar booking with domain identity;
- CRM update requiring reconciliation;
- duplicate action within a loop once loops exist;
- provider with `recovery unknown`;
- observation incorrectly classified as action;
- action incorrectly classified as observation;
- missing provider catalog entry.

Every task includes a reviewed expected effect manifest:

- observations;
- validations or other evidence boundaries;
- actions;
- structural labels;
- provider identity sources;
- declared grants;
- recovery sources;
- intended blockers.

## Metrics

Per task and surface:

- parse success on first attempt;
- executable verification rate;
- repair rounds;
- diagnostic code frequency;
- repeated-diagnostic rate;
- new errors introduced by repair;
- hallucinated provider semantics;
- incorrect upgrade from `unknown`;
- human review corrections after verification;
- tokens and latency when adapter reports them.

Aggregate results must distinguish:

- checker success;
- executability;
- human semantic acceptance;
- provider knowledge unavailable.

## Surface A/B

The standalone `.expresso` surface is implemented first. A future restricted-TS
surface must have its own whitelist grammar and checker; it cannot be ordinary
TypeScript plus a blacklist.

Both surfaces receive identical task intent and provider contracts. Compare:

- verification rate;
- repair rounds;
- grammar errors;
- model-invented constructs;
- reviewer comprehension;
- false assumptions caused by familiar syntax.

Do not choose a surface based only on aesthetic preference.

## Safety

- Use synthetic providers and identifiers.
- Never pass credentials to a model adapter.
- Never execute generated source automatically.
- Keep `unknown` fail-closed.
- Human-review verified workflows before any host receives authority.
- Store model/provider/version and prompt provenance with results.

## Decision rule

Proceed to runtime-host work when:

- at least 80% of tasks verify within three rounds;
- no task silently upgrades unknown recovery;
- reviewers find the diagnostic-driven repair understandable;
- unresolved failures point to bounded language or diagnostic work rather than
  missing semantics.

Otherwise revise the grammar, diagnostics, or provider context and rerun before
expanding runtime scope.
