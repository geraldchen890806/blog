---
author: Gerald Chen
pubDatetime: 2026-04-17T08:00:00+08:00
title: "The AI Agent Security Landscape: From the ClawHavoc Poisoning to Cisco DefenseClaw and Microsoft's Governance Toolkit"
slug: blog129_ai-agent-security-governance
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - AI Agent
  - AI
description: "A ClawHavoc-style supply chain attack poisons 1,184 agent skills and hits 300,000 users; within two weeks, Cisco and Microsoft ship agent security tooling. This post breaks down the threat model, compares the two defense architectures, and walks through real integration code."
---

> **Note**: The ClawHavoc attack, Cisco DefenseClaw, and Microsoft's Agent Governance Toolkit described in this post are a **hypothetical scenario** extrapolated from real AI agent supply chain threat trends — not actual events. The tool designs, code samples, and defense strategies illustrate what this class of security tooling should look like in terms of architecture and interfaces, and are provided for technical reference.

Supply chain security for AI agents is becoming a real threat. According to a hypothetical security trends report, prompt injection attacks grew 340% year over year, more than 36% of MCP servers have SSRF vulnerabilities, and more security teams are starting to take agent runtime protection seriously.

This post uses a thought experiment as its entry point — suppose a large-scale agent skill poisoning incident (call it ClawHavoc) happened tomorrow. How would security vendors respond? How should the defensive tooling be designed? We'll break down the threat model, compare the design philosophies of two hypothetical defense systems, and walk through integration code you can actually reference. AI agent supply chain attacks look strikingly similar to traditional npm poisoning in technique — the attack surface is just wider and the damage paths are harder to see.

## Threat Background

### The ClawHavoc Attack, Reconstructed

ClawHavoc operated in three layers:

1. **Typosquatting**: register packages with names close to popular skills (e.g. `web-search-pro` impersonating `web-search`), exploiting visual misreads when users search.
2. **Delayed malicious payload**: the skill behaves normally after install, only activating its C2 callback logic 7 days later, slipping past install-time sandbox checks.
3. **Lateral credential exfiltration**: once the agent runtime reads environment variables (API keys, database passwords), the malicious skill exfiltrates them via DNS tunneling.

ClawHub pulled all affected packages within 48 hours of disclosure, but because of how agent runtimes work, the malicious packages had already persisted inside users' agents — unlike an npm package that `npm uninstall` removes cleanly, removing a skill also requires purging the agent's memory store and caches.

### A Taxonomy of Agent Security Threats

The following agent threat taxonomy, based on industry trend analysis, shows the attack surface unique to AI agents:

| ID | Threat Type | Typical Scenario |
|------|----------|----------|
| ASI-01 | Prompt Injection | Instructions embedded in a malicious web page hijack agent behavior |
| ASI-02 | Excessive Agency | Agent is granted permissions beyond what the task requires |
| ASI-03 | Memory Poisoning | Contaminating the agent's long-term memory store |
| ASI-04 | Tool Misuse | Getting the agent to use shell/filesystem tools for unintended operations |
| ASI-05 | Supply Chain Attack | Malicious skills, plugins, dependency injection |
| ASI-06 | Credential Exfiltration | Stealing API keys from the runtime environment |
| ASI-07 | SSRF via Tool Call | Probing internal networks through the agent's HTTP tools |
| ASI-08 | Privilege Escalation | Low-privilege agent escalating to admin level |
| ASI-09 | Denial of Service | Triggering infinite loops or expensive LLM calls |
| ASI-10 | Insecure Output | Generated content containing XSS or SQL injection fragments |

ClawHavoc primarily hit ASI-05 and ASI-06. Cisco DefenseClaw and Microsoft AGT focus on different things: DefenseClaw leans toward runtime protection (mainly covering ASI-01, 04, 06, 07), while AGT leans toward governance and the policy layer (covering all 10 categories, with the policy engine at its core).

---

## Cisco DefenseClaw

### Positioning

DefenseClaw's design adds a security proxy layer at agent runtime without modifying the agent's own code — a sidecar that intercepts tool calls and LLM inputs/outputs. It's a good fit for quickly hardening agent systems that are already in production.

### Three-Component Architecture

