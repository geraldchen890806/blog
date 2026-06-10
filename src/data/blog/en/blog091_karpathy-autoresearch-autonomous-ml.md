---
author: Gerald Chen
pubDatetime: 2026-03-19T10:00:00+08:00
title: "Karpathy's AutoResearch: Letting an AI Agent Run 700 ML Experiments on Its Own"
slug: blog091_karpathy-autoresearch-autonomous-ml
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - AI Agent
  - 自动化
  - 开源
description: "A deep dive into Karpathy's open-source AutoResearch project: how a 630-line Python script lets an AI agent run ML experiments autonomously on a single GPU, completing 700 experiments in two days and finding 20 effective optimizations. From architecture to practical applications, here's why every developer should pay attention to the \"Karpathy Loop\" pattern."
---

In early March, Andrej Karpathy posted on X that he had an AI coding agent running ML experiments autonomously on a single GPU. Overnight, the agent completed dozens of experiments, and the model's validation metric showed measurable improvement.

The post blew up. Within a week, the corresponding GitHub repo, autoresearch, racked up 30,000+ stars, making it one of the fastest-growing repositories in GitHub history. Shopify CEO Tobias Lütke gave it a spin: 37 experiments in one night, a 19% performance gain. Fortune and The New Stack covered it, and people started calling the pattern "The Karpathy Loop."

Hype aside, what makes this project genuinely interesting is its minimalist design. The entire system is 3 files, with 630 lines of Python at its core. It demonstrates a new way for agents to work — not "AI writes some code, a human reviews it," but the AI autonomously running the full hypothesize-experiment-evaluate-iterate loop.

## Three Files, One Loop

The file structure of autoresearch is so simple it barely needs explanation:

- `prepare.py` — data preparation, tokenizer training, evaluation functions. **Immutable** — the fixed infrastructure of the experiment.
- `train.py` — model definition, optimizer, training loop. **The only file the agent may modify.**
- `program.md` — natural-language instructions for the agent. **The only thing the human needs to write.**

The workflow is just as direct:

1. The agent reads `program.md` to learn the rules of the experiment
2. It runs `train.py` once to establish a baseline
3. It modifies `train.py` (architecture, hyperparameters, optimizer — anything goes)
4. It trains for 5 minutes and records the validation metric `val_bpb`
5. If the result beats the baseline, keep the change; if it's worse, git reset and roll back
6. Repeat steps 3-5

That's it. No fancy scheduler, no distributed framework, no dashboard. One agent, one GPU, one metric, one loop.

## program.md: "Research Org Code" Written in English

The most thought-provoking part of this project isn't the Python — it's `program.md`. Karpathy calls it "research org code written in English."

Here's its core structure:

**What's allowed**: modify `train.py`, including the model architecture, optimizer, hyperparameters, batch size, model size — everything is fair game.

**What's forbidden**: no touching `prepare.py`, no installing new dependencies, no modifying the evaluation function.

**Optimization target**: `val_bpb` (validation bits per byte) — lower is better.

**Simplicity principle**: given equal results, prefer the simpler approach. A 0.001 improvement that comes with 20 lines of hacky code? Not worth it. Deleting code while maintaining or improving results? Worth it.

The cleverness of these instructions is that they define a tightly constrained experimental environment:

- **A single editable file**: scope stays controlled, diffs stay reviewable
- **A fixed time budget**: every experiment runs exactly 5 minutes, making runs comparable
- **A single evaluation metric**: no fuzzy multi-objective trade-offs
- **An automatic rollback mechanism**: failed experiments can't contaminate later ones

These constraints aren't restrictions — they're the preconditions that let the autonomous loop run stably. Without clear boundaries, the agent drifts off into a meaningless exploration space.

## Three-Layer Programming: A New Paradigm

autoresearch demonstrates an interesting three-layer programming model:

**Layer 1**: `prepare.py` defines the experimental environment and evaluation criteria — traditional code, written by humans, immutable.

**Layer 2**: `train.py` contains the model and training logic — Python code that the agent keeps modifying as it experiments.

**Layer 3**: `program.md` describes the agent's rules of conduct — natural language, written by humans, guiding how the agent does research.

The information flow goes: a human writes program.md in English → the LLM turns those instructions into modifications to train.py → the Python code trains a neural network.

Humans no longer edit the model code directly. They edit the *rules for editing the model code*. It's a metaprogramming idea — what you're programming isn't the model itself, but the process of researching that model.

## Real Results: The Numbers

Karpathy shared data from multiple runs on X. One run of roughly 12 hours:

| Metric | Value |
|:-----|:-----|
| Run duration | ~12 hours |
| Experiments completed | 110 |
| val_bpb start | 0.862415 |
| val_bpb end | 0.858039 |

