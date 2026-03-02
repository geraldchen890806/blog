---
title: 构建具有长期记忆的 AI Agent：从设计模式到生产实践
pubDatetime: 2026-03-02T10:00:00+08:00
description: 深入探讨如何为 AI Agent 构建情景记忆、语义记忆、过程记忆三种长期记忆系统，包含完整技术架构设计、代码实现和生产优化方案。
featured: true
tags:
  - AI Agent
  - 长期记忆
  - 向量数据库
  - LangChain
  - 架构设计
---

2025 年，我们习惯了 ChatGPT 能记住对话上下文。2026 年，AI Agent 需要的不只是"记住刚才说了什么"，而是"记住三个月前的决策"、"理解用户的长期偏好"、"从错误中学习"。

这不是简单的聊天记录存储，而是一个完整的记忆系统设计。

## 为什么 Agent 需要记忆？

### 当前的困境：健忘的助手

想象一个场景：

```text
第 1 天：
你：帮我部署博客，记得用 rsync 而不是 scp
Agent：好的，已记录。使用 rsync 部署。

第 30 天：
你：帮我部署博客
Agent：好的，我用 scp 部署... （忘记了你的偏好）
```

这是因为大多数 Agent 只有"短期记忆"（当前对话窗口），而缺少"长期记忆"。

### 三种记忆类型

认知科学将人类记忆分为三类，AI Agent 同样需要：

**1. 情景记忆（Episodic Memory）**
- **定义**：特定时间、地点发生的事件
- **示例**："2026 年 2 月 13 日，部署失败因为忘记提交 dist 文件夹"
- **用途**：回顾历史对话、避免重复错误

**2. 语义记忆（Semantic Memory）**
- **定义**：一般性的知识和概念
- **示例**："用户偏好使用 rsync 而不是 scp"、"博客框架是 Astro"
- **用途**：理解用户偏好、项目配置、领域知识

**3. 过程记忆（Procedural Memory）**
- **定义**：如何做某事的技能
- **示例**："部署博客的正确步骤：构建 → 提交 dist → 推送 GitHub → 服务器拉取"
- **用途**：优化工作流、学习最佳实践

一个完整的 Agent 记忆系统需要同时支持这三种记忆。

## 技术架构设计

### 架构全景

```text
┌─────────────────────────────────────────────────────────────┐
│                        AI Agent                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 短期记忆     │  │ 长期记忆     │  │ 记忆管理器   │      │
│  │ (会话上下文) │  │ (向量数据库) │  │ (检索/更新)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌──────────┐       ┌──────────┐       ┌──────────┐
  │ 情景记忆 │       │ 语义记忆 │       │ 过程记忆 │
  │ (对话)   │       │ (知识)   │       │ (技能)   │
  └──────────┘       └──────────┘       └──────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                    ┌───────▼───────┐
                    │  向量数据库    │
                    │  (Chroma)     │
                    └───────────────┘
```

### 向量数据库选型

对比三种常见方案：

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **Pinecone** | 托管服务，开箱即用，性能强 | 有费用，依赖外部服务 | 生产环境，大规模数据 |
| **Chroma** | 开源免费，本地运行，易于集成 | 性能不如 Pinecone | 开发测试，中小规模 |
| **Qdrant** | 性能优秀，支持复杂过滤 | 需要自己部署维护 | 企业级，需要高性能 |

**推荐方案**：
- **开发阶段**：Chroma（本地运行，零配置）
- **生产环境**：Pinecone（稳定可靠）或 Qdrant（自托管）

### Embedding 模型选择

Embedding 是将文本转换为向量的过程，直接影响检索质量：

```typescript
// OpenAI Embedding（推荐用于生产）
{
  model: "text-embedding-3-small",
  dimensions: 1536,
  cost: "$0.02 / 1M tokens",
  quality: "优秀",
  speed: "快"
}

// 本地 Embedding（适合隐私敏感场景）
{
  model: "sentence-transformers/all-MiniLM-L6-v2",
  dimensions: 384,
  cost: "免费（本地运行）",
  quality: "良好",
  speed: "中等"
}
```

**成本对比**：

```text
假设每天存储 100 条记忆，每天检索 50 次，运行 1 年：

OpenAI Embeddings + Chroma（本地）：
- 存储 Embedding：36,500 条 × 50 tokens = 1.825M tokens
  → $0.02 / 1M × 1.825 = $0.0365
- 检索 Embedding：18,250 次 × 20 tokens = 365K tokens
  → $0.02 / 1M × 0.365 = $0.0073
- 向量存储（Chroma 本地）：免费（磁盘占用 ~224 MB）
- 总成本：~$0.044/年（几乎免费）

OpenAI Embeddings + Pinecone（托管）：
- Embedding API：$0.044/年（同上）
- 向量存储：0.037M 向量 × $70/M ≈ $2.59/月 ≈ $31/年
- 总成本：~$31/年

本地模型（全免费）：
- Embedding：免费（但需要 GPU，推荐 sentence-transformers）
- 向量存储：免费（Chroma 本地）
- 成本：$0，但需要自己维护模型

结论：
- 低成本方案：OpenAI + Chroma 本地（$0.044/年）
- 零运维方案：OpenAI + Pinecone（$31/年）
- 完全自托管：本地模型 + Chroma（$0，需要技术能力）
```