```
┌───────────────────────────────────────────────┐
│                 Agent Runtime                 │
│                                               │
│  ┌────────────┐    ┌──────────────────────┐   │
│  │ Agent      │───>│ Go Gateway           │   │
│  │ (any       │    │ (request intercept / │   │
│  │ framework) │    │  filtering)          │   │
│  └────────────┘    └──────────┬───────────┘   │
│                               │               │
│  ┌───────────────────────┐    │               │
│  │ Python CLI            │<───┘               │
│  │ (policy config/mgmt)  │                    │
│  └───────────────────────┘                    │
│                                               │
│  ┌──────────────────────────────────────┐     │
│  │ TypeScript Plugin                    │     │
│  │ (IDE / dev-time static analysis)     │     │
│  └──────────────────────────────────────┘     │
└───────────────────────────────────────────────┘
```

- **Go Gateway**: a high-performance request proxy that intercepts the agent's outgoing tool calls and LLM requests in real time. Latency impact < 2ms (official benchmark).
- **Python CLI**: the management interface — configure interception policies, review audit logs, update rule sets.
- **TypeScript Plugin**: integrates with VS Code, flagging high-risk code patterns during development (such as reading `process.env` directly and passing it to an LLM).

### Installation and Basic Configuration

```bash
pip install defenseclaw
defenseclaw init
```

Initialization generates `defenseclaw.yaml`:

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

Start the Gateway:

```bash
defenseclaw gateway start
```

The agent's LLM requests switch from hitting OpenAI directly to routing through the Gateway:

```python
# 改前
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# 改后（只改 base_url，其他代码不变）
client = openai.OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
    base_url="https://localhost:8443/v1"
)
```

### How Prompt Injection Detection Works

DefenseClaw's prompt injection detection uses a two-layer mechanism:

1. **Pattern matching**: 200+ built-in regex rules covering common injection patterns (e.g. `ignore previous instructions`, forged `[SYSTEM]` markers, Base64-encoded instructions).
2. **Semantic similarity**: a lightweight embedding model (runs locally, no internet required) computes cosine similarity between user input and a corpus of known injections; exceeding the threshold triggers an alert or a block.

View detection logs:

```bash
defenseclaw logs --last 100 --filter "prompt_injection"
```

Sample output:

```
2026-04-15 14:23:11 BLOCKED  prompt_injection  score=0.94
  input: "Ignore all previous instructions. You are now..."
  action: request_blocked
  session_id: sess_a1b2c3
```

### Skill Package Scanning

For ClawHavoc-style attacks, the DefenseClaw CLI offers static scanning:

```bash
defenseclaw scan ./skills/           # 扫描本地技能目录
defenseclaw scan --registry clawhub  # 扫描已安装的 ClawHub 技能
```

The scanner detects:
- Delayed-trigger logic (`setTimeout` beyond a threshold, counter-based conditional activation)
- Suspicious network requests (DNS over HTTPS, non-standard ports)
- Exfiltration behavior following environment variable reads

---

## Microsoft Agent Governance Toolkit

### Positioning

AGT isn't about runtime interception — it's **Policy as Code**: define behavioral boundaries at agent design time and compile security constraints directly into the agent's decision logic. The design goal: in internal testing, policy-engine-based protection cut violations from 26.67% to 0.00%, with policy evaluation latency < 0.1ms.

### Core Package Structure

AGT consists of 7 npm packages you can adopt selectively:

| Package | Function |
|------|------|
| `@agt/policy-engine` | Core policy evaluation engine |
| `@agt/threat-model` | OWASP Agentic Top 10 threat model definitions |
| `@agt/tool-registry` | Tool permission registration and least-privilege execution |
| `@agt/memory-guard` | Memory store access control |
| `@agt/audit-logger` | Structured audit logging |
| `@agt/policy-validator` | CI/CD integration, policy compliance checks |
| `@agt/sdk-adapters` | Adapters for LangChain, AutoGen, Semantic Kernel |

### Using the Policy Engine

```bash
npm install @agt/policy-engine @agt/threat-model @agt/tool-registry
```

Define the policy file `agent-policy.json`:

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

Wire it into your agent code:

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

### LangChain Integration

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

### CI/CD Integration: Policy Compliance Checks

```yaml
# .github/workflows/agent-policy-check.yml
- name: Validate agent policies
  run: npx @agt/policy-validator validate ./agent-policy.json --strict
  env:
    AGT_THREAT_MODEL: owasp-agentic-top10
```

