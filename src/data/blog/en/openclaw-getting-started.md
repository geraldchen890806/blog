---
author: Gerald Chen
pubDatetime: 2026-02-13T00:40:00+08:00
title: "Getting Started with OpenClaw: Build Your Self-Hosted AI Assistant in 5 Minutes"
slug: openclaw-getting-started
featured: true
draft: true
tags:
  - OpenClaw
  - AI
  - 自托管
description: "OpenClaw is a powerful self-hosted AI agent gateway that lets you talk to Claude from Telegram and other apps, anywhere, anytime. This guide walks you through building your first AI bot from scratch in 5 minutes."
---

While looking for ways to get more out of AI assistants, I came across a really interesting open-source project: **OpenClaw**. It lets you chat with Claude directly from Telegram, WhatsApp, Discord, and other apps—while keeping everything fully under your control. In this post, I'll walk you through setting up your first OpenClaw AI assistant from scratch.

## What Is OpenClaw?

In short, **OpenClaw is a self-hosted AI agent gateway**. It connects AI models like Claude and GPT to your favorite messaging platforms, so you can interact with AI the same way you'd chat with a friend.

### Key Features

- **Multi-channel support**: Telegram, WhatsApp, Discord, Slack, and other major platforms
- **Self-hosted architecture**: all your data stays on your own server
- **Flexible configuration**: multiple agents, custom tools, memory management
- **Works out of the box**: built-in web dashboard, easy to configure

### Why Self-Host?

You might be wondering: with ready-made services like ChatGPT and Claude.ai already out there, why bother setting up your own?

**Data privacy**: all conversation history and configuration lives on your own machine—nothing gets collected by third parties.

**Full control**: swap models whenever you want, connect to whichever platforms you like, with no vendor lock-in.

**Transparent costs**: you call the API directly and pay for what you actually use—no subscription fees to worry about.

**Freedom to extend**: define custom tools, configure a memory system, hook into local services—the possibilities are wide open.

For developers and privacy-conscious users, self-hosting is the better choice.

## Quick Install (macOS)

The walkthrough below uses macOS, but installation on other systems is similar—see the [official docs](https://openclaw.ai/install) for details.

### Prerequisites

Before you start, make sure your system has:

1. **Node.js 22+**: OpenClaw runs on Node.js
   ```bash
   node --version  # 检查版本，应该 >= 22
   ```
   If your version is too old, install the latest with [nvm](https://github.com/nvm-sh/nvm).

2. **An Anthropic API key**: you'll need a Claude API key
   - Sign up at the [Anthropic Console](https://console.anthropic.com/)
   - Create a new key on the API Keys page
   - Keep it handy—you'll need it shortly

### One-Line Install

OpenClaw ships a convenient one-line install script:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

The script automatically downloads and installs the OpenClaw CLI. Once it finishes, verify the install:

```bash
openclaw --version
```

### Run the Onboarding Wizard

With the CLI installed, run the onboarding wizard to initialize your Gateway:

```bash
openclaw onboard --install-daemon
```

The wizard walks you through the following steps:

1. **Pick a model provider**: choose Anthropic (Claude)
2. **Enter your API key**: paste the Anthropic API key you just created
3. **Set the Gateway port**: defaults to 18789—usually fine to leave as is
4. **Choose channels**: skip this for now; we'll configure Telegram manually below

When the wizard finishes, the OpenClaw Gateway starts automatically.

## Set Up Your First Telegram Bot

Now for the fun part: creating a Telegram bot and connecting it to your OpenClaw Gateway.

### 1. Create a Bot via @BotFather

Open Telegram, search for **@BotFather** (Telegram's official bot management tool), then:

1. Send the `/newbot` command
2. Enter a name for your bot, e.g. `My OpenClaw Assistant`
3. Enter a username for the bot (must end with `bot`), e.g. `my_openclaw_bot`
4. Once created, **BotFather gives you a token** that looks like:
   ```
   7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ```
   **Make sure to save this token!**

### 2. Configure OpenClaw

Next, connect your Telegram bot to OpenClaw. Edit the config file:

```bash
openclaw config edit
```

Find the `channels.telegram` section in the config file and add your bot:

```yaml
channels:
  telegram:
    enabled: true
    accounts:
      - id: my-bot
        token: "7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
        agent: main
```

**What the fields mean**:
- `id`: an internal identifier for this bot—name it whatever you like
- `token`: the bot token you just got from BotFather
- `agent`: which agent to use (the default `main` agent is plenty)

Save the config, then restart the Gateway to apply it:

```bash
openclaw gateway restart
```

### 3. Verify It's Running

Check the Gateway status to make sure everything is healthy:

```bash
openclaw gateway status
```

You should see output like this:

```
✓ Gateway is running
  PID: 12345
  Port: 18789
  Uptime: 5s
```

## Test Your Bot

Everything is in place—time to take your AI assistant for a spin!

### Send Your First Message

1. Open Telegram and search for the bot you just created (by username)
2. Tap **Start** or send `/start`
3. Send a message, e.g. `Hi, tell me about yourself`

If everything went smoothly, your bot should reply—that's Claude responding through your OpenClaw Gateway.

### Watch the Logs in Real Time

Want to see what's happening inside the Gateway? Tail the logs:

```bash
openclaw logs --follow
```

This streams all requests, responses, and errors in real time—great for debugging.

### Use the Web Dashboard

OpenClaw also ships a handy web dashboard. Open your browser and go to:

```
http://localhost:18789
```

From the dashboard, you can:

- Browse all conversation history
- Test conversations manually (no Telegram needed)
- Check system status and configuration
- Manage multiple agents

It's the most convenient debugging tool available—highly recommended.

## FAQ

**Q: My bot isn't replying. What should I check?**

Go through these in order:
1. Run `openclaw gateway status` to confirm the Gateway is running
2. Run `openclaw logs --follow` to check for errors
3. Verify the Telegram token is configured correctly
4. Confirm your Anthropic API key is valid and has credit

**Q: How do I make my bot smarter?**

OpenClaw supports custom agent configuration—you can give an agent memory, tools, custom prompts, and more. I'll cover these advanced features in detail in the next post.

**Q: Can I run multiple bots at once?**

Absolutely! Just add more entries to the `channels.telegram.accounts` array—each bot can point to a different agent.

## What's Next

Congratulations! You now have an AI assistant that's entirely under your control.

If you want to dig deeper into what OpenClaw can do, keep an eye out for the upcoming posts in this series:

- **Multi-agent setup**: dedicated assistants for different contexts (work, fun, learning)
- **Tool integration**: let your AI run commands, search the web, and manage files
- **Memory system**: have your AI remember your preferences and past conversations

You can also head straight to the [official OpenClaw docs](https://openclaw.ai/) for more advanced usage.

---

**Resources**:
- OpenClaw website: https://openclaw.ai/
- GitHub repo: https://github.com/openclaw/openclaw
- Official docs: https://openclaw.ai/docs
- Anthropic API: https://console.anthropic.com/
