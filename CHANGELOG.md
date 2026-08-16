# Changelog

All notable changes to Expresso are recorded here.

## Unreleased

## 0.3.2 — 2026-08-01

### Added

- Native Claude Code marketplace metadata for the self-contained expresso
  authoring plugin.
- Claude Code installation instructions and manifest regression coverage.

### Changed

- Updated repository, package, and plugin positioning to "Keep your agents in
  check."
- Added the language specification and test suite to the published npm package.
- Updated public links from the preview hostname to `https://expresso.build`.

## 0.3.1 — 2026-07-29

### Changed

- Relicensed the repository, npm package, and Codex plugin under Apache-2.0.
- Aligned the README, package metadata, plugin listing, release documentation,
  and website with the public product language: rules, permissions, identity,
  and recovery before an agent acts.
- Replaced release-candidate and unpublished messaging with live installation
  instructions and an explicit production integration boundary.

## 0.3.0 — 2026-07-29

### Added

- Public `@technodotventures/expresso` package metadata and an overwrite-safe `init`
  command.
- Clean-room npm packing, installation, initialization, and checking tests.
- Self-contained Codex authoring plugin with generated compiler assets and
  marketplace metadata.
- Node.js 22/24 CI across Linux, macOS, and Windows.
- Manually approved npm publication workflow.

### Changed

- Runtime execution now requires trusted-host grants before any provider
  dispatch.
- Observation and action plans are journalled and checked for drift before
  ambiguous-response recovery.
- Provider identities and structured inputs are compared by value during
  recovery.

### Security

- Non-repeatable observations fail closed after an ambiguous provider response.
- Runtime diagnostics identify missing grants and recovery-plan drift.
