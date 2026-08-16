# Contributing

Expresso is intentionally small. Contributions should strengthen an enforced
semantic, a testable runtime invariant, or the user-testing loop.

## Before changing code

1. Read [VISION.md](VISION.md) and the relevant ADR.
2. State the invariant the change protects.
3. Prefer the smallest grammar or runtime change that proves it.
4. Do not add syntax solely for readability.
5. Do not weaken a provider contract to make an example pass.

Use a semantic proposal issue before adding a keyword, recovery mode, evidence
class, or authority mechanism.

## Local workflow

```bash
npm ci
npm run verify
```

Use Node.js 22 or newer. `npm run verify` runs semantic and runtime tests, the
example workflows, the generated plugin check, and a clean-room npm package
installation.

Every behavior change should include a focused test that would fail if the
underlying invariant were broken. Good examples include:

- observed data reaching an action without validation;
- provider identity changing after `ActionPlanned`;
- hand-written IR omitting recovery metadata;
- runtime grants missing despite source declarations;
- a lost response causing a duplicate external effect.

## Diagnostics

Diagnostics are an API for both people and coding agents. New diagnostics must
include:

- a stable code;
- severity (`error`, `blocker`, `warning`, or `info`);
- one precise problem;
- a concrete repair directive when repair is possible;
- structured details when a model needs source provenance or contract evidence.

Do not suggest a recovery mode unless it comes from a provider contract.
`unknown` is preferable to invented certainty.

## Provider contracts

Provider recovery claims must name their evidence:

- `unknown`
- `inferred`
- `developer_asserted`
- `documentation_backed`
- `conformance_tested`
- `provider_verified`

Only synthetic providers may be added without external conformance evidence.
Never place credentials, production identifiers, or customer data in fixtures.

## Pull requests

Keep pull requests narrow. Complete the pull request template, update affected
specs or ADRs, and include the exact commands run. If a behavior remains
unverified, say so.

Contributions are submitted under the
[Apache License 2.0](LICENSE). Do not contribute code you are not legally able
to release under those terms.
