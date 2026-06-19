---
author: 陈广亮
pubDatetime: 2026-06-15T22:30:00+08:00
title: "A 2026 Monorepo Setup From Zero to Production: pnpm catalogs, Turborepo 2.x, changesets"
slug: blog193_monorepo-practice-from-zero-to-production
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - 开发效率
  - 工具
  - 自动化
description: The previous post argued monorepos are an organizational problem. This one walks through the actual setup, end to end. pnpm catalogs for version alignment, Turborepo 2.x task graphs, changesets + OIDC publishing, remote cache, CODEOWNERS — every command and config you need, current as of 2026.
---

The previous post, [blog192](https://chenguangliang.com/en/posts/blog192_monorepo-not-tech-but-org-decision/), covered the organizational side of choosing a monorepo. This one is strictly about implementation.

Most monorepo tutorials online fail in three predictable ways:

1. **Outdated.** Plenty of guides still reference Turborepo 1.x's `pipeline` field, which became `tasks` in 2.x ages ago.
2. **Stitched together.** They show pnpm workspaces but skip catalogs, show Turborepo but skip publishing, show changesets but skip OIDC.
3. **No real production scars.** Only the happy path, none of the configs that blow up in CI.

What follows walks through the setup in the order you'd actually build it, from `pnpm init` to automated GitHub Actions publishing — and at each step calls out what the 2026 correct answer is and where teams typically trip.

## 0. Prerequisite: the stack

I won't re-litigate the tooling debate (see the previous post). Here's the **default 2026 stack** I'd reach for, calibrated for the most common case: 3-15 person frontend/full-stack teams with 5-20 internal packages.

| Dimension | Choice | Why |
|---|---|---|
| Package manager | pnpm 11.x (catalogs landed in 9.5, `catalogMode` strict mode added in 10.12) | 2-3x faster than npm, cleanest workspaces implementation, catalogs solve version drift |
| Task orchestration | Turborepo 2.x | Smallest config surface, free remote cache, maintained by Vercel |
| Versioning / publishing | changesets | The only tool that handles "independent versions + automated publishing" in a monorepo |
| Remote cache | Vercel Remote Cache (free) → fall back to ducktors self-hosted if needed | 90% of teams never need to self-host |
| CI | GitHub Actions | Cleanest integration with changesets + OIDC trusted publishing |

If your team is over 50 people or you're polyglot (Java/Go), look at Nx or Bazel. Out of scope here.

## 1. Initialize the repo

```bash
mkdir my-monorepo && cd my-monorepo
git init
pnpm init
```

Edit the root `package.json` and add `"private": true` to prevent accidental publishes:

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@11.8.0"
}
```

The `packageManager` field is non-negotiable — Node Corepack reads it to lock every team member and CI runner onto the same pnpm version. Pin the exact version, no `^`, no `latest`.

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Conventional layout: `apps/` holds deployable artifacts (web/api/cli), `packages/` holds libraries consumed by apps (ui/utils/types/config).

## 2. pnpm catalogs: kill version drift

catalogs shipped in pnpm 9.5 (July 2024), with `catalogMode` strict mode added in 10.12. By 2026 the ecosystem has caught up. **Few tutorials mention this, but it solves the single most common monorepo pain point**: the same dependency pinned to different versions across packages, with type mismatches or runtime crashes downstream.

Extend `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  react: ^19.2.0
  react-dom: ^19.2.0
  typescript: ^5.6.3
  vitest: ^3.0.5

catalogs:
  react18:
    react: ^18.3.1
    react-dom: ^18.3.1
```

Reference from a child package:

```json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

When a package has to stay on an older version (say, a legacy React 18 app), use a named catalog:

```json
{
  "dependencies": {
    "react": "catalog:react18"
  }
}
```

Upgrades are a one-line edit to `pnpm-workspace.yaml` followed by `pnpm update -r` to sync every package.

**catalogMode.** Add `catalogMode: strict` to `pnpm-workspace.yaml` to require every dependency to go through a catalog and forbid bare version strings in child packages. Turn this on as soon as the team grows — without it, catalogs are advisory and people will work around them.