### 记忆检索策略

检索不只是"找到最相似的"，还需要考虑时间、重要性等因素：

```typescript
interface RetrievalStrategy {
  // 1. 混合检索：向量相似度 + 关键词匹配
  hybrid: {
    vectorWeight: 0.7,    // 语义相似度
    keywordWeight: 0.3    // 精确匹配
  },
  
  // 2. 时间衰减：最近的记忆权重更高
  temporalDecay: {
    enabled: true,
    halfLifeDays: 30      // 30 天后权重减半
  },
  
  // 3. 重要性加权：关键事件优先
  importanceBoost: {
    error: 1.5,           // 错误记录 × 1.5
    decision: 1.3,        // 决策记录 × 1.3
    preference: 1.2       // 用户偏好 × 1.2
  },
  
  // 4. 去重：避免返回相似内容
  mmr: {                  // Maximal Marginal Relevance
    enabled: true,
    lambda: 0.7           // 相似度与多样性的平衡
  }
}
```

## 代码实现

### 第一步：初始化记忆系统

```typescript
// memory-system.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

interface MemoryConfig {
  collectionName: string;
  embeddingModel?: string;
  chromaUrl?: string;
}

class LongTermMemory {
  private vectorStore: Chroma;
  private embeddings: OpenAIEmbeddings;
  
  constructor(config: MemoryConfig) {
    // 初始化 Embedding 模型
    this.embeddings = new OpenAIEmbeddings({
      modelName: config.embeddingModel || "text-embedding-3-small",
      dimensions: 1536
    });
    
    // 初始化向量数据库
    this.vectorStore = new Chroma(this.embeddings, {
      collectionName: config.collectionName,
      url: config.chromaUrl || "http://localhost:8000"
    });
  }
  
  // 存储记忆
  async store(memory: Memory): Promise<void> {
    const doc = new Document({
      pageContent: memory.content,
      metadata: {
        type: memory.type,        // episodic | semantic | procedural
        timestamp: Date.now(),
        importance: memory.importance || 1.0,
        tags: memory.tags || []
      }
    });
    
    await this.vectorStore.addDocuments([doc]);
  }
  
  // 检索记忆
  async retrieve(query: string, options?: RetrievalOptions): Promise<Memory[]> {
    const results = await this.vectorStore.similaritySearchWithScore(
      query,
      options?.limit || 5
    );
    
    // 应用时间衰减
    const withDecay = this.applyTemporalDecay(results);
    
    // 应用重要性加权
    const withBoost = this.applyImportanceBoost(withDecay);
    
    // 去重
    const deduplicated = this.applyMMR(withBoost);
    
    return deduplicated.map(r => ({
      content: r.document.pageContent,
      type: r.document.metadata.type,
      score: r.score,
      timestamp: r.document.metadata.timestamp,
      tags: r.document.metadata.tags
    }));
  }
  
  private applyTemporalDecay(
    results: Array<{ document: Document; score: number }>
  ): Array<{ document: Document; score: number }> {
    const now = Date.now();
    const halfLife = 30 * 24 * 60 * 60 * 1000; // 30 天
    
    return results.map(r => {
      const age = now - r.document.metadata.timestamp;
      const decay = Math.pow(0.5, age / halfLife);
      return {
        ...r,
        score: r.score * decay
      };
    });
  }
  
  private applyImportanceBoost(
    results: Array<{ document: Document; score: number }>
  ): Array<{ document: Document; score: number }> {
    const boostMap = {
      error: 1.5,
      decision: 1.3,
      preference: 1.2
    };
    
    return results.map(r => {
      const importance = r.document.metadata.importance || 1.0;
      const tags = r.document.metadata.tags || [];
      
      let boost = 1.0;
      for (const tag of tags) {
        boost = Math.max(boost, boostMap[tag as keyof typeof boostMap] || 1.0);
      }
      
      return {
        ...r,
        score: r.score * importance * boost
      };
    });
  }
  
  private applyMMR(
    results: Array<{ document: Document; score: number }>
  ): Array<{ document: Document; score: number }> {
    // Maximal Marginal Relevance 去重算法
    const lambda = 0.7; // 相似度与多样性的平衡
    const selected: typeof results = [];
    const remaining = [...results];
    
    // 选择得分最高的作为第一个
    if (remaining.length > 0) {
      selected.push(remaining.shift()!);
    }
    
    while (remaining.length > 0 && selected.length < 5) {
      let maxScore = -Infinity;
      let maxIndex = 0;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // 计算与已选择项的最大相似度
        const maxSimilarity = Math.max(
          ...selected.map(s => 
            this.jaccardSimilarity(
              candidate.document.pageContent,
              s.document.pageContent
            )
          )
        );
        
        // MMR 得分 = λ × 相关性 - (1-λ) × 相似度
        const mmrScore = lambda * candidate.score - (1 - lambda) * maxSimilarity;
        
        if (mmrScore > maxScore) {
          maxScore = mmrScore;
          maxIndex = i;
        }
      }
      
      selected.push(remaining.splice(maxIndex, 1)[0]);
    }
    
    return selected;
  }
  
  private jaccardSimilarity(text1: string, text2: string): number {
    // Jaccard 相似度：交集 / 并集
    const set1 = new Set(text1.toLowerCase().split(""));
    const set2 = new Set(text2.toLowerCase().split(""));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
}

interface Memory {
  content: string;
  type: "episodic" | "semantic" | "procedural";
  importance?: number;
  tags?: string[];
  timestamp?: number;
  score?: number;
}

interface RetrievalOptions {
  limit?: number;
  type?: Memory["type"];
  tags?: string[];
}

export { LongTermMemory, Memory };
```

