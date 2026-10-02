# Security policy

Do not open a public issue for a suspected vulnerability or exposed credential. Report it privately to the repository owner with the affected component, a reproduction path, and any mitigation already taken. Rotate exposed credentials immediately; deleting a committed secret does not make it safe.

The repository runs CodeQL for TypeScript, dependency review on pull requests, npm production-dependency auditing, scheduled secret scans, and Dependabot updates. Enable GitHub Secret Scanning, push protection, Dependabot alerts, and Dependabot security updates in the repository Security settings so GitHub can complement these workflows.

Production credentials, payment-provider keys, WhatsApp session material, device signing keys, and signing certificates belong only in GitHub environment secrets or the selected production secret manager. They must never be written to source, build artifacts, logs, issue comments, or release notes.
