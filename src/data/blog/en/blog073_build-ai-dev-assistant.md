---
title: "From Command Line to Conversational Programming: Building a Personal Dev Assistant with AI Agents"
pubDatetime: 2026-02-22T11:33:00+08:00
description: "A deep dive into building an AI dev assistant from scratch with memory, tool calling, and task planning — a hands-on look at AI-native development patterns"
author: Gerald Chen
tags:
  - AI
  - AI Agent
  - 自动化
  - 开发效率
featured: true
---

## Introduction: The Evolution of AI Assistants

In 2024, GitHub Copilot made code completion smart. In 2025, Cursor integrated AI deep into the IDE. By 2026, AI coding tools have evolved from "code suggesters" into agents that understand project context and autonomously execute complex tasks.

But off-the-shelf tools come with limitations: they're designed as one-size-fits-all solutions that rarely fit your personal workflow; their capability boundaries are defined by the vendor and can't be extended on demand; and your data lives in the cloud, raising both privacy and cost concerns.

This article walks you through building a **personally tailored AI dev assistant** that can:
- Remember your project structure and coding conventions
- Call system tools to handle file operations and command execution
- Plan multi-step tasks, going from requirement straight to implementation

Rather than depending on black-box tools, it's better to master the core principles of agents yourself.

## Architecture: The Three Core Capabilities of an Agent

A useful AI dev assistant needs three capabilities:

### 1. Memory System

AI models are stateless by nature — every conversation requires you to re-supply the context. A memory system solves two problems:
- **Short-term memory**: the conversation history of the current session
- **Long-term memory**: project knowledge, past decisions, user preferences

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

### 2. Tool Calling

A real "assistant" doesn't just chat — it takes action. Tool calling turns the AI from an advisor into an executor:

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

### 3. Task Planning

Complex tasks need to be broken down into steps. The agent has to:
1. Understand the user's intent
2. Plan the execution steps
3. Call tools to complete each step
4. Adjust the plan based on results

This is the classic ReAct (Reasoning + Acting) pattern.

## Hands-On: Building a Minimal Viable Version

We'll implement a basic agent in TypeScript that works with the OpenAI/Anthropic APIs.

### The Core Agent Class

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

### Persisting Memory

Use SQLite to store long-term memory:

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

### A Basic Tool Set

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

### Starting the Agent

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

What it looks like in action:

```
AI dev assistant is up. Type your request:

User: Read the dependencies field in package.json
Assistant: Let me read the dependencies from package.json for you.

[calling read_file("package.json")]

Your project dependencies are:
- typescript: ^5.3.3
- @anthropic-ai/sdk: ^0.20.0
- better-sqlite3: ^9.4.0

User: Upgrade TypeScript to 5.4.0
Assistant: I'll modify package.json and run npm install.

[calling write_file(...)]
[calling run_command("npm install")]

TypeScript has been upgraded to 5.4.0 and the lock file is updated.
```

## Going Further: Making the Agent Smarter

### Context Compression

Conversation history burns through tokens fast. We need smart compression:

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

### Multi-Model Collaboration

Use different models for different tasks to cut costs:

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

### Error Handling and Retries

Tool calls can fail, so we need intelligent retries:

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

### Safety Sandbox

Block dangerous operations:

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

## Real-World Use Cases

### Use Case 1: Automated Code Review

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

### Use Case 2: Generating Test Cases

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

### Use Case 3: Keeping Project Docs in Sync

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

### Use Case 4: Bug Diagnosis and Fix Suggestions

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

## Performance and Cost Optimization

### Reducing Token Consumption

1. **Lazy-load context**: only read file contents when actually needed
2. **Cache tool output**: don't re-run calls with identical arguments
3. **Use cheaper models**: route summarization, translation, and similar tasks to Haiku

Real-world numbers (with Claude 3.5 Sonnet):
- Average per conversation turn: 2000-4000 tokens
- With tool calls: 4000-8000 tokens
- Monthly cost (moderate usage): $15-30

### Local Models vs. Cloud APIs

| Dimension | Local model (Llama 3.1) | Cloud API (Claude) |
|------|---------------------|------------------|
| Response speed | Slower (5-10s) | Fast (1-3s) |
| Cost | High hardware investment, free to run | Pay-as-you-go |
| Quality | Moderate | Excellent |
| Privacy | Fully local | Data uploaded |

Recommendation: use local models for simple tasks and cloud APIs for complex reasoning.

### Caching

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

## Wrapping Up and Looking Ahead

We've built an AI dev assistant from scratch with memory, tool calling, and task planning. Compared to off-the-shelf tools, this approach has clear advantages:

**Strengths**:
- Full control: you decide what it can do
- Extensible: add new tools whenever you want
- Privacy-friendly: data stays local
- Cost-controllable: pick models on demand

**Limitations**:
- Requires coding skills
- Less stable than commercial products
- You maintain it yourself

**Future directions**:
1. **Multi-agent collaboration**: dedicated code, docs, and testing agents
2. **Proactive monitoring**: scheduled project health checks with proactive alerts
3. **Learning loops**: improving decisions from user feedback
4. **A GUI**: not just the command line — visual interaction too

AI-native development isn't about having AI write code for you — it's about treating AI as a programmable reasoning engine woven into your workflow. Once you know how to build agents, you have the power to craft any automation tool you need.
