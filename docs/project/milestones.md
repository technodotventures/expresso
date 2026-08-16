# Proposed GitHub milestones

No GitHub repository or remote was available in the workspace, so these
milestones are specified for creation when the clean repository is published.

## Milestone: M0 Foundation

Due: complete with initial scaffold

Issues:

- Implement whitelist parser.
- Implement structured diagnostics.
- Track observation provenance.
- Enforce validate-before-action.
- Split structural and provider identities.
- Validate provider catalog evidence.
- Compile inspectable IR.
- Re-verify IR and runtime grants.
- Demonstrate lost-response reconciliation.
- Add fixture repair loop.

## Milestone: M1 Authoring study

Issues:

- Build 10-task reviewed experiment suite.
- Connect one real model adapter.
- Persist model/version/prompt metadata.
- Add repeated-error and regression metrics.
- Test fail-closed unknown recovery.
- Conduct five developer sessions.
- Decide whether to implement restricted-TS A/B surface.

## Milestone: M2 Closed-lane host

Issues:

- Replace in-memory journal with transactional storage.
- Isolate workflow and provider processes.
- Deny open-agent access to consequential credentials.
- Deny open-agent and workflow egress to protected providers.
- Scope provider implementations by capability.
- Test provider-to-provider confused deputy.
- Fuzz runtime IR verifier.

## Milestone: M3 Provider evidence

Issues:

- Version provider contract schema.
- Record test scope, API version, and expiry.
- Add customer-run conformance harness.
- Capture runtime identity-transmission evidence.
- Detect stale or drifted contracts.
- Pilot one non-production provider sandbox.

## Milestone: M4 Design partner

Issues:

- Qualify three real consequential workflows.
- Map engineer, incident owner, and budget owner.
- Run one staged closed-lane workflow.
- Conduct controlled lost-response exercise.
- Measure eliminated custom glue.
- Record architecture-change and purchase decision.

## Suggested labels

```text
area:language
area:verifier
area:runtime
area:providers
area:experiment
area:docs
type:bug
type:semantic-proposal
type:user-research
type:security
status:blocked-evidence
good-first-invariant
```
