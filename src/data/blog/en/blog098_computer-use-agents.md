---
author: Gerald Chen
pubDatetime: 2026-03-24T09:00:00+08:00
title: "Computer-Use: When AI Agents No Longer Need APIs"
slug: blog098_computer-use-agents
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - AI Agent
  - 自动化
description: "AI agents are learning to operate computers the way humans do—reading the screen, clicking the mouse, typing on the keyboard. From Anthropic's Claude Computer Use to Microsoft's CUA to OpenAI's Operator, Computer-Use is redefining what \"software integration\" means."
---

Yesterday Anthropic officially brought Claude's Computer Use feature to macOS: open Claude Desktop, ask it to operate your computer, and it will launch apps, click buttons, fill out forms, and switch windows on its own. No code to write, no API integration required.

This isn't the first attempt at this. OpenAI's Operator, Microsoft's Computer-Using Agent (CUA), Perplexity Computer, and Manus's "My Computer" are all doing similar things. But Claude Computer Use is built directly into the desktop app, and combined with the newly released Dispatch (commanding the Claude on your computer remotely from your phone), it pushes the experience in this space to a new level.

This article is not a product review. I want to discuss a more fundamental question: **now that AI has learned to "look at the screen and click the mouse," is the way software connects to software about to change?**

## What Is Computer-Use

At the core of Computer-Use is a Perception-Reasoning-Action Loop:

1. **Perceive**: capture a screenshot of the current screen
2. **Reason**: analyze the UI elements in the screenshot (buttons, input fields, menus) and decide the next action
3. **Act**: perform the action (move the mouse, click, type text, run a command)
4. **Repeat**: take another screenshot after the action and plan the next step based on the new state

This loop continues until the task is done. The AI isn't calling an API—it's "looking" at the screen and operating software the way a human does.

On the implementation side, Anthropic provides three basic tools: the Computer Tool (mouse and keyboard control), the Text Editor (file operations), and the Bash Tool (terminal commands). These three primitives cover the vast majority of what a person does on a computer.

## Why This Matters

You might ask: if APIs exist, why bother with the clumsy "look at the screen and click the mouse" approach?

The answer is simple: **most software has no API**.

I'm not talking about developer tools like GitHub, Slack, or Notion. They have mature REST APIs, and integrating them isn't hard. The problem is the systems that actually matter in enterprise environments:

- An ERP system that has been running for 20 years, still built on Windows Forms
- A bank's core trading system, accessible only through a Citrix remote desktop interface
- A hospital's HIS system, operable only through a proprietary client
- A government office system with an IE-only web interface

These systems carry critical business, but they were designed in an era that never considered "being called by other programs." When IT departments want to integrate them, they either spend millions on custom development or use RPA (Robotic Process Automation) to hard-code every coordinate and action—and one UI redesign throws it all away.

Computer-Use changes the game. **The GUI itself becomes the integration layer**. Any software a human can operate, an AI can operate. No API needed, no direct database access, no vendor cooperation.

## The Major Players Today

### Anthropic Claude Computer Use

The first to ship (public beta in October 2024) and currently the most capable across the board. It can operate browsers as well as desktop apps, terminals, and file systems. Yesterday's update turned it from API-only into a built-in Claude Desktop feature—Mac users can use it directly.

The new Dispatch feature lets you issue commands from your phone to the Claude running on your computer—"turn today's meeting notes into an email and send it"—and Claude opens the calendar, reads the meeting notes, opens the mail client, writes the message, and sends it, all on its own.

Cost: screenshots are the main expense. Based on Anthropic API pricing, a 50-step automation task costs roughly $0.50-$2.00, depending on screen resolution and model choice.

### OpenAI Operator

Released in January 2025, positioned primarily as browser automation. A browser instance runs in the cloud and the AI operates inside it. The advantage is that nothing needs to be installed locally, which makes it well suited for web-based tasks (ordering food, filling forms, looking up information). The limitation is that it can only operate a browser, not desktop applications.

### Microsoft Computer-Using Agent (CUA)

Released in Copilot Studio in April 2025 and still iterating. Its biggest differentiator is enterprise-grade features: built-in credential management (no need to expose passwords to the AI), action audit logs (screenshot plus action record for every step), and Cloud PC pools (automatically provisioning virtual desktops to run tasks).

It supports multiple models: both OpenAI CUA and Claude Sonnet 4.5 are available. This suggests Microsoft itself believes Computer-Use won't be dominated by a single vendor—it's becoming a general-purpose AI capability layer.

### Other Players

- **Perplexity**: offers two options—a cloud-hosted Computer and a Mac Mini-based Personal Computer
- **Manus "My Computer"**: turns your Mac into an AI agent
- **AskUI**: an open-source solution that uses computer vision to operate any application, with offline support
- **CLI-Anything**: a different approach—instead of operating the GUI, it auto-generates CLI interfaces for desktop apps so agents can operate them through structured commands

## Computer-Use vs API vs MCP

AI agents currently have three main ways to connect to external software:

### API Integration

The traditional approach. The software provides a REST/GraphQL API, and the agent calls it via function calling.

