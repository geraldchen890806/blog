---
author: Gerald Chen
pubDatetime: 2026-03-20T11:00:00+08:00
title: "Google Stitch's Big Update: UI Design in Natural Language — Should Figma Be Worried?"
slug: blog093_google-stitch-vibe-design
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - 前端
description: "Google Stitch just got a major update, evolving from a simple prompt-to-mockup tool into an AI-native design canvas. Infinite canvas, voice interaction, the DESIGN.md design system format, MCP integration — five big features shipped at once. Free, powered by Gemini, and aimed squarely at Figma Make."
---

On March 18, Google Labs dropped a big one: a complete overhaul of Stitch.

If you haven't used Stitch, it's the AI UI design tool Google announced at last year's I/O, built on Galileo AI, which Google acquired. The old version was simple — type a text description, get a few UI screens, export to Figma or walk away with HTML/CSS. Usable, but nothing to write home about.

This update is a different story. Google shipped five major features at once: an AI-native infinite canvas, a redesigned Design Agent, voice interaction, instant prototype preview, and a design system format called DESIGN.md. Most importantly, all of it is free. Within two days of the announcement, Figma's stock dropped about 12% in total.

## From "Generating a Few Screens" to an "AI-Native Canvas"

The old Stitch was linear: enter a prompt → generate screens → export. The new version replaces that entire interaction model with an infinite canvas. You can put images, text, code snippets, and previously generated designs on the canvas at the same time, and all of it becomes context for the AI.

The change looks small but cuts deep into the workflow. Before, every prompt was independent — the AI had no idea what you'd done previously. Now everything on the canvas is context: the color scheme from your last round, the competitor screenshot you pasted in, the notes you jotted down — the Design Agent can see and reference all of it.

The new Agent Manager lets you explore multiple design directions in parallel. Say you're building an e-commerce app: you can have one agent pursue a minimalist style while another goes playful, with both directions advancing at once. You used to try them one at a time; now you can fan them out simultaneously.

Generation went from one screen at a time to multiple screens at once, and a "Play" button lets you preview interaction flows directly (click a button, jump to the next screen). You can basically stand up a clickable prototype in a few minutes.

## Voice Interaction: Designing Out Loud

The feature Google seems most excited about in this update is voice interaction. You can talk directly to the canvas and the Design Agent responds in real time — "give me three different menu styles", "switch this page to a dark theme", "make the primary button a bit bigger".

Nice idea, but I'm skeptical about designing by voice. Design demands precision, and natural language is inherently fuzzy. When you say "make the colors warmer", the AI's notion of "warmer" probably doesn't match the one in your head. You can end up in a loop of say something → AI tweaks → you're not happy → say something else, which isn't necessarily faster than just pointing and clicking.

It is useful as a coarse-tuning tool, though. In early brainstorming, talking while watching whether the AI gets it is a lot faster than typing. Once the direction is set, switch to precise adjustments.

## DESIGN.md: The Most Imaginative Update

Of the five new features, the one I find most interesting isn't the canvas or voice — it's DESIGN.md.

DESIGN.md is a Markdown file that captures your design system in natural language — colors, typography, spacing, component conventions. You can auto-extract a design system from any website URL, save it as DESIGN.md, then import it into other Stitch projects — or, more importantly, **into coding tools**.

Why do I call this imaginative? Because it bridges the information gap between design and development.

The traditional flow: designer finishes in Figma → writes a design spec doc → developer reads the doc and recreates it → endless back-and-forth on details. Information leaks at every step.

With DESIGN.md: the design system is written in Markdown → both AI design tools and AI coding tools can read it → design and code share the same set of "rules".

It gets even more interesting combined with Stitch's recently released MCP Server and SDK. MCP (Model Context Protocol) is becoming the standard communication protocol between AI tools. Through MCP, Stitch designs can flow directly into coding tools like AI Studio, Cursor, and Claude Code. Google's intent is clear: Stitch isn't just a design tool — it's a node in the AI development pipeline.

## Free vs Figma Make: Which One Is Worth Using

