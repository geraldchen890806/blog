---
title: "Browser-Native AI in Practice: The Complete Guide to Chrome Built-in AI APIs"
pubDatetime: 2026-03-11T10:00:00+08:00
description: "A deep dive into Chrome's built-in Gemini Nano model and the browser-native AI APIs (Prompt, Translation, Summarization) — from technical architecture to production practice, showing how to build privacy-first local AI apps, with complete code examples and performance analysis."
author: Gerald Chen
featured: true
tags:
  - AI
  - 前端
  - 开发效率
---

> ⚠️ **Important note**: As of this writing (March 2026), some of these APIs are still in Origin Trial or early stages. The API status described here is based on Chrome's official documentation and roadmap; actual release timing and API design may change. Hardware requirements and performance numbers are based on currently available information — always refer to the [official Chrome Built-in AI documentation](https://developer.chrome.com/docs/ai/built-in-apis).

In 2026, browser-native AI is moving from experimental feature to production-ready. Chrome's built-in Gemini Nano model lets frontend developers ship intelligent features without a backend server, delivering true "data never leaves the browser" privacy.

This article takes a deep look at the technical architecture of Chrome Built-in AI, its API design, and real-world use cases, with complete code examples showing how to build a privacy-first local AI application.

## Why Browser-Native AI?

### The Pain Points of Traditional Cloud AI

**Privacy**:
- Sensitive user input (medical records, financial information, private conversations) has to be uploaded to the cloud
- Privacy regulations like GDPR and CCPA add compliance costs
- User concerns about data security hurt product adoption

**Performance and cost**:
- Network latency (RTT + model inference time)
- API call costs (billed per token)
- Bandwidth consumption (especially on mobile networks)

**Availability limits**:
- Unusable offline
- Poor experience on unstable networks
- Dependent on external service availability

### The Advantages of In-Browser AI

**Privacy first**:
- Data is processed entirely on-device, never uploaded to the cloud
- Fits a zero-trust security model
- Well suited to sensitive content (medical, legal, financial)

**Better performance**:
- Zero network latency (only local inference time)
- Works offline
- Cuts cloud API costs

**User experience**:
- Real-time responses (inference as you type)
- No waiting on network requests
- A visible privacy story builds user trust

### The Evolution of Chrome Built-in AI

| Phase | Timeline | Highlights |
|------|------|------|
| Announced | 2024 Q2 | Google I/O unveils the Chrome Built-in AI program |
| Origin Trial | 2024 Q3-Q4 | Prompt API developer preview, behind a flag |
| Partially stable | 2025 Q2-Q3 | Chrome 138 - Translator/Summarizer/Language Detector reach stable |
| Prompt API stable | 2025-2026 | Stable in Extensions; still in Origin Trial on the web |

**Current status** (March 2026):
- Chrome 138+ supported
- **Prompt API**: stable in Extensions, still in Origin Trial on the web (requires registration or a flag)
- **Translator/Summarizer/Language Detector**: stable
- **Writer/Rewriter/Proofreader**: still in Origin Trial
- Gemini Nano model size: ~1.5GB (first-time download, happens in the background)
- Multiple language pairs supported for translation (the exact number depends on downloadable language packs)

## Hardware Requirements and Limitations

Before using Chrome Built-in AI, you should know the following hardware and environment constraints (source: Chrome official docs):

### Minimum Hardware Requirements

**Storage**:
- ≥ 22GB of free space (for downloading and caching models)

**GPU mode** (recommended):
- GPU VRAM > 4GB
- A graphics card with WebGPU support

**CPU mode** (fallback):
- RAM ≥ 16GB
- CPU ≥ 4 cores

### Platform Limitations

**Supported platforms**:
- ✅ Windows (x64)
- ✅ macOS (Intel and Apple Silicon)
- ✅ Linux (x64)
- ✅ Chrome OS

**Unsupported platforms**:
- ❌ Android (Prompt API and related features)
- ❌ iOS (browser restrictions)

### Network Requirements

- **First use**: requires a network connection to download the model (~1.5GB)
- **Subsequent use**: fully offline-capable
- **Model updates**: checked and downloaded automatically in the background (Chrome Component Updater)

**Implication**: these constraints mean Chrome Built-in AI is better suited to desktop apps and high-end devices, not every user scenario.

## A Deep Dive into the Technical Architecture

### How Gemini Nano Is Integrated

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
│  │   - Presumed: TFLite format              │  │
│  │   - Presumed: quantized to INT8/INT4     │  │
│  │   - WebGPU-accelerated inference         │  │
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
│   - GPU-accelerated inference (preferred)        │
│   - CPU fallback (when GPU is unavailable)       │
└─────────────────────────────────────────────────┘
```

**Key technical points**:

1. **Model format**: Google has not disclosed the exact format; it is presumed to be TensorFlow Lite (TFLite) with quantization optimizations
2. **Acceleration**: WebGPU first, falling back to CPU (WASM SIMD)
3. **Memory management**: LRU caching to avoid memory blowups
4. **Persistence**: the model is managed by the Chrome Component Updater; you can inspect its status at `chrome://on-device-internals`