### 第二步：实现情景记忆

情景记忆存储具体的对话事件：

```typescript
// episodic-memory.ts
import { LongTermMemory, Memory } from "./memory-system";

class EpisodicMemory {
  private memory: LongTermMemory;
  
  constructor(memory: LongTermMemory) {
    this.memory = memory;
  }
  
  // 存储对话
  async storeConversation(
    userMessage: string,
    agentResponse: string,
    context?: Record<string, any>
  ): Promise<void> {
    const memory: Memory = {
      content: `User: ${userMessage}\nAgent: ${agentResponse}`,
      type: "episodic",
      importance: this.calculateImportance(userMessage, agentResponse),
      tags: this.extractTags(userMessage, agentResponse, context),
      timestamp: Date.now()
    };
    
    await this.memory.store(memory);
  }
  
  // 检索相关对话
  async recallSimilarConversations(
    query: string,
    limit: number = 3
  ): Promise<Memory[]> {
    return await this.memory.retrieve(query, {
      limit,
      type: "episodic"
    });
  }
  
  private calculateImportance(user: string, agent: string): number {
    let importance = 1.0;
    
    // 包含错误信息的对话更重要
    if (agent.includes("错误") || agent.includes("失败")) {
      importance *= 1.5;
    }
    
    // 包含决策的对话更重要
    if (user.includes("记住") || user.includes("偏好")) {
      importance *= 1.3;
    }
    
    // 长对话可能包含更多信息
    const totalLength = user.length + agent.length;
    if (totalLength > 500) {
      importance *= 1.2;
    }
    
    return importance;
  }
  
  private extractTags(
    user: string,
    agent: string,
    context?: Record<string, any>
  ): string[] {
    const tags: string[] = [];
    
    // 从内容提取标签
    if (agent.includes("错误") || agent.includes("失败")) {
      tags.push("error");
    }
    
    if (user.includes("记住") || user.includes("偏好")) {
      tags.push("preference");
    }
    
    if (agent.includes("部署") || agent.includes("发布")) {
      tags.push("deployment");
    }
    
    // 从上下文提取标签
    if (context?.action) {
      tags.push(context.action);
    }
    
    return tags;
  }
}

export { EpisodicMemory };
```

### 第三步：实现语义记忆

语义记忆提取和存储一般性知识：

```typescript
// semantic-memory.ts
import { LongTermMemory, Memory } from "./memory-system";

class SemanticMemory {
  private memory: LongTermMemory;
  private knowledgeGraph: Map<string, Set<string>> = new Map();
  
  constructor(memory: LongTermMemory) {
    this.memory = memory;
  }
  
  // 存储知识
  async storeKnowledge(
    subject: string,
    predicate: string,
    object: string
  ): Promise<void> {
    // 存储为三元组（Subject-Predicate-Object）
    const memory: Memory = {
      content: `${subject} ${predicate} ${object}`,
      type: "semantic",
      importance: 1.2, // 知识默认较重要
      tags: ["knowledge", subject.toLowerCase()],
      timestamp: Date.now()
    };
    
    await this.memory.store(memory);
    
    // 更新知识图谱
    this.updateKnowledgeGraph(subject, predicate, object);
  }
  
  // 存储用户偏好
  async storePreference(
    preference: string,
    context?: string
  ): Promise<void> {
    const memory: Memory = {
      content: context 
        ? `Preference: ${preference} (Context: ${context})`
        : `Preference: ${preference}`,
      type: "semantic",
      importance: 1.3,
      tags: ["preference"],
      timestamp: Date.now()
    };
    
    await this.memory.store(memory);
  }
  
  // 检索知识
  async recallKnowledge(query: string): Promise<Memory[]> {
    return await this.memory.retrieve(query, {
      limit: 5,
      type: "semantic"
    });
  }
  
  // 更新知识图谱
  private updateKnowledgeGraph(
    subject: string,
    predicate: string,
    object: string
  ): void {
    const key = `${subject}:${predicate}`;
    
    if (!this.knowledgeGraph.has(key)) {
      this.knowledgeGraph.set(key, new Set());
    }
    
    this.knowledgeGraph.get(key)!.add(object);
  }
  
  // 查询知识图谱
  queryGraph(subject: string, predicate: string): string[] {
    const key = `${subject}:${predicate}`;
    return Array.from(this.knowledgeGraph.get(key) || []);
  }
}

export { SemanticMemory };
```

