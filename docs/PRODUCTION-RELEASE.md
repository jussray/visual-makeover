# Production release candidate — Visual Makeover and MoodMockup

## 5W1H
- Who: Visual Makeover and MoodMockup own their runtimes; SOL owns verified continuity, Chief owns capability plans, FCR owns governance.
- What: package an independently reproducible candidate for each existing application, with immutable source SHA and checksums.
- Why: avoid rebuilding an untracked source or claiming that a dev-server test establishes production readiness.
- Where: this release branch; actual deployment origin remains to be confirmed.
- When: exact-head CI, provider configuration, owner-approved hosting, and live acceptance.
- How: release candidate CI → verify artifacts → authorized deploy → stranger and authorized browser witnesses → recipient-side verification of peer receipts.

## Established evidence
Base main: `fc7d9d59bc126ae852f8302c6031680e30075bf5`.
Both main CI workflows succeeded; the existing browser smoke uses dev mode for MoodMockup. Nitro logs show a cloudflare-module preset, .output/server/index.mjs, .output/server/wrangler.json, and .output/public. The release workflow adds production-preview testing and retains checksummed bundles without deploying.

## Deployment boundaries
Visual Makeover is a Node HTTP process bound to loopback by design. Use a protected Node host and Cloudflare Tunnel or a carefully verified equivalent. Do not expose it directly or run it in development mode in production. The host must provide persistent receipt storage, validated Access team domain and audience, network egress restrictions, and scoped provider bridges. Session/grant storage is in memory and requires a reviewed persistence/replica strategy before scaling. Public scraping needs an independently reviewed DNS/egress and rate-limit policy. Do not treat the packaged runtime as security-cleared for a public launch.

MoodMockup has a separate Cloudflare-compatible build. Use the generated Wrangler config and confirmed Worker identity, not a guessed production hostname. Existing Lovable publication remains separate; the imported source does not sync automatically. The provider gateway must be configured in the owning runtime, with authorization, consent, quotas, spend boundaries, and real generation/export evidence. No AI requests in candidate CI. A build is not gateway activation.

Peer interoperability: no fabricated registry snapshots, signed receipts or token sharing. Obtain recipient-owned authenticated transport, validate exact-head Chief plan and FCR trust resolution, and evaluate SOL continuity against independent evidence before enabling any execution. Local receipts remain advisory.

## Acceptance and rollback
Verify checksums and source SHA, public entrance at 320px and desktop, anonymous privileged requests fail, authorized scoped requests work, no browser secrets leak, brief/storyboard/export flows with provider consent, and no stale result presented as current. Record exact deployment version and separate peer receipts. Roll back to the last independently verified deployment; never remove authorization gates to make a check pass.

No paid hosting, DNS changes, account linking, deployment, peer registration or provider calls are authorized by this document or workflow. Release artifacts expire after seven days.

## AI activation boundary

Billable text and image calls are disabled by default. After the owner confirms a provider budget and the matching Access application, configure `MOODMOCKUP_AI_ENABLED=true`, `CF_ACCESS_TEAM_DOMAIN` (the owning Cloudflare Access team domain), and `CF_ACCESS_AUD` (this studio application's audience) in the server runtime. The application checks RS256 signature, issuer, audience, expiry and subject before reaching the provider; no anonymous fallback or client-supplied identity. Public local board browsing remains available. Validate real authorized and denied production calls without exposing credentials. Per-instance throttling is not a durable spend quota; provider-side limits remain required. Do not enable on the public Lovable project without separate synchronization and configuration approval.
