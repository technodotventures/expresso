# Security

The Expresso compiler, verifier, runtime core, CLI, and Codex authoring plugin
are publicly available. Security reports are welcome across the complete path
from source verification to provider recovery.

Bundled provider operations are synthetic conformance fixtures. A production
deployment must add host isolation, credential custody, durable journal storage,
network policy, and provider-specific recovery evidence appropriate to the
external system it can change.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's
[private vulnerability reporting
form](https://github.com/technodotventures/expresso/security/advisories/new). If the
form is unavailable, contact the repository owner privately and provide only the
minimum reproduction necessary.

The project will acknowledge receipt, assess scope and severity, and coordinate
a fix before public disclosure.

## Supported versions

Security fixes are provided for the most recent tagged release. Untagged
commits and older releases are not supported.

## Current trust boundary

The runtime core provides source verification, IR re-verification, runtime
grants, identity freezing, journalling, and synthetic provider recovery.

It does not yet provide:

- process or container isolation;
- credential separation;
- network egress enforcement;
- signed provider catalogs;
- tamper-resistant journal storage;
- authenticated deployment;
- resource limits;
- secret redaction.

Passing `expresso check` is not deployment approval.
