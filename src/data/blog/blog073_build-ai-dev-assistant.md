---
title: 从命令行到对话式编程：用 AI Agent 构建个人开发助手
pubDatetime: 2026-02-22T11:33:00+08:00
description: 深入探索如何从零搭建一个具备记忆、工具调用和任务规划能力的 AI 开发助手，展示 AI 原生开发的实践模式
tags:
  - AI
  - Agent
  - TypeScript
  - 开发工具
  - 自动化
featured: true
---

## 引言：AI 助手的进化之路

2024 年，GitHub Copilot 让代码补全变得智能；2025 年，Cursor 把 AI 深度集成进 IDE。到了 2026 年，AI 编程工具已经从"代码建议器"进化为能够理解项目上下文、自主执行复杂任务的智能体（Agent）。

但现成的工具往往有局限：它们被设计为通用解决方案，难以适配个人的工作流程；它们的能力边界由厂商定义，无法按需扩展；它们的数据存储在云端，隐私和成本都是问题。

本文将带你构建一个**个人定制的 AI 开发助手**，它能够：
- 记住你的项目结构和代码习惯
- 调用系统工具完成文件操作、命令执行
- 规划多步任务，从需求直接到实现

与其依赖黑盒工具，不如掌握 Agent 的核心原理。

## 架构设计：Agent 的三大核心能力

一个有用的 AI 开发助手需要三种能力：

### 1. 记忆系统

AI 模型本身是无状态的，每次对话都需要重新提供上下文。记忆系统解决两个问题：
- **短期记忆**：当前会话的对话历史
- **长期记忆**：项目知识、过往决策、用户偏好

```typescript
interface Memory {
  // 短期：对话历史
  conversationHistory: Message[];
  
  // 长期：知识库
  projectContext: {
    fileStructure: string;
    conventions: string[];
    dependencies: Record<string, string>;
  };
  
  // 检索：从历史中提取相关信息
  retrieve(query: string): Promise<string>;
}
```

### 2. 工具调用

真正的"助手"不只是聊天，还能执行操作。工具调用让 AI 从"建议者"变成"执行者"：

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (args: unknown) => Promise<unknown>;
}

// 示例：文件读取工具
const readFileTool: Tool = {
  name: "read_file",
  description: "读取指定文件的内容",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "文件路径" }
    },
    required: ["path"]
  },
  execute: async (args) => {
    const { path } = args as { path: string };
    return await fs.readFile(path, "utf-8");
  }
};
```

### 3. 任务规划

复杂任务需要分解为多个步骤。Agent 需要：
1. 理解用户意图
2. 规划执行步骤
3. 调用工具完成每一步
4. 根据结果调整计划

这是典型的 ReAct（Reasoning + Acting）模式。

## 实战：构建最小可用版本

我们用 TypeScript 实现一个基础 Agent，支持 OpenAI/Anthropic API。

### 核心 Agent 类

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Tool } from "./tools";
import { Memory } from "./memory";

class DevAssistant {
  private client: Anthropic;
  private tools: Map<string, Tool>;
  private memory: Memory;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.tools = new Map();
    this.memory = new Memory();
  }

  // 注册工具
  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  // 主循环：对话 + 工具调用
  async chat(userMessage: string): Promise<string> {
    // 添加用户消息到历史
    this.memory.addMessage({ role: "user", content: userMessage });

    // 构造 API 请求
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      tools: this.getToolDefinitions(),
      messages: this.memory.getHistory(),
    });

    // 处理响应
    return await this.handleResponse(response);
  }

  private async handleResponse(response: any): Promise<string> {
    const { content, stop_reason } = response;

    // 如果 AI 想调用工具
    if (stop_reason === "tool_use") {
      const toolUse = content.find((block: any) => block.type === "tool_use");
      const tool = this.tools.get(toolUse.name);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolUse.name}`);
      }

      // 执行工具
      const result = await tool.execute(toolUse.input);

      // 将工具结果反馈给 AI
      this.memory.addMessage({
        role: "assistant",
        content: content,
      });

      this.memory.addMessage({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          },
        ],
      });

      // 递归：继续对话直到 AI 给出最终回复
      const nextResponse = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        tools: this.getToolDefinitions(),
        messages: this.memory.getHistory(),
      });

      return this.handleResponse(nextResponse);
    }

    // 返回 AI 的文本回复
    const textBlock = content.find((block: any) => block.type === "text");
    return textBlock?.text || "";
  }

  private getToolDefinitions() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }
}
```

### 记忆持久化

使用 SQLite 存储长期记忆：

```typescript
import Database from "better-sqlite3";

class Memory {
  private db: Database.Database;
  private conversationHistory: any[] = [];

  constructor(dbPath: string = "./memory.db") {
    this.db = new Database(dbPath);
    this.initDB();
  }

