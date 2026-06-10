---
title: 浏览器原生 AI 能力实战：Chrome Built-in AI API 完全指南
pubDatetime: 2026-03-11T10:00:00+08:00
description: 深入探讨 Chrome 内置 Gemini Nano 模型和浏览器原生 AI API（Prompt、Translation、Summarization），从技术架构到生产实战，展示如何构建隐私优先的本地 AI 应用，附完整代码示例和性能分析。
featured: true
tags:
  - AI
  - 前端
  - 开发效率
---

> ⚠️ **重要说明**：本文写作时（2026 年 3 月），部分 API 仍处于 Origin Trial 或早期阶段。文中的 API 状态基于 Chrome 官方文档和开发路线图，实际发布时间和 API 设计可能有变化。硬件要求和性能数据基于当前可用信息，请以 [Chrome Built-in AI 官方文档](https://developer.chrome.com/docs/ai/built-in-apis) 为准。

2026 年，浏览器原生 AI 能力正在从实验特性走向生产可用。Chrome 内置的 Gemini Nano 模型让前端开发者无需后端服务器即可实现智能化功能，真正做到"数据不出浏览器"的隐私保护。

本文将深入探讨 Chrome Built-in AI 的技术架构、API 设计、实战应用场景，并通过完整代码示例展示如何构建隐私优先的本地 AI 应用。

## 为什么需要浏览器原生 AI？

### 传统云端 AI 的痛点

**隐私问题**：
- 用户输入的敏感数据（医疗记录、财务信息、私密对话）需要上传到云端
- GDPR、CCPA 等隐私法规带来合规成本
- 用户对数据安全的担忧影响产品采用率

**性能与成本**：
- 网络延迟（RTT + 模型推理时间）
- API 调用成本（按 token 计费）
- 带宽消耗（尤其在移动网络）

**可用性限制**：
- 离线场景无法使用
- 网络不稳定时体验差
- 依赖外部服务可用性

### 浏览器端 AI 的优势

**隐私优先**：
- 数据完全在本地处理，不上传云端
- 符合零信任安全模型
- 适合处理敏感内容（医疗、法律、金融）

**性能提升**：
- 零网络延迟（仅本地推理时间）
- 离线可用
- 降低云端 API 成本

**用户体验**：
- 实时响应（打字即推理）
- 无需等待网络请求
- 隐私感知增强用户信任

### Chrome Built-in AI 的演进

| 阶段 | 时间 | 特性 |
|------|------|------|
| 宣布 | 2024 Q2 | Google I/O 发布 Chrome Built-in AI 计划 |
| Origin Trial | 2024 Q3-Q4 | Prompt API 开发者预览，需 flag 开启 |
| 部分稳定 | 2025 Q2-Q3 | Chrome 138 - Translator/Summarizer/Language Detector 进入 stable |
| Prompt API 稳定 | 2025-2026 | Extensions 已 stable，Web 端仍在 Origin Trial |

**当前状态**（2026 年 3 月）：
- Chrome 138+ 支持
- **Prompt API**：Extensions 中 stable，Web 端仍为 Origin Trial（需申请或 flag 开启）
- **Translator/Summarizer/Language Detector**：已进入 stable
- **Writer/Rewriter/Proofreader**：仍在 Origin Trial
- Gemini Nano 模型大小：约 1.5GB（首次下载，后台进行）
- 支持多种语言对翻译（具体数量取决于可下载的语言包）

## 硬件要求与限制

使用 Chrome Built-in AI 前，需要了解以下硬件和环境限制（来源：Chrome 官方文档）：

### 最低硬件要求

**存储空间**：
- ≥ 22GB 可用空间（用于下载和缓存模型）

**GPU 模式**（推荐）：
- GPU VRAM > 4GB
- 支持 WebGPU 的显卡

**CPU 模式**（降级）：
- RAM ≥ 16GB
- CPU ≥ 4 核

### 平台限制

**支持的平台**：
- ✅ Windows（x64）
- ✅ macOS（Intel 和 Apple Silicon）
- ✅ Linux（x64）
- ✅ Chrome OS

**不支持的平台**：
- ❌ Android（Prompt API 相关功能）
- ❌ iOS（浏览器限制）

### 网络要求

- **首次使用**：需要网络连接下载模型（约 1.5GB）
- **后续使用**：完全离线可用
- **模型更新**：后台自动检查和下载（Chrome Component Updater）

**影响**：这些限制意味着 Chrome Built-in AI 更适合桌面应用和高端移动设备，而非所有用户场景。

## 技术架构深度解析

### Gemini Nano 集成原理

```text
┌─────────────────────────────────────────────────┐
│           Web Page (JavaScript)                  │
│                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ LanguageModel│ │  Translator  │ │Summarizer│ │
│  │    API      │  │     API      │  │   API    │ │
│  └──────┬─────┘  └──────┬───────┘  └────┬────┘ │
│         │                │                │      │
│         └────────────────┴────────────────┘      │
│                          │                       │
└──────────────────────────┼───────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────┐
│      Browser Process (C++)                      │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │   Gemini Nano Model (~1.5GB)             │  │
│  │   - 推测：TFLite 格式                     │  │
│  │   - 推测：量化为 INT8/INT4                │  │
│  │   - WebGPU 加速推理                       │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Component    │  │ Memory Manager       │    │
│  │ Updater      │  │ (LRU eviction)       │    │
│  └──────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────┐
│           WebGPU / CPU                           │
│   - GPU 加速推理（优先）                         │
│   - CPU 降级（GPU 不可用时）                     │
└─────────────────────────────────────────────────┘
```

**关键技术点**：

1. **模型格式**：Google 未公开确切格式，推测为 TensorFlow Lite（TFLite），经过量化优化
2. **加速方式**：优先使用 WebGPU，降级到 CPU（WASM SIMD）
3. **内存管理**：LRU 缓存策略，避免内存溢出
4. **持久化**：模型由 Chrome Component Updater 管理，可在 `chrome://on-device-internals` 查看状态

### WebGPU 加速机制

```javascript
// WebGPU 可用性检测
async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    console.warn("WebGPU not supported, falling back to CPU");
    return false;
  }
  
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.warn("No WebGPU adapter found");
    return false;
  }
  
  const device = await adapter.requestDevice();
  console.log("WebGPU device:", device.limits);
  return true;
}

// Gemini Nano 会自动检测并使用 WebGPU
// 开发者无需手动管理，但可以监控性能
```

**性能对比**（估算值，基于社区反馈，M2 Mac）：
- WebGPU 推理：~50ms/token
- CPU 推理：~200ms/token
- 加速比：4x

### 兼容性检测与降级方案

```javascript
async function detectAICapabilities() {
  const capabilities = {
    promptAPI: false,
    translationAPI: false,
    summarizationAPI: false,
    languageDetectorAPI: false,
    webGPU: false
  };
  
  // 检测 Prompt API（Gemini Nano）
  if ('LanguageModel' in self) {
    try {
      const availability = await LanguageModel.availability();
      // 返回：'readily' | 'after-download' | 'no'
      capabilities.promptAPI = (availability === 'readily' || availability === 'after-download');
    } catch (e) {
      console.warn("Prompt API unavailable:", e.message);
    }
  }
  
  // 检测 Translation API
  if ('Translator' in self) {
    try {
      const availability = await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: 'zh'
      });
      capabilities.translationAPI = (availability === 'readily' || availability === 'after-download');
    } catch (e) {
      console.warn("Translation API unavailable:", e.message);
    }
  }
  
  // 检测 Summarization API
  if ('Summarizer' in self) {
    try {
      const availability = await Summarizer.availability();
      capabilities.summarizationAPI = (availability === 'readily' || availability === 'after-download');
    } catch (e) {
      console.warn("Summarization API unavailable:", e.message);
    }
  }
  
  // 检测 Language Detector API（Chrome 138+）
  if ('LanguageDetector' in self) {
    try {
      const availability = await LanguageDetector.availability();
      capabilities.languageDetectorAPI = (availability === 'readily' || availability === 'after-download');
    } catch (e) {
      console.warn("Language Detector API unavailable:", e.message);
    }
  }
  
  // 检测 WebGPU
  capabilities.webGPU = await checkWebGPUSupport();
  
  return capabilities;
}

// 降级策略
async function getAIProvider(capabilities) {
  if (capabilities.promptAPI) {
    return new ChromeBuiltInAI();
  } else if (window.location.protocol === 'https:') {
    // 降级到云端 API（需要配置）
    const config = window.__AI_CONFIG__ || {};
    return new CloudAI({ apiKey: config.apiKey });
  } else {
    throw new Error("AI capabilities not available");
  }
}
```

## 核心 API 详解

### Prompt API：通用文本生成

**初始化会话**：

```javascript
async function initPromptSession() {
  try {
    // 检测可用性
    const availability = await LanguageModel.availability();
    
    if (availability === 'no') {
      throw new Error("Prompt API not available on this device");
    }
    
    if (availability === 'after-download') {
      console.log("Model needs to be downloaded first");
    }
    
    const session = await LanguageModel.create({
      temperature: 0.7,           // 可选，默认 0.8
      topK: 40,                   // 可选，默认 40
      systemPrompt: "You are a helpful writing assistant.", // 可选
      monitor(m) {
        // 监听模型下载进度
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Download progress: ${(e.loaded * 100).toFixed(1)}%`);
        });
      }
    });
    
    return session;
  } catch (error) {
    if (error.name === 'NotSupportedError') {
      console.error("Prompt API not supported in this browser");
    } else if (error.name === 'NotReadableError') {
      console.error("Model not downloaded yet, please wait");
    }
    throw error;
  }
}
```

**文本生成（流式）**：

```javascript
async function generateText(session, prompt) {
  try {
    const stream = session.promptStreaming(prompt);
    
    let result = "";
    for await (const chunk of stream) {
      result = chunk; // 累积结果
      console.log("Current output:", result);
      // 实时更新 UI
      document.getElementById('output').textContent = result;
    }
    
    return result;
  } catch (error) {
    console.error("Generation failed:", error);
    throw error;
  }
}
```

**批量生成（非流式）**：

```javascript
async function batchGenerate(session, prompts) {
  const results = [];
  
  for (const prompt of prompts) {
    const result = await session.prompt(prompt);
    results.push(result);
  }
  
  return results;
}
```

**会话管理**：

```javascript
class PromptSessionManager {
  constructor() {
    this.sessions = new Map();
    this.maxSessions = 3; // 限制并发会话数
  }
  
