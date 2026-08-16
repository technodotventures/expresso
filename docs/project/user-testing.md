# User-testing plan

## Purpose

Validate the developer pain and the authoring model before building broad
integrations.

## Participants

Recruit two distinct groups:

1. developers currently hand-building model-to-action workflows;
2. platform, reliability, or security owners accountable when those workflows
   fail.

Do not count text-only assistants, demos with no external effects, or teams that
cannot describe a concrete consequential workflow.

## Session

Each 60-minute session uses one synthetic task.

1. Ask the participant how they would build it today.
2. Inventory every library, service, process, and review step they would add for
   model calls, validation, durability, identity, recovery, authority, and
   audit.
3. Have an AI assistant generate the Expresso workflow.
4. Run the repair loop while the participant observes.
5. Ask the participant to review the verified source and effect manifest.
6. Inject a provider-success/lost-response failure.
7. Show the journal and reconciliation.
8. Ask what remains unsafe or unclear.

## Questions

- Which current engineering work would Expresso remove?
- Which restrictions feel justified versus obstructive?
- Does `validate` match how the team expresses policy?
- Can the participant explain both identities?
- Who owns a duplicate-effect incident?
- Who would approve adopting a closed consequential lane?
- Would the team change credential or egress architecture to obtain
  non-bypassability?
- Is the result a must-fix problem, a useful audit, or merely interesting?
- If Expresso disappeared, who would complain first?

## Evidence to capture

- current stack and custom glue;
- time spent building equivalent machinery;
- task completion and repair rounds;
- diagnostics that confuse participant or model;
- edits made after executable verification;
- rejected language restrictions;
- buyer and incident owner;
- willingness to pilot and change architecture;
- verbatim value-language, with participant permission.

## Success criteria

After five sessions:

- at least three participants identify costly current glue;
- at least four can explain the guarantee boundary after one walkthrough;
- at least three would use the strict lane for a named workflow;
- at least two organizations have both a technical owner and a budget path;
- no participant mistakes verifier success for correctness of model judgment.

Failure to meet these criteria is evidence to narrow or stop, not a prompt to
add features.