## 3. Internal package references: the workspace protocol

```bash
mkdir -p packages/ui apps/web
cd packages/ui && pnpm init
```

`packages/ui/package.json`:

```json
{
  "name": "@my/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

`apps/web/package.json` consumes it:

```json
{
  "dependencies": {
    "@my/ui": "workspace:*"
  }
}
```

`workspace:*` is supported by both pnpm and yarn. It tells the package manager **"must link from this repo,"** so you can't accidentally pull a same-named package from npm. After `pnpm install`, `node_modules/@my/ui` is a symlink — source changes are visible immediately, zero build step.

At publish time, `pnpm publish` rewrites `workspace:*` to a concrete version in the published artifact (yarn does the same). Downstream consumers see a normal npm dependency. changesets only handles version bumping and triggering publish; the rewrite is the package manager's job.

## 4. Turborepo 2.x: task orchestration

```bash
pnpm add -Dw turbo
```

`-Dw` = devDependency + workspace root. Turborepo lives only at the root.

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Field by field:**

- **`tasks`**: renamed in 2.x; it was `pipeline` in 1.x. Tutorials that still say `pipeline` will throw immediately — replace it.
- **`dependsOn: ["^build"]`**: the `^` prefix means "run this task in upstream dependencies first." If web depends on ui, `turbo build` builds ui before web.
- **`outputs`**: the files to cache. **Forget this and every run rebuilds from scratch** — the most common rookie mistake.
- **`!.next/cache/**`**: exclude Next.js's own cache directory so you don't cache the cache.
- **`inputs`**: which file changes invalidate the cache. `$TURBO_DEFAULT$` is a 2.x convenience macro meaning "all source files in this package."
- **`persistent: true`**: required for long-running tasks like dev servers — it tells Turbo "this task won't exit on its own, don't wait for it."

> **Note**: the example puts `dependsOn: ["^build"]` on both `lint` and `typecheck`. That assumes packages share types via built `dist` output. If your packages `import` `.ts` source directly across the workspace (which many frontend monorepos do), drop `dependsOn` from those two tasks — CI will be substantially faster.

Running tasks:

```bash
turbo run build              # everything
turbo run build --filter=@my/web   # just web (plus its dependencies)
turbo run test --filter='[HEAD^]'  # only packages affected by recent changes
```

The third command is monorepo **affected** mode — running only what the change touched. This is the core operational win of monorepos over polyrepos.

## 5. Remote cache: start with the free Vercel tier

One-time:

```bash
npx turbo login
npx turbo link
```

`login` ties your machine to a Vercel account; `link` connects the current repo to Vercel's remote cache. **Vercel Remote Cache is free for everyone and does not require you to deploy your app to Vercel** — a point most tutorials gloss over.

To let GitHub Actions hit the cache, you need two environment variables:

```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

Generate `TURBO_TOKEN` at [vercel.com/account/tokens](https://vercel.com/account/tokens); name it something like `ci-monorepo-cache` and grant `read+write`. `TURBO_TEAM` is your Vercel team slug (your username for personal accounts).

**When does self-hosting make sense?** Three signals together: (1) more than ~5000 builds/month, (2) compliance requires build artifacts to stay in your own VPC, (3) multi-region CI clusters (see the Mercari case in the previous post). Otherwise stick with Vercel.

The standard self-hosted option is [ducktors/turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache) — community-maintained, supports S3/GCS/Azure Blob backends, one-line Docker setup.

## 6. changesets: versioning and publishing

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

`init` creates `.changeset/config.json` at the root. Set `access` to `public` (publish to the public npm registry) or `restricted` (private):

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**Field by field:**

- **`fixed`**: packages that must always release together at the same major version. The React ecosystem, for example, keeps `react` and `react-dom` in `fixed`.
- **`linked`**: packages that share minor/patch numbers but can release independently. Rarely needed.
- **`updateInternalDependencies`**: how internal references update when an upstream package bumps. `patch` is the common choice — if A depends on B and B releases a minor, A auto-bumps a patch.
- **`ignore`**: packages here are invisible to changesets (typical for examples and playgrounds).

**Day-to-day workflow:**

```bash
# 1. After making changes, before committing, add a changeset
pnpm changeset

# Interactive: which packages changed → major/minor/patch → description
# Produces a .changeset/foo-bar.md

# 2. Commit the changeset along with your changes
git add . && git commit -m "feat(ui): add Button variant"
```

Once the PR is merged into main, the changesets-action in CI opens a **Version Packages** PR that consolidates pending changesets, bumps versions, and updates CHANGELOG. Merging that PR triggers the publish to npm.

## 7. End-to-end CI: GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ vars.TURBO_TEAM }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # required; turbo affected needs git history

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.14
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test build
```

**Key points:**

- **`fetch-depth: 0`**: by default `actions/checkout` fetches a single commit; `turbo --filter='[HEAD^]'` can't compute affected packages without full history.
- **`--frozen-lockfile`**: mandatory in CI; fails immediately if the lockfile and the actual install diverge.
- Chaining tasks on one line: Turborepo parallelizes the task graph automatically. One line vs. separate steps performs identically, but the log is cleaner.

`.github/workflows/release.yml` (publish workflow):

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write   # OIDC trusted publishing
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.14
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build

      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Note `id-token: write`.** npm OIDC [trusted publishing](https://docs.npmjs.com/trusted-publishers) went GA on July 31, 2025, and classic tokens are permanently deprecated as of December 9, 2025. It replaces long-lived `NPM_TOKEN` secrets and removes the manual rotation problem. The prerequisite is configuring a trusted publisher on the npm package page, bound to your GitHub repo + workflow filename.

**Hard requirement**: OIDC publishing needs **npm CLI ≥ 11.5.1 + Node ≥ 22.14.0**, which is why the workflow above pins `node-version: 22.14` (not a bare `22`).

Once configured, the workflow **no longer needs an NPM_TOKEN secret** — `changesets/action` fetches the OIDC token and authenticates automatically.

## 8. CODEOWNERS: enforce ownership

Once a monorepo has any scale, CODEOWNERS is mandatory to route reviews. `.github/CODEOWNERS`:

```
# default owner
* @alice

# by directory
/packages/ui/        @ui-team
/packages/utils/     @platform-team
/apps/web/           @web-team
/apps/api/           @backend-team

# cross-team config
/turbo.json          @platform-team @ui-team
/.changeset/         @release-managers
/.github/workflows/  @devops
```

In repo Settings → Branches → Branch protection rules, enable "Require review from Code Owners." From that point on, cross-domain changes **require** an explicit owner approval before merge.

This step looks trivial but **matters more than anything else here**. The "ownership decay at 50 engineers" failure mode I described in the previous post — CODEOWNERS is the structural defense. Without it, within a year a monorepo turns into a tragedy of the commons where everyone can change everything and nobody is responsible for anything.

## 9. Five traps you'll actually hit

Field notes — **most tutorials skip these**:

**Trap 1: Turborepo cache misses because `inputs` is wrong.**
By default Turborepo hashes all files in the package as the cache key, but **it has no idea about environment variables**. If your build reads `process.env.NODE_ENV`, switching between dev and prod will not invalidate the cache. Fix:

```json
"build": {
  "env": ["NODE_ENV", "VITE_*"]
}
```

The `VITE_*` wildcard syntax was added in 2.x and matches by prefix.

**Trap 2: pnpm phantom dependencies.**
pnpm uses strict hoisting by default — a child package cannot import anything not declared in its own `package.json`. But in a monorepo it's common to see:

```ts
// packages/web/src/foo.ts
import { format } from 'date-fns'   // ❌ web never declared date-fns
```

TypeScript doesn't complain, because date-fns is installed at the root. Dev works fine, then it explodes when users install the published package. **Force strict mode in root `.npmrc`:**

```ini
public-hoist-pattern[]=
shamefully-hoist=false
```

**Trap 3: missing changesets silently skip the release.**
Someone changes source code, forgets the changeset, CI says nothing, the release is silently skipped, and the bug ships only to users on the next release. **Enforce changeset presence in PRs** with a check workflow:

```yaml
- run: pnpm changeset status --since=origin/main
```

`status` exits 1 if there are source changes without a matching changeset. CI goes red.

**Trap 4: turbo remote cache fails on fork PRs.**
Vercel Remote Cache, for security reasons, **denies writes from fork PRs by default** (read-only). This is why OSS projects feel slow. Control read/write with Turborepo's real environment variable `TURBO_REMOTE_CACHE_READ_ONLY`, or pass `--cache=remote:r` (read-only) / `--cache=remote:rw` (read-write) directly on `turbo run`:

```yaml
# force read-only on fork PRs so upstream cache stays clean
- name: Build
  run: pnpm turbo run build --cache=${{ github.event.pull_request.head.repo.full_name != github.repository && 'remote:r' || 'remote:rw' }}
```

`--cache=remote:r` / `remote:rw` are the real Turborepo 2.x CLI flags. **Do not be misled by tutorials referencing a `TURBO_CACHE` environment variable** — Turborepo has no such variable, only `TURBO_CACHE_DIR` (which sets the cache directory; entirely different thing).

**Trap 5: shipping `.ts` source breaks consumers.**
Setting `main: ./src/index.ts` is great in dev — zero build, instant HMR. But npm users have no TypeScript runtime, so import explodes the moment they install. **Use the dual-export pattern:**

```json
{
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "publishConfig": {
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    }
  }
}
```

`publishConfig.exports` **overrides** the top-level `exports` at publish time, stripping the development path. Two caveats here that, if missed, will burn you:

1. **This is a pnpm and yarn feature; the official npm CLI still does not support it** ([npm/cli#7586](https://github.com/npm/cli/issues/7586) is still open). If you publish with `npm publish`, `publishConfig.exports` is ignored, the published package keeps the `development` path, and consumers blow up. **You must use `pnpm publish` or `yarn npm publish`.** The good news: in the changesets workflow above, explicitly setting `publish: pnpm changeset publish` routes through pnpm correctly.
2. **The `development` condition is not universally recognized.** Vite, esbuild, and tsx support it; Node's native `require`/`import` did not understand it before Node 24. If your monorepo has a pure-Node app consuming TypeScript source directly, pair it with a loader like tsx or ts-node.

## 10. Minimal directory layout

After running through all of the above, the repo looks like this:

```
my-monorepo/
├── .changeset/
│   └── config.json
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── apps/
│   ├── web/        # Next.js / Vite app
│   └── api/        # Hono / Express
├── packages/
│   ├── ui/         # component library
│   ├── utils/      # shared utilities
│   ├── types/      # shared types
│   └── config/     # shared ESLint / tsconfig
├── .npmrc
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

A word on `packages/config`: put your ESLint / tsconfig / Prettier configs in a single package, export them, and have every app and package consume them:

```json
{
  "extends": "@my/config/tsconfig/base.json"
}
```

This stops every child package from copy-pasting its own config and drifting over time.

## Wrap-up

The stack above is what I'd actually recommend to a team in 2026. It isn't the flashiest combination — no Nx full-suite, no Bazel — but **every choice should hold up for at least three years**:

- pnpm catalogs solve version drift, and 2026 is the year they move from experimental to production-default
- Turborepo 2.x's `tasks` field is stable; the next breaking change is at least 18 months out
- changesets + OIDC is now the default publishing pattern in the npm ecosystem
- CODEOWNERS is a native GitHub primitive and doesn't depend on any toolchain

Combine the decision framework from the previous post (when to adopt a monorepo) with the implementation path here (how to build a production-grade one) and you should cover 90% of monorepo decisions and rollouts. The remaining 10% is the Bazel/Buck super-scale regime, which needs a dedicated build infra team and is outside the scope of general advice.

---

**Further reading**:
- [pnpm Catalogs official docs](https://pnpm.io/catalogs) — complete catalog configuration reference
- [Turborepo Configuring Tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) — full `tasks` field documentation
- [Changesets Getting Started](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) — the official intro
- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers) — OIDC publishing setup