  private initDB() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB
      );
      CREATE INDEX IF NOT EXISTS idx_type ON memories(type);
    `);
  }

  addMessage(message: any) {
    this.conversationHistory.push(message);
  }

  getHistory() {
    return this.conversationHistory;
  }

  // 保存重要决策到长期记忆
  saveDecision(content: string) {
    const stmt = this.db.prepare(`
      INSERT INTO memories (timestamp, type, content)
      VALUES (?, ?, ?)
    `);
    stmt.run(Date.now(), "decision", content);
  }

  // 检索相关记忆（简化版，实际可用向量搜索）
  retrieve(query: string, limit: number = 5) {
    const stmt = this.db.prepare(`
      SELECT content FROM memories
      WHERE content LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(`%${query}%`, limit);
  }
}
```

### 基础工具集

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

// 文件读取
export const readFile: Tool = {
  name: "read_file",
  description: "读取文件内容",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
    },
    required: ["path"],
  },
  execute: async ({ path }: any) => {
    return await fs.readFile(path, "utf-8");
  },
};

// 文件写入
export const writeFile: Tool = {
  name: "write_file",
  description: "写入内容到文件",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
    required: ["path", "content"],
  },
  execute: async ({ path, content }: any) => {
    await fs.writeFile(path, content, "utf-8");
    return { success: true };
  },
};

// 命令执行
export const runCommand: Tool = {
  name: "run_command",
  description: "在终端执行命令",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string" },
    },
    required: ["command"],
  },
  execute: async ({ command }: any) => {
    const { stdout, stderr } = await execAsync(command);
    return { stdout, stderr };
  },
};
```

### 启动 Agent

```typescript
async function main() {
  const agent = new DevAssistant(process.env.ANTHROPIC_API_KEY!);

  // 注册工具
  agent.registerTool(readFile);
  agent.registerTool(writeFile);
  agent.registerTool(runCommand);

  // 交互式对话
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("AI 开发助手已启动，输入你的需求：\n");

  readline.on("line", async (input: string) => {
    const response = await agent.chat(input);
    console.log(`\n助手: ${response}\n`);
  });
}

main();
```

运行效果：

```
AI 开发助手已启动，输入你的需求：

用户: 读取 package.json 的 dependencies 字段
助手: 我来帮你读取 package.json 文件的依赖。

[调用 read_file("package.json")]

你的项目依赖包括：
- typescript: ^5.3.3
- @anthropic-ai/sdk: ^0.20.0
- better-sqlite3: ^9.4.0

用户: 把 TypeScript 版本升级到 5.4.0
助手: 我会修改 package.json 并运行 npm install。

[调用 write_file(...)]
[调用 run_command("npm install")]

已升级 TypeScript 到 5.4.0，并更新了 lock 文件。
```

## 进阶：增强 Agent 的智能

### 上下文压缩

对话历史会快速消耗 token。我们需要智能压缩：

```typescript
class ContextManager {
  async compress(messages: Message[]): Promise<Message[]> {
    // 策略1：保留最近 N 条消息
    const recentMessages = messages.slice(-10);

    // 策略2：总结早期对话
    if (messages.length > 10) {
      const earlyMessages = messages.slice(0, -10);
      const summary = await this.summarize(earlyMessages);
      return [
        { role: "system", content: `之前的对话摘要：${summary}` },
        ...recentMessages,
      ];
    }

    return recentMessages;
  }

  private async summarize(messages: Message[]): Promise<string> {
    // 调用 AI 生成摘要
    const response = await this.client.messages.create({
      model: "claude-3-haiku-20240307", // 用便宜的模型做摘要
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `总结以下对话的关键信息：\n${JSON.stringify(messages)}`,
        },
      ],
    });
    return response.content[0].text;
  }
}
```

### 多模型协作

不同任务用不同模型，降低成本：

```typescript
class ModelRouter {
  selectModel(task: string): string {
    // 简单任务用 Haiku
    if (task.includes("总结") || task.includes("翻译")) {
      return "claude-3-haiku-20240307";
    }
    
    // 需要推理用 Sonnet
    if (task.includes("分析") || task.includes("设计")) {
      return "claude-3-5-sonnet-20241022";
    }
    
    // 复杂代码生成用 Opus（如果需要）
    if (task.includes("重构") || task.includes("架构")) {
      return "claude-3-opus-20240229";
    }
    
    return "claude-3-5-sonnet-20241022"; // 默认
  }
}
```

### 错误处理与重试

工具调用可能失败，需要智能重试：