He then let the system run for two days, completing roughly 700 experiments in total and distilling 20 effective optimizations out of them. Applying those 20 optimizations to a larger language model sped up training by 11% (per Fortune).

Shopify CEO Lütke ran it overnight on internal data: 37 experiments, a 19% performance gain.

These numbers aren't huge, but the key point is that they were produced with **zero human intervention**. You set the rules, go to sleep, and check the results in the morning.

## How It Differs from AutoML

At first glance autoresearch looks like AutoML — both automatically search for better model configurations. But how they search is fundamentally different.

**AutoML**: searches a predefined space (hyperparameter ranges, a list of candidate architectures) using algorithms (Bayesian optimization, evolutionary strategies, etc.) to find the best combination.

**autoresearch**: no predefined search space. The LLM reads the code directly, understands the current implementation, and proposes modifications. It can refactor the architecture, swap optimizers, introduce new tricks — the search space is "all legal Python code modifications."

An analogy: AutoML searches for the best move on a fixed board; autoresearch lets the agent redesign the board.

There's a cost, of course. AutoML's search is systematic and guarantees a degree of coverage. autoresearch relies on the LLM's "intuition" — it may keep trying similar directions and miss promising paths. But at current LLM capability levels, this code-understanding-driven exploration often finds optimizations that sit outside any AutoML search space definition.

## Where Else This Pattern Applies

Karpathy made a key remark on X: any metric you care about that can be evaluated efficiently can be autoresearched by an agent swarm.

The subtext: autoresearch isn't just an ML experimentation tool — it's a general pattern. If your problem meets three conditions, you can apply it:

1. **A quantifiable evaluation metric** — val_bpb, response time, test pass rate, compression ratio, anything works
2. **A code/config file the agent can modify** — doesn't need to be big; smaller is better
3. **A manageable per-experiment time cost** — 5 minutes, 10 minutes; not the kind that runs all day

People have already tried it in other domains:

- **Autosearcher**: a distributed version where multiple agents run experiments in parallel and share findings. In early runs, the system independently rediscovered techniques like Kaiming initialization and RMSNorm
- **AutoVoiceEvals**: applies the same loop to optimizing a voice agent's prompt. According to the developer, after multiple iterations the scheduling success rate improved dramatically — and the final prompt ended up shorter

Extrapolating further:

- **Frontend performance optimization**: the agent tweaks webpack/vite config, runs lighthouse scoring, keeps the changes that improve scores
- **API response time optimization**: the agent modifies database queries or caching strategies, runs benchmarks, iterates
- **Compiler optimization passes**: the agent adjusts optimization pass parameters, runs compile + perf tests

The core idea is always the same: take the loop where a human engineer manually tunes parameters, runs tests, reads results, and decides the next step — and hand it to an agent to run autonomously.

## Limitations and Risks

autoresearch is inspiring, but it has clear boundaries.

**It only works for small-scale experiments.** Karpathy's train.py is 630 lines, and the model trains in 5 minutes on a single GPU. Real frontier model training code can run to hundreds of thousands of lines, with training runs that take weeks. Karpathy himself admits it's "much more complicated at scale."

**The LLM's exploration is biased.** The agent's modification directions are bounded by the LLM's training data and "worldview." If an optimization trick isn't in the LLM's knowledge, it almost certainly won't try it. And the LLM may circle the same direction repeatedly without realizing it.

**Safety deserves attention.** You're letting an agent modify and execute code without restriction — that's inherently risky. autoresearch mitigates this by restricting which files can be modified and forbidding new dependencies, but if you apply the pattern elsewhere (say, modifying server configuration), you need a much stricter sandbox.

**It doesn't fit metrics that require human judgment.** val_bpb is purely objective; a machine can compute it automatically. But if your goal is "text quality" or "user experience," humans have to be in the evaluation loop, and the advantage of the autonomous cycle evaporates.

## What "The Karpathy Loop" Teaches Developers

Even if you don't do ML research, the design thinking behind autoresearch is worth borrowing. At its core it answers one question: **how do you turn an iterative process that requires continuous human involvement into a loop an agent can run autonomously?**

The answer is three constraints:

1. **A single mutable variable**: give the agent exactly one thing it can change (one file, one config) and lock down everything else
2. **An objective evaluation function**: define a metric that can be computed automatically, with no human judgment required
3. **A fixed time window**: keep each experiment round the same length, ensuring comparability and preventing the agent from running away

Add a rollback mechanism — break it, roll it back — and the whole system can run autonomously and safely.

Looking ahead, Karpathy says the next step is going from a single agent iterating linearly to multiple agents exploring in parallel. The goal isn't to simulate one grad student, but to simulate a community of grad students.

That sounds a bit sci-fi, but autoresearch has already proven the first step is feasible. And that first step takes nothing more than 630 lines of Python and one well-written Markdown file.

---