  async getSession(id = 'default') {
    if (this.sessions.has(id)) {
      return this.sessions.get(id);
    }
    
    if (this.sessions.size >= this.maxSessions) {
      // LRU 策略：删除最老的会话
      const oldestId = this.sessions.keys().next().value;
      await this.destroySession(oldestId);
    }
    
    const session = await initPromptSession();
    this.sessions.set(id, session);
    return session;
  }
  
  async destroySession(id) {
    const session = this.sessions.get(id);
    if (session) {
      await session.destroy();
      this.sessions.delete(id);
    }
  }
  
  async destroyAll() {
    for (const [id, session] of this.sessions) {
      await session.destroy();
    }
    this.sessions.clear();
  }
}
```

### Translation API：离线翻译

**检测翻译能力**：

```javascript
async function checkTranslationSupport(sourceLang, targetLang) {
  const availability = await Translator.availability({
    sourceLanguage: sourceLang,
    targetLanguage: targetLang
  });
  
  // 返回值：'readily' | 'after-download' | 'no'
  switch (availability) {
    case 'readily':
      console.log("Translation model ready");
      return true;
    case 'after-download':
      console.log("Translation model needs download (~50MB)");
      return true;
    case 'no':
      console.warn(`Translation not supported: ${sourceLang} → ${targetLang}`);
      return false;
  }
}
```

**创建翻译器**：

```javascript
async function createTranslator(sourceLang, targetLang) {
  try {
    const translator = await Translator.create({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang
    });
    
    // 监听模型下载进度
    translator.addEventListener('downloadprogress', (e) => {
      console.log(`Download progress: ${e.loaded}/${e.total} bytes`);
      const percent = (e.loaded / e.total * 100).toFixed(1);
      document.getElementById('progress').textContent = `${percent}%`;
    });
    
    return translator;
  } catch (error) {
    console.error("Translator creation failed:", error);
    throw error;
  }
}
```

**执行翻译**：

```javascript
async function translate(text, sourceLang = 'en', targetLang = 'zh') {
  const translator = await createTranslator(sourceLang, targetLang);
  
  try {
    const result = await translator.translate(text);
    return result;
  } finally {
    // 清理资源
    translator.destroy();
  }
}

