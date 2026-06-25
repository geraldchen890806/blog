---
author: 陈广亮
pubDatetime: 2026-06-25T16:03:52+08:00
title: "The CLI's Second Spring in the AI Era: Three Structural Reasons Behind the Claude Code / Codex / Charm / Ink Surge"
slug: blog196_cli-second-spring-ai-era-three-structural-reasons
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 工具
  - 开发效率
description: Starting in 2025, Claude Code, Codex CLI, Charm Bubble Tea, and Ink all took off at once. After 30 years of GUI dominance, the CLI suddenly became the default form factor for AI tooling — Claude Code itself even ships as a Bun binary. This isn't nostalgia. Three structural constraints — LLM I/O, controllable long-running tasks, and cross-tool interop — are pushing engineers back to the terminal. Includes a 30-line Claude Agent SDK sample.
---

## The phenomenon: CLIs came back from the dead in 2025-2026

If you'd asked in 2020 "what does the next decade look like for the CLI," the consensus answer would have been "further marginalized by GUIs and the web." What actually happened in 2025 and the first half of 2026 is the exact opposite:

- **February 24, 2025**: Anthropic shipped Claude Code as a research preview. Three months later (May 22) it went GA alongside Claude 4. Notable detail: Claude Code itself **ships as a Bun binary** (Anthropic later acquired Bun).
- **April 2025**: OpenAI open-sourced Codex CLI (initial version in Node/TypeScript), then **announced a Rust rewrite in June**. As of June 2026 it has accumulated roughly **93k GitHub stars / 41.8 million monthly downloads / 5 million WAU** — the most successful developer product in OpenAI's history.
- **Charm's Bubble Tea** (Go TUI framework) shipped its latest release in June 2026. The repo has **40k+ stars**, and there are over **18,000** projects in the wild building TUIs on top of it.
- **Vadim Demedes' Ink** (React for CLI) has become the default UI layer for AI coding tools — Claude Code, Gemini CLI, and Qwen Code **all render on top of Ink + Yoga**.
- **March 31, 2026**: Claude Code's full TypeScript source leaked because a missing `.npmignore` exposed the source map. About 59.8 MB / 510,000 lines / 1,900 files went public by accident. It was the first time the industry got a complete look at the internals of a production-grade AI CLI: a custom React reconciler, a pure-TypeScript Yoga port, a full ANSI/CSI/DEC/ESC/OSC parser stack — more complex than the vast majority of web apps.

There's a piece by JacksonChen riding the "CLI revival" narrative that landed at #22 on the June 23 Chinese trending charts, but the "CLI is back" framing is nowhere near enough — what's worth unpacking is **why the AI era specifically picked the CLI as its default form factor**.

It's not nostalgia. Three **structural reasons** are pushing engineers back to the terminal.

## Reason A: LLM I/O is text streams. CLIs map onto that natively.

An LLM's input is a token sequence, its output is a token sequence, and every transformation layer in between is pure overhead. The CLI matches this reality in three deep ways:

**1. Unambiguous input.** The whole point of a GUI is "compress user intent into a finite set of buttons and form fields." That was a sensible 30-years-ago design assumption: humans are bad at precise description, so the system reduces semantics down to clickable options. LLMs flip this on its head — what they're best at is **precise natural-language description**, and what they're worst at is "guess what the user meant by clicking this button." The CLI's stdin is an arbitrary block of text, which happens to be the LLM's native food.

**2. Composable pipes.** The Unix pipe (`|`) was designed by Ken Thompson in 1973. Its essence is "wire one program's output blindly into the next program's input," which requires **text streams as I/O**. This forty-year-old, mostly-unchanged protocol turns out to be a perfect fit for LLMs — `cat file.md | claude "summarize" | bat` reads naturally to humans, models, and tools alike. For any team building an LLM agent, becoming a pipe node is the cheapest possible integration. GUI tools fundamentally can't plug into a pipe.

**3. Serializable state.** A CLI's session state is just text (cwd, env, history) — you can dump it to JSON, diff it, version it, hand it to another LLM to continue. GUI state is scattered across memory, the DOM, IndexedDB, and a forest of controllers, and is **impossible for an LLM to see in full**. The reason Claude Code can "resume yesterday's session" is that its state is all text. The reason Cursor can hand control to another agent is that its IDE context can be serialized to a text snapshot.

Add these up: **LLMs are text machines, CLIs are text systems, and the match is tight enough that almost no adapter layer is needed**. From a pure engineering-effort standpoint, any team building agentic tooling will find the CLI to be the path of least resistance.

## Reason B: Long-running agents need to be monitored, interrupted, and replayed — TUIs deliver that cheaper than GUIs

The second structural reason has to do with how **long agents run**.

