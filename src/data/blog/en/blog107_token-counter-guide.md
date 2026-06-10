---
author: Gerald Chen
pubDatetime: 2026-03-30T14:00:00+08:00
title: "Tool Guide 17: AI Token Counter"
slug: blog107_token-counter-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - AI
description: "A practical guide to AI token counters: how they work, why tokenizers differ across models, and how to accurately estimate token usage for GPT, Claude, and other LLMs to keep API costs under control."
---

When you build on top of LLM APIs, the scariest thing isn't poor model quality — it's an end-of-month bill several times larger than you expected. Where does it go wrong? Most of the time, you simply didn't count tokens correctly.

This post covers what tokens actually are, why different models count them differently, and how to use an online tool to nail down your costs before you ship.

## Why You Need a Token Counter

Anyone who has used the OpenAI or Anthropic APIs knows that billing is per token — not per character, not per word. A single Chinese character can be 1-3 tokens, and an English word may be split into multiple subwords. Eyeballing it is basically hopeless.

A few typical scenarios:

- **Cost estimation**: Before launch, you want to know roughly what each call costs, which means knowing how many tokens the prompt and completion each take
- **Context window management**: GPT-4o has a 128K context, Claude 3.5 has 200K — stuff in too much and you get truncated, too little and you waste capability
- **Prompt optimization**: The same meaning phrased differently can vary wildly in token count; trimming prompt length directly saves money
- **RAG chunking strategy**: For retrieval-augmented generation, document chunk sizes are usually measured in tokens, not characters

## What Tokens Really Are: BPE Tokenization

Most modern LLMs use BPE (Byte Pair Encoding) or a variant of it for tokenization. In short, text gets split into "the smallest units the model recognizes."

Take OpenAI's `cl100k_base` encoding (used by GPT-4 and GPT-4o) as an example:

```text
Input: "Hello, world!"
Tokens: ["Hello", ",", " world", "!"]
Token count: 4

Input: "你好世界"
Tokens: ["你", "好", "世", "界"]
Token count: 4
```

English tokenization is fairly intuitive — common words are usually one token each, while long or rare words get split apart. Chinese is a different story: each character is essentially its own token, and sometimes a single character even encodes to multiple tokens.

This means **the same semantic content typically costs 1.5-2x more tokens in Chinese than in English** (based on measurements with the OpenAI tokenizer). For developers building Chinese-language AI applications, this is a cost factor you can't ignore.

## Token Differences Across Models

Different models use different tokenizers, so the same text can produce very different token counts:

| Model | Tokenizer | Chinese efficiency |
|------|--------|----------|
| GPT-4 / GPT-4o | cl100k_base | ~1.3-1.5 tokens/char |
| Claude 3.5 / Claude 4 | Anthropic proprietary | ~1.2-1.4 tokens/char |
| Llama 3 | SentencePiece | ~1.5-2.0 tokens/char |
| DeepSeek V3 | proprietary BPE | ~1.0-1.2 tokens/char |

(The figures above are estimated ranges for typical Chinese text; actual token counts vary with content. You can verify this yourself with an online tool — paste the same Chinese text and switch between models to compare.)

Note that DeepSeek's Chinese efficiency is noticeably better than the others — that's no accident. Its training data has a higher proportion of Chinese, and its tokenizer was specifically optimized for it.

## Using an Online Token Counter

