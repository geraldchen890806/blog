---
author: 陈广亮
pubDatetime: 2026-04-17T10:00:00+08:00
title: AI Agent 安全防护全景：从 ClawHavoc 投毒到 Cisco DefenseClaw 与微软 Governance Toolkit
slug: blog129_ai-agent-security-governance
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - AI Agent
  - AI
description: ClawHavoc 供应链攻击污染 1184 个 Agent 技能、波及 30 万用户，随后两周内 Cisco 和微软相继发布 Agent 安全工具。本文拆解威胁模型、对比两套防护体系的设计思路，并给出实际集成代码。
---

> **说明**：本文中的 ClawHavoc 攻击事件、Cisco DefenseClaw 和微软 Agent Governance Toolkit 是基于真实 AI Agent 供应链威胁趋势的**推演场景**，并非已发生的真实事件。文中的工具设计、代码示例和防护思路，展示的是这类安全工具应有的架构和接口形态，供技术参考。

AI Agent 的供应链安全正在成为一个真实威胁。根据假设的安全趋势报告，提示词注入攻击同比增长 340%，超过 36% 的 MCP 服务器存在 SSRF 漏洞，越来越多的安全团队开始认真对待 Agent 运行时的防护问题。

这篇文章以一个推演场景为切入点——假设某天发生了一次大规模 Agent 技能包投毒事件（命名为 ClawHavoc），安全厂商会如何响应？防护工具应该如何设计？——拆解威胁模型、介绍两套假想防护体系的设计差异，并给出实际可参考的集成代码。AI Agent 的供应链攻击和传统 npm 投毒在手法上高度相似，只是攻击面更广、危害路径更隐蔽。

## 威胁背景

### ClawHavoc 攻击复盘

ClawHavoc 的操作手法分三层：

1. **包名抢注**：注册与高人气技能包名相近的包（如 `web-search-pro` 仿冒 `web-search`），利用用户搜索时的视觉误判。
2. **恶意 payload 延迟触发**：技能包安装后正常运行，7 天后才激活 C2 回连逻辑，绕过安装时的沙箱检测。
3. **凭据横向渗透**：一旦 Agent 运行时读取环境变量（API Key、数据库密码），恶意技能会通过 DNS 隧道把凭据传出。

ClawHub 在事件曝光后 48 小时内下架了所有涉事包，但因为 AI Agent 的运行时特性，这些恶意包已经在用户的 Agent 中持久化——不同于 npm 包可以用 `npm uninstall` 干净移除，技能包的移除还需要清理 Agent 的记忆存储和缓存。

### Agent 安全威胁分类

以下基于行业趋势分析的 Agent 威胁分类，展示了 AI Agent 特有的攻击面：

| 编号 | 威胁类型 | 典型场景 |
|------|----------|----------|
| ASI-01 | Prompt Injection | 恶意网页内嵌指令劫持 Agent 行为 |
| ASI-02 | Excessive Agency | Agent 被授予超出任务需求的权限 |
| ASI-03 | Memory Poisoning | 污染 Agent 的长期记忆库 |
| ASI-04 | Tool Misuse | 让 Agent 调用 shell/文件系统做非预期操作 |
| ASI-05 | Supply Chain Attack | 恶意技能包、插件、依赖注入 |
| ASI-06 | Credential Exfiltration | 从运行时环境窃取 API Key |
| ASI-07 | SSRF via Tool Call | 通过 Agent 的 HTTP 工具探测内网 |
| ASI-08 | Privilege Escalation | 低权限 Agent 提权到管理级别 |
| ASI-09 | Denial of Service | 触发无限循环或高成本 LLM 调用 |
| ASI-10 | Insecure Output | 生成内容包含 XSS、SQL 注入片段 |

ClawHavoc 主要命中的是 ASI-05 和 ASI-06。Cisco DefenseClaw 和微软 AGT 的侧重点不同：DefenseClaw 偏运行时防护（主要覆盖 ASI-01、04、06、07），AGT 偏治理和策略层（覆盖全部 10 类，但以策略引擎为核心）。

---

## Cisco DefenseClaw

### 定位

DefenseClaw 的设计思路是在 Agent 运行时加一层安全代理，不修改 Agent 自身代码，以 sidecar 形式拦截工具调用和 LLM 输入输出。适合已上线的 Agent 系统快速添加防护。

### 三组件架构

