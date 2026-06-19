---
author: 陈广亮
pubDatetime: 2026-06-15T22:30:00+08:00
title: Monorepo 从 0 到 1 实操指南 2026 版：pnpm catalogs + Turborepo 2.x + changesets 全链路
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
description: 上一篇讲了为什么 monorepo 是组织问题，这一篇手把手把"应该怎么搭"讲清楚。pnpm catalogs 版本统一、Turborepo 2.x 任务流、changesets + OIDC 发布、远程缓存、CODEOWNERS——全链路命令配置一次到位，2026 年仍然有效。
---

上一篇 [blog192](https://chenguangliang.com/posts/blog192_monorepo-not-tech-but-org-decision/) 讲了 monorepo 选型背后的组织问题，这一篇专心讲落地。

网上 monorepo 教程的通病有三个：

1. **版本过时**——大量教程还在写 Turborepo 1.x 的 `pipeline` 字段，2.x 早就改成 `tasks` 了
2. **拼凑感强**——写 pnpm workspaces 不讲 catalogs，写 Turborepo 不讲发布，写 changesets 不讲 OIDC
3. **没踩过实战的坑**——只贴 happy path 命令，不讲哪些配置在 CI 上会爆

这一篇按真实搭建顺序走一遍，从 `pnpm init` 到 GitHub Actions 自动发布全链路，每个环节顺带告诉你 2026 年正确的做法和最常踩的坑。

## 0. 前置：技术栈选定

不浪费篇幅讨论选型（去看上一篇）。这里给出一套**2026 年默认推荐组合**，适用于"3-15 人前端/全栈团队 + 5-20 个内部 package"这个最常见的区间：

| 维度 | 选择 | 理由 |
|---|---|---|
| 包管理器 | pnpm 11.x（catalogs 9.5 引入、10.12 起新增 `catalogMode` 严格模式） | 比 npm 快 2-3 倍，workspaces 实现最干净，catalogs 解决版本漂移 |
| 任务编排 | Turborepo 2.x | 配置最简，远程缓存免费，Vercel 维护 |
| 版本/发布 | changesets | 唯一能在 monorepo 下兼顾"独立版本 + 自动发布"的方案 |
| 远程缓存 | Vercel Remote Cache（免费）→ 不够再换 ducktors 自建 | 90% 团队不需要自建 |
| CI | GitHub Actions | 与 changesets + OIDC trusted publishing 集成最顺 |

如果你团队规模超过 50 人或有 Java/Go 这类多语言栈，再考虑 Nx 或 Bazel。本篇不覆盖。

## 1. 初始化仓库

```bash
mkdir my-monorepo && cd my-monorepo
git init
pnpm init
```

修改根 `package.json`，加 `"private": true` 阻止意外发布：

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@11.8.0"
}
```

`packageManager` 字段必须写——这是 Node Corepack 识别的关键字段，确保团队成员和 CI 用同一个 pnpm 版本。版本号写死，不要用 `^` 或 `latest`。

创建 `pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

约定俗成的分层：`apps/` 放可部署产物（web/api/cli），`packages/` 放被复用的库（ui/utils/types/config）。

## 2. pnpm catalogs：杜绝版本漂移

catalogs 在 pnpm 9.5（2024 年 7 月）正式发布，10.12 起新增 `catalogMode` 严格模式，到 2026 年生态适配成熟。**少有教程提到，但能解决 monorepo 最常见的痛点**——同一个依赖在不同 package 写不同版本，最后 type 不一致或运行时崩。

在 `pnpm-workspace.yaml` 加：

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

子 package 引用方式：

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

对于有些 package 必须停留在旧版本的情况（比如有个 React 18 的遗留 app），用命名 catalog：

```json
{
  "dependencies": {
    "react": "catalog:react18"
  }
}
```

升级依赖只改 `pnpm-workspace.yaml` 一处，跑 `pnpm update -r` 同步所有 package。

**catalogMode**：在 `pnpm-workspace.yaml` 加 `catalogMode: strict` 强制所有依赖必须走 catalog，禁止子 package 写裸版本号。团队规模一上来就开严格模式，否则 catalog 形同虚设。

## 3. 内部包互相引用：workspace 协议

```bash
mkdir -p packages/ui apps/web
cd packages/ui && pnpm init
```

`packages/ui/package.json`：