Normal GUI applications have sub-second interaction cadence — you click, it responds, repeat. Agent tasks operate on a completely different timescale. A refactor agent might run for 30 minutes, a doc-generation agent might run for two hours, a long loop might run overnight. At those durations users need three things, and **TUIs deliver all three more cheaply than GUIs**:

**1. Real-time observability.** You can't stare at a progress bar for two hours. What you need is a **scrolling event stream** — what tool the agent is calling right now, what file it's reading, what it's thinking, what it's emitting. That's natively a streaming-text shape, and CLIs/TUIs deliver it by printing one line at a time. Getting "a comfortable real-time event stream" out of a GUI requires purpose-built components, virtualized scrolling, performance work — hundreds of lines of code at minimum. In a TUI, `console.log` is already a reasonable UI.

**2. Interrupt and redirect.** Halfway through a long task you realize the direction is wrong, you want to Ctrl+C, change the instruction, and continue. The Unix signal mechanism (SIGINT / SIGTERM / SIGTSTP) and the fg/bg process control conventions are a forty-year-old protocol that fits "human intervention in long tasks" perfectly. Doing "stop + edit prompt + restart" in a GUI requires hand-rolling a process control layer, a state-save layer, and UI flow control. In a CLI/TUI, Ctrl+C is enough.

**3. Replay and audit.** Once an agent finishes, you want to know exactly what it did, why it chose path A over B, and whether anything needs rolling back. What you need is a **complete transcript**. A CLI's output is already a transcript — saving it to a file, grepping it, `tail -f`-ing it are all free. Building a readable execution trace in a GUI requires a custom log panel, a timeline component, a filter UI; in a CLI, `tee session.log` covers the entire requirement in one command.

The March 31, 2026 Claude Code source leak revealed an internal architecture full of ANSI escape sequence handling. That's not for visual flair — **it's for precisely controlling the position and color of every character during a long task** so the screen scrolls without flicker and state refreshes in real time. Achieving the same precision in a GUI costs 10x more — the TUI's character grid is already a minimal raster.

## Reason C: The CLI is the greatest common divisor for cross-tool collaboration

The third structural reason is the easiest to overlook and the most consequential in practice.

Today you might use Claude Code, tomorrow Codex CLI, next week Cursor's Agent mode. If each tool ships as a web app, **they can't call each other** — you can't have Claude Code spawn a Cursor session and ask Cursor to do a job for it.

But if everything is a CLI, **calling each other is a single shell line**:

```bash
# Claude Code can call Codex with zero ceremony
codex --task "run the test suite and summarize failures"

# Codex can call Claude Code too
claude --skill review-pr 12345

# Two agents can even talk to each other
claude "design the API" | tee design.md | codex "implement based on this design"
```

This kind of **interop** is infrastructure-level leverage for the agent ecosystem. Three different AI companies' tools can be composed, don't conflict, don't need SDK integrations, don't need OAuth, don't need subscription bundles — they just have to honor the forty-year-old contract of "read stdin, write stdout, exit 0/non-zero."

This also explains why **Cursor, originally an IDE-shaped tool, started aggressively beefing up its CLI interface in late 2025** — they realized that not plugging into the shell means being excluded from the agent ecosystem. GUI-shaped AI tools are inherently isolated in multi-agent scenarios; **nobody can "call" a GUI from the outside**.

The CLI is the USB of the LLM era — ugly, old, constrained, but everything plugs in.

## Hands-on: a 30-line CLI agent with Bun + Ink + Claude Agent SDK

Enough structural argument — here's the smallest runnable sample. This is a CLI agent rendered with React (Ink) that runs in under 30 lines (excluding imports):

```tsx
#!/usr/bin/env bun
import React, { useEffect, useState } from "react";
import { render, Box, Text } from "ink";
import Spinner from "ink-spinner";
import { query } from "@anthropic-ai/claude-agent-sdk";

function Agent({ prompt }: { prompt: string }) {
  const [events, setEvents] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      for await (const msg of query({
        prompt,
        options: { model: "claude-opus-4-7" },
      })) {
        setEvents(prev => [...prev, JSON.stringify(msg)]);
      }
      setDone(true);
    })();
  }, []);

  return (
    <Box flexDirection="column">
      {events.map((e, i) => <Text key={i}>{e}</Text>)}
      {!done && <Text color="cyan"><Spinner /> thinking...</Text>}
    </Box>
  );
}

render(<Agent prompt={process.argv.slice(2).join(" ")} />);
```

Run it:

```bash
bun add ink ink-spinner react @anthropic-ai/claude-agent-sdk
chmod +x agent.tsx
./agent.tsx "list the 5 biggest files under src/ and summarize each"
```

What did 30 lines buy you?