### 第四步：实现过程记忆

过程记忆学习和优化技能：

```typescript
// procedural-memory.ts
import { LongTermMemory, Memory } from "./memory-system";

class ProceduralMemory {
  private memory: LongTermMemory;
  private skillRegistry: Map<string, Skill> = new Map();
  
  constructor(memory: LongTermMemory) {
    this.memory = memory;
  }
  
  // 存储技能
  async storeSkill(
    name: string,
    steps: string[],
    successRate?: number
  ): Promise<void> {
    const skill: Skill = {
      name,
      steps,
      successRate: successRate || 0,
      attempts: 0,
      lastUsed: Date.now()
    };
    
    this.skillRegistry.set(name, skill);
    
    const memory: Memory = {
      content: `Skill: ${name}\nSteps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      type: "procedural",
      importance: 1.0 + (successRate || 0),
      tags: ["skill", name.toLowerCase()],
      timestamp: Date.now()
    };
    
    await this.memory.store(memory);
  }
  
  // 更新技能（从反馈中学习）
  async updateSkill(
    name: string,
    success: boolean,
    feedback?: string
  ): Promise<void> {
    const skill = this.skillRegistry.get(name);
    if (!skill) return;
    
    skill.attempts += 1;
    skill.successRate = (
      skill.successRate * (skill.attempts - 1) + (success ? 1 : 0)
    ) / skill.attempts;
    skill.lastUsed = Date.now();
    
    // 如果失败，记录反馈以供改进
    if (!success && feedback) {
      const memory: Memory = {
        content: `Skill "${name}" failed: ${feedback}`,
        type: "procedural",
        importance: 1.5, // 失败记录很重要
        tags: ["skill", "error", name.toLowerCase()],
        timestamp: Date.now()
      };
      
      await this.memory.store(memory);
    }
  }
  
  // 检索最佳技能
  async getBestSkill(task: string): Promise<Skill | null> {
    const memories = await this.memory.retrieve(task, {
      limit: 3,
      type: "procedural",
      tags: ["skill"]
    });
    
    if (memories.length === 0) return null;
    
    // 从记忆中解析技能名称
    const skillName = this.extractSkillName(memories[0].content);
    return this.skillRegistry.get(skillName) || null;
  }
  
  private extractSkillName(content: string): string {
    const match = content.match(/^Skill: (.+)$/m);
    return match ? match[1] : "";
  }
}

interface Skill {
  name: string;
  steps: string[];
  successRate: number;
  attempts: number;
  lastUsed: number;
}

export { ProceduralMemory, Skill };
```

### 第五步：集成到 Agent

将三种记忆整合到 Agent 中：

```typescript
// agent-with-memory.ts
import { LongTermMemory } from "./memory-system";
import { EpisodicMemory } from "./episodic-memory";
import { SemanticMemory } from "./semantic-memory";
import { ProceduralMemory } from "./procedural-memory";

class AgentWithMemory {
  private longTermMemory: LongTermMemory;
  private episodic: EpisodicMemory;
  private semantic: SemanticMemory;
  private procedural: ProceduralMemory;
  
  constructor() {
    // 初始化记忆系统
    this.longTermMemory = new LongTermMemory({
      collectionName: "agent-memory",
      embeddingModel: "text-embedding-3-small"
    });
    
    this.episodic = new EpisodicMemory(this.longTermMemory);
    this.semantic = new SemanticMemory(this.longTermMemory);
    this.procedural = new ProceduralMemory(this.longTermMemory);
  }
  
  // 处理用户消息
  async chat(userMessage: string): Promise<string> {
    // 1. 检索相关记忆
    const relevantMemories = await this.recallRelevantContext(userMessage);
    
    // 2. 构建增强上下文
    const contextPrompt = this.buildContextPrompt(relevantMemories);
    
    // 3. 调用 LLM（这里省略实际调用）
    const agentResponse = await this.callLLM(userMessage, contextPrompt);
    
    // 4. 存储对话
    await this.episodic.storeConversation(userMessage, agentResponse);
    
    // 5. 提取并存储知识
    await this.extractAndStoreKnowledge(userMessage, agentResponse);
    
    return agentResponse;
  }
  
