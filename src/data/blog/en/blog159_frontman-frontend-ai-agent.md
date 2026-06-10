---
author: Gerald Chen
pubDatetime: 2026-05-01T16:00:00+08:00
title: "Frontman Deep Dive: What an AI Agent Can Do When It Sees Your Code from the Browser, Paired with Frontend Skills"
slug: blog159_frontman-frontend-ai-agent
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - AI Agent
  - Claude Code
  - 开发效率
description: "Cursor and Claude Code both start from source code, but a frontend engineer's real work happens in the browser—the actual color on hover, the real DOM after SSR, the re-render triggered by the third useState. Frontman works in the opposite direction: from the browser back to the code. This post breaks down its architecture and combines it with Anthropic's frontend-design Skill and others into a complete frontend AI workflow."
---

Mainstream AI coding tools—Cursor, Claude Code, Copilot—share one assumption: start from the source code. The model reads your JSX/CSS files, edits the source, hands you a diff. But what a frontend engineer actually debugs is the thing in the browser: the color a button actually computes to on hover, what that long string of Tailwind classes actually cascades into, the final DOM a Server Component renders on the client. The gap between source code and rendered state is the biggest blind spot in today's AI frontend tooling.

`frontman-ai/frontman` hit GitHub Trending over the past two weeks, closing in on 400 stars, with a very direct pitch: **work backwards from the browser to the source code**. This post breaks down its architecture, then covers how to pair it with Anthropic's official frontend-design Skill, a React composition patterns Skill, and an accessibility audit Skill to form a complete frontend AI workflow.

## The blind spot in existing tools

A designer finishes a button in Figma: 8px border radius, background transitioning from `#3B82F6` to `#2563EB` on hover. You implement it, the designer looks at it and says "the radius looks smaller, and the hover color is off."

Drop this problem into Cursor, and the flow usually goes:

1. You paste a screenshot into Cursor
2. Cursor finds the corresponding component file
3. It reads the className list and sees `rounded-lg hover:bg-blue-600`
4. It tells you `rounded-lg` is 8px and `hover:bg-blue-600` is `#2563EB`—matches the design spec
5. You go argue with the designer: maybe it's a perception issue, the radius and color are clearly correct

But in reality:

- The component is wrapped in a `Card` with `rounded-xl` (12px), and the inner button visually looks like it has an inconsistent radius because of the parent's overflow-hidden and box-shadow
- `hover:bg-blue-600` gets overridden by a `bg-gradient-to-r` parent rule in some browsers
- Tailwind's `bg-blue-600` is overridden by `dark:bg-blue-700` in dark mode, but your test browser was in light mode

**None of this information lives in the source code**—it only exists in the browser's actual rendered state. Cursor only reads source, so all it can ever tell you is "the code looks correct."

This is exactly where Frontman comes in.

## Frontman's architecture

Frontman injects itself into your dev server's middleware and serves a `/frontman` route as an in-browser overlay. In dev mode you see both the page you're debugging and Frontman's tool panel.

The capabilities it gives an AI Agent—the things Cursor can't see—boil down to a few core items:

1. **The runtime DOM tree**: not the JSX tree in your source, but the final DOM after React/Vue rendering and hydration
2. **Computed CSS values**: the styles actually in effect on each element (after cascade and inheritance), not className strings
3. **Component tree ↔ DOM node mapping**: using source maps to trace which line of which JSX file rendered a given DOM node
4. **Server logs and routing info**: which request's render output corresponds to this page
5. **Screenshots and hot reload**: instant preview after editing the source, so the AI can "see" the effect of its changes

The workflow looks roughly like this:

```text
You → click the button in the browser →
describe "bigger radius, darker color on hover" →
Frontman packages [DOM node + computed CSS + source location] for the AI →
AI edits the source → hot reload kicks in → you see the result immediately
```

The third step is the key: the AI doesn't receive a vague "make the radius bigger." It receives a request with precise context: "`<button class='rounded-lg hover:bg-blue-600'>` at `src/components/ui/Button.tsx:42`, computed border-radius is 8px, hover background is rgb(37, 99, 235); needed: larger radius, darker hover color."

## It doesn't conflict with Cursor / Claude Code

An easy misreading: Frontman isn't trying to replace Cursor. It **installs as an OpenClaw Skill**, adding a "see the browser" capability to your existing Agent.

The actual workflow becomes a mix:

- Building new features, refactoring backend logic: keep using Cursor / Claude Code (the source-code view is more efficient)
- Tweaking styles, matching design specs, fine-tuning UI: switch to Frontman (the runtime view is more accurate)
- Debugging hydration errors and Server Component boundary issues: use Frontman to inspect the actual DOM and server logs

Framework support already covers most of the modern frontend stack: Next.js (App Router + Pages Router, Turbopack), Astro (Islands, Content Collections, SSR/Hybrid), and all Vite projects (React, Vue, Svelte, SvelteKit).

## BYOK and the license design

Frontman uses a BYOK (Bring Your Own Keys) model: you plug in your own Anthropic / OpenAI / OpenRouter API key, and Frontman charges no subscription and imposes no call limits. That's the most direct difference from paid products like Cursor and v0.

The license is a two-tier structure:

| Component | License | Meaning |
|---|---|---|
| Client libraries | Apache 2.0 | Permissive open source—commercial use and modification allowed |
| Server | AGPL-3.0 | Copyleft—derivative work must be open-sourced |

**Production builds strip Frontman out completely**—add it as a dev dependency and your deployed bundle is identical to one without it. This is a necessary security design: Frontman exposes source-code access in the browser and must never reach production.

## Pairing with Anthropic's frontend-design Skill

Anthropic's official frontend-design Skill is currently the most installed frontend Skill, passing 270,000 installs in March. Its positioning is perfectly complementary to Frontman:

