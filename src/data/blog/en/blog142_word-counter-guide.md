---
author: Gerald Chen
pubDatetime: 2026-04-23T14:00:00+08:00
title: "Tool Guide 43: Online Word Counter"
slug: blog142_word-counter-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 文本处理
  - 前端
description: "How to use an online word counter, with a deep dive into the tricky parts of counting mixed Chinese-English text: the logic behind character count, word count, Chinese characters, lines, and paragraphs, plus real-world use cases."
---

You finish an article and your editor says "keep it under 3,000 characters." Easy enough to check in Word—but what if you're writing Markdown, code comments, or drafting directly in the browser?

Word counting looks trivial, but mixed Chinese-English text is full of gotchas: does a Chinese character count as one word or one character? How do you split English words? Does a blank line start a new paragraph? Different tools routinely disagree on the numbers.

The [online word counter](https://anyfreetools.com/tools/word-counter) settles all of this at once: paste your text and it shows character count, word count, Chinese character count, line count, and paragraph count in real time—five metrics side by side, no software to install, and nothing gets uploaded to a server.

## What the Tool Does

Open the page and the core interaction is dead simple: one text input box plus five stat cards.

The five metrics:

- **Characters**: total number of characters, including spaces, punctuation, and newlines
- **Words**: number of English words split on whitespace
- **Chinese characters**: number of Han characters in the Unicode range `\u4e00-\u9fff`
- **Lines**: number of lines split on newline characters
- **Paragraphs**: number of paragraphs separated by blank lines (two consecutive newlines)

Counting happens live—every keystroke updates the results. There's no "Count" button to click.

## The Technical Details of Counting Mixed Chinese-English Text

The hard part of word counting isn't the counting—it's defining what a "word" is.

### Characters vs. Words

Take the text "Hello 你好":

- **Characters**: 8 (H-e-l-l-o-space-你-好)
- **Words**: 2 (splitting on whitespace yields two tokens, "Hello" and "你好")
- **Chinese characters**: 2 (你, 好)

Note how the word count works: the tool splits on whitespace, so a Chinese phrase separated from English by a space also counts as one token. That's not a bug—it's the simplest possible tokenization strategy. Accurate Chinese word segmentation requires a dictionary; an online tool keeps it lightweight.

If someone asks "how many words is this," the answer depends on context. For Chinese writing, "word count" usually means Chinese characters plus English words, not total characters. But every platform calculates it differently:

| Platform | Counting method |
|------|----------|
| Microsoft Word | Each Chinese character = 1 word, English counted by word |
| Google Docs | Same as Word |
| Juejin | Raw character count (including punctuation and spaces) |
| WeChat Official Accounts | Chinese + English letters + digits, excluding punctuation and spaces |

So the same article can show word counts that differ by 20%-30% across platforms. This tool lists all five metrics—you pick whichever number applies.

### Splitting English Words

The tool uses `text.trim().split(/\s+/)` to split words—breaking on whitespace (spaces, tabs, newlines). That's good enough for regular English text, but there are a few edge cases:

- `don't` counts as 1 word (the apostrophe isn't whitespace)
- `self-driving` counts as 1 word (same for hyphens)
- `hello   world` (multiple spaces) counts as 2 words (`\s+` collapses consecutive whitespace)

This matches Word's counting logic pretty closely.

### Detecting Chinese Characters

The tool matches Chinese characters with the regex `/[\u4e00-\u9fff]/g`, which covers the CJK Unified Ideographs basic block (20,902 characters). Everyday Chinese characters all fall within this range.

What's not in this range:

- Rare characters in CJK Extensions A/B/C/D (`\u3400-\u4dbf`, `\u20000-\u2a6df`, etc.)
- Japanese kana (`\u3040-\u309f`, `\u30a0-\u30ff`)
- Chinese punctuation (`\u3000-\u303f`, `\uff00-\uffef`)

For 99% of Chinese writing, the basic block is plenty. If you're working with classical texts or rare characters, you may need to widen the match.

### Counting Paragraphs

The tool defines a "paragraph" as a block of text separated by blank lines:

```javascript
text.split(/\n\s*\n/).filter(p => p.trim()).length
```

The regex `\n\s*\n` matches any whitespace that may sit between two newlines. `filter(p => p.trim())` drops blocks that are pure whitespace.

Which means:

```text
First paragraph

Second paragraph
```

counts as 2 paragraphs. But with no blank line in between, just a single newline:

```text
First line
Second line
```

counts as 1 paragraph, 2 lines.

This definition matches Markdown's paragraph rules—in Markdown, a single newline doesn't start a new paragraph; you need a blank line.

## Real-World Use Cases

### Content Writing

Publishing platforms usually have length requirements:

- WeChat Official Accounts: 1500-3000 characters recommended (5-10 minutes of reading time)
- Juejin technical articles: 800+ characters recommended to qualify for recommendation
- Zhihu answers: longer answers generally rank higher (answers over 2000 characters get more upvotes, per Zhihu's official data)
- SEO articles: data from English-language SEO shows top-10 pages average around 1400-2000 words (source: Backlinko's 2023 analysis)

Keep the word counter open while you write and watch the count in real time—no more finishing a draft only to find it's over or under the limit.

### Translation Work

Charging by word count is standard practice in translation. Chinese-to-English is usually billed by Chinese character count, English-to-Chinese by English word count. The tool shows both metrics at once, making it easy for translators to quote quickly.

A useful rule of thumb: after translating Chinese into English, the word count (English words) lands at roughly 60%-70% of the Chinese character count. So 1000 Chinese characters become about 600-700 English words. The reverse direction flips accordingly.

### Academic Writing

Paper submissions come with strict length limits. IEEE conference papers, for example, are typically capped at 6-8 pages, which works out to roughly 4000-6000 English words. Chinese journals generally cap at 5000-8000 characters.

The benefit of counting with this tool is avoiding surprises when LaTeX or Word templates render differently than expected—control the length at the plain-text stage first.

### Code Comment Audits

Some teams enforce comment-density requirements (e.g., comment lines must be at least 15% of total lines). Paste in the code and the line count gives you a quick reference number.

## Building Your Own Word Counter

The tool's core logic is under 10 lines of code. If you want to integrate it into your own project:

```typescript
function countText(text: string) {
  return {
    chars: text.length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    chinese: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    lines: text ? text.split("\n").length : 0,
    paragraphs: text.trim()
      ? text.split(/\n\s*\n/).filter(p => p.trim()).length
      : 0,
  };
}
```

A few directions worth extending:

**Reading time estimation**: Chinese reading speed is roughly 300-500 characters/minute (silent reading), English about 200-250 words/minute.

```typescript
function estimateReadingTime(text: string) {
  const { chinese, words } = countText(text);
  // 中文按 400 字/分钟，英文按 225 词/分钟
  const minutes = chinese / 400 + words / 225;
  return Math.max(1, Math.ceil(minutes));
}
```

**Excluding code blocks**: in technical articles, code blocks shouldn't count toward body text. Strip them with a regex first:

```typescript
function stripCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
}
```

**Supporting more CJK characters**:

```typescript
// 扩展到 CJK 统一表意文字全范围
const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
const cjkCount = (text.match(cjkRegex) || []).length;
```

## How It Compares to Other Tools

Why not just use Word or a browser extension?

**Word / Google Docs**: if you're already writing in the editor, of course just use the built-in counter. But if your text comes from chat logs, emails, copied web pages, or a JSON field returned by an API, opening an editor just to paste and count is a detour. The online tool's advantage is "open and go."

**Browser extensions**: there are plenty of word-count extensions, but they require installation and request page permissions. For occasional one-off use, the online tool is lighter.

**Command-line tools**: the `wc` command (built into Linux/macOS) counts characters, words, and lines, but its handling of Chinese depends on locale settings, and it doesn't distinguish Chinese characters from English ones.

```bash
# wc 的输出：行数 单词数 字节数
echo "Hello 你好" | wc
#        1       2      13

# wc 也按空白分割，"Hello" 和 "你好" 各算 1 个单词，共 2 个
# 字节数是 13（Hello=5 + 空格=1 + 你=3bytes + 好=3bytes + 换行=1）
```

`wc` reports bytes rather than characters—a UTF-8 Chinese character takes 3 bytes, so the number skews high. The online tool uses JavaScript's `string.length`, which counts Unicode characters and matches intuition better.

---

Tool link: [Word Counter](https://anyfreetools.com/tools/word-counter)

The real value of a word counter isn't the implementation (a few regexes cover it)—it's being "available anytime." Quickly confirming a count while writing, translating, or submitting a paper, without opening an editor or installing a plugin. Paste the text, get the numbers.

---

**Other articles in this series**:

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
- [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/)
- [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/)
- [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/)
- [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/)
- [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/)
- [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/)
- [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/)
- [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/)
- [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/)
- [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/)
- [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/)
- [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/)
- [Tool Guide 29: Online AES Encryption & Decryption Tool](/en/posts/blog127_aes-encryption-guide/)
- [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/)
- [Tool Guide 31: Online IP Address Lookup Tool](/en/posts/blog130_ip-lookup-guide/)
- [Tool Guide 32: Online RSA Key Generator](/en/posts/blog131_rsa-keygen-guide/)
- [Tool Guide 33: Online Color Contrast Checker](/en/posts/blog133_color-contrast-guide/)
- [Tool Guide 37: Online Unit Converter](/en/posts/blog132_unit-converter-guide/)
- [Tool Guide 38: Online User-Agent Parser](/en/posts/blog135_user-agent-guide/)
- [Tool Guide 39: Online Code Minifier](/en/posts/blog136_code-minifier-guide/)
- [Tool Guide 40 - Online CSS Border Radius Generator](/en/posts/blog137_border-radius-guide/)
- [Tool Guide 41: Online Color Shades Generator](/en/posts/blog140_color-shades-guide/)
- [Tool Guide 42: Online JSON Schema Validator](/en/posts/blog141_json-schema-validator-guide/)
