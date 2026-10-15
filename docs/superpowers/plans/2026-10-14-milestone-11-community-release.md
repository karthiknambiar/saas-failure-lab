# Milestone 11 Community Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project release-ready for an owner-approved future GitHub Pages launch without publishing it or adding runtime infrastructure.

**Architecture:** Community-facing Markdown and GitHub templates describe the existing static application and contribution boundaries. Repository-owned media is captured from the production preview and linked locally. The existing GitHub Pages workflow remains unchanged unless static-hosting verification proves a concrete defect.

**Tech Stack:** Markdown, GitHub issue/PR templates, GitHub Actions, Vite static preview, Playwright, existing npm quality gates.

---

## File structure

- Modify: `README.md` — release-oriented project overview and local media links.
- Create: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ROADMAP.md`, `docs/deployment.md`.
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`, `scenario_proposal.yml`, `config.yml`, `.github/pull_request_template.md`.
- Create: `docs/media/landing.png`, `scenario-browser.png`, `investigation.png`, `completed-share.png`; create `docs/media/flow.gif` only if the compressed asset is readable and under 5 MB.
- Modify: `.github/workflows/ci.yml` only to check Markdown/local-media links if a small existing-repo script can do so without adding dependencies; otherwise document the manual check.
- Create: `docs/release-checklist.md` — pre-publication and Pages handoff checklist.

### Task 1: Add community governance and contribution documents

**Files:**

