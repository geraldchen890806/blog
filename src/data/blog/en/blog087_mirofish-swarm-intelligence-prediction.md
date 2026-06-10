---
author: Gerald Chen
pubDatetime: 2026-03-15T18:00:00+08:00
title: "MiroFish: A Swarm Intelligence Prediction Engine a College Senior Built in 10 Days with Vibe Coding"
slug: blog087_mirofish-swarm-intelligence-prediction
featured: true
draft: false
tags:
  - AI
  - 开源
description: "A deep dive into the architecture and design of MiroFish, a swarm intelligence prediction engine. Built by a college senior in 10 days with Vibe Coding, it topped GitHub Trending and landed a 30M RMB investment from Shanda. Here's what it got right, technically."
---

In early March, an open-source project called MiroFish hit the #1 spot on GitHub Trending worldwide.

That alone isn't unusual, but the story behind it has a few details worth noting: the developer is Guo Hangjiang (online handle "Baifu"), a senior at the University of Science and Technology of China; the core code was finished in 10 days; and it was built using so-called "Vibe Coding"—leaning heavily on AI coding tools like Claude Code. Even more striking: within 24 hours of submitting a demo video to Chen Tianqiao, he had secured a 30 million RMB strategic investment from Shanda Group.

This isn't his first rodeo, either. In the second half of 2025, his other project BettaFish (an AI public-opinion analysis tool) also topped GitHub Trending, picking up more than 20,000 stars in a week.

Story aside, MiroFish does something genuinely interesting on the technical side: it takes multi-agent simulation out of academic papers and packages it into an engineering system you can actually run. This post breaks down its architecture and engineering decisions from a technical perspective.

## What MiroFish Actually Is

In one sentence: MiroFish is a swarm intelligence prediction engine that forecasts how things will unfold by constructing a "parallel digital world."

Concretely, you feed it a piece of seed material (a news article, a draft policy, even the first half of a novel), and MiroFish will:

1. **Extract the real-world seed**: use an LLM to analyze the text and pull out key entities (people, organizations, events) and the relationships between them
2. **Build a digital world**: generate an independent AI agent for each entity, complete with a persona, memory, and behavioral logic
3. **Run the simulation**: let these agents freely interact, debate, and spread information on simulated social platforms
4. **Generate a prediction report**: a dedicated ReportAgent analyzes the simulation results and produces a structured forecast

Its positioning isn't "95% prediction accuracy"—it's a "decision sandbox." It gives you a low-cost environment for trial and error, letting the future play out in a digital sandbox first.

## Architecture Breakdown

MiroFish's architecture has three layers, and the overall design is clean.

### World Layer: From Text to Knowledge Graph

The first step is converting the seed text into a structured knowledge graph. This uses temporal GraphRAG, built on top of Graphiti, the graph engine behind Zep Cloud.

The pipeline looks roughly like this:

```text
Seed text → LLM entity/relation extraction → Generate ontology (entity types + relation types) → Build knowledge graph
```

For example, according to the project docs, given an academic report on US-Iran relations, the system automatically extracted 118 entities (Iranian nuclear scientists, former US Secretaries of State, CNN as a media outlet, etc.) and established the relationships between them (SUPPORTS, CRITICIZES, ALLIED_WITH, and so on).

The key design here is the **dynamic decay mechanism**—the knowledge graph isn't static. As the simulation progresses, old relationships decay and new ones form. This is far more sensible than plain RAG retrieval, because real-world relationships genuinely do change over time.

### Agent Layer: Agents with Personality

Each entity becomes an independent agent, and every agent has:

- **A full backstory**: generated from the seed material
- **Behavioral patterns**: decision-making tendencies, communication style
- **Social relationships**: a network of ties to other agents
- **Personality traits**: shaping its decision preferences and how it expresses itself

These agents aren't just prompt templates—they have long-term memory. Through Zep Cloud's temporal memory system, agents remember their interaction history and adjust their subsequent behavior accordingly. This is the foundation for "swarm emergence"—micro-level individual behaviors accumulate into macro-level collective phenomena that couldn't have been designed in advance.

### Interaction Layer: Dual-Platform Parallel Simulation

During simulation, agents interact on simulated social platforms (think Twitter and Reddit). The dual-platform design exists to model how information spreads differently across different kinds of social networks:

- **Short-message platform** (Twitter-like): fast propagation, fragmented, emotion-driven
- **Long-discussion platform** (Reddit-like): in-depth discussion, clashing viewpoints, community polarization

Users can take a "god's-eye view" and dynamically inject variables mid-simulation (say, dropping in a piece of explosive breaking news) to watch how the entire digital world reacts.

## Engineering Decisions: Pragmatic Trade-offs

MiroFish made several engineering decisions worth paying attention to.

### Reusing OASIS Instead of Building a Simulation Engine

The simulation engine is the most complex part of the entire system. MiroFish didn't reinvent the wheel—it built a thin wrapper around OASIS, an open-source project from the CAMEL-AI team. OASIS is a multi-agent simulation framework validated by academic papers, supporting large-scale agent interaction.

