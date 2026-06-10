---
author: Gerald Chen
pubDatetime: 2026-03-31T18:00:00+08:00
title: "Flash-MoE: Running a 397B-Parameter Model on a MacBook at 4.4 token/s"
slug: blog109_flash-moe-local-inference
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - LLM
  - 开源
description: "A developer built Flash-MoE in 24 hours: it runs the 397B-parameter Qwen3.5 model on a 48GB MacBook Pro at 4.4 token/s, using only about 6GB of RAM and no cloud GPUs. We break down how it works: SSD streaming, Metal shader optimization, and MoE sparse activation."
---

A 397B-parameter model, running on a MacBook Pro with 48GB of RAM, at 4.4 token/s (the 4-bit production config), using about 6GB of memory.

This isn't vaporware. It's an open-source project called Flash-MoE. Developer Dan Woods used Claude Code to write roughly 8,000 lines of C/Objective-C and Metal GPU shader code in 24 hours, ran 90+ optimization experiments, and got Alibaba's Qwen3.5-397B-A17B model running at usable speed on a laptop.

No Python, no PyTorch, no frameworks at all — pure C + Metal, talking directly to the hardware.

## Why a 397B model fits in 48GB

The answer is the MoE (Mixture-of-Experts) architecture.

Traditional "dense" models like LLaMA 70B run every token through all parameters at inference time. 70B parameters in FP16 is 140GB — your 48GB MacBook simply can't hold it.

MoE is different. Qwen3.5-397B has 397B total parameters, but in its native configuration each token only activates 10 routed experts + 1 shared expert (about 17B parameters, or 4.3%). The model has 60 transformer layers with 512 "experts" per layer.

To make it usable on a 48GB machine, Flash-MoE goes further and drops the active expert count to K=4 (the native config is K=10+1). That means only 4 experts' weights are loaded from SSD per layer — trading some quality for much lower I/O demand.

An analogy: a company with 512 engineers normally assigns 11 people to each task; Flash-MoE assigns 4. Less labor per task but higher efficiency, because you don't need to pay everyone simultaneously (load everything into memory) — you only call people into the office when needed (read from SSD).

Flash-MoE exploits exactly this property:

1. **Memory-resident**: only the routing logic and non-expert parts (about 5.5GB)
2. **Load on demand**: in Flash-MoE's config each token needs 4 experts (the model natively uses 10+1), each about 6.75MB (4-bit quantized), read from SSD
3. **The SSD is fast enough**: the M3 Max's NVMe SSD reads at 17.5GB/s, so loading 4 experts takes just a few milliseconds

The entire 209GB model (after 4-bit quantization) lives on SSD, but RAM only needs about 6GB (5.5GB of weights + ~200MB GPU buffers) plus the OS page cache. The remaining 42GB of memory is free for everything else.

## Breaking down the core techniques

### 1. SSD streaming — "Trust the OS"

Flash-MoE's most counterintuitive design decision: **no custom cache**.

Intuitively, if you're constantly reading expert weights from SSD, surely an LRU cache would reduce I/O? Dan tried it — it was slower. He also tried LZ4 compression, a Metal LRU, and malloc caching — all slower.

The final approach is "Trust the OS" — just use the operating system's page cache. macOS's page cache automatically keeps recently read data in memory, and it measured a 71% hit rate in practice. A custom cache actually competes with the GPU for memory bandwidth, sending GPU latency through the roof.

This finding came out of 90+ experiments (58 of them fully logged). Some "obvious optimizations" turn out to be anti-optimizations, because under Apple Silicon's unified memory architecture, SSD DMA and GPU compute share the same memory controller — running them in parallel causes contention.

### 2. Metal shaders — hand-written GPU kernels

Flash-MoE's GPU compute doesn't use MLX or PyTorch's Metal backend. Instead, it's roughly 1,200 lines of hand-written Metal shaders:

- **4-bit dequantizing matrix-vector multiply**: rewrites `(nibble * scale + bias) * x` as `fma(nibble, scale*x, bias*x)`, letting the GPU's FMA (fused multiply-add) unit do dequantization + multiplication in a single instruction. 12% faster than the naive version.
- **Fused SwiGLU activation**: merges the activation function and gating into one kernel, reducing GPU launch overhead
- **Two-phase RMS normalization**: first compute the sum of squares (reduce), then normalize (apply), making full use of SIMD
- **Fused MoE combine + residual + sigmoid gating**: multiple ops collapsed into one kernel

### 3. Pipeline design — strict serialization is actually faster

Apple Silicon's unified memory architecture has a counterintuitive property: GPU compute and SSD reads **cannot run in parallel**.

