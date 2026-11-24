# Moodboard to Mockups — roadmap

## In progress
- [x] Fix phone mockup icon type error (typecheck clean)
- [x] Four-step studio shell: persistent clickable progress, back navigation, in-memory notice, ProjectProvider at root
- [x] Step 1 Mood board: drag/drop + validation, masonry, notes/tags, 24-reference library, >=3 gate
- [x] Step 2 Design brief: image consent, AI brief, palette + font samples, regenerate / note + regenerate, text-only fallback, Markdown copy
- [x] Step 3 Your app: description, features (add/remove, AI suggest), target audience + accessibility needs
- [x] Step 4 Mockups: AI screen plans, phone frames, per-screen regenerate / style / tweak, PNG zip + Markdown export
- [ ] AI accessibility review: screen-specific recommendations grounded in plans + automatic checks, apply-to-screen, stale tracking
- [ ] Server hardening: payload caps, image consent enforced server-side, rate limit
- [ ] Runtimes, frameworks, skills and prompts: versioned AI prompt module, project skill for maintaining the studio, documented runtime rules (AGENTS.md)
- [ ] SEO + head metadata on every page, sitemap, accessibility pass (landmarks, focus, live regions)
- [ ] Tests for rules (gate, limits, consent, staleness, grounding) + browser journey desktop/mobile + real AI call

- [ ] Onboarding wording check: designer's onboarding copy + audience → AI flags confusing wording with clearer alternatives (UI built; AI not yet tried live)
- [x] Visual makeover of the studio
- [ ] Google Search Console: connect, verify the published site, submit sitemap (publish only with approval)

## Open / blocked
- Repo sync: GitHub isn't connected; a workspace owner/admin must connect it in Project settings → Git
- Credits ran out mid-build; continuing needs available credits
- Product walkthrough video (video-router skill): waiting on the user's choice of video style

## Open
- [ ] Make the app produce actual storyboards from the mood board images and notes (not just a written brief) — awaiting user's choice of storyboard format