# Vision

## The problem

Ordinary application languages represent model calls, deterministic business
logic, and real-world effects as similar-looking function calls. Developers then
rebuild the important distinctions with conventions, wrappers, retry code,
logs, queues, approval flows, and provider-specific recovery logic.

Those conventions are easy for humans and coding agents to bypass.

Expresso starts from a narrower premise:

> Uncertain observations and consequential actions deserve mechanically
> enforced boundaries.

This is not a claim that AI needs decorative syntax. `observe`, `validate`, and
`action` exist only because they change what a program is allowed to do.

## The model

An Expresso workflow runs in a closed consequential lane:

```text
uncertain source
      |
   observe        result is committed and carries uncertainty provenance
      |
 deterministic code
      |
   validate       explicit deterministic evidence discharges taint
      |
    action        identity-bearing, recoverable, capability-protected effect
      |
controlled provider host
```

The runtime has no ambient clock, randomness, filesystem, network, process,
dynamic import, or raw provider credentials. Those powers must enter through
host-supplied operations.

## The core claim

Expresso mechanically checks information flow from uncertain, journalled
observations into identity-bearing consequential actions inside a durable
execution model.

This builds on prior work in effect systems, information-flow control,
object-capability security, durable execution, and restricted execution
substrates. The proposed contribution is their interaction at the
observation-to-action boundary, not the invention of those fields.

## What success looks like

A developer or coding agent can describe a consequential workflow and receive:

1. precise structural obligations without writing a complete formal
   specification;
2. machine-repairable diagnostics when those obligations are unmet;
3. a verified artifact that the runtime checks again before execution;
4. a journal that preserves the exact observation and action plan used;
5. recovery behavior grounded in provider evidence rather than model guesses;
6. an execution environment where raw consequential paths are absent.

## What Expresso does not promise

Expresso does not prove:

- that an observation is true;
- that a model's recommendation is wise;
- that deterministic validations express complete business policy;
- exactly-once effects from providers that do not support deduplication or
  reconciliation;
- whole-system confinement when credentials or egress bypass the action host;
- safety for arbitrary JavaScript, Python, shell, or open agent environments.

The language can make a wrong refund well-formed. Business rules, approvals,
independent verification, and human judgment remain necessary.

## Product sequence

The first product is the mechanism:

- a strict authoring surface;
- a semantic compiler and verifier;
- re-entrant runtime verification;
- a controlled synthetic runtime;
- an AI generate-check-repair experiment.

Provider catalogs, open-world assurance, and interoperability may follow, but
they must reuse the semantics without borrowing closed-world guarantees.

The immediate question is falsifiable:

> Can people and coding agents produce useful workflows under these constraints,
> and do the constraints prevent the failures developers otherwise hand-code
> around?
