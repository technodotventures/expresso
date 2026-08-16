# Public release

This runbook publishes a verified Expresso release across npm, GitHub, the
Codex and Claude Code plugin marketplaces, and the website. It does not replace
deployment-level review of host isolation, credentials, storage, network
policy, or a real provider adapter.

## Release contract

| Surface | Release | Compatibility |
| --- | --- | --- |
| npm package | `@technodotventures/expresso@0.3.x` | Node.js 22 or 24 |
| Codex plugin | `expresso@0.3.x` | CLI/compiler `0.3.x` |
| Claude Code plugin | `expresso@0.3.x` | CLI/compiler `0.3.x` |
| Expresso IR | `1` | runtime verifier `1` |
| Provider catalog | `1` | compiler and plugin bundle `0.3.x` |

The package version, plugin version, generated plugin manifest, and marketplace
entry must match. `npm run verify` enforces that relationship.

## 1. Confirm owner-controlled setup

Before publication:

- confirm ownership of the `@technodotventures` npm organization and
  `@technodotventures/expresso` package name;
- require two-factor authentication for package maintainers;
- enable GitHub private vulnerability reporting and publish a durable security
  contact;
- approve the public logo and listing copy;
- decide whether the project needs privacy, terms, or acceptable-use pages for
  the website and plugin directory;
- add those legal and support URLs to the plugin manifest when they exist;
- protect the release environment and default branch in GitHub.

Do not invent placeholder legal URLs or email addresses.

## 2. Verify the candidate

From a clean checkout on the release commit:

```bash
npm ci
npm run verify
```

Require green GitHub checks for Node.js 22 and 24 on Linux, Node.js 24 on macOS,
and Node.js 24 on Windows. Review the packed file list and confirm it contains
the CLI, compiler, bundled catalog, examples, language specification, test
suite, README, and license, but not workflows or repository-only release
scripts.

The Codex and Claude Code plugin manifests must pass their platform validators.
Review the generated manifest and confirm its source hashes match the release
commit.

## 3. Tag and publish npm

Create an immutable `vX.Y.Z` tag from the reviewed commit. The publication
workflow refuses to run unless the selected GitHub ref is exactly the package
version prefixed with `v`.

The package uses GitHub OIDC trusted publishing from
`technodotventures/expresso`, workflow `publish.yml`, environment `npm`, with
the `npm publish` action allowed. Do not add a long-lived publication token.
GitHub-hosted publication automatically supplies npm provenance.

After publication, test from a new empty directory:

```bash
npx @technodotventures/expresso --version
npx @technodotventures/expresso init
npx @technodotventures/expresso check expresso/refund.expresso
```

Confirm the reported version matches the tag, initialization does not overwrite
files, and the example checks without a repository-relative catalog.

## 4. Distribute the Codex plugin

Install the public plugin using the same immutable tag:

```bash
codex plugin marketplace add technodotventures/expresso --ref vX.Y.Z
codex plugin add expresso@expresso
```

Download the `expresso-agent-authoring-plugin-vX.Y.Z` artifact produced by the publication
workflow. Run at least five valid authoring checks and three expected failures
covering unvalidated observation flow, missing grants, and unsupported
recovery. Submit the skills-only ZIP through the OpenAI plugin submission
[portal](https://platform.openai.com/plugins). Automated skill scanning,
directory review, approval, and the final publisher-controlled publish action
are external release gates.

## 5. Verify the Claude Code marketplace

Install the public plugin from the repository marketplace:

```text
/plugin marketplace add technodotventures/expresso
/plugin install expresso@expresso
/reload-plugins
```

Confirm `/expresso:build-expresso-agent` is available in a clean project and
that its bundled checker works without repository-relative files.

## 6. Change the website last

Only show an installation path after its exact command succeeds in a clean
environment. The website may advertise:

- npm after the public registry smoke test passes;
- Codex after the tagged marketplace install passes;
- Claude Code after the repository marketplace install passes;
- another agent only after a separately packaged and tested integration exists.

Describe the runtime boundary consistently: Expresso enforces the declared
consequential lane, while a production deployment must supply host isolation,
credential custody, durable storage, network policy, and a conformance-tested
provider adapter.

## 7. Roll back safely

If a release has a safety or installation defect:

- deprecate the affected npm version with a clear replacement message;
- move affected npm tags to the last verified release;
- remove the affected plugin version from the marketplace listing;
- publish an advisory when the issue is security-relevant;
- never reuse or rewrite a published version or Git tag.