The [AnyFreeTools Token Counter](https://anyfreetools.com/tools/token-counter) offers a simple, no-frills online interface for counting tokens. Key features:

### Basic Usage

1. Select the target model (GPT-4, Claude, Llama, etc.)
2. Paste or type your content into the text box
3. The token count updates in real time

The tool runs entirely in the browser — your text never leaves your machine — which makes it suitable for prompts containing sensitive information.

### A Real-World Example

Say you're building a customer service bot with a system prompt that looks roughly like this:

```text
You are an e-commerce customer service assistant. Users may ask about order status, return/exchange policies, shipping information, and so on.
Answer in a concise, friendly tone. If you cannot determine the answer, guide the user to contact a human agent.
Below are reference answers for common questions:
... (specific QA pairs omitted)
```

Drop this text into the token counter and suppose it comes to 350 tokens. Add the user input per turn (estimated 100 tokens) and the model's reply (estimated 200 tokens), and a single turn runs about 650 tokens.

At GPT-4o pricing (input $2.50/M tokens, output $10.00/M tokens — check the [OpenAI pricing page](https://openai.com/api/pricing/) for current rates):
- Input cost: 450 tokens x $2.50/1M = $0.001125
- Output cost: 200 tokens x $10.00/1M = $0.002
- Cost per turn: ~$0.003

At 1000 conversations a day, that's roughly $90 a month. Working this out before launch beats discovering it on the bill afterwards — by a wide margin.

## Counting Tokens in Code

If you need token counting inside your code, there are libraries for every major language.

### Python (OpenAI tiktoken)

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o")
text = "用 Token 计数器优化你的 AI 应用成本"
tokens = enc.encode(text)
print(f"Token 数: {len(tokens)}")  # 输出具体数值
print(f"Token 列表: {tokens}")
print(f"解码验证: {[enc.decode([t]) for t in tokens]}")
```

`tiktoken` is OpenAI's official library, implemented in Rust and very fast.

### JavaScript (gpt-tokenizer)

```typescript
import { encode, decode } from "gpt-tokenizer";

const text = "用 Token 计数器优化你的 AI 应用成本";
const tokens = encode(text);
console.log(`Token 数: ${tokens.length}`);
// decode(tokens) 可以还原原始文本
```

For frontend projects, the [`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer) npm package works out of the box — pure JavaScript, no WASM dependency. The default export's encoding depends on the package version (`cl100k_base` or `o200k_base`); to target a specific model, import it like `import { encode } from "gpt-tokenizer/model/gpt-4o"`.

### Counting Tokens for Anthropic Claude

Claude does not have a publicly available tokenizer library. For exact counts, use the `usage` field from the API:

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

Or use an online tool for a rough estimate first — in most cases, Claude's token counts are within 10-15% of OpenAI's.

## Practical Prompt Optimization Tips

A token counter isn't just for staring at numbers — its real value is helping you optimize prompts. A few tricks that have proven effective in practice:

**1. Compress the System Prompt**

A lot of system prompts read like short essays. In reality, models understand concise instructions just as well — often better:

```text
# Before (~80 tokens)
You are a professional technical documentation assistant. You need to help users write clear, accurate,
well-structured technical documents. Make sure to use professional terminology while keeping the language accessible.

# After (~40 tokens)
Role: technical documentation assistant
Requirements: clear and accurate, professional terminology, accessible language
```

Half the tokens, virtually identical results.

**2. Replace Natural Language with Structured Formats**

Structured formats like JSON and YAML express constraints far more token-efficiently than prose:

```text
# Natural language (~60 tokens)
Please answer in Chinese, keep the response under 200 characters,
do not use Markdown formatting, and maintain a friendly yet professional tone.

# YAML format (~35 tokens)
lang: zh
max_length: 200
format: plain_text
tone: friendly_professional
```

**3. Avoid Redundant Information**

In multi-turn conversations, history gets resent over and over. Replace the full history with a summary:

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

## FAQ

**Q: Does the online tool's count match the actual token count from an API call?**

If you pick the right model, the error is usually within 1-2%. The main difference comes from special tokens the API adds (such as message separators), which online tools may not include.

**Q: How are tokens counted for images?**

GPT-4o counts image tokens by resolution: low-resolution images are a fixed 85 tokens, while high-resolution images are counted in 512x512 tiles at 170 tokens each. Online token counters typically handle text only — images need to be calculated separately.

**Q: How are tokens counted for Function Calling / Tool Use?**

Tool definitions (function schemas) get converted to text and inserted into the prompt, consuming tokens like everything else. A complex tool definition can take 200-500 tokens. If you define many tools, this overhead is far from negligible.

---

**Related reading**:
- [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) - JSON comparison and diff analysis

**Other posts in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/)
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/)
- [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/)
- [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/)
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/)
- [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/)
- [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/)
- [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/)
- [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/)
- [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/)
- [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/)