// 批量翻译
async function batchTranslate(texts, sourceLang, targetLang) {
  const translator = await createTranslator(sourceLang, targetLang);
  
  try {
    const results = [];
    for (const text of texts) {
      const result = await translator.translate(text);
      results.push(result);
    }
    return results;
  } finally {
    translator.destroy();
  }
}
```

**支持的语言对**（部分示例）：

| 源语言 | 目标语言 | 模型大小 |
|--------|----------|----------|
| en | zh | ~50MB（估算） |
| en | es | ~45MB（估算） |
| zh | en | ~50MB（估算） |
| ja | en | ~48MB（估算） |
| ... | ... | ... |

具体支持的语言对数量取决于可下载的语言包，可通过 `Translator.availability()` 检测。

### Language Detector API：自动检测语言

**自动检测源语言**（Chrome 138+）：

```javascript
async function detectLanguage(text) {
  if (!('LanguageDetector' in self)) {
    console.warn("Language Detector API not available");
    return null;
  }
  
  try {
    const detector = await LanguageDetector.create();
    const results = await detector.detect(text);
    
    // 返回语言列表，按置信度排序
    // results = [{ language: 'en', confidence: 0.95 }, ...]
    return results[0]?.language || null;
  } catch (error) {
    console.error("Language detection failed:", error);
    return null;
  }
}

// 智能翻译：自动检测源语言
async function smartTranslate(text, targetLang = 'zh') {
  const sourceLang = await detectLanguage(text);
  
  if (!sourceLang) {
    throw new Error("Unable to detect source language");
  }
  
  console.log(`Detected language: ${sourceLang}`);
  return await translate(text, sourceLang, targetLang);
}
```

### Summarization API：文本摘要

**创建摘要器**：

```javascript
async function createSummarizer(options = {}) {
  try {
    const summarizer = await Summarizer.create({
      type: options.type || 'tl;dr',        // 'tl;dr' | 'key-points' | 'teaser' | 'headline'
      format: options.format || 'plain-text', // 'plain-text' | 'markdown'
      length: options.length || 'medium'      // 'short' | 'medium' | 'long'
    });
    
    return summarizer;
  } catch (error) {
    console.error("Summarizer creation failed:", error);
    throw error;
  }
}
```

**生成摘要**：

```javascript
async function summarize(text, options = {}) {
  const summarizer = await createSummarizer(options);
  
  try {
    const summary = await summarizer.summarize(text);
    return summary;
  } finally {
    summarizer.destroy();
  }
}

// 流式摘要（实时更新）
async function summarizeStreaming(text, options = {}) {
  const summarizer = await createSummarizer(options);
  
  try {
    const stream = summarizer.summarizeStreaming(text);
    
    let summary = "";
    for await (const chunk of stream) {
      summary = chunk;
      // 实时更新 UI
      document.getElementById('summary').textContent = summary;
    }
    
    return summary;
  } finally {
    summarizer.destroy();
  }
}
```

**摘要类型示例**：

```javascript
const article = `
Artificial intelligence (AI) is transforming software development.
From code completion to automated testing, AI tools are becoming
essential for modern developers. However, privacy concerns and
cost implications remain significant challenges...
`;

// TL;DR 摘要（简短总结）
const tldr = await summarize(article, { type: 'tl;dr', length: 'short' });
// 输出："AI is changing development but raises privacy and cost issues."

// 要点摘要（列表形式）
const keyPoints = await summarize(article, { type: 'key-points', length: 'medium' });
// 输出：
// - AI transforming software development
// - Tools include code completion and testing
// - Privacy and cost concerns exist

