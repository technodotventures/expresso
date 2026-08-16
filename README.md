# Expresso

**Keep your agents in check.**

Express what your agents are allowed to do. Declared in words, checked like
code.

Keep your model, framework, application code, and provider SDKs. Expresso sits
only where uncertain model output can become a consequential action.

Its enforced semantics are deliberately small:

- `observe` introduces externally determined, journalled information.
- `validate` is a compiler-recognized information-flow boundary.
- `action` requests a world-changing effect with structural identity, provider
  identity, recovery semantics, and runtime authority.

Legibility is what those semantics look like. Reliability is what they are
worth.

## Current release

Version `0.3.2` is the current public release of the compiler, verifier, runtime
core, CLI, examples, and Codex and Claude Code authoring plugins. The package is
available as
[`@technodotventures/expresso`](https://www.npmjs.com/package/@technodotventures/expresso),
and every release is verified on Linux, macOS, and Windows before publication.

The runtime is built to enforce a narrow, controlled lane from uncertain
information to external action. Bundled providers are synthetic conformance
fixtures, not production integrations. Before connecting a real consequential
system, supply a trusted host, isolated credentials, durable journal storage,
and a provider adapter whose recovery contract has been tested against that
provider.

The current release includes:

- a deliberately small, whitelist `.expresso` grammar;
- source verification with structured, repair-oriented diagnostics;
- taint tracking from `observe` through `validate` into `action`;
- separate structural and provider action identities;
- provider contracts whose recovery claims carry evidence;
- fail-closed `recovery unknown`;
- compilation to inspectable workflow IR;
- runtime re-verification of untrusted IR and host grants;
- journalling and lost-response reconciliation with synthetic providers;
- a model-command interface for generate–check–repair experiments.

Expresso does **not** claim that model judgments are correct, that arbitrary
agent code is deterministic, or that real providers are exactly-once. It makes
the boundary explicit and enforces the path you declare.

## Try it

Requirements: Node.js 22 or newer. To verify a repository checkout:

```bash
npm ci
npm run verify
```

A developer can start in an existing project without cloning this repository:

```bash
npx @technodotventures/expresso init
npx @technodotventures/expresso check expresso/refund.expresso
```

`init` creates a checked example and a local provider catalog in `expresso/`. It
will not overwrite either file. The lost-response demo should report one
provider dispatch, one external refund, and a journal containing
`ObservationPlanned`, `ObservationCommitted`, `ActionPlanned`, and
`ActionCompleted`.

## A minimal workflow

```expresso
workflow RefundCustomer {
  input {
    case_id: string
    customer_id: string
    remaining_paid: integer
  }

  grants {
    ai.propose_refund
    payments.refund
    payments.lookup_refund
  }

  let proposal = observe "propose-refund" ai.propose_refund {
    case_id: input.case_id
  }

  let refund = validate proposal {
    require proposal.amount > 0
    require proposal.amount <= input.remaining_paid
    require proposal.customer_id == input.customer_id
    return {
      refund_id: input.case_id
      amount: proposal.amount
      customer_id: proposal.customer_id
    }
  }

  action "issue-refund" payments.refund {
    identity refund.refund_id
    recovery reconcile
    input {
      refund_id: refund.refund_id
      amount: refund.amount
      customer_id: refund.customer_id
    }
  }
}
```

The compiler rejects direct observation-to-action flow, unstable provider
identity, recovery modes that contradict the provider contract, and missing
reconciliation grants. The runtime checks those safety-critical properties
again and independently checks authority supplied by the trusted host.

## Commands

```text
expresso init [directory]
expresso check <file> [--catalog <file>] [--json]
expresso compile <file> [--catalog <file>] [--out <file>] [--json]
expresso demo lost-response
expresso experiment <tasks.json> [--model-command <executable>]
expresso --version
```

`check` and `compile` use `expresso/providers.json` when it exists, otherwise
they use the provider catalog bundled with the package.

`--json` emits machine-readable diagnostics intended for an AI repair loop.
A model command receives one JSON request on standard input and must return:

```json
{ "source": "workflow ..." }
```

The request includes the task, the prior diagnostics, and a minimized provider
catalog. Recovery facts are inputs to generation, never model inventions.

## Use with Codex

The repository includes a self-contained Codex authoring plugin. A tagged
release should be installed with a pinned marketplace reference:

```bash
codex plugin marketplace add technodotventures/expresso --ref v0.3.2
codex plugin add expresso@expresso
```

The plugin teaches Codex the same `observe` → `validate` → `action` authoring
loop and runs compiler code generated from the tagged release. Maintainers can
verify the bundle from a checkout with `npm run check:plugin` and
`npm run test:plugin`.

## Use with Claude Code

The same self-contained authoring plugin is distributed through the
repository's Claude Code marketplace:

```text
/plugin marketplace add technodotventures/expresso
/plugin install expresso@expresso
/reload-plugins
```

The plugin provides the namespaced `/expresso:build-expresso-agent` skill and
uses the same bundled checker as the Codex plugin. Other-agent integrations are
not yet distributed. The website must not present another agent as installable
until its path has a verified artifact and clean-room installation test.

## Repository map

```text
src/
  language/       tokenizer and whitelist parser
  verifier/       source and runtime IR verification
  compiler/       source-to-IR lowering
  runtime/        journal, evaluator, execution, synthetic providers
  providers/      provider-catalog validation
  harness/        generate-check-repair experiment loop
providers/        versioned provider contracts
examples/         checked workflows and synthetic inputs
experiments/      user-test tasks and repair fixtures
plugins/          self-contained Codex and Claude Code plugin
scripts/          package and plugin release checks
test/             semantic and runtime regression tests
.agents/          Codex plugin marketplace metadata
.claude-plugin/   Claude Code plugin marketplace metadata
docs/
  adr/            accepted architectural decisions
  architecture/   verifier, runtime, and trust-zone design
  spec/           language and semantic model
  experiments/    experiment protocol
  project/        milestones and user-testing plan
```

## Design boundary

Expresso guarantees the integrity and recoverability of the path from uncertain
input to consequential execution **inside a controlled lane**. It does not
guarantee the truth of an observation or the wisdom of an action.

A production host must keep raw credentials, unrestricted provider egress, and
unregistered SDKs out of workflow code and any open agent environment. Expresso
defines and checks that control boundary; the deployment host remains
responsible for process isolation, credential custody, network policy, durable
storage, and provider-specific conformance.

Start with [VISION.md](VISION.md), then read the
[language specification](docs/spec/language.md),
[semantic model](docs/spec/semantic-model.md), and
[runtime architecture](docs/architecture/runtime.md). Maintainers should use
the [release runbook](docs/project/public-release.md) before publishing a new
package, plugin, or website version.

## License

Expresso is open source under the
[Apache License 2.0](LICENSE).
