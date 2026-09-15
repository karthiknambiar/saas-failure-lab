# Milestone 1 Design System and Routing Design

## Scope

Milestone 1 turns the repository foundation into an accessible, responsive product shell. It delivers global navigation, clean static routes, reusable visual primitives, the landing page, and an intentionally empty scenario-browser shell.

It does not implement scenario schemas, YAML content, deterministic composition, gameplay, scoring, debriefs, progress persistence, or the IAM-001 vertical slice.

## Visual direction

The interface combines two qualities approved during visual exploration:

- calm operational clarity associated with a modern SaaS incident console
- welcoming learning cues that make technical practice approachable

The visual hierarchy emphasizes evidence and deliberate investigation without using a fake terminal aesthetic. Learning progression appears through encouraging language and the investigation-loop presentation rather than points, streaks, or childish gamification.

The initial experience is dark, restrained, and professional. Theme switching is not added in this milestone. Design tokens must make a future theme possible without building that feature now.

## Routing

Use React Router with `BrowserRouter` and clean paths:

- `/` — landing page
- `/scenarios` — scenario-browser shell
- `/how-it-works` — concise troubleshooting-flow explanation
- `*` — not-found recovery page

The landing page's “Start a random incident” action routes to `/scenarios` until scenario content and selection exist. It must not fabricate random-selection behavior.

### Static-host behavior

Vite uses `/` as its normal base and accepts a deployment base path through an environment variable. React Router derives its `basename` from Vite's compiled `BASE_URL`, so repository-path deployments remain navigable.

The production build creates `dist/404.html` as a copy of `dist/index.html`. On GitHub Pages, direct requests for an application route receive the fallback document and React Router resolves the requested path. Other static hosts may use their native SPA rewrite support. No server-side renderer or runtime service is introduced.

## Application structure

```text
src/
  app/
    AppRouter.tsx
    AppShell.tsx
  components/
    ActionLink.tsx
    Badge.tsx
    Button.tsx
    Card.tsx
    EvidencePanel.tsx
  design/
    global.css
    tokens.css
  features/
    browse/
      ScenarioBrowserPage.tsx
  pages/
    LandingPage.tsx
    HowItWorksPage.tsx
    NotFoundPage.tsx
```

Each unit has one responsibility:

- `AppRouter` defines public routes and the static deployment basename.
- `AppShell` provides skip navigation, header, responsive navigation, main-content focus target, and footer.
- Page components compose product sections without owning shared control styling.
- The browse feature owns only the browser shell and its empty-content explanation.
- Component primitives establish reusable semantics and appearance.
- Design files own tokens, reset/global rules, layout utilities, focus states, and responsive behavior.

## Component decisions

### Buttons and links

Use separate `Button` and `ActionLink` components instead of a polymorphic component. This preserves native semantics and prevents invalid combinations of navigation and button behavior.

Both support primary and secondary emphasis. Icon-only controls are not needed in this milestone.

### Cards

`Card` provides a semantic bounded surface without encoding scenario-specific data. Callers choose an appropriate element or heading structure rather than receiving hidden document semantics.

### Badges

`Badge` is display-only. It must never be used as a button or as the sole carrier of status meaning.

### Evidence panels

`EvidencePanel` establishes the visual and semantic pattern for future evidence renderers: a titled region with optional metadata and content. It does not accept scenario definitions or reveal relevance classifications.

## Landing page

The landing page contains:

1. An evidence-first hero with the product promise.
2. Primary and secondary actions for starting/browsing scenarios and understanding the product.
3. Trust statements: no account, free/open source, browser-based, and no AI requirement.
4. A three-step investigation loop: establish scope, collect evidence, make the call and learn.
5. A summary of the six product domains without scenario root causes or playable content.
6. A final contribution-oriented call to action that points to repository documentation rather than implementing contribution workflows.

## Scenario-browser shell

