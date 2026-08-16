# Roadmap

The roadmap is organized around falsifiable milestones, not feature volume.

## M0 — Foundation

Goal: make the converged semantics executable and reviewable.

Exit criteria:

- whitelist grammar for `observe`, `validate`, and `action`;
- structured source diagnostics;
- dual identity model;
- fail-closed unknown recovery;
- provider catalog with evidence;
- inspectable IR;
- runtime IR and authority verification;
- synthetic lost-response recovery;
- generate-check-repair fixture loop;
- public specifications and ADRs.

Status: shipped.

## M0.5 — Public release

Goal: let a developer install and verify the authoring toolchain without a
repository checkout.

Shipped in `0.3.x`:

- public npm package shape with an `init` path and bundled provider catalog;
- clean-room package installation and CLI smoke test;
- self-contained Codex authoring plugin and marketplace metadata;
- generated-plugin drift detection and plugin validation;
- runtime authority required before provider dispatch;
- observation and action plans frozen across ambiguous recovery;
- Node.js 22/24 verification on Linux, macOS, and Windows;
- tokenless npm trusted publishing with provenance;
- live npm, GitHub, Codex marketplace, and website installation paths;
- Apache-2.0 licensing across the repository, package, and plugin.

Remaining distribution operation:

- complete any publisher-controlled review required for the public Codex
  directory.

See the [public release runbook](docs/project/public-release.md).

## M1 — Authoring user test

Goal: learn whether developers and coding agents can author the strict language.

Exit criteria:

- 10 representative workflow tasks;
- a real model adapter run against all tasks;
- machine-readable experiment results;
- repair-round and diagnostic-frequency baselines;
- recorded hallucination rate for recovery semantics;
- five developer review sessions;
- explicit decision on whether to prototype a restricted TypeScript-shaped
  surface for A/B comparison.

Go signal: at least 80% of tasks verify within three repair rounds without
inventing provider semantics.

## M2 — Runtime mechanism

Goal: prove the closed consequential lane rather than assuming it.

Exit criteria:

- persistent crash-safe journal;
- load-time IR verification corpus and fuzz tests;
- isolated workflow process;
- credentials available only to the action host;
- deny-by-default egress;
- least-privilege provider processes;
- open-agent bypass test;
- provider-to-provider confused-deputy test;
- one host-owned tool and one synthetic third-party tool.

Go signal: all in-lane and out-of-lane bypass tests fail closed.

## M3 — Provider evidence

Goal: ensure AI authoring is grounded in verified provider semantics.

Exit criteria:

- versioned contract schema;
- contract signatures or trusted provenance;
- customer-runnable conformance harness;
- drift and expiry metadata;
- one non-production provider sandbox integration;
- reports that separate verified, asserted, and unknown properties.

Go signal: the harness detects a deliberately introduced contract drift and
blocks execution.

## M4 — Design partner

Goal: validate developer pain and the willingness to adopt the closed lane.

Exit criteria:

- three teams with consequential workflow candidates;
- one staged workflow running in the isolated host;
- one controlled lost-response exercise;
- measured reduction in hand-written reliability machinery;
- interviews with both the engineer feeling the pain and the budget owner;
- explicit commercial and architecture-change feedback.

## Deferred

These are deliberately out of scope until earlier milestones pass:

- broad MCP, framework, or provider catalogs;
- open-world enforcement claims;
- visual workflow builder;
- general orchestration or scheduling;
- arbitrary TypeScript/Python lowering;
- a public protocol or standards effort;
- production deployment.

See [milestones.md](docs/project/milestones.md) for GitHub planning detail.