This was a smart call: focus your effort on the business-value layer (the prediction engine's input/output experience) and delegate the underlying simulation capability to a battle-tested open-source solution.

### Zep Cloud Instead of a Self-Hosted Graph Service

The memory system uses Zep Cloud, a SaaS offering, rather than a self-hosted graph database. The upside is development speed, and the free tier is enough for MVP validation. The cost is a dependency on an external service that may need replacing at scale.

For a project finished in 10 days, this trade-off is entirely reasonable.

### Frontend Polling Instead of WebSocket

Simulation progress updates use frontend polling instead of WebSocket. It looks "low-tech," but for long-running tasks like simulations, polling is actually more robust—no persistent connections to maintain, simple to implement, easy to debug when things go wrong.

### JSONL Files Instead of a Database for Logs

Agent interaction logs are written to JSONL files rather than a relational database. This choice prioritizes write performance (no locking needed when multiple agents write concurrently) at the expense of complex query capability. In a simulation context, logs are mainly used for post-hoc analysis, so the trade-off holds up.

## Tech Stack at a Glance

| Component | Technology | Notes |
|------|---------|------|
| Backend | FastAPI (Python) | Async framework, well-suited for I/O-heavy workloads |
| Frontend | Vue 3 | Visual interactive interface |
| Simulation engine | OASIS (CAMEL-AI) | Academically validated multi-agent simulation framework |
| Memory system | Zep Cloud + Graphiti | Temporal GraphRAG |
| LLM | Alibaba Bailian qwen-plus | OpenAI SDK-compatible API |
| Deployment | Docker Compose | One-command deployment of frontend and backend |

The runtime requires Node.js 18+ and Python 3.11-3.12; the frontend runs on port 3000 and the backend API on port 5001.

## Use Cases

MiroFish currently covers 6 categories of prediction scenarios:

1. **Public opinion forecasting**: predicting sentiment trends and how attention rises and falls. This is its most mature scenario—its predecessor BettaFish did exactly this
2. **Financial trend prediction**: multi-agent simulation analysis for stocks and crypto
3. **Novel ending prediction**: forecasting where a story goes based on existing content. The official demo used the first 80 chapters of Dream of the Red Chamber to predict the ending of the last 40
4. **TV/film plot prediction**: predicting how a series develops and where characters end up
5. **Corporate decision rehearsal**: simulating the effects of strategic decisions
6. **Product launch simulation**: predicting market reaction and user feedback

Public opinion forecasting is the best fit; the recommendation there is to enable the Zep graph, run both platforms in parallel, and simulate over a 72-hour window. The finance and fiction scenarios fit reasonably well too, but require parameter tuning for the specific use case.

## The Vibe Coding Phenomenon

The other phenomenon worth noting behind MiroFish is Vibe Coding.

The term was coined by Andrej Karpathy (OpenAI founding member, former Tesla AI director). The core idea: developers no longer write code line by line; instead, they describe requirements in natural language, let AI generate the code, and take on the role of reviewer and direction-setter.

Guo Hangjiang shipped two consecutive projects (BettaFish and MiroFish) this way, each in 10 days. This tells us:

- **AI-assisted coding has crossed an efficiency threshold**: one person plus an AI toolchain can build a reasonably well-engineered system in a very short time
- **The core competency is system design, not writing code**: MiroFish's line count isn't the point—the point is the three-layer architecture, the technology trade-offs, and the business positioning
- **Open source + AI toolchain = super individual**: a college senior topping GitHub doesn't come from raw programming superiority, but from skillfully composing existing open-source components

That said, the limitations are real: Vibe Coding currently fits rapid validation and the MVP stage, but scenarios requiring deep optimization, high concurrency, or security audits still demand traditional engineering skill.

## A Sober Take

MiroFish is genuinely interesting, but a few things deserve a level-headed look:

**Prediction accuracy is hard to verify.** The results of multi-agent simulation depend heavily on the quality of the agent personas and the reasoning ability of the LLM. The same seed material run with a different LLM or a different agent count can produce wildly different predictions. The project itself acknowledges its positioning as a "decision sandbox," not "accurate prediction."

**It isn't cheap.** Each simulation requires a large volume of LLM calls (agent count x interaction rounds x inference per round). Even with the relatively inexpensive qwen-plus, the cost of a 40+ round simulation is non-trivial.

**The core simulation engine isn't homegrown.** OASIS is the CAMEL-AI team's academic work; MiroFish's core value lies more at the product layer (the input/output experience, scenario adaptation) than in the underlying technology.

None of this negates MiroFish's value—it just means developers who want to use or learn from the project should set their expectations accordingly.

## Takeaways

MiroFish got several things right: a clean three-layer architecture, pragmatic technology trade-offs, and a complete end-to-end loop. It demonstrates that by 2026, the "super individual + AI toolchain" development paradigm has matured enough to produce genuinely influential projects.

For developers in the AI agent space, the most valuable lesson from MiroFish isn't any specific technology—it's the engineering decision methodology: focus on the business-value layer, leverage open-source components well, and make the right technical trade-offs during the rapid-validation phase.

---

**Related links**:

- [MiroFish GitHub](https://github.com/666ghj/MiroFish) - Project source code
- [OASIS simulation engine](https://github.com/camel-ai/oasis) - The multi-agent simulation framework MiroFish builds on
- [Live Demo](https://666ghj.github.io/mirofish-demo/) - Try the public opinion forecasting