The browser page establishes future page hierarchy and control placement without implementing M2 content behavior. It includes:

- page title and concise explanation
- labeled search, domain, and difficulty controls shown disabled
- adjacent text explaining that filters activate when validated scenario content arrives
- a polite empty state with a path back to the learning explanation

Disabled controls must remain visibly labeled and must not imply broken functionality.

## Responsive navigation

Desktop navigation uses visible links. Narrow layouts use a native `details`/`summary` disclosure inside the navigation landmark, avoiding a custom menu state machine in this milestone. Links remain keyboard operable, focus-visible, and marked with `aria-current` on the active route.

The page includes a skip link targeting the main content. Layout reflows to one column without horizontal page scrolling at 320 CSS pixels.

## Accessibility

Accessibility is functional acceptance criteria:

- semantic header, navigation, main, sections, headings, and footer
- one page-level heading per route
- visible keyboard focus
- native controls and disclosures
- sufficient text/background contrast
- state and meaning never communicated through color alone
- motion suppressed when `prefers-reduced-motion` is enabled
- touch targets sized appropriately on coarse pointers
- disabled filters accompanied by explanatory text

## Error and recovery behavior

Unknown routes render a friendly not-found page inside the normal application shell. It states that the page was not found and provides routes to the landing page and scenario browser.

No global error boundary or data-loading error system is added because this milestone has no loaders, asynchronous application data, or scenario composition. Those recovery mechanisms should be introduced with the behavior that can fail.

## Testing

Use test-driven development for application behavior.

Component and route tests verify:

- primitives preserve native semantics and variants
- each route renders its named page heading
- navigation exposes active-page semantics
- the browser shell has labeled disabled filters and explanatory status
- unknown routes provide recovery links

Playwright verifies:

- landing page renders from the production build
- keyboard navigation can use the skip link and reach primary navigation/actions
- desktop navigation reaches `/scenarios`
- mobile navigation disclosure opens and its link reaches `/how-it-works`
- a direct request to a built clean route renders successfully through the fallback behavior

The build test verifies both `dist/index.html` and `dist/404.html` exist and contain the same application document.

## Files changed or added

Expected additions:

```text
scripts/create-spa-fallback.mjs
src/app/AppRouter.tsx
src/app/AppShell.tsx
src/components/ActionLink.tsx
src/components/Badge.tsx
src/components/Button.tsx
src/components/Card.tsx
src/components/EvidencePanel.tsx
src/design/global.css
src/design/tokens.css
src/features/browse/ScenarioBrowserPage.tsx
src/pages/LandingPage.tsx
src/pages/HowItWorksPage.tsx
src/pages/NotFoundPage.tsx
```

Expected modifications:

```text
.gitignore
.github/workflows/deploy.yml
README.md
docs/architecture.md
package.json
package-lock.json
src/App.test.tsx
src/App.tsx
src/main.tsx
tests/e2e/home.spec.ts
vite.config.ts
```

Tests may be colocated with the unit they verify where this keeps behavior and expectations together.

## Complexity deliberately deferred

- Scenario cards backed by real content
- Working search and filters
- Random scenario selection
- React state libraries
- Theme switching
- Client persistence
- Custom mobile-menu state
- Animated route transitions
- Icons or icon packages
- Global error boundaries without a current failure source
- Scenario, scoring, or investigation-engine interfaces

## Acceptance criteria

Milestone 1 is complete when:

- all four route outcomes render correctly from the application shell
- clean URLs work in the static deployment build
- desktop and mobile navigation are keyboard accessible
- the approved calm/encouraging visual direction is implemented responsively
- reusable buttons, links, cards, badges, and evidence panels are covered by focused tests
- the scenario browser is clearly an inactive shell rather than fake gameplay
- formatting, linting, unit tests, production build, and relevant Playwright tests pass
- documentation reflects the routing and design-system decisions
- no Milestone 2+ content or engine behavior has been introduced