// 标题生成
const headline = await summarize(article, { type: 'headline' });
// 输出："AI Transforms Development Amid Privacy Concerns"
```

### Writer & Rewriter API（Origin Trial）

**改写文本**：

```javascript
// 注意：Writer/Rewriter API 目前仍在 Origin Trial
async function rewriteText(text, context = 'improve') {
  if (!('Rewriter' in self)) {
    console.warn("Rewriter API not available");
    return null;
  }
  
  try {
    const rewriter = await Rewriter.create({
      context // 'improve' | 'formal' | 'casual' | 'shorten' | 'elaborate'
    });
    
    const result = await rewriter.rewrite(text);
    rewriter.destroy();
    
    return result;
  } catch (error) {
    console.error("Rewrite failed:", error);
    return null;
  }
}
```

## 实战案例：构建本地化智能编辑器

### 需求分析

**目标**：构建一个隐私优先的写作助手，所有 AI 处理在本地完成。

**核心功能**：
1. 实时语法检查与改写建议
2. 智能续写（基于上下文）
3. 多语言翻译（自动检测源语言）
4. 一键摘要生成

**技术选型**：
- UI 框架：Web Components（无依赖，轻量级）
- AI 能力：Chrome Built-in AI API
- 存储：LocalStorage（用户偏好）+ IndexedDB（草稿历史）

### 核心代码实现

**1. AI 服务封装**

```javascript
class LocalAIService {
  constructor() {
    this.promptSession = null;
    this.translators = new Map();
    this.summarizer = null;
    this.languageDetector = null;
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) return;
    
    // 检测能力
    const capabilities = await detectAICapabilities();
    
    if (!capabilities.promptAPI) {
      throw new Error("Prompt API not available");
    }
    
    // 初始化 Prompt 会话
    this.promptSession = await LanguageModel.create({
      systemPrompt: "You are a professional writing assistant. Help users improve their writing with clear, concise suggestions."
    });
    
    // 初始化 Language Detector
    if (capabilities.languageDetectorAPI) {
      this.languageDetector = await LanguageDetector.create();
    }
    
    this.initialized = true;
    console.log("LocalAI service initialized");
  }
  
  async rewrite(text, instruction = "improve clarity") {
    if (!this.promptSession) await this.initialize();
    
    const prompt = `Rewrite the following text to ${instruction}:\n\n${text}\n\nRewritten version:`;
    const result = await this.promptSession.prompt(prompt);
    
    // 提取实际内容（移除可能的前缀）
    return result.replace(/^Rewritten version:\s*/i, '').trim();
  }
  
  async continueWriting(context) {
    if (!this.promptSession) await this.initialize();
    
    const prompt = `Continue writing based on this context:\n\n${context}\n\nContinuation:`;
    const stream = this.promptSession.promptStreaming(prompt);
    
    return stream; // 返回流，由调用者处理
  }
  
  async translate(text, targetLang) {
    // 自动检测源语言
    let sourceLang = 'en';
    if (this.languageDetector) {
      const results = await this.languageDetector.detect(text);
      sourceLang = results[0]?.language || 'en';
    }
    
    const key = `${sourceLang}-${targetLang}`;
    
    if (!this.translators.has(key)) {
      const translator = await Translator.create({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      });
      this.translators.set(key, translator);
    }
    
    const translator = this.translators.get(key);
    return await translator.translate(text);
  }
  
  async summarize(text, type = 'tl;dr', length = 'medium') {
    if (!this.summarizer) {
      this.summarizer = await Summarizer.create({
        type,
        length
      });
    }
    
    return await this.summarizer.summarize(text);
  }
  
  async destroy() {
    if (this.promptSession) {
      await this.promptSession.destroy();
      this.promptSession = null;
    }
    
    for (const translator of this.translators.values()) {
      translator.destroy();
    }
    this.translators.clear();
    
    if (this.summarizer) {
      this.summarizer.destroy();
      this.summarizer = null;
    }
    
    if (this.languageDetector) {
      this.languageDetector.destroy();
      this.languageDetector = null;
    }
    
    this.initialized = false;
  }
}
```

**2. 智能编辑器组件**

```javascript
class SmartEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.aiService = new LocalAIService();
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.initializeAI();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .editor-container {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .toolbar {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }
        
        button {
          padding: 8px 16px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 14px;
        }
        
        button:hover {
          background: #e9e9e9;
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        textarea {
          width: 100%;
          min-height: 300px;
          padding: 16px;
          border: none;
          font-size: 16px;
          line-height: 1.6;
          resize: vertical;
          font-family: inherit;
        }
        
        .status {
          padding: 8px 12px;
          background: #e3f2fd;
          color: #1976d2;
          font-size: 12px;
          border-top: 1px solid #ddd;
        }
        
        .status.error {
          background: #ffebee;
          color: #c62828;
        }
      </style>
      
      <div class="editor-container">
        <div class="toolbar">
          <button id="rewrite-btn">✨ Rewrite</button>
          <button id="continue-btn">➡️ Continue</button>
          <button id="translate-btn">🌍 Translate</button>
          <button id="summarize-btn">📝 Summarize</button>
        </div>
        
        <textarea id="editor" placeholder="Start writing..."></textarea>
        
        <div class="status" id="status">Ready</div>
      </div>
    `;
  }
  
  setupEventListeners() {
    const editor = this.shadowRoot.getElementById('editor');
    const rewriteBtn = this.shadowRoot.getElementById('rewrite-btn');
    const continueBtn = this.shadowRoot.getElementById('continue-btn');
    const translateBtn = this.shadowRoot.getElementById('translate-btn');
    const summarizeBtn = this.shadowRoot.getElementById('summarize-btn');
    
    rewriteBtn.addEventListener('click', () => this.handleRewrite());
    continueBtn.addEventListener('click', () => this.handleContinue());
    translateBtn.addEventListener('click', () => this.handleTranslate());
    summarizeBtn.addEventListener('click', () => this.handleSummarize());
    
    // 实时保存草稿
    let saveTimeout;
    editor.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => this.saveDraft(), 1000);
    });
  }
  
  async initializeAI() {
    try {
      this.setStatus("Initializing AI...");
      await this.aiService.initialize();
      this.setStatus("Ready");
    } catch (error) {
      this.setStatus(`Error: ${error.message}`, true);
      console.error("AI initialization failed:", error);
    }
  }
  
  async handleRewrite() {
    const editor = this.shadowRoot.getElementById('editor');
    const selectedText = this.getSelectedText();
    
    if (!selectedText) {
      alert("Please select text to rewrite");
      return;
    }
    
    try {
      this.setStatus("Rewriting...");
      const rewritten = await this.aiService.rewrite(selectedText);
      this.replaceSelectedText(rewritten);
      this.setStatus("Rewrite complete");
    } catch (error) {
      this.setStatus(`Error: ${error.message}`, true);
    }
  }
  
  async handleContinue() {
    const editor = this.shadowRoot.getElementById('editor');
    const context = editor.value;
    
    if (!context.trim()) {
      alert("Please write something first");
      return;
    }
    
    try {
      this.setStatus("Generating continuation...");
      const stream = await this.aiService.continueWriting(context);
      
      let continuation = "";
      for await (const chunk of stream) {
        continuation = chunk;
        // 实时更新（追加到现有内容）
        editor.value = context + "\n\n" + continuation;
      }
      
      this.setStatus("Continuation complete");
    } catch (error) {
      this.setStatus(`Error: ${error.message}`, true);
    }
  }
  
  async handleTranslate() {
    const editor = this.shadowRoot.getElementById('editor');
    const text = editor.value;
    
    if (!text.trim()) {
      alert("Please write something to translate");
      return;
    }
    
    // 简化示例：自动检测 → ZH/EN
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    const targetLang = hasChinese ? 'en' : 'zh';
    
    try {
      this.setStatus(`Translating to ${targetLang.toUpperCase()}...`);
      const translated = await this.aiService.translate(text, targetLang);
      editor.value = translated;
      this.setStatus("Translation complete");
    } catch (error) {
      this.setStatus(`Error: ${error.message}`, true);
    }
  }
  
  async handleSummarize() {
    const editor = this.shadowRoot.getElementById('editor');
    const text = editor.value;
    
    if (!text.trim() || text.length < 100) {
      alert("Please write at least 100 characters to summarize");
      return;
    }
    
    try {
      this.setStatus("Generating summary...");
      const summary = await this.aiService.summarize(text);
      
      // 在编辑器顶部插入摘要
      editor.value = `**Summary:** ${summary}\n\n---\n\n${text}`;
      this.setStatus("Summary complete");
    } catch (error) {
      this.setStatus(`Error: ${error.message}`, true);
    }
  }
  
  getSelectedText() {
    const editor = this.shadowRoot.getElementById('editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    return editor.value.substring(start, end);
  }
  
  replaceSelectedText(newText) {
    const editor = this.shadowRoot.getElementById('editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    const before = editor.value.substring(0, start);
    const after = editor.value.substring(end);
    editor.value = before + newText + after;
    
    // 保持选中新文本
    editor.selectionStart = start;
    editor.selectionEnd = start + newText.length;
  }
  
  setStatus(message, isError = false) {
    const status = this.shadowRoot.getElementById('status');
    status.textContent = message;
    status.classList.toggle('error', isError);
  }
  
  saveDraft() {
    const editor = this.shadowRoot.getElementById('editor');
    localStorage.setItem('smart-editor-draft', editor.value);
  }
  
  disconnectedCallback() {
    this.aiService.destroy();
  }
}

customElements.define('smart-editor', SmartEditor);
```

**3. 使用示例**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Smart Editor - Privacy-First AI Writing</title>
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    connect-src 'none';
  ">
</head>
<body>
  <h1>Smart Editor</h1>
  <p>All AI processing happens locally in your browser. Your data never leaves your device.</p>
  <p><small>⚠️ Requires Chrome 138+ and sufficient hardware (22GB storage, 4GB VRAM).</small></p>
  
  <smart-editor></smart-editor>
  
  <script src="local-ai-service.js"></script>
  <script src="smart-editor.js"></script>
</body>
</html>
```

### 性能优化策略

**1. 请求队列管理**

```javascript
class AIRequestQueue {
  constructor(maxConcurrent = 2) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }
  
  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const { fn, resolve, reject } = this.queue.shift();
    
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // 处理下一个
    }
  }
}

