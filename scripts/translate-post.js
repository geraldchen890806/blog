#!/usr/bin/env node
/**
 * translate-post.js — 单篇博客中译英
 *
 * 用法:
 *   ANTHROPIC_API_KEY=... node scripts/translate-post.js src/data/blog/zh/blogXXX_xxx.md [--force]
 *
 * 输出: src/data/blog/en/<同名文件>
 *
 * 规则:
 *  - 代码块原样保留(不翻译代码和代码内注释)
 *  - frontmatter 只翻译 title/description;其余字段(pubDatetime/tags/slug/draft 等)
 *    由脚本从原文强制回填,不信任模型输出
 *  - 站内链接 /posts/xxx 改为 /en/posts/xxx
 *  - author 改为 "Gerald Chen"
 *
 * 模型默认 claude-opus-4-8,可用 TRANSLATE_MODEL 环境变量覆盖
 * (批量翻译压成本时可换 claude-sonnet-4-6 / claude-haiku-4-5)
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MODEL = process.env.TRANSLATE_MODEL || "claude-opus-4-8";

function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const keyFile = path.join(os.homedir(), ".anthropic", "api_key");
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, "utf8").trim();
  console.error("❌ 未设置 ANTHROPIC_API_KEY,且 ~/.anthropic/api_key 不存在");
  process.exit(1);
}

function splitFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("无法解析 frontmatter");
  return { frontmatter: m[1], body: m[2] };
}

/** 提取 frontmatter 中某字段的原始行(含多行值,如 tags 列表) */
function extractField(frontmatter, key) {
  const lines = frontmatter.split("\n");
  const start = lines.findIndex(l => l.startsWith(`${key}:`));
  if (start === -1) return null;
  const block = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^[\w-]+:/.test(lines[i])) break;
    block.push(lines[i]);
  }
  return block.join("\n");
}

const SYSTEM_PROMPT = `You are a professional technical translator. Translate Chinese tech blog posts into natural, native-quality English for a developer audience.

Rules:
1. Output ONLY the complete translated markdown file (frontmatter + body). No commentary, no markdown fences around the whole output.
2. Code blocks (\`\`\`...\`\`\`), inline code, commands, file paths, API names, and code comments must be preserved EXACTLY as-is. Do not translate anything inside code blocks.
3. In the frontmatter, translate ONLY the values of "title" and "description". Copy every other frontmatter line unchanged (pubDatetime, modDatetime, slug, tags, draft, featured, author, etc.).
4. Rewrite internal links from /posts/<slug> to /en/posts/<slug>. Keep external URLs unchanged.
5. Do not translate tag values.
6. Translate for meaning and flow, not word-by-word. The result should read like it was originally written in English by an experienced engineer — idiomatic, direct, no translationese.
7. Keep all markdown structure (headings, tables, lists, blockquotes, bold/italic) intact.
8. Keep technical terms, product names, and library names in their original form.
9. Numbers, dates, and units stay as-is.`;

// 这些字段从原文强制回填,不信任模型输出
const LOCKED_FIELDS = [
  "pubDatetime",
  "modDatetime",
  "slug",
  "tags",
  "draft",
  "featured",
  "reviewed",
  "approved",
  "ogImage",
  "canonicalURL",
  "timezone",
  "hideEditPost",
];

async function translate(inputPath, force = false) {
  const absInput = path.resolve(inputPath);
  if (!absInput.includes(`${path.sep}zh${path.sep}`)) {
    throw new Error("输入文件必须位于 src/data/blog/zh/ 目录下");
  }
  const outputPath = absInput.replace(`${path.sep}zh${path.sep}`, `${path.sep}en${path.sep}`);

  if (fs.existsSync(outputPath) && !force) {
    console.log(`⏭️  已存在,跳过: ${path.basename(outputPath)} (用 --force 覆盖)`);
    return { skipped: true };
  }

  const raw = fs.readFileSync(absInput, "utf8");
  const source = splitFrontmatter(raw);

  const client = new Anthropic({ apiKey: loadApiKey() });

  console.log(`🌐 翻译中: ${path.basename(absInput)} (model: ${MODEL})`);
  const started = Date.now();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Translate this blog post to English:\n\n${raw}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const text = message.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("");

  // 清理模型可能加的整体代码围栏
  let translated = text.trim();
  translated = translated.replace(/^```(?:markdown|md)?\n([\s\S]*)\n```$/m, "$1");

  // 解析译文 frontmatter,回填锁定字段
  const out = splitFrontmatter(translated);
  let fm = out.frontmatter;
  for (const key of LOCKED_FIELDS) {
    const original = extractField(source.frontmatter, key);
    const inOutput = extractField(fm, key);
    if (original === null) {
      // 原文没有该字段,译文里若有则删掉
      if (inOutput !== null) fm = fm.replace(inOutput + "\n", "").replace(inOutput, "");
      continue;
    }
    if (inOutput !== null) {
      fm = fm.replace(inOutput, original);
    } else {
      fm = `${fm}\n${original}`;
    }
  }
  // author 固定为英文名
  const authorLine = extractField(fm, "author");
  if (authorLine) fm = fm.replace(authorLine, "author: Gerald Chen");

  const result = `---\n${fm}\n---\n\n${out.body.trimStart()}`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result, "utf8");

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const usage = message.usage;
  console.log(
    `✅ 完成: ${path.basename(outputPath)} (${secs}s, in=${usage.input_tokens} out=${usage.output_tokens} tokens)`
  );
  return { skipped: false, usage };
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const files = args.filter(a => !a.startsWith("--"));

if (files.length === 0) {
  console.error("用法: node scripts/translate-post.js <zh文章路径> [--force]");
  process.exit(1);
}

for (const file of files) {
  await translate(file, force);
}
