# Milestone 11 — Community Release Design

## Status

Approved for specification review on 2026-10-14.

## Goal

Make SaaS Failure Lab release-ready as an open-source, statically deployed
project without publishing it to a live GitHub repository during this
milestone. The owner will make the final public-release decision after
reviewing the materials.

## Scope

Milestone 11 delivers a polished public repository package:

- a concise, newcomer-oriented README;
- contributor guidance and structured GitHub issue templates;
- a code of conduct, security policy, and public roadmap;
- screenshots and, if it remains small and readable, a short GIF captured
  from the real production-style application;
- a GitHub Pages deployment guide and release checklist; and
- verification that the existing static GitHub Pages workflow remains the
  correct deployment path.

The existing `deploy.yml` workflow stays authoritative. The milestone documents
repository settings and the final human approval step but does not push to a
remote, change repository settings, enable Pages, create releases, or publish
a live site.

## Repository materials

### README

The README leads with the product purpose, audiences, key learning flow,
static/privacy constraints, locally runnable commands, the twelve-scenario
catalog, and a clear contribution path. It links to the project policies,
roadmap, scenario authoring guide, deployment guide, and local media assets.
It states facts supported by the repository only: no backend, accounts,
analytics, hosted AI, secrets, or production-customer data.

### Community documents

`CONTRIBUTING.md` describes setup, required quality gates, content authoring,
review expectations, and safe contribution practices. `CODE_OF_CONDUCT.md`
uses a concise community standard with enforcement and reporting guidance.
`SECURITY.md` instructs reporters to use private GitHub security advisories;
it does not invent an email address or response-time guarantee. `ROADMAP.md`
summarizes completed beta work, the optional AI extension contract, and future
ideas as non-commitments.

Issue templates include a bug report and a scenario proposal. Both collect
reproducible, sanitized information and explicitly prohibit secrets,
credentials, private logs, customer names, and proprietary details. A small
pull-request template is included only to point contributors to the existing
tests, scenario validation, and documentation expectations.

### Media

README media lives in a local, repository-owned `docs/media/` directory and is
captured from the real static application. Images demonstrate public user
states only: landing, scenario browser, incident intro/workspace, and a
completed result/share state. They must not show developer routes, hidden
scenario truth, relevance labels, answer keys, browser-local progress data,
or user-identifying information.

Images use readable descriptive names and alt text. A GIF is included only if
its compressed size and readability justify it; otherwise a small set of PNG
screenshots is the complete visual deliverable.

## Deployment readiness

The release guide explains that `npm run build` produces static assets, the
deploy workflow supplies a repository base path, and GitHub Pages deploys
changes from `main` after repository Pages settings are enabled. It includes a
pre-publication checklist: inspect the public README and media, pass CI,
confirm no secrets/private data, enable Pages in the repository settings, and
review the first deployment URL.

No server, database, authentication provider, secrets store, telemetry,
analytics, custom domain, or external hosting integration is introduced.

## Validation

Release verification includes:

- formatting, linting, scenario validation, deterministic generation, unit
  tests, production build, and browser end-to-end tests;
- link checks for local documentation and media references where practical;
- production-preview capture and manual visual inspection of every media
  asset at desktop and mobile widths;
- inspection of workflow configuration for static GitHub Pages compatibility;
  and
- checks that public media and templates do not reveal hidden answer content
  or invite sensitive submissions.

## Deferred scope

Milestone 11 does not create a live GitHub repository, publish a Pages site,
create a release/tag, set a custom domain, add telemetry or analytics, add a
community chat, establish support SLAs, implement authentication, or add any
backend service. These actions require separate owner authorization.

## Important decisions

- Prepare a release-ready repository, but leave actual public publication to
  an explicit owner decision.
- Use GitHub security advisories rather than an invented reporting email.
- Keep public visuals grounded in real static-app states and free of hidden
  answer content.
- Reuse the existing GitHub Pages workflow instead of adding deployment
  infrastructure.