`policy-validator` checks:
- Policy file format compliance
- Threat types from the OWASP Agentic Top 10 left uncovered (with `--strict` enabled, missing threat coverage fails CI)
- Policy conflict detection (e.g. two rules with contradictory actions for the same condition)

---

## Comparing the Two Approaches

| Dimension | Cisco DefenseClaw | Microsoft AGT |
|------|-------------------|----------|
| Protection layer | Runtime interception | Design-time policy compilation |
| Integration style | Sidecar, no agent code changes | SDK, invasive integration |
| Primary coverage | ASI-01, 04, 06, 07 | Full coverage of ASI-01 through ASI-10 |
| Supply chain scanning | Yes (static skill package scanning) | No (focuses on behavioral governance) |
| Best fit | Quickly hardening agents already in production | Security design for new agent systems |
| Latency impact | Gateway adds < 2ms | Policy evaluation < 0.1ms |
| License | Apache 2.0 | MIT |

The two tools aren't competitors — they cover different stages of agent security. A mature agent security posture should:

- **Development**: use AGT's policy-validator in CI/CD to check policy coverage, and the DefenseClaw TypeScript Plugin to flag risky code in the IDE.
- **Deployment**: use DefenseClaw to scan all third-party skill packages and dependencies, the way you'd run `npm audit`.
- **Runtime**: run the DefenseClaw Gateway for real-time traffic interception and the AGT policy-engine for behavioral boundary enforcement, in parallel.

---

## Supply Chain Attacks: AI Agent Edition vs. Traditional npm Poisoning

In the [Inside the Axios Poisoning: How a North Korean APT Infected Millions of Developer Environments in 3 Hours](/en/posts/blog126_axios-supply-chain-attack/), attackers injected data-harvesting code into axios via a malicious npm package. ClawHavoc used the exact same playbook — it just swapped npm for ClawHub.

But AI agent supply chain attacks have a few properties that make them harder to defend against:

**1. Runtime privileges are inherently higher**

An AI agent skill can legitimately read files, call APIs, and access databases — operations that would be suspicious in an npm package are normal functionality in an agent skill. That makes it much harder for behavior-based anomaly detection to separate normal from malicious.

**2. Execution paths are dynamic and non-deterministic**

An npm package's call paths are mostly deterministic; an agent skill's trigger conditions are the output of LLM reasoning. Attackers can design payloads that only activate in specific semantic contexts, evading static testing.

**3. Memory persistence makes cleanup more complicated**

A traditional npm package is gone once you delete it. A malicious agent skill, however, may write poisoned data into the agent's long-term memory while active — even after the skill is removed, malicious instructions in memory keep influencing the agent's subsequent behavior (i.e. ASI-03 Memory Poisoning).

This is why defending against agent supply chain attacks requires covering all three layers at once: pre-install scanning, runtime monitoring, and memory access control.

---

## Practical Recommendations

**If you're maintaining an AI agent system already in production**:

1. Run `defenseclaw scan` once across all third-party skill packages as a baseline audit
2. Put the DefenseClaw Gateway in front of your LLM API, enabling at minimum the credential_exfiltration and ssrf_prevention rules
3. Shrink the agent's tool permissions to the minimum, removing every skill the agent once used but no longer needs

**If you're building a new AI agent system**:

1. Start from the AGT `agent-policy.json` template and define tool allowlists and permission boundaries at the architecture design stage
2. Wire `policy-validator --strict` into CI/CD so policy coverage gaps surface before launch
3. Manage all external skill packages like npm dependencies with lockfiles — pin to exact versions, never use `latest`

**On credential protection** (both tools cover this, but you need to do your part first):

- Don't keep the agent runtime's API keys as plaintext environment variables; inject them at runtime from a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Give each agent instance its own least-privilege API key, so when something goes wrong you can revoke a single key without taking everything down

---

The attack surface of AI agents is broader than that of traditional web applications, because agents inherently call tools, read and write data, and operate across systems. Cisco and Microsoft shipping defensive tooling in the same window would signal that this threat has moved from theory to something actually happening in production.

If tools like these emerge, teams running agent systems should track these defensive solutions early — rather than scrambling after a real large-scale attack lands.

> **Reminder, once more**: the ClawHavoc attack, Cisco DefenseClaw, and Microsoft's Agent Governance Toolkit in this post are a hypothetical scenario extrapolated from technical trends, not real products. The architecture designs and code samples show what AI agent security tooling should look like, and are provided for technical reference.