// 使用示例
const queue = new AIRequestQueue();
const result = await queue.add(() => aiService.rewrite(text));
```

**2. 响应缓存**

```javascript
class CachedAIService extends LocalAIService {
  constructor() {
    super();
    this.cache = new Map();
    this.maxCacheSize = 100;
  }
  
  getCacheKey(method, ...args) {
    return `${method}:${JSON.stringify(args)}`;
  }
  
  async rewrite(text, instruction) {
    const key = this.getCacheKey('rewrite', text, instruction);
    
    if (this.cache.has(key)) {
      console.log("Cache hit:", key);
      return this.cache.get(key);
    }
    
    const result = await super.rewrite(text, instruction);
    
    // LRU 缓存
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, result);
    return result;
  }
}
```

**3. 取消机制**

```javascript
class CancellableAIService extends LocalAIService {
  constructor() {
    super();
    this.abortControllers = new Map();
  }
  
  async rewriteWithCancel(text, instruction, requestId) {
    // 取消之前的请求
    if (this.abortControllers.has(requestId)) {
      this.abortControllers.get(requestId).abort();
    }
    
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    try {
      // 注意：实际 API 可能不支持 AbortSignal
      // 这里演示概念，实际需要手动实现取消逻辑
      const result = await this.rewrite(text, instruction);
      
      if (controller.signal.aborted) {
        throw new Error("Request cancelled");
      }
      
      return result;
    } finally {
      this.abortControllers.delete(requestId);
    }
  }
  