In theory you'd think: "While the GPU computes the current layer, have the CPU prefetch the next layer's expert data — pipelined parallelism, great." Dan tried it and found that when SSD DMA runs alongside the GPU, GPU latency spikes by 73%. The reason: both go through the same memory controller, and running them in parallel creates memory bandwidth contention.

The final design is a strictly serial pipeline:

```text
GPU attention compute [1.22ms]
  → GPU routing + shared expert [0.55ms]
    → CPU topK routing [0.003ms]
      → SSD parallel read of 4 experts [2.41ms]
        → GPU expert forward + combine [deferred commit]
```

Each layer takes about 4.28ms total. 60 layers = 257ms/token, roughly 3.9 tok/s (4-bit). With the FMA kernel optimization, it reaches 4.36 tok/s.

### 4. 2-bit quantization — faster, but at a cost

Dan also implemented 2-bit quantization (compressing the model from 209GB down to 120GB):

- Speed rises to 5.74 tok/s (peak 7.05)
- Text generation quality is basically usable

But 2-bit has a fatal flaw: **JSON output breaks**. At 2-bit precision the model generates `"name"` as `\name\`, making tool calling unusable. So 4-bit remains the production configuration.

## Lessons from 90 experiments

The Flash-MoE repo ships with the full experiment log (results.tsv), recording 90+ optimization attempts. A few interesting findings:

| Attempt | Result | Reason |
|------|------|------|
| LZ4-compress expert weights | -13% speed | Decompression overhead exceeds the I/O saved by cache hits |
| Predict and prefetch next layer's experts | -18% speed | Prediction accuracy was only 25%, wasting SSD bandwidth |
| mmap the expert files | -5x speed | Cold data triggers a page fault per page — enormous overhead |
| dispatch_io parallel reads | -70% speed | GCD dispatch_data management overhead is too high |
| Spin-wait for GPU completion | -23% speed | CPU heat competes with the GPU for thermal headroom |

Every "this should obviously be faster" optimization turned into an anti-optimization. The core lesson: **on a unified memory architecture, mechanical sympathy matters more than clever software optimizations**.

## How it differs from llama.cpp

You might ask: doesn't llama.cpp run big models too?

The key difference is that **llama.cpp was designed for dense models**. Its strategy is to fit as much of the model into memory as possible, and quantize when it doesn't fit. That works great for a 70B dense model, but for a 397B MoE model, even at 4-bit it's 209GB — far beyond memory capacity.

Flash-MoE is purpose-built for the MoE architecture: it exploits the fact that most parameters don't need to be in memory at the same time, treating the SSD as extended VRAM. The idea comes from Apple's 2023 paper "LLM in a Flash", but Flash-MoE is the first open-source implementation to achieve usable speed on consumer hardware.

## What this means for local inference

Flash-MoE proves one thing: **model size does not equal hardware requirements**.

The MoE architecture is naturally suited to SSD-streaming inference — each token only needs to load a tiny fraction of the parameters. As MoE models become mainstream (DeepSeek, Qwen, and Mixtral all use it), SSD-streaming inference engines will only grow in importance.

A few numbers for comparison:

| Option | Cost | Speed | Privacy |
|------|------|------|------|
| Cloud API (Qwen3.5-Plus, as of 2026.3) | $0.40/million tokens | ~50 tok/s | Data uploaded |
| Cloud GPU (A100 80GB) | ~$2/hour | ~30 tok/s | Self-hosted |
| Flash-MoE (MacBook Pro) | One-time hardware purchase | 4-5 tok/s | Fully local |

For privacy-sensitive scenarios (legal documents, medical records, internal company data), 4-5 tok/s locally isn't fast, but it's enough. What matters is that the data never leaves your device.

Of course, Flash-MoE is still an experimental project, not a production-grade tool. But the architectural direction it demonstrates — treating the SSD as an extension of VRAM, and exploiting MoE sparsity to cut actual memory requirements — will very likely be adopted by future inference engines.

## Try it yourself

If you have a MacBook Pro with an M3 Max, 48GB of RAM, and a 1TB SSD:

```bash
git clone https://github.com/danveloper/flash-moe
cd flash-moe/metal_infer
make
./chat --2bit  # 快速体验（5.5 tok/s，不支持 tool calling）
./chat          # 4-bit 生产配置（4.4 tok/s，支持 tool calling）
```

You'll need about 120GB (2-bit) or 209GB (4-bit) of disk space for the model weights. The repo includes extraction and repacking scripts.

GitHub: [github.com/danveloper/flash-moe](https://github.com/danveloper/flash-moe)

---