  private async recallRelevantContext(query: string): Promise<string[]> {
    // 混合检索：同时查询三种记忆
    const [episodicMemories, semanticMemories, proceduralMemories] = await Promise.all([
      this.episodic.recallSimilarConversations(query, 2),
      this.semantic.recallKnowledge(query),
      this.procedural.getBestSkill(query)
    ]);
    
    const context: string[] = [];
    
    // 添加相关对话
    if (episodicMemories.length > 0) {
      context.push("## Recent Conversations:");
      context.push(...episodicMemories.map(m => m.content));
    }
    
    // 添加相关知识
    if (semanticMemories.length > 0) {
      context.push("## Relevant Knowledge:");
      context.push(...semanticMemories.map(m => m.content));
    }
    
    // 添加相关技能
    if (proceduralMemories) {
      context.push("## Best Practice:");
      context.push(
        proceduralMemories.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
      );
    }
    
    return context;
  }
  
  private buildContextPrompt(memories: string[]): string {
    if (memories.length === 0) return "";
    
    return [
      "# Context from Long-Term Memory",
      "",
      ...memories,
      "",
      "Use the above context to provide a more personalized and informed response."
    ].join("\n");
  }
  
  private async callLLM(
    userMessage: string,
    context: string
  ): Promise<string> {
    // 实际项目中调用 OpenAI/Anthropic API
    // 这里返回模拟响应
    return `Response to: ${userMessage} (with context: ${context.length} chars)`;
  }
  
  private async extractAndStoreKnowledge(
    userMessage: string,
    agentResponse: string
  ): Promise<void> {
    // 检测用户偏好
    const preferenceMatch = userMessage.match(/记住|偏好|喜欢|使用(.+)而不是(.+)/);
    if (preferenceMatch) {
      await this.semantic.storePreference(userMessage);
    }
    
    // 检测新技能
    const skillMatch = userMessage.match(/如何|怎么|步骤/);
    if (skillMatch && agentResponse.includes("1.")) {
      const steps = agentResponse.match(/\d+\.\s+(.+)/g) || [];
      if (steps.length > 0) {
        await this.procedural.storeSkill(
          "Extracted Skill",
          steps.map(s => s.replace(/^\d+\.\s+/, ""))
        );
      }
    }
  }
}

export { AgentWithMemory };
```

## 生产环境优化

### 性能优化

**1. 索引优化**

```typescript
// 为常用查询字段创建索引
await vectorStore.createIndex({
  field: "metadata.type",
  indexType: "exact"
});

await vectorStore.createIndex({
  field: "metadata.timestamp",
  indexType: "range"
});
```

**2. 缓存策略**

```typescript
class MemoryCacheLayer {
  private cache: Map<string, { result: Memory[]; expiry: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 分钟
  
  async retrieve(
    query: string,
    fetcher: () => Promise<Memory[]>
  ): Promise<Memory[]> {
    const cached = this.cache.get(query);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }
    
    const result = await fetcher();
    this.cache.set(query, {
      result,
      expiry: Date.now() + this.cacheTTL
    });
    
    return result;
  }
  
  invalidate(query?: string): void {
    if (query) {
      this.cache.delete(query);
    } else {
      this.cache.clear();
    }
  }
}
```

**3. 批量处理**

```typescript
// 批量存储记忆，减少 API 调用
async function batchStoreMemories(memories: Memory[]): Promise<void> {
  const docs = memories.map(m => new Document({
    pageContent: m.content,
    metadata: {
      type: m.type,
      timestamp: m.timestamp || Date.now(),
      importance: m.importance || 1.0,
      tags: m.tags || []
    }
  }));
  
  // 一次性批量插入
  await vectorStore.addDocuments(docs);
}
```

### 成本控制

**Embedding API 调用优化**：

```typescript
class EmbeddingCache {
  private cache: Map<string, number[]> = new Map();
  
  async getEmbedding(text: string): Promise<number[]> {
    // 1. 检查缓存
    const hash = this.hashText(text);
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }
    
    // 2. 调用 API
    const embedding = await this.embeddings.embedQuery(text);
    
    // 3. 存入缓存
    this.cache.set(hash, embedding);
    
    return embedding;
  }
  
  private hashText(text: string): string {
    // 使用简单哈希（生产环境使用 crypto）
    return text.toLowerCase().replace(/\s+/g, " ");
  }
}

// 成本节省示例：
// 假设每天 1000 次查询，其中 30% 重复
// - 无缓存：1000 × $0.02 / 1M = $0.00002
// - 有缓存：700 × $0.02 / 1M = $0.000014
// 节省：30% API 调用
```

### 错误处理与降级策略

生产环境必须处理各种异常情况：向量数据库连接失败、Embedding API 限流等。

**1. 完整的错误处理实现**

```typescript
class RobustLongTermMemory {
  private vectorStore: Chroma;
  private fallbackMode: boolean = false;
  private localCache: Map<string, Memory[]> = new Map();
  private retryQueue: Memory[] = [];
  