  cancel(requestId) {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }
}
```

## 性能与成本分析

### 首次加载性能

**模型下载**（一次性，后台进行）：
- Gemini Nano 完整模型：~1.5GB
- 首次下载时间（估算）：
  - 高速网络（100 Mbps）：~2 分钟
  - 中速网络（10 Mbps）：~20 分钟
  - 低速网络（1 Mbps）：~3 小时

**优化策略**：
1. **懒加载**：仅在用户首次使用 AI 功能时下载
2. **后台下载**：不阻塞页面加载，显示进度条
3. **增量更新**：模型更新仅下载差异部分

**Translation/Summarization 模型**：
- 单个语言对：~50MB（估算）
- 按需下载（使用时触发）

### 推理速度对比

**测试环境**（估算值，基于社区反馈）：
- 设备：MacBook Pro M2, 16GB RAM
- 浏览器：Chrome 138+
- 输入长度：500 tokens

| 场景 | 本地（WebGPU） | 本地（CPU） | 云端 API | 说明 |
|------|----------------|-------------|----------|------|
| 文本改写 | 1.2s | 4.5s | 2.8s | 包含网络延迟 |
| 翻译（EN→ZH） | 0.8s | 2.3s | 1.5s | 100 字 |
| 摘要生成 | 1.5s | 5.2s | 3.0s | 2000 字文章 |
| 续写（流式） | 50ms/token | 200ms/token | 80ms/token | 首 token 延迟 |

**数据来源**：基于社区反馈和公开基准测试的估算值，实际性能因设备而异。

**结论**：
- ✅ 本地 WebGPU > 云端 API（短文本场景）
- ✅ 本地 CPU ≈ 云端 API（长文本场景）
- ✅ 流式生成体验：本地更流畅（无网络抖动）

### 成本对比

**云端 API 成本**（以 GPT-4 Turbo 为例，2026 年定价）：
- 输入：$10/1M tokens
- 输出：$30/1M tokens
- 月度使用（假设）：100 次改写 × 1000 tokens = 100k tokens
- 月成本：~$1.50

**本地 AI 成本**：
- 首次下载流量：1.5GB
- 电力消耗（估算）：
  - WebGPU 推理：~10W × 2s = 0.0056 Wh/次
  - CPU 推理：~20W × 5s = 0.0278 Wh/次
- 月成本：$0（忽略电费，约 $0.001）

**成本节省**（估算）：
- 高频用户（> 1000 次/月）：节省 > $10/月
- 企业级（> 100k 次/月）：节省 > $1000/月

### 用户体验优化

**加载状态管理**：

```javascript
class AILoadingManager {
  constructor() {
    this.listeners = new Set();
  }
  
  async init(onProgress) {
    const capabilities = await detectAICapabilities();
    
    if (!capabilities.promptAPI) {
      // 检查模型下载状态
      const availability = await LanguageModel.availability();
      
      if (availability === 'after-download') {
        onProgress({
          type: 'model-download',
          state: 'pending'
        });
        
        // 等待下载完成
        await this.waitForDownload(onProgress);
      }
    }
  }
  
  async waitForDownload(onProgress) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const availability = await LanguageModel.availability();
        
        if (availability === 'readily') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }
}
```

**错误处理与降级**：

```javascript
class RobustAIService {
  constructor() {
    this.localAI = new LocalAIService();
    this.cloudAI = null; // 降级选项
    this.preferLocal = true;
  }
  
  async rewrite(text, instruction) {
    if (this.preferLocal) {
      try {
        return await this.localAI.rewrite(text, instruction);
      } catch (error) {
        console.warn("Local AI failed, falling back to cloud:", error);
        
        // 用户确认后降级到云端
        const confirmed = confirm(
          "Local AI is unavailable. Use cloud AI instead? (Your data will be sent to servers)"
        );
        
        if (confirmed) {
          if (!this.cloudAI) {
            const config = window.__AI_CONFIG__ || {};
            this.cloudAI = new CloudAI(config);
          }
          this.preferLocal = false;
          return await this.cloudAI.rewrite(text, instruction);
        }
        
        throw error;
      }
    } else {
      return await this.cloudAI.rewrite(text, instruction);
    }
  }
}
```

## 隐私与安全

### 数据不出浏览器的实现原理

**1. 沙箱隔离**

```text
┌─────────────────────────────────────────┐
│          Browser Process                 │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Web Page (Isolated Origin)       │ │
│  │                                    │ │
│  │   JavaScript Code                  │ │
│  │   ↓ API Call                       │ │
│  └────────────────────────────────────┘ │
│                ↓                         │
│  ┌────────────────────────────────────┐ │
│  │   Gemini Nano (Browser Process)    │ │
│  │   - 数据在浏览器进程内处理          │ │
│  │   - 不通过网络传输                  │ │
│  │   - Origin 隔离（每个网站独立）     │ │
│  └────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
           ❌ 无网络请求
```

**2. 网络请求监控**

```javascript
// 验证无网络请求（开发者工具 Network 面板）
async function verifyNoNetworkRequests() {
  // 记录初始网络请求
  const initialRequests = performance.getEntriesByType('resource');
  
  // 执行 AI 操作
  const session = await LanguageModel.create();
  const result = await session.prompt("Hello");
  
  // 检查新增网络请求
  const finalRequests = performance.getEntriesByType('resource');
  const newRequests = finalRequests.slice(initialRequests.length);
  
  // 过滤 AI 相关请求
  const aiRequests = newRequests.filter(req => 
    !req.name.includes('localhost') &&
    !req.name.includes('127.0.0.1')
  );
  
  if (aiRequests.length === 0) {
    console.log("✅ Verified: No network requests during AI inference");
  } else {
    console.warn("⚠️ Unexpected network requests:", aiRequests);
  }
}
```

### Content Security Policy 配置

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  connect-src 'none';
">
```

