---
author: 陈广亮
pubDatetime: 2026-03-30T14:00:00+08:00
title: 工具指南17-AI Token计数器
slug: blog107_token-counter-guide
featured: false
draft: false
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - AI
description: 详解 AI Token 计数器的使用方法和技术原理，帮助开发者精确估算 GPT、Claude 等大模型的 Token 消耗，优化 API 调用成本。
---

用大模型 API 开发应用，最怕的不是模型效果不好，而是月底账单比预期多了几倍。问题出在哪？大多数时候就是 Token 没算对。

这篇文章聊聊 Token 到底是什么，为什么不同模型的计数方式不一样，以及怎么用在线工具在开发前就把成本算清楚。

## 为什么需要 Token 计数器

用过 OpenAI、Anthropic 这类 API 的开发者都知道，计费单位是 Token，不是字符也不是单词。一个中文字可能是 1-3 个 Token，一段英文单词可能被拆成多个子词。靠肉眼估算基本不靠谱。

几个典型场景：

- **成本预估**：上线前想算算每次调用大概花多少钱，需要知道 prompt + completion 各占多少 Token
- **上下文窗口管理**：GPT-4o 有 128K 上下文，Claude 3.5 有 200K，塞太多会被截断，塞太少浪费能力
- **Prompt 优化**：同样的意思，不同的写法 Token 数量可以差很多，优化 prompt 长度直接省钱
- **RAG 分块策略**：做检索增强生成时，文档分块大小通常按 Token 而不是字符来切

## Token 的本质：BPE 分词

大多数现代 LLM 使用 BPE（Byte Pair Encoding）或其变体来做分词。简单说就是把文本拆成"模型认识的最小单位"。

以 OpenAI 的 `cl100k_base` 编码（GPT-4、GPT-4o 使用）为例：

```text
输入: "Hello, world!"
Token: ["Hello", ",", " world", "!"]
Token 数: 4

输入: "你好世界"
Token: ["你", "好", "世", "界"]
Token 数: 4
```

英文的分词比较直觉，常见单词通常是一个 Token，长单词或罕见词会被拆开。中文就不一样了——每个汉字基本上都是独立的 Token，有时一个字甚至会被编码成多个 Token。

这意味着**同样的语义内容，中文的 Token 消耗通常比英文高 1.5-2 倍**（基于 OpenAI tokenizer 的实测数据）。这对做中文 AI 应用的开发者来说是个必须考虑的成本因素。

## 不同模型的 Token 差异

不同模型的分词器不一样，同一段文本在不同模型下的 Token 数可能差很远：

| 模型 | 分词器 | 中文效率 |
|------|--------|----------|
| GPT-4 / GPT-4o | cl100k_base | 约 1.3-1.5 Token/字 |
| Claude 3.5 / Claude 4 | Anthropic 自有 | 约 1.2-1.4 Token/字 |
| Llama 3 | SentencePiece | 约 1.5-2.0 Token/字 |
| DeepSeek V3 | 自有 BPE | 约 1.0-1.2 Token/字 |

（以上数据基于常见中文文本的估算范围，实际 Token 数因文本内容而异。可以用在线工具输入同一段中文，切换不同模型对比验证）

注意 DeepSeek 的中文效率明显好于其他模型——这不是偶然，而是训练数据中中文占比更高，分词器对中文做了专门优化。

## 在线 Token 计数工具使用