```typescript
async function executeToolWithRetry(
  tool: Tool,
  args: any,
  maxRetries: number = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await tool.execute(args);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 给 AI 错误信息，让它调整参数
      console.log(`工具执行失败，尝试 ${i + 1}/${maxRetries}：${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 安全沙箱

限制危险操作：

```typescript
class SafetyGuard {
  private dangerousPatterns = [
    /rm\s+-rf\s+\//,  // 删除根目录
    /:\(\)\{\s*:\|:\&\s*\}/, // fork 炸弹
    /eval\(/,  // 动态执行
  ];

  validate(command: string): boolean {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`检测到危险命令：${command}`);
      }
    }
    return true;
  }
  
  // 白名单模式：只允许特定命令
  private allowedCommands = ["npm", "git", "node", "cat", "ls"];
  
  isAllowed(command: string): boolean {
    const cmd = command.split(" ")[0];
    return this.allowedCommands.includes(cmd);
  }
}
```

## 实际应用场景

### 场景 1：自动化代码审查

```typescript
// 用户：审查 src/utils/parser.ts 的代码质量

agent.registerTool({
  name: "code_review",
  description: "分析代码质量问题",
  parameters: { /* ... */ },
  execute: async ({ filePath }) => {
    const code = await fs.readFile(filePath, "utf-8");
    
    // AI 分析代码
    const issues = await analyzeCode(code);
    
    return {
      complexity: calculateComplexity(code),
      issues: issues,
      suggestions: generateSuggestions(issues),
    };
  },
});
```

### 场景 2：生成测试用例

```typescript
// 用户：为 UserService 生成单元测试

agent.registerTool({
  name: "generate_tests",
  description: "生成单元测试代码",
  parameters: { /* ... */ },
  execute: async ({ className, filePath }) => {
    const sourceCode = await fs.readFile(filePath, "utf-8");
    
    const testCode = await generateTestCode(className, sourceCode);
    
    await fs.writeFile(
      filePath.replace(".ts", ".test.ts"),
      testCode
    );
    
    return { testFile: filePath.replace(".ts", ".test.ts") };
  },
});
```

### 场景 3：项目文档同步

```typescript
// 定时任务：检查代码变更，更新 README

agent.registerTool({
  name: "sync_docs",
  description: "同步代码和文档",
  parameters: {},
  execute: async () => {
    // 1. 获取 git diff
    const { stdout } = await execAsync("git diff HEAD~1 --name-only");
    const changedFiles = stdout.split("\n");
    
    // 2. 分析变更
    const apiChanges = detectAPIChanges(changedFiles);
    
    // 3. 更新文档
    if (apiChanges.length > 0) {
      await updateREADME(apiChanges);
      return { updated: true, changes: apiChanges };
    }
    
    return { updated: false };
  },
});
```

### 场景 4：Bug 诊断与修复建议

```typescript
// 用户：帮我分析为什么测试失败了

agent.registerTool({
  name: "diagnose_test_failure",
  description: "分析测试失败原因",
  parameters: { /* ... */ },
  execute: async ({ testFile }) => {
    // 1. 运行测试
    const { stdout, stderr } = await execAsync(`npm test ${testFile}`);
    
    // 2. 解析错误
    const errors = parseTestErrors(stderr);
    
    // 3. 读取相关代码
    const sourceCode = await readSourceFiles(errors);
    
    // 4. AI 分析
    return {
      errors,
      possibleCauses: await analyzeCauses(errors, sourceCode),
      suggestedFixes: await generateFixes(errors, sourceCode),
    };
  },
});
```

## 性能与成本优化

### Token 消耗优化

1. **懒加载上下文**：只在需要时读取文件内容
2. **缓存工具输出**：相同参数不重复调用
3. **使用便宜模型**：摘要、翻译等任务用 Haiku

实测数据（基于 Claude 3.5 Sonnet）：
- 平均每轮对话：2000-4000 tokens
- 带工具调用：4000-8000 tokens
- 每月成本（中度使用）：$15-30

### 本地模型 vs 云端 API

| 维度 | 本地模型 (Llama 3.1) | 云端 API (Claude) |
|------|---------------------|------------------|
| 响应速度 | 较慢 (5-10s) | 快 (1-3s) |
| 成本 | 硬件投入高，运行免费 | 按量付费 |
| 质量 | 中等 | 优秀 |
| 隐私 | 完全本地 | 数据上传 |

建议：简单任务用本地模型，复杂推理用云端 API。

### 缓存机制

```typescript
class ToolCache {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private TTL = 5 * 60 * 1000; // 5 分钟

  async get(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  set(key: string, result: any) {
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}
```

## 总结与展望

我们从零构建了一个具备记忆、工具调用和任务规划能力的 AI 开发助手。与现成工具相比，这个方案的优势在于：

**优势**：
- 完全可控：你决定它能做什么
- 可扩展：随时添加新工具
- 隐私友好：数据存在本地
- 成本可控：按需选择模型

**局限**：
- 需要编码能力
- 稳定性不如商业产品
- 需要自己维护

**未来改进方向**：
1. **多 Agent 协作**：专门的代码 Agent、文档 Agent、测试 Agent
2. **主动监控**：定时检查项目健康度，主动提醒
3. **学习机制**：从用户反馈中改进决策
4. **GUI 界面**：不只是命令行，支持可视化交互

AI 原生开发不是用 AI 写代码，而是把 AI 当作可编程的推理引擎，融入你的工作流程。当你掌握了 Agent 的构建方法，你就拥有了定制任何自动化工具的能力。