**关键点**：
- `connect-src 'none'`：禁止所有网络请求（除浏览器内置功能）
- `script-src 'wasm-unsafe-eval'`：允许 WebAssembly（模型推理可能需要）
- 确保 AI 功能在严格 CSP 下仍可用

### 敏感数据过滤

```javascript
class PrivacyAwareAIService extends LocalAIService {
  constructor() {
    super();
    this.sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g,          // SSN
      /\b\d{16}\b/g,                      // 信用卡
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g // IP
    ];
  }
  
  detectSensitiveData(text) {
    const found = [];
    
    for (const pattern of this.sensitivePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        found.push(...matches);
      }
    }
    
    return found;
  }
  
  async rewrite(text, instruction) {
    const sensitive = this.detectSensitiveData(text);
    
    if (sensitive.length > 0) {
      const confirmed = confirm(
        `Detected potentially sensitive data: ${sensitive.join(', ')}\n\n` +
        "Even with local AI, do you want to proceed?"
      );
      
      if (!confirmed) {
        throw new Error("User cancelled due to sensitive data");
      }
    }
    
    return await super.rewrite(text, instruction);
  }
}
```

### GDPR/CCPA 合规性

**优势**：
- ✅ 数据处理在用户设备上，无"数据控制者"角色
- ✅ 无需数据处理协议（DPA）
- ✅ 无需 Cookie 同意（AI 功能无需网络）
- ✅ 自动符合"数据最小化"原则

**仍需注意**：
- 用户明确知情（UI 提示"本地 AI 处理"）
- 透明度（隐私政策说明技术实现）
- 模型本身的隐私（Google 训练数据合规性）

## 生产环境最佳实践

### 特性检测与 Polyfill 策略

```javascript
class AIFeatureDetector {
  static async detect() {
    const features = {
      builtInAI: false,
      cloudAI: false,
      fallbackReady: false
    };
    
    // 检测浏览器内置 AI
    if ('LanguageModel' in self) {
      try {
        const availability = await LanguageModel.availability();
        features.builtInAI = (availability === 'readily' || availability === 'after-download');
      } catch (e) {
        console.warn("Built-in AI detected but unavailable:", e);
      }
    }
    
    // 检测云端 API 配置
    const config = window.__AI_CONFIG__ || {};
    if (config.apiKey) {
      features.cloudAI = true;
    }
    
    // 检测降级准备
    features.fallbackReady = features.builtInAI || features.cloudAI;
    
    return features;
  }
  
  static async getProvider() {
    const features = await this.detect();
    
    if (features.builtInAI) {
      return new LocalAIService();
    } else if (features.cloudAI) {
      console.warn("Using cloud AI fallback (data will be sent to servers)");
      const config = window.__AI_CONFIG__ || {};
      return new CloudAI(config);
    } else {
      throw new Error("No AI provider available");
    }
  }
}

// 使用
const aiService = await AIFeatureDetector.getProvider();
```

### 错误处理与监控

```javascript
class MonitoredAIService extends LocalAIService {
  constructor(errorReporter) {
    super();
    this.errorReporter = errorReporter;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0
    };
  }
  
  async rewrite(text, instruction) {
    const startTime = performance.now();
    this.metrics.totalRequests++;
    
    try {
      const result = await super.rewrite(text, instruction);
      
      this.metrics.successfulRequests++;
      this.updateLatency(performance.now() - startTime);
      
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      
      // 上报错误（不包含用户数据）
      this.errorReporter.report({
        type: 'ai-rewrite-failed',
        error: error.message,
        textLength: text.length,
        instruction,
        latency: performance.now() - startTime
      });
      
      throw error;
    }
  }
  
  updateLatency(latency) {
    const total = this.metrics.avgLatency * (this.metrics.successfulRequests - 1);
    this.metrics.avgLatency = (total + latency) / this.metrics.successfulRequests;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
    };
  }
}
```

### 多浏览器兼容方案

```javascript
class CrossBrowserAI {
  static async create() {
    // Chrome Built-in AI
    if (await this.detectChrome()) {
      return new ChromeBuiltInAI();
    }
    
    // Edge (可能支持类似 API)
    if (await this.detectEdge()) {
      return new EdgeBuiltInAI();
    }
    
    // Safari (Web ML 实验特性)
    if (await this.detectSafari()) {
      return new SafariWebML();
    }
    
    // 降级到云端
    const config = window.__AI_CONFIG__ || {};
    return new CloudAI(config);
  }
  
  static async detectChrome() {
    return 'LanguageModel' in self;
  }
  
  static async detectEdge() {
    // Edge 可能有类似 API（未来）
    return false;
  }
  
  static async detectSafari() {
    // Safari 的 Web ML API（实验性）
    return 'ml' in window;
  }
}
```

### 云端/本地混合架构

