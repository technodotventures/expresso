# ADR-0005: Treat compiled IR as untrusted

- Status: Accepted
- Date: 2026-07-25

## Context

If runtime execution trusts IR because an official compiler supposedly produced
it, hand-written or tampered IR becomes an unchecked side door. Static
declarations must not create authority.

## Decision

The runtime re-verifies all safety-critical IR properties at load:

- shape and version;
- operation kind;
- structural site;
- identity and recovery presence;
- information-flow evidence;
- declared grants;
- host-supplied grants;
- provider catalog compatibility.

The runtime reconstructs analysis rather than trusting serialized compiler
results.

## Consequences

- Source verification improves developer and AI experience.
- Runtime verification is the execution guarantee.
- IR may remain inspectable and portable without relying on secrecy.
- Signed artifacts prove provenance, not safety, and would still be verified.
- Shared verification code reduces implementation drift but requires adversarial and
  differential testing before production.

## Rejected alternatives

- Sealed or undocumented IR as the sole protection.
- Compiler signature bypassing runtime semantic checks.
- Runtime grant derivation from source grants.