  async store(memory: Memory): Promise<void> {
    try {
      // 尝试存储到向量数据库
      const doc = new Document({
        pageContent: memory.content,
        metadata: {
          type: memory.type,
          timestamp: Date.now(),
          importance: memory.importance || 1.0,
          tags: memory.tags || []
        }
      });
      
      await this.vectorStore.addDocuments([doc]);
      
      // 成功后退出 fallback 模式
      if (this.fallbackMode) {
        console.log("向量存储已恢复，退出 fallback 模式");
        this.fallbackMode = false;
        await this.processRetryQueue();
      }
    } catch (error) {
      console.error("向量存储失败，启用 fallback 模式:", error);
      
      // 降级策略：存入本地缓存
      this.fallbackMode = true;
      const key = `fallback_${Date.now()}`;
      this.localCache.set(key, [memory]);
      
      // 加入重试队列
      this.retryQueue.push(memory);
      
      // 异步重试（5 秒后）
      setTimeout(() => this.retryStore(memory), 5000);
    }
  }
  
  async retrieve(query: string, options?: RetrievalOptions): Promise<Memory[]> {
    // 如果在 fallback 模式，使用本地缓存
    if (this.fallbackMode) {
      console.warn("使用 fallback 缓存检索");
      return this.fallbackRetrieve(query, options?.limit || 5);
    }
    
    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        options?.limit || 5
      );
      
      return this.processResults(results);
    } catch (error) {
      console.error("向量检索失败，降级到本地缓存:", error);
      this.fallbackMode = true;
      return this.fallbackRetrieve(query, options?.limit || 5);
    }
  }
  
  private fallbackRetrieve(query: string, limit: number): Memory[] {
    // 简单的关键词匹配（降级方案）
    const allMemories = Array.from(this.localCache.values()).flat();
    const keywords = query.toLowerCase().split(/\s+/);
    
    return allMemories
      .filter(m => 
        keywords.some(kw => m.content.toLowerCase().includes(kw))
      )
      .slice(0, limit);
  }
  
  private async retryStore(memory: Memory): Promise<void> {
    try {
      await this.store(memory);
      console.log("重试存储成功");
      
      // 从重试队列移除
      const index = this.retryQueue.indexOf(memory);
      if (index > -1) {
        this.retryQueue.splice(index, 1);
      }
    } catch (error) {
      console.error("重试存储失败，保留在缓存中");
    }
  }
  
  private async processRetryQueue(): Promise<void> {
    console.log(`处理重试队列，共 ${this.retryQueue.length} 条记忆`);
    
    for (const memory of this.retryQueue) {
      await this.retryStore(memory);
    }
  }
  
  private processResults(
    results: Array<{ document: Document; score: number }>
  ): Memory[] {
    return results.map(r => ({
      content: r.document.pageContent,
      type: r.document.metadata.type,
      score: r.score,
      timestamp: r.document.metadata.timestamp,
      tags: r.document.metadata.tags
    }));
  }
}
```

**2. 健康检查与自动恢复**

```typescript
class MemoryHealthMonitor {
  private isHealthy: boolean = true;
  private lastCheckTime: number = 0;
  private checkInterval: number = 60 * 1000; // 1 分钟
  
  async checkHealth(memory: RobustLongTermMemory): Promise<boolean> {
    const now = Date.now();
    
    if (now - this.lastCheckTime < this.checkInterval) {
      return this.isHealthy;
    }
    
    try {
      // 测试写入
      await memory.store({
        content: "health_check_test",
        type: "episodic",
        timestamp: now
      });
      
      // 测试读取
      await memory.retrieve("health_check_test", { limit: 1 });
      
      this.isHealthy = true;
      this.lastCheckTime = now;
      return true;
    } catch (error) {
      console.error("健康检查失败:", error);
      this.isHealthy = false;
      this.lastCheckTime = now;
      return false;
    }
  }
}
```

**降级策略总结**：

| 故障类型 | 降级方案 | 恢复机制 |
|---------|---------|---------|
| 向量数据库不可用 | 本地缓存（关键词匹配） | 定时重试 + 自动同步 |
| Embedding API 限流 | 使用缓存的 embedding | 指数退避重试 |
| 磁盘空间不足 | 自动清理旧记忆 | 监控 + 告警 |
| 检索超时 | 返回缓存结果 | 减小检索范围 |

### 隐私与安全

**1. 敏感信息过滤**

```typescript
class PrivacyFilter {
  private sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g,           // SSN
    /\b\d{16}\b/g,                      // Credit card
    /[a-zA-Z0-9]{32,}/g,                // API keys
    /password[:=]\s*\S+/gi              // Passwords
  ];
  
  sanitize(text: string): string {
    let sanitized = text;
    
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
    
    return sanitized;
  }
}

// 在存储前过滤
async function storeMemory(content: string): Promise<void> {
  const filter = new PrivacyFilter();
  const sanitized = filter.sanitize(content);
  
  await memory.store({
    content: sanitized,
    type: "episodic",
    timestamp: Date.now()
  });
}
```

**2. 访问控制**

```typescript
class MemoryAccessControl {
  private userPermissions: Map<string, Set<string>> = new Map();
  
