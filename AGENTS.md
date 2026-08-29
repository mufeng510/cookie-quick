# AGENTS.md

Guidance for coding agents working in this repository.

## Project

Cookie Quick is a minimal, privacy-first Chrome / Edge (Manifest V3) extension that copies all cookies or clears site data for the current page. TypeScript + Vite, tests with Vitest.

## Commands

- `npm run check` — full quality gate: lint + test + build + package. Run before every push.
- `npm run lint` / `npm run lint:fix` — eslint
- `npm run test` / `npm run test:watch` — Vitest
- `npm run build` — typecheck + production build into `dist/`
- `npm run package` — build + zip into `release/cookie-quick-<version>.zip`

## Release process (automatic)

Releases are driven by the `version` field in `package.json`. The **Release** workflow runs on every push to `main`; if that version has no GitHub Release yet, it builds, lints, tests, packages, pushes a `v<version>` tag, creates the GitHub Release with the ZIP, and publishes it to the Chrome Web Store and Microsoft Edge Add-ons.

**After completing a development task on `main`, ship a release as part of the task:**

1. Make sure `npm run check` passes locally.
2. Bump `version` in `package.json` following semver — new feature → minor, fix → patch, breaking change → major — then run `node scripts/sync-version.mjs` to sync `public/manifest.json`.
3. Update `CHANGELOG.md`: move the entries under `## [Unreleased]` into a new `## [x.y.z] - YYYY-MM-DD` section.
4. Commit everything and push to `main`.
5. Watch the `Release` workflow run and confirm the GitHub Release was created and the store publish jobs succeeded (or were skipped with a warning while store secrets are unconfigured).

Rules:

- **Never create or push release tags manually** — CI owns the `v*` tags.
- A version is released at most once (the workflow skips versions that already have a GitHub Release). To ship again, bump the version.
- If a store publish failed or was skipped, fix the cause, then publish manually via the *Publish to Chrome Web Store* / *Publish to Microsoft Edge Add-ons* workflows (`workflow_dispatch`, optionally with `--ref v<version>`).

Store publishing requires these GitHub Secrets; until they are configured, the automatic publish steps are skipped with a warning:

- Chrome: `CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`
- Edge: `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY`