Figma launched Figma Make this year, doing something similar — generating UI from natural language. But the two are positioned very differently.

| Dimension | Google Stitch | Figma Make |
|:-----|:-------------|:-----------|
| Price | Free (~350 standard generations/month) | Requires a paid Figma subscription |
| Model | Gemini 2.5 Flash / 2.5 Pro | Figma's in-house model |
| Design system integration | DESIGN.md (new format) | Uses your existing Figma component libraries directly |
| Code export | HTML/CSS, React, Tailwind | Relies on Dev Mode |
| AI toolchain integration | MCP Server + AI Studio + Antigravity (Google's AI code generation tool) | Within the Figma ecosystem |
| Collaboration | Mostly single-player (limited collaboration) | Mature team collaboration |
| Target users | Indie developers, founders, engineers | Professional design teams |

If you're already on Figma with a mature component library and team workflows, Figma Make's advantage is that it runs inside your existing environment, with the AI able to call into your design system and component libraries. That organization-level context is something Stitch doesn't have today.

But if you're an indie developer, an early-stage startup, or an engineer who just needs a quick prototype to show investors — Stitch being free is reason enough. 350 generations a month is plenty for iterating your entire app's UI several times over.

## Hands-On Impressions

I tried the new Stitch (stitch.withgoogle.com). A few practical observations:

**Generation quality**: Standard mode (Gemini 2.5 Flash) is fast and fine for first drafts. Experimental mode (Gemini 2.5 Pro) is noticeably better, but the monthly quota is limited. Mobile UI generations come out better than complex web layouts.

**Canvas experience**: The infinite canvas is the right direction conceptually, but the current implementation is still rough. Drag-and-drop isn't smooth, and switching between parallel agent design directions gets confusing. The gap with Figma's canvas experience is obvious.

**Code export**: The exported HTML/CSS and React code is basically usable, Tailwind-style. But it's a long way from "production-grade" — responsive layouts need manual fixes, and component splitting isn't granular enough. Good as a prototype reference; shipping it directly isn't realistic.

**Voice interaction**: English recognition accuracy is solid; Chinese support remains to be verified. Coarse adjustments are genuinely faster than typing, but fine-tuning still requires text prompts.

**DESIGN.md**: Extracting a design system from a URL is genuinely useful — pull a site's colors, fonts, and spacing in one click, then apply them to a new project. This is the feature with the most practical value for me so far.

## The Concerns About Stitch

After the good, the problems.

**Google's product lifecycle**. Google's history of killing products is well known. Stitch still lives in Google Labs (the experimental products platform), which is both its incubator and possibly its final stop. The Galileo acquisition and the rapid update cadence show Google is investing, but building your core workflow on a Labs-stage product is not a small risk.

**The limits of a single-player tool**. Stitch is essentially a single-user tool right now, lacking Figma-style real-time multiplayer collaboration. For companies with design teams, that's a dealbreaker.

**Consistency of AI generations**. Multiple reviews mention that Stitch sometimes "forgets" the component styles you liked, or interprets the same component in a completely different way in a new generation round. For projects that need design consistency, that means extra manual verification.

## What This Means for Frontend Developers

Stitch isn't positioned to replace Figma, nor to replace frontend developers. It's more of a "concept accelerator" — turning the fuzzy idea in your head into something you can see and click within minutes.

For frontend developers, the things worth watching are:

1. **DESIGN.md as the design-to-code bridge**. If more tools adopt this format, the communication cost between designers and developers drops dramatically.
2. **MCP integration means a connected toolchain**. Stitch generates the design → MCP hands it to a coding agent → code gets generated automatically. The more mature this pipeline gets, the shorter the path from idea to prototype.
3. **"Vibe Design" is the design-side counterpart of "Vibe Coding"**. Writing code in natural language is already happening (Cursor, Claude Code); designing in natural language is the same trend.

Stitch is still a Labs-stage experiment with some distance to maturity. But the direction it points to — AI-native, natural-language-driven, with design and code toolchains connected — is very likely where design tools are headed over the next few years.

Try it for free: [stitch.withgoogle.com](https://stitch.withgoogle.com)

---