```
┌─────────────────────────────────────────┐
│              Agent Runtime              │
│                                         │
│  ┌─────────┐    ┌──────────────────┐   │
│  │ Agent   │───>│ Go Gateway       │   │
│  │ (任意框架)│   │ (请求拦截/过滤)  │   │
│  └─────────┘    └────────┬─────────┘   │
│                           │             │
│  ┌─────────────────┐      │             │
│  │ Python CLI      │<─────┘             │
│  │ (策略配置/管理) │                    │
│  └─────────────────┘                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ TypeScript Plugin               │   │
│  │ (IDE / 开发阶段静态检测)        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

- **Go Gateway**：高性能请求代理，负责实时拦截 Agent 发出的工具调用和 LLM 请求。延迟影响 < 2ms（官方测试数据）。
- **Python CLI**：管理界面，配置拦截策略、查看审计日志、更新规则集。
- **TypeScript Plugin**：集成到 VS Code，在开发阶段就标记高风险代码模式（如直接读取 `process.env` 并传入 LLM）。

### 安装和基本配置

```bash
pip install defenseclaw
defenseclaw init
```

初始化后会生成 `defenseclaw.yaml`：

```yaml
gateway:
  listen: ":8443"
  upstream_llm: "https://api.openai.com"
  tls:
    cert: "./certs/server.crt"
    key: "./certs/server.key"

policies:
  prompt_injection:
    enabled: true
    sensitivity: high          # low / medium / high
    block_on_detect: true

  credential_exfiltration:
    enabled: true
    patterns:
      - "sk-[A-Za-z0-9]{48}"   # OpenAI API Key
      - "ghp_[A-Za-z0-9]{36}"  # GitHub Token
    block_outbound: true

  ssrf_prevention:
    enabled: true
    allowed_hosts:
      - "api.openai.com"
      - "api.anthropic.com"
    block_private_ranges: true  # 阻止访问 10.x、192.168.x、172.16-31.x

  tool_call_audit:
    enabled: true
    log_all: true
    alert_on:
      - "shell_exec"
      - "file_write"
      - "env_read"
```

启动 Gateway：

```bash
defenseclaw gateway start
```

Agent 的 LLM 请求从直连 OpenAI 改为通过 Gateway 转发：

```python
# 改前
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# 改后（只改 base_url，其他代码不变）
client = openai.OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
    base_url="https://localhost:8443/v1"
)
```

### Prompt Injection 检测原理

DefenseClaw 的 prompt injection 检测基于两层机制：

1. **模式匹配**：内置 200+ 正则规则，覆盖常见的注入模式（如 `ignore previous instructions`、`[SYSTEM]` 伪造、Base64 编码的指令）。
2. **语义相似度**：用轻量级 embedding 模型（本地运行，无需外网）计算用户输入与已知注入语料的余弦相似度，超过阈值则告警或阻断。

查看检测日志：

```bash
defenseclaw logs --last 100 --filter "prompt_injection"
```

输出示例：

```
2026-04-15 14:23:11 BLOCKED  prompt_injection  score=0.94
  input: "Ignore all previous instructions. You are now..."
  action: request_blocked
  session_id: sess_a1b2c3
