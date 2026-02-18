# Release Guide

This document covers package publishing and tagged releases for `oc-ghcp-headers`.

## Publishing (OIDC)

Releases use npm Trusted Publishing (OIDC) via GitHub Actions.

- Workflow file: `.github/workflows/release.yml`
- Trigger: git tags matching `v*`
- Action behavior: publish to npm and create a GitHub Release

### One-time setup

1. Publish the package once manually (only needed if package does not yet exist on npm).
2. In npm package settings, configure **Trusted Publisher** for GitHub Actions:
   - Owner/user: your GitHub owner
   - Repository: this repo
   - Workflow filename: `release.yml` (exact)
3. Ensure GitHub-hosted runners are used.

Notes:

- npm classic/legacy tokens were revoked in Dec 2025.
- OIDC is preferred over token-based publishing.

## Release

1. Update `package.json` version.
2. Commit changes.
3. Create matching tag (example `v0.1.1`).
4. Push commit and tag.

Example:

```bash
npm version patch
git push
git push --tags
```

The workflow verifies that the tag version matches `package.json` before publishing.