### The WebGPU Acceleration Path

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

**Performance comparison** (estimated, based on community reports, M2 Mac):
- WebGPU inference: ~50ms/token
- CPU inference: ~200ms/token
- Speedup: 4x

### Capability Detection and Fallback Strategy

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

## Core APIs in Detail

### Prompt API: General-Purpose Text Generation

**Initializing a session**:

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

**Text generation (streaming)**:

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

**Batch generation (non-streaming)**:

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

**Session management**:

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

### Translation API: Offline Translation

**Checking translation support**:

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

**Creating a translator**:

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

**Running a translation**:

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

**Supported language pairs** (partial examples):

| Source language | Target language | Model size |
|--------|----------|----------|
| en | zh | ~50MB (estimated) |
| en | es | ~45MB (estimated) |
| zh | en | ~50MB (estimated) |
| ja | en | ~48MB (estimated) |
| ... | ... | ... |

The exact number of supported language pairs depends on downloadable language packs; check with `Translator.availability()`.

### Language Detector API: Automatic Language Detection

**Auto-detecting the source language** (Chrome 138+):

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

### Summarization API: Text Summarization

**Creating a summarizer**:

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

**Generating a summary**:

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

**Summary type examples**:

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

### Writer & Rewriter API (Origin Trial)

**Rewriting text**:

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

## Hands-On: Building a Local Smart Editor

### Requirements

**Goal**: build a privacy-first writing assistant where all AI processing happens locally.

**Core features**:
1. Real-time grammar checks and rewrite suggestions
2. Smart continuation (context-aware)
3. Multilingual translation (with auto-detected source language)
4. One-click summary generation

**Tech choices**:
- UI framework: Web Components (no dependencies, lightweight)
- AI capabilities: Chrome Built-in AI API
- Storage: LocalStorage (user preferences) + IndexedDB (draft history)

### Core Implementation

**1. The AI service wrapper**

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

**2. The smart editor component**

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

**3. Usage example**

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

### Performance Optimization Strategies

**1. Request queue management**

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

**2. Response caching**

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

**3. Cancellation**

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

## Performance and Cost Analysis

### First-Load Performance

**Model download** (one-time, in the background):
- Full Gemini Nano model: ~1.5GB
- First download time (estimated):
  - Fast network (100 Mbps): ~2 minutes
  - Medium network (10 Mbps): ~20 minutes
  - Slow network (1 Mbps): ~3 hours

**Optimization strategies**:
1. **Lazy loading**: download only when the user first uses an AI feature
2. **Background download**: do not block page load; show a progress bar
3. **Incremental updates**: model updates download only the delta

**Translation/Summarization models**:
- One language pair: ~50MB (estimated)
- Downloaded on demand (triggered at use time)

### Inference Speed Comparison

**Test environment** (estimated, based on community reports):
- Device: MacBook Pro M2, 16GB RAM
- Browser: Chrome 138+
- Input length: 500 tokens

| Scenario | Local (WebGPU) | Local (CPU) | Cloud API | Notes |
|------|----------------|-------------|----------|------|
| Text rewriting | 1.2s | 4.5s | 2.8s | Includes network latency |
| Translation (EN→ZH) | 0.8s | 2.3s | 1.5s | 100 words |
| Summary generation | 1.5s | 5.2s | 3.0s | 2000-word article |
| Continuation (streaming) | 50ms/token | 200ms/token | 80ms/token | First-token latency |

**Data source**: estimates based on community reports and public benchmarks; actual performance varies by device.

**Takeaways**:
- ✅ Local WebGPU > cloud API (for short text)
- ✅ Local CPU ≈ cloud API (for long text)
- ✅ Streaming experience: local feels smoother (no network jitter)

### Cost Comparison

**Cloud API costs** (using GPT-4 Turbo as an example, 2026 pricing):
- Input: $10/1M tokens
- Output: $30/1M tokens
- Monthly usage (hypothetical): 100 rewrites × 1000 tokens = 100k tokens
- Monthly cost: ~$1.50

**Local AI costs**:
- First-time download: 1.5GB of bandwidth
- Power consumption (estimated):
  - WebGPU inference: ~10W × 2s = 0.0056 Wh/request
  - CPU inference: ~20W × 5s = 0.0278 Wh/request
- Monthly cost: $0 (ignoring electricity, roughly $0.001)

**Savings** (estimated):
- Heavy users (> 1000 requests/month): save > $10/month
- Enterprise scale (> 100k requests/month): save > $1000/month

### User Experience Optimizations

**Loading state management**:

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

**Error handling and fallback**:

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

## Privacy and Security

### How "Data Never Leaves the Browser" Works

**1. Sandbox isolation**

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
│  │   - Data processed in-process      │ │
│  │   - Never sent over the network    │ │
│  │   - Origin-isolated (per site)     │ │
│  └────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
           ❌ No network requests
```

**2. Network request monitoring**

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

### Content Security Policy Configuration

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  connect-src 'none';
">
```