```json
{
  "name": "@my/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

`apps/web/package.json` 引用它：

```json
{
  "dependencies": {
    "@my/ui": "workspace:*"
  }
}
```

`workspace:*` 是 pnpm/yarn 都支持的协议，告诉包管理器**"必须从本仓库链接"**，避免不小心从 npm 拉了同名包。`pnpm install` 后 `node_modules/@my/ui` 是 symlink，源代码改了立即生效，零构建延迟。

发布时 `pnpm publish` 会自动把 `workspace:*` 替换成具体版本号写入发布产物（yarn 同理），下游消费者拿到的是正常的 npm 依赖。changesets 只负责 bump 版本和触发 publish，转换工作由包管理器完成。

## 4. Turborepo 2.x：任务编排

```bash
pnpm add -Dw turbo
```

`-Dw` = devDependency + workspace root。Turborepo 只装在根。

创建 `turbo.json`：

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

**关键字段逐个拆**：

- **`tasks`**：2.x 改名，1.x 时叫 `pipeline`。如果你在网上抄到 `pipeline` 直接报错，需要替换
- **`dependsOn: ["^build"]`**：`^` 前缀 = 先跑依赖包的同名 task。例 web 依赖 ui，跑 `turbo build` 时会先 build ui 再 build web
- **`outputs`**：哪些产物要被缓存。**漏掉这个等于每次都重跑**，是新手最大坑
- **`!.next/cache/**`**：排除 Next.js 自己的 cache 目录，避免缓存里塞缓存
- **`inputs`**：哪些文件变化会让 cache 失效。`$TURBO_DEFAULT$` 是 2.x 引入的便捷宏，代表"该 package 的所有源文件"
- **`persistent: true`**：dev server 类长任务必须加，告诉 Turbo "这个 task 不会自己退出，别等"

> **注解**：示例里 `lint` / `typecheck` 都加了 `dependsOn: ["^build"]`，前提是你的 package 之间通过 dist 产物共享 types。如果各 package 直接 import 源码 `.ts`（很多前端 monorepo 都这样配），把这两个 task 的 `dependsOn` 去掉，CI 会快很多。

跑任务：

```bash
turbo run build              # 所有 package
turbo run build --filter=@my/web   # 只构 web（包含依赖）
turbo run test --filter='[HEAD^]'  # 只测改动影响到的 package
```

第三种是 monorepo 的 **affected** 模式——CI 上只跑变动相关的 package，是 monorepo 比 polyrepo 优秀的核心场景。

## 5. 远程缓存：先用 Vercel 免费版

跑一次：

```bash
npx turbo login
npx turbo link
```

`login` 把你的机器和 Vercel 账号绑定，`link` 把当前仓库链接到 Vercel 远程缓存。**Vercel 远程缓存对所有人免费，不强制把应用部署到 Vercel**——这是很多教程没说清楚的点。

CI 上要让 GitHub Actions 也能命中缓存，需要两个环境变量：

```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

`TURBO_TOKEN` 在 [vercel.com/account/tokens](https://vercel.com/account/tokens) 生成，命名建议 `ci-monorepo-cache`，权限选 `read+write`。`TURBO_TEAM` 是你 Vercel 团队的 slug（个人账号就是用户名）。

**什么时候要自建？** 三个信号同时出现：① 月构建任务量 > 5000 次 ② 公司合规要求 build artifact 不离自家 VPC ③ 跨地域 CI 集群（参考上一篇 Mercari 案例）。否则直接用 Vercel，省心。

自建首选 [ducktors/turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache)，是社区维护的开源实现，支持 S3/GCS/Azure Blob 多后端，Docker 一行起。

## 6. changesets：版本与发布

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

`init` 会在根目录创建 `.changeset/config.json`，把 `access` 改成 `public`（发布到 npm 公开 registry）或 `restricted`（私有）：

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

**逐字段说明**：

- **`fixed`**：哪些包必须同步发版（共用大版本号）。例如 React 体系会把 `react` `react-dom` 放 `fixed`
- **`linked`**：哪些包共用 minor/patch 号但可独立发布。一般用不到
- **`updateInternalDependencies`**：内部包之间相互引用的更新策略。`patch` 是最常见——A 依赖 B，B 发了 minor，A 自动跟一个 patch
- **`ignore`**：放在这里的 package 不会被 changesets 管理（常用于 example、playground）

**日常工作流**：

```bash
# 1. 改完代码、写完 commit 之前，添加一个 changeset
pnpm changeset

# 交互式选：哪些 package 改了 → major/minor/patch → 改动说明
# 生成一个 .changeset/foo-bar.md

# 2. 提交时把 changeset 文件一起 commit
git add . && git commit -m "feat(ui): add Button variant"
```

PR 合并到 main 后，CI 上的 changesets-action 会自动开一个 **Version Packages** PR，把所有未发布的 changeset 合并、bump 版本、改 CHANGELOG。这个 PR 合并的瞬间，包就发到 npm。

## 7. CI 全流程：GitHub Actions

`.github/workflows/ci.yml`：

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
          fetch-depth: 0   # 必须，turbo affected 需要 git history

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.14
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test build
```

**关键点**：

- **`fetch-depth: 0`**：默认 actions/checkout 只拉 1 个 commit，`turbo --filter='[HEAD^]'` 算不出 affected，必须拉全 history
- **`--frozen-lockfile`**：CI 必须用，本地 lockfile 和实际 install 不一致直接报错
- 任务串成一行：Turborepo 会自动并行调度有依赖关系的 task，串成一行 vs 写多个 step 性能一样但日志更清

`.github/workflows/release.yml`（发布工作流）：

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

**注意 `id-token: write`**：npm OIDC [trusted publishing](https://docs.npmjs.com/trusted-publishers) 在 2025 年 7 月 31 日 GA，2025 年 12 月 9 日起 classic token 永久弃用。它替代了传统的长寿命 `NPM_TOKEN`，避免 token 泄露要手动 rotate。前提是你在 npm 包页面配置好 trusted publisher，绑定到你的 GitHub repo + workflow 文件名。

**硬性要求**：OIDC 发布需要 **npm CLI ≥ 11.5.1 + Node ≥ 22.14.0**，所以上面 workflow 里写的是 `node-version: 22.14`（不要再写裸 `22`）。

设置完后 workflow **不再需要 NPM_TOKEN secret**——`changesets/action` 会自动找 OIDC token 完成发布认证。

## 8. CODEOWNERS：所有权强制

monorepo 一上规模，必须有 CODEOWNERS 文件强制 review 路由。`.github/CODEOWNERS`：

```
# 默认 owner
* @alice

# 按目录
/packages/ui/        @ui-team
/packages/utils/     @platform-team
/apps/web/           @web-team
/apps/api/           @backend-team

# 跨团队配置
/turbo.json          @platform-team @ui-team
/.changeset/         @release-managers
/.github/workflows/  @devops
```

打开仓库 Settings → Branches → Branch protection rules，勾上 "Require review from Code Owners"。从此跨域改动**必须**对应 owner 批准才能 merge。

这一步看似简单但**至关重要**——上一篇里讲的"50 人团队的所有权失效"问题，CODEOWNERS 是底层防线。没这层强制，monorepo 一年内就会变成"谁都能改谁都不负责"的烂泥地。

## 9. 五个最常踩的坑

实战经验，**网上教程基本不会告诉你这些**：

**坑 1：Turborepo cache 没命中，原因是 `inputs` 没配**
默认 Turborepo 把 package 下所有文件当 cache key，但**它不知道环境变量**。如果你的 build 读 `process.env.NODE_ENV`，在 dev/prod 间切换不会重 build。修复：

```json
"build": {
  "env": ["NODE_ENV", "VITE_*"]
}
```

`VITE_*` 是 2.x 引入的通配符语法，匹配前缀。

**坑 2：pnpm 幽灵依赖（phantom dependency）**
pnpm 默认严格 hoist，子 package 不能 import 没在自己 `package.json` 声明的依赖。但 monorepo 里很常见有人写：

```ts
// packages/web/src/foo.ts
import { format } from 'date-fns'   // ❌ web 没声明 date-fns
```

ts 不报错，是因为 root 装了 date-fns。dev 跑得好好的，发布后用户安装时炸。**强制开启 pnpm 严格模式**，在根 `.npmrc`：

```ini
public-hoist-pattern[]=
shamefully-hoist=false
```

**坑 3：changeset 漏写，CI 跳过发布**
有人改了源码忘加 changeset，CI 不会报错只会跳过发布，bug 在用户那爆。**强制 PR 必须有 changeset**，加一个 check workflow：

```yaml
- run: pnpm changeset status --since=origin/main
```

`status` 命令如果发现有 src 改动但没对应 changeset 会 exit 1，CI 直接红。

**坑 4：turbo remote cache 在 PR fork 里失效**
Vercel 远程缓存出于安全考虑，**默认禁止 PR fork 写缓存**（只读）。开源项目跑得慢就是这个原因。修复用 Turborepo 提供的真实环境变量 `TURBO_REMOTE_CACHE_READ_ONLY` 控制是否只读，或者在 `turbo run` 命令上加 `--cache=remote:r`（只读）/ `--cache=remote:rw`（读写）flag：

```yaml
# 在 fork PR 上强制只读，避免污染主仓库缓存
- name: Build
  run: pnpm turbo run build --cache=${{ github.event.pull_request.head.repo.full_name != github.repository && 'remote:r' || 'remote:rw' }}
```

`--cache=remote:r` / `remote:rw` 是 Turborepo 2.x 真实的命令行 flag；**不要被网上一些教程里的 `TURBO_CACHE` 环境变量误导**——Turborepo 至今没有这个环境变量，只有 `TURBO_CACHE_DIR`（指定缓存目录，是另一回事）。

**坑 5：内部 package 用 .ts 直接 import，发布出去消费者炸**
开发期 `main: ./src/index.ts` 很爽，热重载零延迟。发布出去 npm 用户没 ts runtime，import 直接报错。**双导出策略**：

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

`publishConfig.exports` 在**发布时覆盖**顶层 `exports`，把 development 路径去掉。但有两点必须注意，否则反而被坑：

1. **这是 pnpm 和 yarn 的能力，npm 官方 CLI 至今不支持**（[npm/cli#7586](https://github.com/npm/cli/issues/7586) 仍未合并）。如果你用 `npm publish` 发包，`publishConfig.exports` 不会生效，发出去的还是 `development` 路径，下游消费者直接炸。**必须用 `pnpm publish` 或 `yarn npm publish`**——好在 changesets 工作流里把 `publish` 命令显式写成 `pnpm changeset publish` 就能正确走 pnpm 通道。
2. **`development` condition 不是所有 runtime 都识别**——Vite、esbuild、tsx 支持，Node 原生 `require`/`import` 在 24 之前不识别。如果你 monorepo 里有纯 Node 跑的 app 直接消费源码 TS，需要配合 tsx/ts-node 这类 loader。

## 10. 最小目录结构总览

跑完上面所有步骤，仓库长这样：

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
│   ├── ui/         # 组件库
│   ├── utils/      # 共享工具
│   ├── types/      # 共享类型
│   └── config/     # 共享 ESLint / tsconfig
├── .npmrc
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

`packages/config` 这一个 package 单独说一下——把 ESLint / tsconfig / Prettier 配置都放在它里面，对外 export，所有 app 和 package 引用：

```json
{
  "extends": "@my/config/tsconfig/base.json"
}
```

避免每个子 package 都自己抄一份配置然后慢慢飘逸。

## 结尾

上面这套是 2026 年我会实际给团队推荐的默认组合。它不是"最酷"的搭配（没用 Nx 那种全家桶、没上 Bazel），但**每个选择都经得起 3 年时间考验**：

- pnpm catalogs 解决版本漂移，2026 是它从实验变成生产可用的年份
- Turborepo 2.x `tasks` 字段稳定，下一次 breaking change 至少 18 个月后
- changesets + OIDC 已经是 npm 生态默认的发布范式
- CODEOWNERS 是 GitHub 平台原生能力，不依赖任何工具链

把上一篇的判断框架（什么时候上 monorepo）和这一篇的实操路径（怎么搭一个生产级 monorepo）合起来看，应该够覆盖 90% 团队的 monorepo 决策与实施。剩下 10% 是 Bazel/Buck 这种超大规模场景，那个需要专门的 build infra 团队，不在通用建议范围。

---

**延伸阅读**：
- [pnpm Catalogs 官方文档](https://pnpm.io/catalogs) - catalog 完整配置参考
- [Turborepo Configuring Tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) - tasks 字段完整文档
- [Changesets Getting Started](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) - 官方入门
- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers) - OIDC 发布配置