[AnyFreeTools Token 计数器](https://anyfreetools.com/tools/token-counter) 提供了一个简单直接的在线 Token 计数界面。主要功能：

### 基本用法

1. 选择目标模型（GPT-4、Claude、Llama 等）
2. 在文本框粘贴或输入内容
3. 实时显示 Token 数量

工具在浏览器端完成计算，文本不会上传到服务器，适合处理包含敏感信息的 prompt。

### 实际应用示例

假设你在做一个客服机器人，system prompt 大概长这样：

```text
你是一个电商客服助手。用户可能会问关于订单状态、退换货政策、物流信息等问题。
请用简洁友好的语气回答，如果无法确定答案请引导用户联系人工客服。
以下是常见问题的参考答案：
...（此处省略具体QA对）
```

把这段文本丢进 Token 计数器，假设得到 350 Token。加上每轮对话的用户输入（估算 100 Token）和模型回复（估算 200 Token），单轮对话大概 650 Token。

按 GPT-4o 的价格（输入 $2.50/M Token，输出 $10.00/M Token，具体以 [OpenAI 官方定价页](https://openai.com/api/pricing/) 为准）：
- 输入成本：450 Token x $2.50/1M = $0.001125
- 输出成本：200 Token x $10.00/1M = $0.002
- 单轮对话成本：约 $0.003

日均 1000 轮对话的话，月成本约 $90。这个数字在上线前算清楚，比上线后看账单强太多。

## 编程中的 Token 计数

如果需要在代码中做 Token 计数，不同语言有对应的库。

### Python（OpenAI tiktoken）

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o")
text = "用 Token 计数器优化你的 AI 应用成本"
tokens = enc.encode(text)
print(f"Token 数: {len(tokens)}")  # 输出具体数值
print(f"Token 列表: {tokens}")
print(f"解码验证: {[enc.decode([t]) for t in tokens]}")
```

`tiktoken` 是 OpenAI 官方库，用 Rust 实现的，速度很快。

### JavaScript（gpt-tokenizer）

```typescript
import { encode, decode } from "gpt-tokenizer";

const text = "用 Token 计数器优化你的 AI 应用成本";
const tokens = encode(text);
console.log(`Token 数: ${tokens.length}`);
// decode(tokens) 可以还原原始文本
```

前端项目可以直接用 [`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer) 这个 npm 包，纯 JavaScript 实现，不依赖 WASM。默认导出的编码取决于包版本（`cl100k_base` 或 `o200k_base`），如需指定模型可以用 `import { encode } from "gpt-tokenizer/model/gpt-4o"` 的方式导入。

### Anthropic Claude 的计数

Claude 没有公开的分词器库。如果需要精确计数，可以用 API 的 `usage` 字段：

```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-20250514",  # 替换为当前可用的模型名
    max_tokens=1024,
    messages=[{"role": "user", "content": "你好"}]
)
print(f"输入 Token: {response.usage.input_tokens}")
print(f"输出 Token: {response.usage.output_tokens}")
```

或者用在线工具先做一个粗略估算——大多数情况下，Claude 的 Token 数和 OpenAI 的差距在 10-15% 以内。

## Prompt 优化的几个实用技巧

Token 计数器不只是看数字，更重要的是帮你优化 prompt。几个实测有效的技巧：

**1. 压缩 System Prompt**

很多人的 system prompt 写得像小作文。实际上模型理解能力很强，简洁的指令反而效果更好：

```text
# 优化前（约 80 Token）
你是一个专业的技术文档撰写助手。你需要帮助用户编写清晰、准确、
结构良好的技术文档。请确保使用专业术语，同时保持语言通俗易懂。

# 优化后（约 40 Token）
角色：技术文档撰写助手
要求：清晰准确，术语专业，语言通俗
```

Token 数减半，效果几乎一样。

**2. 用结构化格式替代自然语言**

JSON、YAML 这类结构化格式在表达约束条件时比自然语言更省 Token：

```text
# 自然语言（约 60 Token）
请用中文回答，回答长度控制在200字以内，
不要使用 Markdown 格式，语气要友好但专业。

# YAML 格式（约 35 Token）
lang: zh
max_length: 200
format: plain_text
tone: friendly_professional
```

**3. 避免重复信息**

多轮对话中，历史消息会反复发送。可以用摘要替代完整历史：

```python
# 每 5 轮对话，把历史压缩成摘要
if len(messages) > 10:
    summary = summarize(messages[:-4])  # 保留最近 2 轮
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "assistant", "content": f"对话摘要: {summary}"},
        *messages[-4:]  # 最近 2 轮完整保留
    ]
```

## 常见问题

**Q: 在线工具的计数和实际 API 调用的 Token 数一样吗？**

选对模型的话，误差通常在 1-2% 以内。主要差异来自 API 会额外添加的特殊 Token（如消息分隔符），这部分在线工具可能不计入。

**Q: 图片的 Token 怎么算？**

GPT-4o 的图片 Token 按分辨率计算：低分辨率固定 85 Token，高分辨率按 512x512 的块数计算，每块 170 Token。在线 Token 计数器通常只处理文本，图片需要单独计算。

**Q: Function Calling / Tool Use 的 Token 怎么算？**

工具定义（function schema）会被转换成文本插入到 prompt 中，同样消耗 Token。一个复杂的工具定义可能占 200-500 Token。如果定义了很多工具，这部分消耗不可忽视。

---

**相关阅读**：
- [工具指南16-在线JSON对比工具](https://chenguangliang.com/posts/blog106_json-diff-guide/) - JSON 数据对比和差异分析

**本系列其他文章**：
- [工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/)
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/)
- [工具指南3-在线正则表达式测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/)
- [工具指南4-二维码生成工具](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/)
- [工具指南5-Base64编解码工具](https://chenguangliang.com/posts/blog090_base64-tool-guide/)
- [工具指南6-JWT在线解码工具](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/)
- [工具指南7-Unix时间戳转换工具](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/)
- [工具指南8-在线密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/)
- [工具指南9-URL编解码工具](https://chenguangliang.com/posts/blog096_url-encoder-guide/)
- [工具指南10-在线哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/)
- [工具指南11-JSON转TypeScript类型生成器](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/)
- [工具指南12-Cron表达式在线解析工具](https://chenguangliang.com/posts/blog100_cron-parser-guide/)
- [工具指南13-在线颜色转换工具](https://chenguangliang.com/posts/blog102_color-converter-guide/)
- [工具指南14-在线SQL格式化工具](https://chenguangliang.com/posts/blog103_sql-formatter-guide/)
- [工具指南15-在线Markdown实时预览工具](https://chenguangliang.com/posts/blog104_markdown-preview-guide/)
- [工具指南16-在线JSON对比工具](https://chenguangliang.com/posts/blog106_json-diff-guide/)