- **Pros**: fast, reliable, structured data
- **Cons**: requires the software to provide an API (many don't); requires developers to write integration code; API changes need maintenance

### MCP (Model Context Protocol)

A protocol Anthropic introduced last year that is becoming the standard for AI tool connectivity. The software provides an MCP Server, and the agent calls it through a standard protocol.

- **Pros**: standardized, automated tool discovery, better suited to AI scenarios than raw APIs
- **Cons**: requires the software vendor to adopt MCP (simpler than building an API, but still development work); the ecosystem is still early

### Computer-Use

No changes required on the software side at all. The AI looks at the screen and operates directly.

- **Pros**: zero requirements on the target software; can handle any system with a GUI
- **Cons**: slow (the screenshot-analyze-act loop is an order of magnitude slower than an API call); less reliable (UI changes can break operations); expensive (every step burns visual reasoning tokens); security risks (the AI can see everything on the screen)

The three approaches aren't substitutes for each other—they're complementary. Real agent workflows mix them:

```text
Software with an API → use the API (fast, stable, cheap)
Software with MCP → use MCP (standardized, AI-friendly)
Software with neither → use Computer-Use (last resort)
```

This looks a lot like progressive enhancement in web development: prefer the best option, but make sure things still work under the worst conditions.

## Security Can't Be Ignored

The security implications of letting an AI control your computer are obvious.

**Screen data leakage**: Computer-Use needs to capture screenshots and send them to the AI model. If your screen contains sensitive information (passwords, private keys, customer data), the AI service will see it. Anthropic processes screenshots locally, but in API mode screenshots do get sent to the cloud.

**Misoperation risk**: the AI may click the wrong button, type into the wrong input field, or accidentally delete files. Today's Computer-Use is still not precise enough—drag-and-drop, scrolling, and clicking small targets fail relatively often.

**Excessive permissions**: once you give an AI desktop control, it can theoretically access anything on your computer. Anthropic emphasizes the principle of least privilege, but in practice precise control is hard.

Microsoft's CUA takes this seriously: encrypted credential storage (the AI model never sees plaintext passwords), screenshot logs and audit records for every step, and support for human approval checkpoints. In enterprise scenarios these features aren't optional—they're mandatory.

For individual users, the current recommendations are:

1. Don't run Computer-Use in environments containing sensitive information
2. Use a separate user account or a virtual machine to isolate agent operations
3. Add confirmation checkpoints before important actions (have the AI tell you what it's about to do, and execute only after you approve)

## What This Means for Developers

If you're a frontend or full-stack developer, the Computer-Use trend has a few points worth paying attention to:

### 1. UI "Readability" Matters More

When AI understands your UI through screenshots, semantic design matters more than visual flair. Clear button labels, sensible layout hierarchy, consistent interaction patterns—these were best practices meant for humans, and now AI needs them too.

Writing proper ARIA labels, using semantic HTML, keeping the UI consistent—these practices now carry an extra payoff: they let AI agents understand and operate your application better too.

### 2. MCP Is the Better Way to Integrate with AI

If you're building developer-facing tools, rather than waiting for someone to "brute-force" your UI with Computer-Use, proactively ship an MCP Server. MCP integration is 10x+ faster than Computer-Use, far more reliable, and far cheaper.

Google Stitch just released an MCP Server a few days ago; Figma, VS Code, and all kinds of databases are connecting. The ecosystem is growing fast.

### 3. The RPA Industry Is Under Pressure

Traditional RPA's (UiPath, Automation Anywhere) core selling point is "automating software without APIs." Computer-Use does the same thing, but instead of hard-coding every coordinate and step, it uses AI to understand UI semantics and adapt its actions. UI got redesigned? Computer-Use just looks at the new interface and re-understands it—no manual script maintenance needed.

This doesn't mean RPA disappears overnight—enterprises have huge fleets of deployed RPA workflows, and migration takes time. But for new automation projects, Computer-Use's flexibility advantage is obvious.

## Current Limitations

After all the upsides, let's be objective about the problems:

**Speed**: the screenshot-analyze-act loop is inherently slower than an API call. Something an API call finishes in milliseconds can take Computer-Use tens of seconds.

**Reliability**: the AI sometimes "misreads"—mistaking one button for another, clicking in the wrong place, or not knowing what to do with a popup. Complex tasks may need multiple retries.

**Cost**: every screenshot step burns visual reasoning tokens. Long workflows add up.

**Resolution dependence**: the higher the screen resolution, the larger the screenshots and the more tokens consumed—yet small elements actually become harder for the AI to see.

All of these problems are improving fast. Anthropic acquired Vercept (a company specializing in visual perception) to strengthen the underlying capability, Microsoft is using Cloud PC to solve the infrastructure problem, and everyone is optimizing screenshot compression and UI element recognition algorithms.

## Conclusion

Computer-Use is not a replacement for APIs—it's a complement. It fills a long-standing gap: **how to let AI operate software that has no programmatic interface**.

In the short term, its biggest value is in enterprise scenarios—using AI to connect decade-old systems that have no APIs. In the long term, it may change how we think about "software integration": future agents won't need every piece of software to provide an API—they can just look at the screen and use it.

For developers, the most pragmatic approach right now is:

1. Use API/MCP for core integrations (fast, stable, cheap)
2. Use Computer-Use as the fallback for long-tail needs (slow but flexible)
3. Ship an MCP Server for your own product, so AI integrates the proper way instead of brute-forcing your UI

The way AI agents interact is expanding from "calling APIs" to "using software like a human." This isn't replacement—it's evolution.

---
