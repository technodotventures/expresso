---
name: build-expresso-agent
description: Generate, check, repair, or review `.expresso` workflows. Use when a user asks to translate workflow intent into Expresso, repair compiler diagnostics, or report observations, actions, grants, identities, recovery modes, and unresolved provider assumptions.
---

# Build Expresso Agent

Use Expresso to create the smallest checked workflow that represents the
requested effect boundary. The bundled checker is
generated from the same source used by the public CLI; its result establishes
language admissibility, not provider truth or deployment approval.

## Workflow

1. Inspect the target repository before writing. Reuse existing `.expresso`
   files, provider catalogs, labels, and naming conventions.
2. Read [language-kernel.md](references/language-kernel.md). Read
   [recovery-and-review.md](references/recovery-and-review.md) whenever a
   workflow contains an action or sensitive data.
3. Write a short effect plan containing:
   - observations and why they are externally determined;
   - actions and the external state they change;
   - required grants;
   - stable operation labels and provider identities;
   - provider-backed recovery modes;
   - unresolved business or provider assumptions.
4. Reuse provider operations from the supplied catalog. Never invent
   idempotency, reconciliation, retention, or authority guarantees.
5. Generate one workflow per file. Keep the language surface small and explicit.
   Version 0.1 has no imports, function calls, loops, concurrency, filesystem,
   network, clock, randomness, or dynamic evaluation.
6. Validate every changed file:

   ```bash
   node <skill-directory>/scripts/expresso.mjs check <file>
   ```

   Resolve `<skill-directory>` to the directory containing this `SKILL.md`.
   Add `--catalog <file>` when the target project supplies its own catalog.
7. Repair diagnostics surgically and rerun the checker until it reports
   `VERIFIED`. Do not weaken a provider contract to make source pass.
8. Use only synthetic inputs and providers for execution tests. Do not invoke
   production payments, communications, infrastructure, or customer systems.
9. Return the changed files plus an effect manifest covering observations,
   actions, grants, recovery/manual gates, provider assumptions, and checks run.

## Review existing programs

- Run the checker before interpreting source.
- Separate compiler-established properties from provider assertions and
  business-policy assumptions.
- Report actionable findings before optional improvements.
- Do not execute the workflow unless the user asks and all providers are
  synthetic.

## Boundaries

- `check` establishes admissibility only within the closed language surface.
- Source `grants` declare requirements; runtime authority is independent and
  must fail closed.
- Provider recovery declarations remain assertions until backed by conformance
  evidence.
- Never describe Expresso as providing universal exactly-once execution.
- Keep authoring separate from deployment and credential access.