- **frontend-design**: gives the AI a design philosophy up front (bold colors, deliberate typography, purposeful motion) so generated UIs stop looking generic
- **Frontman**: lets the AI see the actual rendered result, so source edits don't drift visually from the design spec

Combined usage:

```text
1. Use the frontend-design Skill to have the AI produce a first version of the component
   → automatically applies a cohesive design language (palette, typography, spacing)

2. Open it in the browser to review

3. Use Frontman to click the element that needs fine-tuning
   → the AI gets computed style + source location
   → adjusts within the design system constraints defined by frontend-design
```

With both Skills active, the frontend workflow gets close to Figma + editor sync—the AI both understands your design philosophy and perceives what's happening in the browser.

## The companion frontend Skill list

Here's a roundup of frontend Skills worth installing, grouped by responsibility:

### Design system layer

- **`frontend-design`** (Anthropic official) — the most widely used frontend Skill; makes AI output UIs with actual design sensibility
- **UI/UX Pro Max** — ships with 50+ UI styles, 97 palettes, 57 font pairings, and 99 UX guidelines the AI can randomly sample during generation

### Component architecture layer

- **React Component Composition Patterns** — teaches the AI compound components, context providers, explicit variants, and other patterns to avoid boolean prop explosion
- **React Best Practices** (Vercel) — performance patterns + established best practices (avoiding unnecessary re-renders, the real boundaries for using useMemo / useCallback)

### Runtime awareness layer

- **Frontman** — the subject of this post; lets the AI see the browser's rendered state
- **Browser Use Skill** — general-purpose browser automation, good for end-to-end testing scenarios

### Quality audit layer

- **Accessibility Skill** — scans JSX for missing alt text, broken heading hierarchy, color contrast issues, missing ARIA labels, keyboard navigation problems
- **Performance Audit Skill** — runs Lighthouse + interprets the results, with concrete optimization suggestions

### Mobile

- **React Native + Expo Skill** — 60fps constraints, gesture navigation, iOS/Android platform differences

### Recommended combos (three workflows)

**Greenfield project from scratch**:

```text
frontend-design + React Best Practices + Accessibility
```

Have the AI follow the design system, performance, and accessibility rules from the very first version.

**Style tweaks in an existing project**:

```text
Frontman + frontend-design
```

Browser-view fine-tuning + design language consistency—this is where Frontman delivers the most value.

**Refactoring legacy code**:

```text
React Component Composition + Accessibility + Performance Audit
```

Break the "prop-explosion monster component" into small composable pieces while auditing accessibility and performance along the way.

## A concrete scenario, side by side

Have the AI fix a real problem: a list card overflows its content after expanding on mobile.

**Cursor only**:

1. You screenshot + describe: "card overflows on mobile"
2. Cursor reads `Card.tsx`, sees `max-w-sm` and `overflow-hidden`
3. Cursor guesses: maybe the image is missing `max-w-full`
4. It makes the change—possibly wrong, because the problem might be in the parent container's grid template

**Frontman + Accessibility Skill**:

1. You click the overflowing card in the mobile emulator
2. Frontman hands the AI the computed style: actual width is 412px, and the parent's grid `1fr 1fr` was never switched to `1fr` on mobile
3. The AI fixes the grid template instead of the image
4. The Accessibility Skill checks whether the change broke screen reader order while it's at it

The first is the "guess-and-check" style common in SPA debugging; the second is a fix grounded in runtime data.

## Current limitations and where it applies

Frontman is not without problems:

- **Server-side RSC boundaries**: React 19 Server Components render on the server, so Frontman only sees the serialized RSC payload, not component instances. Localization accuracy in complex RSC scenarios is worse than for client components
- **CSS-in-JS at runtime**: with libraries that generate dynamic class names like styled-components / Emotion, source map tracing may land on a generated class, requiring a manual jump to the component source
- **Unusable in production**: production builds strip it completely, so live issues must first be reproduced locally
- **Depends on hot reload**: when HMR breaks, Frontman gets sluggish along with it

Good fit: day-to-day development, design reviews, UI fine-tuning, validating new components.
Poor fit: production bug hunting (must reproduce first), pure logic-layer code (no reason to open a browser), environments that must run offline.

## How to get started

The lowest-friction way to try it:

```bash
# Next.js 项目
npx @frontman-ai/nextjs install

# Astro 项目
astro add @frontman-ai/astro

# 任何 Vite 项目
npx @frontman-ai/vite install
```

After installing, start the dev server, visit `http://localhost:3000/frontman` to enter the overlay, configure an Anthropic or OpenAI API key, and you're set.

If you use Claude Code instead of a standalone Agent, install Frontman as an OpenClaw Skill so Claude Code invokes it automatically on frontend tasks. This keeps your existing CLAUDE.md, other Skills, and workflows—you've simply added a pair of "browser eyes."

## A decision rule

Whether Frontman is worth adding to your workflow comes down to one question: **how often does your AI coding tool say "the code looks correct" while the browser disagrees?**

- Almost never: your app is logic-heavy with simple UI; Frontman adds little
- Occasionally: give it a try as a supplementary tool
- All the time: this is exactly the pain point it targets, and you'll feel the difference immediately

The real bottleneck for frontend engineers usually isn't "writing code slowly"—it's "code, design, and browser failing to line up." Frontman's step extends AI tooling from "code assistant" to "frontend collaboration tool"—a direction worth watching in 2026.

---

**Further reading**:
- [Frontman GitHub repository](https://github.com/frontman-ai/frontman) - project source and issue tracker
- [Anthropic frontend-design Skill](https://www.aitmpl.com/component/skill/frontend-design) - the most installed frontend Skill
