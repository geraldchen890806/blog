---
author: 陈广亮
pubDatetime: 2026-03-31T18:00:00+08:00
title: Flash-MoE：在 MacBook 上跑 397B 参数大模型，4.4 token/s
slug: blog109_flash-moe-local-inference
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - 本地推理
  - MoE
  - Apple Silicon
  - 开源
description: 一个开发者用 24 小时写出了 Flash-MoE，在 48GB MacBook Pro 上以 4.4 token/s 运行 397B 参数的 Qwen3.5 模型。只用约 6GB 内存，不需要云端 GPU。拆解它的技术原理：SSD 流式加载、Metal 着色器优化、MoE 稀疏激活。
---

一个 397B 参数的大模型，跑在一台 48GB 内存的 MacBook Pro 上，速度 4.4 token/s（4-bit 生产配置），内存占用约 6GB。

这不是 PPT，是一个叫 Flash-MoE 的开源项目。开发者 Dan Woods 用 Claude Code 在 24 小时内写了大约 8000 行 C/Objective-C 和 Metal GPU 着色器代码，跑了 90 多次实验优化，最终让阿里巴巴的 Qwen3.5-397B-A17B 模型在笔记本上跑出了可用的速度。

没有 Python，没有 PyTorch，没有任何框架——纯 C + Metal，直接和硬件对话。

## 为什么 397B 的模型能塞进 48GB

答案在 MoE（Mixture-of-Experts）架构。

传统的"稠密模型"（Dense Model）比如 LLaMA 70B，推理时每个 token 都要经过所有参数。70B 参数在 FP16 下就是 140GB，你的 48GB MacBook 根本装不下。

MoE 不一样。Qwen3.5-397B 虽然总参数量 397B，但模型原生配置下每个 token 只激活 10 个路由专家 + 1 个共享专家（约 17B 参数，占 4.3%）。模型有 60 个 transformer 层，每层 512 个"专家"（expert）。

Flash-MoE 为了在 48GB 机器上可用，进一步把激活专家数降到了 K=4（原生是 K=10+1）。这意味着每层只从 SSD 加载 4 个专家的权重，牺牲一定质量换取更低的 I/O 需求。

打个比方：一家有 512 个工程师的公司，原本每个任务派 11 个人，Flash-MoE 只派 4 个——活少了但效率更高，因为你不需要同时给所有人发工资（加载到内存），只需要在需要的时候叫人进办公室（从 SSD 读取）。

Flash-MoE 就是利用了这个特性：

1. **常驻内存**的只有路由逻辑和非专家部分（约 5.5GB）
2. **按需加载**：Flash-MoE 配置下每个 token 需要 4 个专家（模型原生是 10+1），每个专家约 6.75MB（4-bit 量化），从 SSD 读取
3. **SSD 速度够快**：M3 Max 的 NVMe SSD 读取速度达 17.5GB/s，加载 4 个专家只要几毫秒

整个 209GB 的模型（4-bit 量化后）存在 SSD 上，但内存里只需要约 6GB（5.5GB 权重 + ~200MB GPU 缓冲区）+ 操作系统的页缓存。剩下 42GB 内存可以干别的事。

## 核心技术拆解

### 1. SSD 流式加载——"信任操作系统"

Flash-MoE 最反直觉的设计决策是：**没有自定义缓存**。

直觉上你会觉得，频繁从 SSD 读专家权重，应该加个 LRU 缓存减少 I/O 吧？Dan 试了，结果更慢。他还试了 LZ4 压缩、Metal LRU、malloc 缓存——全都更慢。

最终方案是"Trust the OS"——直接用操作系统的页缓存。macOS 的页缓存会自动把最近读过的数据留在内存里，实测达到 71% 的命中率。自定义缓存反而会和 GPU 争内存带宽，导致 GPU 延迟飙升。

这个发现来自 90 多次实验（其中 58 次有完整记录）。有些"显而易见的优化"实际上是反优化，因为 Apple Silicon 的统一内存架构下，SSD DMA 和 GPU 计算共享同一个内存控制器，并行反而造成抢占。

### 2. Metal 着色器——手写 GPU 内核

Flash-MoE 的 GPU 计算没有用 MLX 或 PyTorch Metal 后端，而是手写了约 1200 行 Metal 着色器：

- **4-bit 反量化矩阵向量乘法**：把 `(nibble * scale + bias) * x` 重排成 `fma(nibble, scale*x, bias*x)`，让 GPU 的 FMA（fused multiply-add）单元在一条指令里完成反量化 + 乘法。比直觉写法快 12%。
- **融合 SwiGLU 激活**：把激活函数和门控合并成一个内核，减少 GPU 启动开销
- **两阶段 RMS 归一化**：先求平方和（归约），再归一化（应用），充分利用 SIMD
- **融合 MoE combine + 残差 + sigmoid 门控**：多个操作合成一个内核

### 3. 流水线设计——严格串行反而更快

Apple Silicon 的统一内存架构有个违反直觉的特性：GPU 计算和 SSD 读取**不能并行**。

