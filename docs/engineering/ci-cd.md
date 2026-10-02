# CI/CD

GitHub Actions is the delivery control plane for this repository. Every workflow uses read-only repository access unless it needs a narrowly scoped deployment permission. Build output expires after 14 days and never includes operational credentials.

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `Continuous integration` | Pull requests and pushes to `master` | TypeScript type-check/build, architecture validation, Flutter analysis, widget tests, and web build |
| `Security scanning` | Pull requests, pushes, weekly schedule | CodeQL, dependency review, npm production audit, and committed-secret scan |
| `Native application builds` | Flutter changes on pull requests and `master` | Android APK/AAB, unsigned iOS app, and Windows/macOS/Ubuntu desktop deliverables |
| `Deploy web application` | Flutter changes merged to `master` | Builds and deploys the Flutter web app to GitHub Pages |

## One-time GitHub setup

1. In **Settings → Pages**, set the source to **GitHub Actions**. The deployment workflow uses the repository-aware base path, so it works at the project Pages URL.
2. In **Settings → Code security and analysis**, enable Secret Scanning, Push Protection, Dependabot alerts, and Dependabot security updates.
3. Protect `master`: require `Continuous integration`, `Security scanning / CodeQL TypeScript analysis`, `Security scanning / Dependency review`, and `Native application builds` before merge. Require pull requests and keep administrators subject to the rule.
4. Configure an approval rule for the `github-pages` environment if web releases need review before publishing.

## Mobile release boundary

The native workflow deliberately builds an unsigned iOS app and Android deliverables only. App Store Connect and Google Play publication require account-owned signing identities, provisioning profiles, store credentials, package identifiers, release tracks, and review policy decisions. Those secrets should be added only after the real store accounts exist; then a protected `production` environment can run the store-upload workflow without exposing credentials to pull requests.

## Backend deployment boundary

The repository has no running API container yet, so a backend deployment workflow would only be a nonfunctional placeholder. When the NestJS runtime, Docker image, and hosting destination are implemented, add a protected `staging` environment, then promote a tested image digest to a protected `production` environment. The deploy action must use short-lived identity or environment secrets and verify a health endpoint before marking the deployment successful.