**Key points**:
- `connect-src 'none'`: blocks all network requests (except built-in browser features)
- `script-src 'wasm-unsafe-eval'`: allows WebAssembly (model inference may need it)
- Make sure AI features still work under a strict CSP

### Filtering Sensitive Data

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

### GDPR/CCPA Compliance

**Advantages**:
- ✅ Data is processed on the user's device — there is no "data controller" role
- ✅ No data processing agreement (DPA) needed
- ✅ No cookie consent required (the AI features need no network)
- ✅ Automatically aligns with the "data minimization" principle

**Still worth attention**:
- Explicit user awareness (a UI hint that processing is "local AI")
- Transparency (explain the technical implementation in your privacy policy)
- The model's own privacy posture (compliance of Google's training data)

## Production Best Practices

### Feature Detection and Polyfill Strategy

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

### Error Handling and Monitoring

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

### Cross-Browser Compatibility

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

### A Hybrid Cloud/Local Architecture

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

## Looking Ahead

### WebNN Standardization Progress

**Web Neural Network API** (W3C draft standard):

```javascript
// 未来可能的 WebNN API
const context = await navigator.ml.createContext();

const builder = new MLGraphBuilder(context);
const input = builder.input('input', { type: 'float32', dimensions: [1, 512] });
const output = builder.add(input, builder.constant(/* weights */));

const graph = await builder.build({ output });
const results = await context.compute(graph, { input: inputTensor });
```

**Relationship to Built-in AI**:
- WebNN: a low-level neural network acceleration API
- Built-in AI: a high-level language model API
- They may converge in the future (Built-in AI implemented on top of WebNN)

### Broader Browser Vendor Support

**Current status** (March 2026):
- ✅ Chrome/Edge: Gemini Nano partially stable
- ⏳ Safari: Web ML experimental feature (behind a flag)
- ⏳ Firefox: under discussion, not implemented

**Expected** (2026-2027):
- Safari may ship its own API (built on the Apple Neural Engine)
- Firefox may support a standardized API
- Cross-browser standardization (W3C WebML Community Group)

### Custom Models and Fine-Tuning

**Current limitations**:
- Only the Google-provided Gemini Nano is available
- No custom model weights
- No fine-tuning

**Possible futures**:
1. **Model Hub**: a built-in browser model store with multiple model choices
2. **Custom models**: upload your own TFLite models
3. **Fine-tuning API**: fine-tune small models in the browser

**Technical challenges**:
- Security (malicious models)
- Storage (multiple large models)
- Compatibility (performance variance across devices)

### Browser AI's Role in the WebAssembly Ecosystem

**Direction of integration**:

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

**Strengths**:
- Built-in AI: fast startup, general-purpose capability
- WASM models: domain-specific, customizable
- Hybrid architecture: get the best of both

## Conclusion

Chrome Built-in AI opens the door to local intelligence for frontend developers:

**Core strengths**:
1. **Privacy first**: data never leaves the browser, satisfying strict privacy regulations
2. **Zero network latency**: real-time responses, offline-capable
3. **Cost optimization**: saves on cloud API call fees

**Production readiness**:
- ⚠️ **Partially stable**: Translator/Summarizer/Language Detector are stable
- ⚠️ **Partially experimental**: the Prompt API is still in Origin Trial on the web
- ✅ Acceptable performance (with WebGPU acceleration)
- ✅ Mature tooling story (fallback strategies, error handling)
- ⚠️ High hardware bar (22GB storage, 4GB VRAM)

**Best-fit scenarios**:
- Sensitive data processing (medical, legal, financial)
- Real-time interactive apps (writing assistants, chatbots)
- Offline-first apps (PWA, mobile web)
- Cost-sensitive scenarios (high-frequency AI calls)

**Limitations and challenges**:
- High hardware requirements rule out many users
- Some APIs are still experimental and may change
- Limited mobile support (Android/iOS restrictions)

**Next steps**:
- Try integrating the Translator/Summarizer APIs (already stable) into your projects
- Watch for the Prompt API stabilizing on the web
- Build privacy-first AI features
- Follow WebNN standardization progress
- Explore hybrid architecture designs

Browser-native AI is not a replacement for cloud AI — it is a new option that balances privacy, performance, and cost. Choosing the right approach for each specific scenario is how you extract the most value.

---

**Related reading**:
- [AI Agent-Driven Development: A Paradigm Shift from Tools to Workflows](https://chenguangliang.com/posts/blog078_ai-agent-driven-development/) - comparing the use cases of agents vs. in-browser AI
- [Building an AI Development Assistant: The Complete Journey from Zero to Production](https://chenguangliang.com/posts/blog073_build-ai-dev-assistant/) - another route to local AI capability

**Further reading**:
- [Chrome Built-in AI official documentation](https://developer.chrome.com/docs/ai/built-in-apis)
- [Web Neural Network API Explainer](https://github.com/webmachinelearning/webnn)
- [Gemini Nano Technical Report](https://ai.google.dev/gemini-api/docs/models/gemini#gemini-nano)
