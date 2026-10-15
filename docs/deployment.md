# GitHub Pages deployment

This repository contains a static GitHub Pages workflow; it is not an
instruction or authorization to publish the site. Do not deploy during this
milestone. A repository owner must give explicit owner approval before any
deployment or GitHub settings change. This is a required release-governance
policy; the workflow itself does not enforce who approves or starts a run.

## What the workflow does

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs when a
commit is pushed to `main` or when `workflow_dispatch` starts it manually. It
checks out the repository, uses Node.js 22 with npm caching, runs `npm ci`, then
runs `npm run build`.

The build receives the repository subpath through this environment value:

```text
VITE_BASE_PATH: /${{ github.event.repository.name }}/
```

This repository base injection lets Vite and React Router serve the static app
from a project-page path rather than assuming the domain root. The workflow
then configures Pages, uploads `dist` with `actions/upload-pages-artifact`, and
deploys that artifact with `actions/deploy-pages`.

## Release steps after owner approval

1. A repository owner enables GitHub Pages in the repository's GitHub Pages
   settings with GitHub Actions as the build and deployment source.
2. Confirm the workflow permissions and the selected Pages environment match
   the repository's release policy.
3. After owner approval, use the intended `main` push or `workflow_dispatch`
   trigger and wait for the deployment job to complete.
4. Review the URL reported by the deployment job. Check the landing page,
   scenario navigation, and a direct route before sharing that URL publicly.

This guide does not claim that GitHub Pages is enabled or that a deployment has
occurred. Those are owner-controlled actions that require explicit approval.