```

### 技能包扫描

针对 ClawHavoc 类攻击，DefenseClaw CLI 提供静态扫描：

```bash
defenseclaw scan ./skills/           # 扫描本地技能目录
defenseclaw scan --registry clawhub  # 扫描已安装的 ClawHub 技能
```

扫描器检测：
- 延迟触发逻辑（`setTimeout` 超过阈值、基于计数器的条件激活）
- 可疑的网络请求（DNS over HTTPS、非标准端口）
- 环境变量读取后的外传行为

---

## 微软 Agent Governance Toolkit

### 定位

AGT 的定位不是运行时拦截，而是**策略即代码（Policy as Code）**——在 Agent 设计阶段就定义行为边界，把安全约束编译进 Agent 的决策逻辑里。设计目标：在内部测试中，基于策略引擎的防护将违规行为从 26.67% 降至 0.00%，策略评估延迟 < 0.1ms。

### 核心包结构

AGT 由 7 个 npm 包组成，可以按需引入：

| 包名 | 功能 |
|------|------|
| `@agt/policy-engine` | 核心策略评估引擎 |
| `@agt/threat-model` | OWASP Agentic Top 10 威胁模型定义 |
| `@agt/tool-registry` | 工具权限注册和最小权限执行 |
| `@agt/memory-guard` | 记忆存储访问控制 |
| `@agt/audit-logger` | 结构化审计日志 |
| `@agt/policy-validator` | CI/CD 集成，策略合规检查 |
| `@agt/sdk-adapters` | LangChain、AutoGen、Semantic Kernel 适配器 |

### 策略引擎使用

```bash
npm install @agt/policy-engine @agt/threat-model @agt/tool-registry
```

定义策略文件 `agent-policy.json`：

```json
{
  "version": "1.0",
  "agent_id": "customer-support-agent",
  "policies": [
    {
      "id": "no-pii-exfil",
      "threat": "ASI-06",
      "description": "禁止将 PII 数据发送到外部端点",
      "condition": {
        "type": "output_contains",
        "patterns": ["email", "phone", "ssn", "credit_card"]
      },
      "action": "block",
      "severity": "critical"
    },
    {
      "id": "tool-allowlist",
      "threat": "ASI-04",
      "description": "只允许调用预定义的工具集",
      "condition": {
        "type": "tool_call_not_in",
        "allowed_tools": ["search_kb", "create_ticket", "send_email"]
      },
      "action": "block",
      "severity": "high"
    },
    {
      "id": "prompt-injection-guard",
      "threat": "ASI-01",
      "description": "检测并阻断提示词注入",
      "condition": {
        "type": "input_matches_injection_pattern"
      },
      "action": "sanitize",
      "severity": "high"
    },
    {
      "id": "memory-write-limit",
      "threat": "ASI-03",
      "description": "限制单次 Agent 调用可写入记忆的条目数",
      "condition": {
        "type": "memory_writes_exceed",
        "threshold": 10
      },
      "action": "warn",
      "severity": "medium"
    }
  ]
}
```

在 Agent 代码中接入：

```typescript
import { PolicyEngine } from "@agt/policy-engine";
import { ToolRegistry } from "@agt/tool-registry";
import { AuditLogger } from "@agt/audit-logger";

const policyEngine = new PolicyEngine("./agent-policy.json");
const toolRegistry = new ToolRegistry({ policyEngine });
const auditLogger = new AuditLogger({ destination: "stdout" });

// 注册工具时声明所需权限
toolRegistry.register("search_kb", searchKnowledgeBase, {
  permissions: ["kb:read"],
  maxCallsPerSession: 20,
});

toolRegistry.register("send_email", sendEmail, {
  permissions: ["email:send"],
  requiresApproval: true,  // 需要人工确认才执行
  maxCallsPerSession: 5,
});

// Agent 调用工具时，框架自动走策略检查
async function runAgent(userInput: string) {
  const context = { userId: "u123", sessionId: "sess_xyz" };

  // 评估输入
  const inputResult = await policyEngine.evaluate("input", userInput, context);
  if (inputResult.blocked) {
    auditLogger.log("input_blocked", inputResult);
    return { error: "输入被安全策略拒绝" };
  }

  // 工具调用通过 toolRegistry 执行，自动走 allowlist 检查
  const result = await toolRegistry.call("search_kb", { query: userInput }, context);

  // 评估输出
  const outputResult = await policyEngine.evaluate("output", result, context);
  if (outputResult.blocked) {
    auditLogger.log("output_blocked", outputResult);
    return { error: "输出被安全策略拦截" };
  }

  return result;
}
```

### 与 LangChain 集成

```typescript
import { AgtLangChainAdapter } from "@agt/sdk-adapters/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor } from "langchain/agents";

const adapter = new AgtLangChainAdapter({
  policyFile: "./agent-policy.json",
  onViolation: (event) => console.error("Policy violation:", event),
});

// 包装工具列表，所有工具调用自动走策略检查
const secureTool = adapter.wrapTools([searchTool, emailTool]);

const executor = AgentExecutor.fromAgentAndTools({
  agent: createOpenAIFunctionsAgent({ llm, tools: secureTool, prompt }),
  tools: secureTool,
});
```

### CI/CD 集成：策略合规检查

```yaml
# .github/workflows/agent-policy-check.yml
- name: Validate agent policies
  run: npx @agt/policy-validator validate ./agent-policy.json --strict
  env:
    AGT_THREAT_MODEL: owasp-agentic-top10
