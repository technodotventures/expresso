# Hermes development workflow acceptance

This documentation-only change exercises the isolated development and publication
path for this repository:

- repository work executes as a non-root user in the restricted development sidecar;
- verification runs on Node.js 24 using `npm run verify`;
- publication uses a repository-scoped, short-lived GitHub App token; and
- the host publisher may create only `agent/*` draft pull requests targeting `main`.

This draft pull request is an acceptance artifact. It is not intended to merge and
should be closed after the workflow and branch protections have been verified.