理论上你会想："GPU 在计算当前层时，CPU 预读下一层的专家数据，流水线并行多好。"Dan 试了，发现 SSD DMA 和 GPU 并行时，GPU 延迟飙升 73%。原因是两者走同一个内存控制器，并行操作导致内存带宽争用。

最终采用的是严格串行流水线：

```text
GPU 注意力计算 [1.22ms]
  → GPU 路由 + 共享专家 [0.55ms]
    → CPU topK 路由 [0.003ms]
      → SSD 并行读取 4 个专家 [2.41ms]
        → GPU 专家前向 + 合并 [延迟提交]
```

每层总耗时约 4.28ms。60 层 = 257ms/token，约 3.9 tok/s（4-bit）。加上 FMA 内核优化后达到 4.36 tok/s。

### 4. 2-bit 量化——速度更快但有代价

Dan 还实现了 2-bit 量化（把模型从 209GB 压缩到 120GB）：

- 速度提升到 5.74 tok/s（峰值 7.05）
- 文本生成质量基本可用

但 2-bit 有个致命问题：**JSON 输出会出错**。2-bit 精度下模型会把 `"name"` 生成为 `\name\`，导致 tool calling 不可用。所以 4-bit 仍然是生产配置。

## 90 次实验的经验

Flash-MoE 仓库里附带了完整的实验日志（results.tsv），记录了 90+ 次优化尝试。几个有意思的发现：

| 尝试 | 结果 | 原因 |
|------|------|------|
| LZ4 压缩专家权重 | 速度 -13% | 解压开销比缓存命中省下的 I/O 更大 |
| 预测下一层要用哪些专家并预取 | 速度 -18% | 预测准确率只有 25%，浪费了 SSD 带宽 |
| mmap 专家文件 | 速度 -5x | 冷数据每页触发缺页异常，开销巨大 |
| dispatch_io 并行读取 | 速度 -70% | GCD dispatch_data 管理开销太大 |
| 自旋等待 GPU 完成 | 速度 -23% | CPU 发热和 GPU 争夺散热 |

每个"看起来应该更快"的优化都变成了反优化。核心教训：**在统一内存架构上，机械同感（mechanical sympathy）比聪明的软件优化更重要**。

## 和 llama.cpp 的区别

你可能会问：llama.cpp 不是也能跑大模型吗？

关键区别在于 **llama.cpp 是为稠密模型设计的**。它的策略是尽量把模型放进内存，放不下就用量化压缩。对于 70B 的稠密模型效果很好，但对 397B 的 MoE 模型，即使量化到 4-bit 也有 209GB，远超内存容量。

Flash-MoE 是专门为 MoE 架构设计的：利用"大多数参数不需要同时在内存里"这个特性，把 SSD 当作扩展 VRAM 用。这个思路来自 Apple 2023 年的论文 "LLM in a Flash"，但 Flash-MoE 是第一个在消费级硬件上跑出可用速度的开源实现。

## 对本地推理的意义

Flash-MoE 证明了一件事：**模型大小不等于硬件需求**。

MoE 架构天然适合 SSD 流式推理——每个 token 只需要加载极小比例的参数。随着 MoE 模型越来越主流（DeepSeek、Qwen、Mixtral 都在用），SSD 流式推理引擎会变得越来越重要。

几个数字对比：

| 方案 | 成本 | 速度 | 隐私 |
|------|------|------|------|
| 云端 API（Qwen3.5-Plus，截至 2026.3） | $0.40/百万 token | ~50 tok/s | 数据上传 |
| 云端 GPU（A100 80GB） | ~$2/小时 | ~30 tok/s | 需要自建 |
| Flash-MoE（MacBook Pro） | 一次性购机 | 4-5 tok/s | 完全本地 |

对于隐私敏感场景（法律文档、医疗记录、公司内部数据），本地 4-5 tok/s 的速度虽然不快，但够用。重要的是数据从不离开你的设备。

当然，Flash-MoE 目前还是实验项目，不是生产级工具。但它展示的架构方向——把 SSD 当作 VRAM 的延伸，利用 MoE 的稀疏性减少实际内存需求——大概率会被未来的推理引擎采用。

## 试一下

如果你有 M3 Max + 48GB + 1TB SSD 的 MacBook Pro：

```bash
git clone https://github.com/danveloper/flash-moe
cd flash-moe/metal_infer
make
./chat --2bit  # 快速体验（5.5 tok/s，不支持 tool calling）
./chat          # 4-bit 生产配置（4.4 tok/s，支持 tool calling）
```

需要约 120GB（2-bit）或 209GB（4-bit）的磁盘空间存放模型权重。仓库里有提取和重新打包脚本。

GitHub：[github.com/danveloper/flash-moe](https://github.com/danveloper/flash-moe)

---

**相关阅读**：
- [2026 AI 大模型全景对比：国内外 12 款主流模型实测](https://chenguangliang.com/posts/blog080_ai-models-comparison-2026/) - 包含 Qwen 系列模型的测评
