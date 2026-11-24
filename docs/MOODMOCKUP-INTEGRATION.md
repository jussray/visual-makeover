# MoodMockup integration boundary

## Source and topology

- Visual Makeover base: e03bca920a5894e2e397a734e13608700fa8f8f9.
- Lovable source: fd3fac422cd4c886abf1a67823d1676263bd8892 (text source imported; original binary favicon not available losslessly, replaced with an authored SVG; internal Lovable metadata omitted).
- Separate runtime in apps/moodmockup. No shared credentials, cookies, browser grants, or deployment authority.

## Peer contracts inspected

- SOL continuity: [world-learning continuity runtime](https://github.com/jussray/solcontinuity/blob/b38e1c853599bd0390d860af6f6d4d6c169288e8/.ai-skills/runtime/world-learning-continuity.mjs). Local design keys/fingerprints invalidate stale panels. Local receipt does not assert SOL's signed or verified continuity.
- Chief: [capability-plan contract](https://github.com/jussray/chief-ai-machine/blob/f3e66f60e12804e616b4b0cd718194792b741725/src/domain/capability-plan.js) and proposal endpoint require exact source head and an approved capability registry snapshot. The studio exports proof requirements, not a fabricated Chief plan.
- FCR: [standalone peer pair contract](https://github.com/jussray/founder-control-room/blob/9f69c02975faa973c96dc609304873c9ba4e6341/config/founder-chief-pair.contract.json). FCR independently resolves registry trust and governs execution. Studio receipts are drafts and cannot authorize merge, publish, spend or deploy.

## Production gates

1. Exact-head CI on both runtimes.
2. Verify actual AI gateway configuration and credit policy, consent, storyboard generation, export and responsive Step 4. No paid generation in CI.
3. Confirm deployment origin, trusted runtime and Lovable sync separately.
4. Obtain recipient-owned authenticated transport, registry snapshot, exact deployed SHAs and recipient-side receipt validation before activating remote peer calls.
5. No raw design uploads, session tokens or browser grants in peer receipts.

Rollback: revert focused integration commits; the root Visual Makeover Node server is not replaced. No remote provider configuration or credentials are changed.