  async retrieve(
    userId: string,
    query: string
  ): Promise<Memory[]> {
    // 只检索用户有权限的记忆
    const permissions = this.userPermissions.get(userId) || new Set();
    
    const results = await memory.retrieve(query);
    
    return results.filter(m => 
      !m.tags || m.tags.some(tag => permissions.has(tag))
    );
  }
}
```

### 监控与调试

```typescript
class MemoryMonitor {
  private metrics = {
    storeCount: 0,
    retrieveCount: 0,
    averageRetrievalTime: 0,
    cacheHitRate: 0
  };
  
  async trackRetrieval<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await operation();
      
      this.metrics.retrieveCount += 1;
      const duration = Date.now() - start;
      
      // 更新平均检索时间
      this.metrics.averageRetrievalTime = (
        this.metrics.averageRetrievalTime * (this.metrics.retrieveCount - 1) +
        duration
      ) / this.metrics.retrieveCount;
      
      return result;
    } catch (error) {
      console.error("Memory retrieval error:", error);
      throw error;
    }
  }
  
  getMetrics() {
    return this.metrics;
  }
}
```

## 实战案例：个人助手 Agent

让我们构建一个完整的案例：能记住用户偏好的个人助手。

### 场景设计

```text
用户第 1 天：
用户：我喜欢用 VS Code，不喜欢 Vim
Agent：好的，已记住。你偏好 VS Code。

用户第 7 天：
用户：帮我推荐一个代码编辑器
Agent：基于你之前的偏好，我推荐 VS Code。你之前提到过喜欢用它而不是 Vim。

用户第 30 天：
用户：上次部署出了什么问题？
Agent：2 月 13 日，部署失败是因为忘记提交 dist 文件夹。之后我们更新了部署脚本，增加了自动检查步骤。
```

### 完整代码

```typescript
// personal-assistant.ts
import { AgentWithMemory } from "./agent-with-memory";

class PersonalAssistant extends AgentWithMemory {
  async handleUserMessage(message: string): Promise<string> {
    // 特殊处理：偏好设置
    if (this.isPreferenceSetting(message)) {
      return await this.handlePreference(message);
    }
    
    // 特殊处理：回忆请求
    if (this.isRecallRequest(message)) {
      return await this.handleRecall(message);
    }
    
    // 普通对话
    return await this.chat(message);
  }
  
  private isPreferenceSetting(message: string): boolean {
    return /喜欢|偏好|使用.+而不是/.test(message);
  }
  
  private async handlePreference(message: string): Promise<string> {
    // 提取偏好
    const match = message.match(/喜欢|偏好|使用(.+)而不是(.+)/);
    if (!match) {
      await this.semantic.storePreference(message);
      return "好的，已记住你的偏好。";
    }
    
    const [_, preferred, notPreferred] = match;
    
    await this.semantic.storeKnowledge(
      "User",
      "prefers",
      preferred.trim()
    );
    
    await this.semantic.storeKnowledge(
      "User",
      "dislikes",
      notPreferred.trim()
    );
    
    return `好的，已记住。你偏好 ${preferred.trim()}，不喜欢 ${notPreferred.trim()}。`;
  }
  
  private isRecallRequest(message: string): boolean {
    return /上次|之前|记得|还记得/.test(message);
  }
  
  private async handleRecall(message: string): Promise<string> {
    const memories = await this.episodic.recallSimilarConversations(message, 5);
    
    if (memories.length === 0) {
      return "抱歉，我没有找到相关的记忆。";
    }
    
    // 格式化记忆输出
    const formatted = memories.map((m, i) => {
      const date = new Date(m.timestamp!);
      return `${i + 1}. ${date.toLocaleDateString()} - ${m.content}`;
    }).join("\n\n");
    
    return `我找到了这些相关记忆：\n\n${formatted}`;
  }
}

// 使用示例
const assistant = new PersonalAssistant();

// 第 1 天
await assistant.handleUserMessage("我喜欢用 VS Code，不喜欢 Vim");
// → "好的，已记住。你偏好 VS Code，不喜欢 Vim。"

// 第 7 天
await assistant.handleUserMessage("帮我推荐一个代码编辑器");
// → "基于你之前的偏好，我推荐 VS Code..."

// 第 30 天
await assistant.handleUserMessage("上次部署出了什么问题？");
// → "我找到了这些相关记忆：1. 2月13日 - ..."
```

## 未来演进方向

### 1. 自适应遗忘机制

不是所有记忆都需要永久保存，需要定期清理低价值记忆：

```typescript
class AdaptiveForgetfulness {
  private memory: LongTermMemory;
  private retentionPolicy = {
    minImportance: 1.5,        // 重要度 < 1.5 可删除
    maxAge: 90,                // 最多保留 90 天
    maxCount: 10000,           // 最多保留 10000 条
    accessThreshold: 30        // 30 天内未访问可删除
  };
  