- Create: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ROADMAP.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/scenario_proposal.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/pull_request_template.md`

- [ ] **Step 1: Write a failing repository-content test or shell assertion for required documents and safety wording.**

  Add `scripts/community-docs.test.mjs` that asserts each required file exists and contains the exact safety phrases `Do not include credentials`, `private GitHub security advisory`, and `fictional` in the appropriate document/template.

- [ ] **Step 2: Run it and verify it fails because release files are absent.**

  Run: `node --test scripts/community-docs.test.mjs`

  Expected: FAIL with missing-file assertions.

- [ ] **Step 3: Create focused documents and templates.**

  `CONTRIBUTING.md` must specify Node/npm setup, all existing quality commands, YAML authoring/generation, review expectations, and sanitized fictional content. `SECURITY.md` must direct reports to private GitHub security advisories, with no email or SLA. `CODE_OF_CONDUCT.md` must define respectful conduct, enforcement, and advisory reporting. `ROADMAP.md` must identify completed Milestones 0–10, M11 release readiness, M12 optional AI extension contract, and label future items as non-commitments.

  The bug form must collect summary, reproduction, expected/actual behavior, browser/environment, and a confirmation that secrets/customer data are excluded. The scenario form must collect public symptom, fictional root cause, evidence, plausible wrong assumptions, and transferable lesson, plus a confirmation that all material is fictional and sanitized. Disable blank issues through `config.yml`. The PR template must require tests, scenario validation when content changes, documentation updates, and no sensitive data.

- [ ] **Step 4: Run the document test and commit.**

  Run: `node --test scripts/community-docs.test.mjs && npm run format:check`

  Expected: PASS.

  ```sh
  git add CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md ROADMAP.md .github scripts/community-docs.test.mjs
  git commit -m "docs: add community contribution materials"
  ```

### Task 2: Polish README and document static deployment

**Files:**

- Modify: `README.md`
- Create: `docs/deployment.md`, `docs/release-checklist.md`

- [ ] **Step 1: Extend the failing document test with README/deployment assertions.**

  Require README links to `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md`, `docs/deployment.md`, and four local PNG paths. Require `docs/deployment.md` to mention `npm run build`, `main`, GitHub Pages settings, `/\${{ github.event.repository.name }}/`, and the owner approval step.

- [ ] **Step 2: Run the test and verify it fails before README/deployment material exists.**

  Run: `node --test scripts/community-docs.test.mjs`

  Expected: FAIL with missing links/content.

- [ ] **Step 3: Write the public README and deployment handoff.**

  Lead README with purpose, intended learners, deterministic/static/privacy principles, 12-scenario/six-domain catalog, quick start, quality commands, media, contributor links, and a concise “not a production incident-response tool” boundary. `docs/deployment.md` must explain the existing workflow triggers on `main`, Vite base-path injection, Pages settings the owner must enable, and that no deployment occurs during this milestone. `docs/release-checklist.md` must include CI green, media reviewed, no confidential data, Pages enabled by owner, and first deployment URL reviewed.

- [ ] **Step 4: Run document checks and commit.**

  Run: `node --test scripts/community-docs.test.mjs && npm run format:check`

  Expected: PASS.

  ```sh
  git add README.md docs/deployment.md docs/release-checklist.md scripts/community-docs.test.mjs
  git commit -m "docs: prepare public release handoff"
  ```

### Task 3: Capture and validate safe repository-owned release media

**Files:**

- Create: `docs/media/landing.png`, `docs/media/scenario-browser.png`, `docs/media/investigation.png`, `docs/media/completed-share.png`
- Create optional: `docs/media/flow.gif`
- Modify: `README.md`, `scripts/community-docs.test.mjs`

- [ ] **Step 1: Add failing media assertions.**

  Require all four PNG files to exist, be non-empty, and be referenced with meaningful README alt text. If `flow.gif` exists, assert it is no larger than 5 MB.

- [ ] **Step 2: Build and capture real public app states.**

  Run: `npm run build` and start the existing Pages-style preview. Capture desktop and 320px screenshots only from landing, browser, incident/workspace, and completed share states. Do not capture `/developer/*`, root causes, debrief answer explanations, relevance labels, progress history, or browser/user data. Use descriptive file names exactly as listed.

- [ ] **Step 3: Visually inspect assets and add README media section.**

  Verify readable text, no horizontal overflow at 320px, and no hidden-answer/sensitive material. Reference the four PNGs with descriptive alt text. Add GIF only when it is readable and under 5 MB; otherwise omit it.

- [ ] **Step 4: Run media/document checks and commit.**

  Run: `node --test scripts/community-docs.test.mjs && npm run format:check`

  Expected: PASS.

  ```sh
  git add docs/media README.md scripts/community-docs.test.mjs
  git commit -m "docs: add release media"
  ```

### Task 4: Verify release readiness without publishing

**Files:**

- Modify: `docs/deployment.md`, `docs/release-checklist.md` only if verification finds an inaccurate statement
- Test: `scripts/community-docs.test.mjs`, existing CI/build/E2E suite

- [ ] **Step 1: Inspect `.github/workflows/deploy.yml` against the deployment guide.**

  Confirm it builds with `VITE_BASE_PATH: /\${{ github.event.repository.name }}/`, uploads `dist`, and deploys only after the build job. Do not change workflow triggers or publish settings.

- [ ] **Step 2: Run complete quality gates.**

  Run:

  ```sh
  npm run format:check
  npm run lint
  npm run validate:scenarios
  npm run generate:scenarios
  git diff --exit-code -- src/generated/scenario-index.json src/generated/scenario-catalog.ts
  node --test scripts/community-docs.test.mjs
  npm test
  npm run build
  npm run test:e2e
  git diff --check
  ```

  Expected: every command passes; no generated drift; build creates static `dist` and browser tests exercise the production preview.

- [ ] **Step 3: Commit any verification-only documentation correction.**

  ```sh
  git add docs/release-checklist.md docs/deployment.md scripts/community-docs.test.mjs
  git commit -m "test(docs): verify community release readiness"
  ```

## Plan self-review

- Scope coverage: Tasks 1–2 deliver community/release material, Task 3 delivers safe real-app visuals, and Task 4 verifies static Pages readiness without publishing.
- Safety: every template and visual requirement prohibits sensitive data and hidden scenario truth.
- Boundaries: no remote publication, account/repository settings changes, server runtime, backend, secrets, analytics, or custom-domain work is included.