- **Streaming output**: `useState` + `for await` puts every agent event on the terminal in real time
- **React componentization**: views composed from `<Box>` and `<Text>`, same mental model as the web
- **Spinner affordance**: animation during long tasks so the user knows it's still working (echoing "long tasks need to be observable")
- **Pipe-ready**: because it's a CLI, output drops straight into `| bat`, `> log.txt`, `| codex ...`

This is the actual shape of writing an AI CLI in 2026 — **React mental model + terminal target + agent SDK**. Ink + Yoga ports the entire React ecosystem (hooks, components, Suspense) onto the ANSI character grid as-is. It feels like writing for the web but runs in the terminal.

In Go, the equivalent is Bubble Tea (also elegant, but a different syntax and model); in Rust it's Ratatui. The three frameworks line up with **the de facto standards of three language camps**, all backed by the same judgment: the terminal is worth treating as a first-class engineering target.

## The CLI isn't a silver bullet — when to fall back to GUI / Web UI

A reverse boundary is necessary here, otherwise this turns into CLI fundamentalism. The CLI **still loses to GUIs/Web UIs** in three categories, and forcing it actively hurts users:

**1. Non-linear visual information.** Looking at images, editing video, color grading, designing UIs, drawing diagrams — the core of these tasks is **two-dimensional spatial perception**, which a CLI's character grid simply cannot carry. Even though Charm's [Glow](https://github.com/charmbracelet/glow) can render markdown in the terminal, looking at a PNG still means opening an image viewer. Any task where "I need to see this image" is a core step is the wrong fit for a CLI.

**2. Exploratory data interaction.** Scrolling a million-row database table, panning and zooming a map, navigating a call graph in a large codebase — these need **low-latency spatial movement**, and mouse + touch + drag is the optimal input. CLIs can grep, jq, and SQL-query, but "I want to scroll around and see where the outliers are" is an order of magnitude faster in a GUI.

**3. Tools for non-technical end users.** CLIs carry real cognitive cost for non-technical users: "I don't know what the command is called," "I forget the flag order," "I can't tell I made a typo." Tools meant for designers, product managers, and ops should be web apps. **Only tools meant for engineers** are a good fit for the CLI — this must be stated explicitly, otherwise the "CLI's second spring" gets misread as "everyone should go back to the terminal," which is completely wrong.

The substance of the CLI revival is **engineer-facing tools returning to engineer-appropriate form**, not a return to 1980s human-computer interaction paradigms.

## Wrapping up

Stack the three structural reasons:

- **LLM I/O is text** → CLIs natively map to stdin/stdout
- **Long-running agents need monitoring/interrupting/replaying** → TUIs ride on forty years of free process control protocol
- **Multi-agent collaboration needs interop** → the shell is the no-auth, no-protocol, no-SDK greatest common divisor

Any single one of these wouldn't be enough to bring the CLI back. With all three present simultaneously — which is the 2025-2026 AI tooling market — the CLI couldn't *not* come back.

What's likely to evolve in the next 1-2 years:
- More GUI/IDE tools forced to add CLI interfaces (Cursor has already started)
- Further specialization across Bubble Tea, Ink, and Ratatui (the one-to-one mapping with Go / TypeScript / Rust — the three mainstream AI agent languages — is not a coincidence)
- Terminal emulators themselves being redesigned — Warp, Wave, Ghostty and other "AI-native terminals" becoming new infrastructure

The CLI's first spring was Unix in the 70s and 80s. Its second spring isn't nostalgia, isn't a trend, isn't aesthetics — it's the LLM pulling the underlying constraint on engineering collaboration from "be friendly to humans" back to "be friendly to systems." This time around the CLI is **more engineered** than it was forty years ago (Ink/Yoga/ANSI parsers are web-level complexity) while being **more human-friendly** (streaming output, animation, componentization). It's a real evolution.

---

**Further reading**:

- [Anthropic Claude Code GitHub Releases](https://github.com/anthropics/claude-code/releases) - Complete release history from the 2025/2 research preview through 2026/6
- [OpenAI Codex CLI GitHub](https://github.com/openai/codex) - Initial Node/TypeScript release, Rust rewrite from 2025/6, 93k+ stars by 2026/6
- [Charm Bubble Tea](https://github.com/charmbracelet/bubbletea) - The de facto Go TUI standard
- [Vadim Demedes Ink](https://github.com/vadimdemedes/ink) - React for CLI, the shared foundation under Claude Code / Gemini CLI / Qwen Code
- [Rich CLIs with React Ink: The Tech Behind ClaudeCode](https://zenn.dev/mizchi/articles/react-ink-renderer-for-ai-age?locale=en) - mizchi's breakdown of how Ink rendering works (includes 2026/3 source-leak analysis)