  async pruneMemories(): Promise<void> {
    console.log("开始记忆清理...");
    
    // 1. 获取所有记忆（分批获取避免内存溢出）
    const allMemories = await this.getAllMemories();
    console.log(`总记忆数：${allMemories.length}`);
    
    // 2. 筛选待删除的记忆
    const now = Date.now();
    const ageThreshold = now - this.retentionPolicy.maxAge * 24 * 60 * 60 * 1000;
    const accessThreshold = now - this.retentionPolicy.accessThreshold * 24 * 60 * 60 * 1000;
    
    const toDelete = allMemories.filter(m => {
      // 重要记忆不删除
      if (m.importance && m.importance >= this.retentionPolicy.minImportance) {
        return false;
      }
      
      // 过于陈旧（超过 90 天）
      if (m.timestamp && m.timestamp < ageThreshold) {
        return true;
      }
      
      // 长时间未访问（30 天内未访问）
      if (m.lastAccessed && m.lastAccessed < accessThreshold) {
        return true;
      }
      
      return false;
    });
    
    // 3. 如果总数超过限制，删除最旧的
    if (allMemories.length > this.retentionPolicy.maxCount) {
      const excess = allMemories.length - this.retentionPolicy.maxCount;
      const sorted = allMemories
        .filter(m => !toDelete.includes(m))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      toDelete.push(...sorted.slice(0, excess));
    }
    
    // 4. 执行删除
    console.log(`待删除记忆数：${toDelete.length}`);
    for (const memory of toDelete) {
      await this.deleteMemory(memory.id);
    }
    
    console.log(`清理完成，删除了 ${toDelete.length} 条记忆`);
    console.log(`剩余记忆数：${allMemories.length - toDelete.length}`);
  }
  
  private async getAllMemories(): Promise<Memory[]> {
    // 分批获取所有记忆（避免一次性加载过多）
    const batchSize = 1000;
    const allMemories: Memory[] = [];
    let offset = 0;
    
    while (true) {
      const batch = await this.memory.vectorStore.getDocuments({
        offset,
        limit: batchSize
      });
      
      if (batch.length === 0) break;
      
      allMemories.push(...batch.map(doc => ({
        id: doc.id,
        content: doc.pageContent,
        type: doc.metadata.type,
        timestamp: doc.metadata.timestamp,
        importance: doc.metadata.importance,
        lastAccessed: doc.metadata.lastAccessed,
        tags: doc.metadata.tags
      })));
      
      offset += batchSize;
      
      if (batch.length < batchSize) break;
    }
    
    return allMemories;
  }
  
  private async deleteMemory(id: string): Promise<void> {
    await this.memory.vectorStore.delete({ ids: [id] });
  }
}

// 使用示例：定时清理
setInterval(async () => {
  const forgetter = new AdaptiveForgetfulness();
  await forgetter.pruneMemories();
}, 7 * 24 * 60 * 60 * 1000); // 每周清理一次
```

### 2. 跨 Agent 记忆共享

多个 Agent 共享记忆库：

```typescript
class SharedMemoryPool {
  private pools: Map<string, LongTermMemory> = new Map();
  
  async shareMemory(
    fromAgent: string,
    toAgent: string,
    memoryId: string
  ): Promise<void> {
    const sourceMemory = this.pools.get(fromAgent);
    const targetMemory = this.pools.get(toAgent);
    
    if (!sourceMemory || !targetMemory) return;
    
    // 复制记忆到目标 Agent
    const memory = await sourceMemory.retrieve(memoryId);
    await targetMemory.store(memory[0]);
  }
}
```

### 3. 记忆可视化

帮助用户理解 Agent 记住了什么：

```typescript
interface MemoryVisualization {
  timeline: {
    date: string;
    events: Memory[];
  }[];
  
  knowledgeGraph: {
    nodes: { id: string; label: string }[];
    edges: { from: string; to: string; label: string }[];
  };
  
  skills: {
    name: string;
    successRate: number;
    lastUsed: Date;
  }[];
}
```

## 结语

长期记忆不是 AI Agent 的"可选功能"，而是从"工具"升级为"伙伴"的必要条件。

一个有记忆的 Agent 能够：
- **理解上下文**：不需要每次都重新解释项目背景
- **学习偏好**：自动适应你的工作习惯
- **避免错误**：记住过去的失败，不重复犯错
- **持续改进**：从每次交互中学习，变得更好

当你的 Agent 能在三个月后准确回忆起你的偏好，你就拥有了一个真正的"AI 伙伴"。

---

**相关阅读**：
- [AI Agent 记忆系统实战：OpenClaw Memory 最佳实践](https://chenguangliang.com/posts/blog074_openclaw-memory-best-practices/) - 如果你正在使用 OpenClaw 框架，可以参考这篇文章了解其内置记忆工具的配置和优化技巧。

**延伸阅读**：
- [LangChain Memory Documentation](https://js.langchain.com/docs/modules/memory/)
- [Chroma Vector Database](https://www.trychroma.com/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Cognitive Science of Memory](https://www.simplypsychology.org/memory.html)