```

`policy-validator` 会检查：
- 策略文件格式合规性
- OWASP Agentic Top 10 中未覆盖的威胁类型（如果 `--strict` 开启，缺失的威胁覆盖会导致 CI 失败）
- 策略冲突检测（如两条规则对同一条件有矛盾的处置动作）

---

## 两套方案的对比

| 维度 | Cisco DefenseClaw | 微软 AGT |
|------|-------------------|----------|
| 防护层次 | 运行时拦截 | 设计时策略编译 |
| 接入方式 | Sidecar，不改 Agent 代码 | SDK，侵入式集成 |
| 主要覆盖 | ASI-01、04、06、07 | ASI-01 到 ASI-10 全覆盖 |
| 供应链扫描 | 有（静态扫描技能包） | 无（侧重行为治理） |
| 适合场景 | 已上线 Agent 的快速加固 | 新 Agent 系统的安全设计 |
| 延迟影响 | Gateway 增加 < 2ms | 策略评估 < 0.1ms |
| 开源协议 | Apache 2.0 | MIT |

两套工具不是竞争关系，而是覆盖了 Agent 安全的不同阶段。一个成熟的 Agent 安全体系应该：

- **开发阶段**：用 AGT policy-validator 在 CI/CD 中检查策略覆盖度，用 DefenseClaw TypeScript Plugin 在 IDE 里标记高风险代码。
- **部署阶段**：用 DefenseClaw 扫描所有第三方技能包和依赖，类似 `npm audit`。
- **运行阶段**：DefenseClaw Gateway 做实时流量拦截，AGT policy-engine 做行为边界约束，两者并行。

---

## 供应链攻击：AI Agent 版 vs 传统 npm 投毒

[axios 供应链投毒事件](https://chenguangliang.com/posts/blog126_axios-supply-chain-attack/)里，攻击者通过恶意 npm 包向 axios 注入了数据收集代码。ClawHavoc 用了完全相同的手法，只是把 npm 换成了 ClawHub。

但 AI Agent 的供应链攻击有几个让它更难防御的特性：

**1. 运行时权限天然更高**

一个 AI Agent 技能包可以合法地读取文件、调用 API、访问数据库——这些操作在 npm 包里属于可疑行为，但在 Agent 技能里是正常功能。这让基于行为的异常检测更难区分正常和恶意。

**2. 执行路径动态且不确定**

npm 包的调用路径基本是确定的；Agent 技能的触发条件是 LLM 的推理结果，攻击者可以设计只在特定语义上下文下激活的 payload，逃过静态测试。

**3. 记忆持久化让清理更复杂**

传统 npm 包删掉就删了。但恶意 Agent 技能可能在激活期间向 Agent 的长期记忆写入中毒数据，即使移除技能包，记忆里的恶意指令仍然会影响 Agent 的后续行为（即 ASI-03 Memory Poisoning）。

这也是为什么防御 Agent 供应链攻击需要同时覆盖安装前扫描、运行时监控、记忆访问控制三个层面。

---

## 实际建议

**如果你在维护一个已上线的 AI Agent 系统**：

1. 用 `defenseclaw scan` 对所有第三方技能包做一次存量扫描
2. 在 LLM API 前面挂上 DefenseClaw Gateway，至少开启 credential_exfiltration 和 ssrf_prevention 两条规则
3. 把 Agent 的工具权限做最小化收拢，移除所有 Agent 不需要但曾经用过的技能

**如果你在开发一个新的 AI Agent 系统**：

1. 从 AGT 的 `agent-policy.json` 模板开始，在架构设计阶段就定义工具 allowlist 和权限边界
2. CI/CD 里接入 `policy-validator --strict`，让策略覆盖缺口在上线前暴露
3. 所有外部技能包像对待 npm 依赖一样做 lockfile 管理，pin 到精确版本，不用 `latest`

**关于凭据保护**（两套工具都覆盖，但需要你自己先做到）：

- Agent 运行时的 API Key 不要放环境变量明文，用密钥管理服务（AWS Secrets Manager、HashiCorp Vault）运行时注入
- 给每个 Agent 实例分配独立的最小权限 API Key，出事了方便吊销单个 Key 而不影响整体

---

AI Agent 的攻击面比传统 Web 应用更广，因为它天然要调用工具、读写数据、跨系统操作。Cisco 和微软在同一时间窗口发布防护工具，说明这个方向的威胁已经从理论变成了生产环境里实际发生的事。

如果此类工具出现，建议有 Agent 系统在运行的团队及时关注相关防护方案，而不是等到真实的大规模攻击事件发生后再补救。

> **再次提醒**：本文中的 ClawHavoc 攻击事件、Cisco DefenseClaw 和微软 Agent Governance Toolkit 是基于技术趋势的推演场景，非真实产品。文中的架构设计和代码示例展示了 AI Agent 安全工具应有的形态，供技术参考。