```javascript
class HybridAIService {
  constructor() {
    this.local = new LocalAIService();
    this.cloud = null;
    this.strategy = 'privacy-first'; // 'privacy-first' | 'performance-first' | 'cost-first'
  }
  
  async rewrite(text, instruction) {
    const decision = this.decide({
      action: 'rewrite',
      textLength: text.length,
      sensitivity: this.estimateSensitivity(text)
    });
    
    if (decision.useLocal) {
      try {
        return await this.local.rewrite(text, instruction);
      } catch (error) {
        if (decision.allowFallback) {
          console.warn("Local failed, falling back to cloud");
          if (!this.cloud) {
            const config = window.__AI_CONFIG__ || {};
            this.cloud = new CloudAI(config);
          }
          return await this.cloud.rewrite(text, instruction);
        }
        throw error;
      }
    } else {
      if (!this.cloud) {
        const config = window.__AI_CONFIG__ || {};
        this.cloud = new CloudAI(config);
      }
      return await this.cloud.rewrite(text, instruction);
    }
  }
  
  decide({ action, textLength, sensitivity }) {
    switch (this.strategy) {
      case 'privacy-first':
        // 优先本地，敏感数据禁止云端
        return {
          useLocal: true,
          allowFallback: sensitivity < 0.5
        };
      
      case 'performance-first':
        // 长文本用云端（更快）
        return {
          useLocal: textLength < 1000,
          allowFallback: true
        };
      
      case 'cost-first':
        // 始终本地
        return {
          useLocal: true,
          allowFallback: false
        };
    }
  }
  
  estimateSensitivity(text) {
    // 简化的敏感度评估
    const patterns = [
      /password/i,
      /ssn/i,
      /credit card/i,
      /\b\d{16}\b/
    ];
    
    const matches = patterns.filter(p => p.test(text)).length;
    return matches / patterns.length; // 0-1
  }
}
```

## 未来展望

### WebNN 标准化进展

**Web Neural Network API**（W3C 标准草案）：

```javascript
// 未来可能的 WebNN API
const context = await navigator.ml.createContext();

const builder = new MLGraphBuilder(context);
const input = builder.input('input', { type: 'float32', dimensions: [1, 512] });
const output = builder.add(input, builder.constant(/* weights */));

const graph = await builder.build({ output });
const results = await context.compute(graph, { input: inputTensor });
```

**与 Built-in AI 的关系**：
- WebNN：底层神经网络加速 API
- Built-in AI：高层语言模型 API
- 未来可能融合（Built-in AI 基于 WebNN 实现）

### 更多浏览器厂商支持

**当前状态**（2026 年 3 月）：
- ✅ Chrome/Edge：Gemini Nano 部分稳定
- ⏳ Safari：Web ML 实验特性（需开启 flag）
- ⏳ Firefox：讨论中，未实现

**预期**（2026-2027）：
- Safari 可能推出自己的 API（基于 Apple Neural Engine）
- Firefox 可能支持标准化后的 API
- 跨浏览器标准化（W3C WebML Community Group）

### 模型自定义与微调

**当前限制**：
- 只能使用 Google 提供的 Gemini Nano
- 无法自定义模型权重
- 无法微调（fine-tune）

**未来可能**：
1. **Model Hub**：浏览器内置模型商店，选择不同模型
2. **自定义模型**：上传自己的 TFLite 模型
3. **微调 API**：在浏览器中微调小型模型

**技术挑战**：
- 安全性（恶意模型）
- 存储空间（多个大模型）
- 兼容性（跨设备性能差异）

### 浏览器 AI 在 WebAssembly 生态中的角色

**整合方向**：

```javascript
// 未来可能：WASM + Built-in AI
import { loadModel } from '@tensorflow/tfjs-wasm';

// 对于简单任务，使用浏览器内置 AI
const builtInAI = await LanguageModel.create();

// 对于复杂任务，使用 WASM + 自定义模型
const customModel = await loadModel('path/to/model.wasm');

// 混合使用
const result = await hybridInference(builtInAI, customModel, input);
```

**优势**：
- 内置 AI：快速启动，通用能力
- WASM 模型：专业领域，自定义能力
- 混合架构：发挥各自优势

## 总结

Chrome Built-in AI 为前端开发者打开了本地智能化的大门：

**核心优势**：
1. **隐私优先**：数据不出浏览器，符合严格隐私法规
2. **零网络延迟**：实时响应，离线可用
3. **成本优化**：节省云端 API 调用费用

**生产就绪状态**：
- ⚠️ **部分稳定**：Translator/Summarizer/Language Detector 已 stable
- ⚠️ **部分实验**：Prompt API 在 Web 端仍为 Origin Trial
- ✅ 性能可接受（WebGPU 加速）
- ✅ 工具链成熟（降级方案、错误处理）
- ⚠️ 硬件要求高（22GB 存储、4GB VRAM）

**适用场景**：
- 敏感数据处理（医疗、法律、金融）
- 实时交互应用（写作助手、聊天机器人）
- 离线优先应用（PWA、移动 Web）
- 成本敏感场景（高频 AI 调用）

**限制与挑战**：
- 硬件门槛高，不适用于所有用户
- 部分 API 仍在实验阶段，可能变更
- 移动端支持有限（Android/iOS 限制）

**下一步**：
- 尝试在项目中集成 Translator/Summarizer API（已稳定）
- 关注 Prompt API 的 Web 端稳定化进展
- 构建隐私优先的 AI 功能
- 关注 WebNN 标准化进展
- 探索混合架构设计

浏览器原生 AI 不是云端 AI 的替代品，而是隐私、性能、成本三者平衡的新选择。根据具体场景选择合适的技术方案，才能发挥最大价值。

---

**相关阅读**：
- [AI Agent 驱动开发：从工具到工作流的范式转变](https://chenguangliang.com/posts/blog078_ai-agent-driven-development/) - 对比 Agent 与浏览器 AI 的应用场景
- [构建 AI 开发助手：从零到生产的完整实践](https://chenguangliang.com/posts/blog073_build-ai-dev-assistant/) - 本地化 AI 能力的另一种实现路径

**延伸阅读**：
- [Chrome Built-in AI 官方文档](https://developer.chrome.com/docs/ai/built-in-apis)
- [Web Neural Network API Explainer](https://github.com/webmachinelearning/webnn)
- [Gemini Nano Technical Report](https://ai.google.dev/gemini-api/docs/models/gemini#gemini-nano)
