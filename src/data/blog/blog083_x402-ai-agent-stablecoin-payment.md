---
title: 当 AI Agent 学会付钱：x402 协议与 Agent 支付基础设施全解析
pubDatetime: 2026-03-12T10:00:00+08:00
description: 深入解析 Coinbase x402 协议如何复活 HTTP 402 状态码，让 AI Agent 用稳定币自动支付 API 调用。从协议设计到代码实战，从 Stripe/Mastercard 竞争格局到 $28K 日交易量的现实挑战，全面拆解 Agent 支付赛道。
featured: true
tags:
  - AI
  - Web3
  - 前端
  - ai-agent
  - 区块链
  - 最佳实践
---

你的 AI Agent 需要调用一个付费 API。它有钱包，有 USDC，但没有信用卡，没有账号，也没有人类帮它点"订阅"按钮。怎么付钱？

这不是假设场景。当 AI Agent 从"聊天机器人"进化成能自主执行任务的"数字员工"，支付能力成了绕不开的基础设施问题。2025 年 5 月，Coinbase 推出 x402 协议，复活了沉睡近 28 年的 HTTP 402 "Payment Required" 状态码，让支付变成 HTTP 协议的原生能力。同年 9 月，Coinbase 联合 Cloudflare 成立 x402 基金会，推动协议标准化。

本文将从协议设计、代码实战、竞争格局和现实挑战四个维度，拆解这个正在重塑 Agent 经济的支付协议。

## HTTP 402：互联网最早的遗憾

1997 年，HTTP/1.1 规范定义状态码时，402 被标记为"Payment Required"，预留给未来的网络原生支付机制。设计者的想法很直接：服务器应该能告诉客户端"这个资源需要付费"，然后触发支付流程。

但这个"未来"迟迟没有到来。

信用卡网络太慢、手续费太高，不适合小额支付。PayPal 在 HTTP 层之外运作。Stripe 简化了在线支付，但仍需要商户账号、API 集成和 2-3% 的手续费。互联网最终选择了广告、订阅和 API Key 作为变现方式，402 成了一个从未被正式使用的"占位符"。

直到稳定币出现。

低成本区块链上的 USDC（比如 Base 链上不到 $0.001 的交易费和秒级确认），终于提供了一条足够快、足够便宜、足够可编程的支付通道。x402 做的事情，就是把这条通道接入 HTTP 协议。

## x402 协议工作原理

x402 的核心设计是一个基于 HTTP 的挑战-响应（challenge-response）支付流程。不需要新的传输协议，不需要 WebSocket，不需要自定义认证方案。客户端发标准 HTTP 请求，服务器要么返回资源，要么要求付款。

### 完整支付流程

```text
客户端                         服务器                        Facilitator              区块链
  │                             │                              │                       │
  │  GET /api/market-data       │                              │                       │
  │ ──────────────────────────> │                              │                       │
  │                             │                              │                       │
  │  402 Payment Required       │                              │                       │
  │  + 价格/收款地址/链信息     │                              │                       │
  │ <────────────────────────── │                              │                       │
  │                             │                              │                       │
  │  [用钱包签名支付授权]       │                              │                       │
  │                             │                              │                       │
  │  GET /api/market-data       │                              │                       │
  │  + PAYMENT-SIGNATURE 头     │                              │                       │
  │ ──────────────────────────> │                              │                       │
  │                             │  /verify (验证签名)          │                       │
  │                             │ ───────────────────────────> │                       │
  │                             │  验证通过                    │                       │
  │                             │ <─────────────────────────── │                       │
  │                             │                              │                       │
  │                             │  /settle (结算)              │                       │
  │                             │ ───────────────────────────> │                       │
  │                             │                              │  提交交易             │
  │                             │                              │ ────────────────────> │
  │                             │                              │  确认 (~2s Base)      │
  │                             │                              │ <──────────────────── │
  │                             │  结算确认                    │                       │
  │                             │ <─────────────────────────── │                       │
  │                             │                              │                       │
  │  200 OK + 数据              │                              │                       │
  │  + PAYMENT-RESPONSE 头      │                              │                       │
  │ <────────────────────────── │                              │                       │
```

整个流程在约 2 秒内完成（Base 链上），支付在响应到达客户端之前就已经链上确认。

### 请求和响应细节

**第一步：客户端发起普通请求**

```text
GET /api/v1/market-data HTTP/1.1
Host: api.example.com
```

**第二步：服务器返回 402 + 支付要求**

```text
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJwcmljZSI6IjEwMDAwMCIsInRva2VuIjoiVVNEQyJ9
```

`PAYMENT-REQUIRED` 头包含 Base64 编码的 JSON，解码后：

```json
{
  "price": "100000",
  "token": "USDC",
  "chain": "base",
  "recipient": "0x1234...abcd",
  "scheme": "exact"
}
```

**第三步：客户端签名并重新请求**

客户端解析支付要求，用自己的钱包签名一个 USDC 转账授权（EIP-3009 TransferWithAuthorization），然后带着签名重新发请求：

```text
GET /api/v1/market-data HTTP/1.1
Host: api.example.com
PAYMENT-SIGNATURE: eyJzaWduYXR1cmUiOiIweC4uLiJ9
```

**第四步：服务器验证并返回数据**

```text
HTTP/1.1 200 OK
PAYMENT-RESPONSE: eyJ0eEhhc2giOiIweC4uLiIsInN0YXR1cyI6InNldHRsZWQifQ==
Content-Type: application/json

{ "data": { "BTC/USD": 97432.50 } }
```

### 关键设计决策

**为什么用 EIP-3009 而不是普通转账？**

EIP-3009（TransferWithAuthorization）实现了 gasless 支付：客户端只需签名，不需要自己提交链上交易，也不需要持有 ETH 付 gas。Facilitator（促成者）负责提交交易。这对 AI Agent 很关键 -- Agent 只需要持有 USDC，不需要管理多种代币。

**为什么叫"exact"方案？**

当前生产环境使用的方案叫 "exact"，即每次请求支付固定金额（比如 $0.001/次 API 调用）。V2 版本引入了会话支持，认证一次后可以多次请求，降低高频场景的开销。

**Facilitator 是什么？**

Facilitator 是可选的中间服务，负责验证签名、提交链上交易、处理结算。它降低了服务端的区块链集成复杂度。Coinbase 运营官方 Facilitator，但协议设计是开放的，任何人都可以运行自己的。

## 代码实战：从零构建 x402 支付 API

x402 提供了模块化的 npm SDK，让集成变得非常简单。

### 服务端：Express + 支付中间件

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

// 连接 Facilitator
const facilitator = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

// 注册 EVM 支付方案（Base Sepolia 测试网）
const resourceServer = new x402ResourceServer(facilitator)
  .register("eip155:84532", new ExactEvmScheme());

const app = express();

// 定义付费路由和价格
app.use(
  paymentMiddleware(
    {
      "GET /api/data": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "eip155:84532",
            payTo: process.env.PAY_TO_ADDRESS,
          },
        ],
        description: "Premium market data - $0.001 per request",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// 业务逻辑（只有付费后才会到这里）
app.get("/api/data", (_req, res) => {
  res.json({
    btc: 97432.50,
    eth: 3821.15,
    timestamp: Date.now(),
  });
});

app.listen(4021, () => {
  console.log("x402 API server running on port 4021");
});
```

`paymentMiddleware` 拦截请求。如果没有有效的支付签名，返回 402 + 支付要求；如果签名有效，交给下游路由处理。服务端不需要直接跟区块链交互。

### 客户端：AI Agent 自动付费

```typescript
import { privateKeyToAccount } from "viem/accounts";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

// Agent 的钱包（预充了 USDC）
const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);

// 初始化 x402 客户端
const client = new x402Client();
registerExactEvmScheme(client, { signer: account });

// 包装 fetch -- 自动处理 402 响应
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// 像普通 fetch 一样使用，支付在后台自动完成
const response = await fetchWithPay("http://api.example.com/api/data");
const data = await response.json();
console.log(data); // { btc: 97432.50, eth: 3821.15, ... }
```

`wrapFetchWithPayment` 拦截 402 响应，解析支付要求，用钱包签名，然后自动重试请求。从 Agent 的视角看，就是一次普通的 `fetch` 调用。

### 浏览器端：MetaMask 钱包支付

```typescript
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

// 连接 MetaMask
const [address] = await window.ethereum.request({
  method: "eth_requestAccounts",
});

const wallet = createWalletClient({
  account: address,
  chain: baseSepolia,
  transport: custom(window.ethereum),
});

const signer = {
  address,
  signTypedData: async (params) =>
    wallet.signTypedData({
      account: address,
      domain: params.domain,
      types: params.types,
      primaryType: params.primaryType,
      message: params.message,
    }),
};

const client = new x402Client();
registerExactEvmScheme(client, { signer });
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// 用户点击按钮时，MetaMask 弹出签名确认
const response = await fetchWithPay("/api/data");
```

用户点击支付时，MetaMask 弹出 EIP-712 类型化数据签名请求。不需要 ETH 付 gas -- Facilitator 负责提交链上交易。

### 本地测试

```bash
# 克隆官方仓库
git clone https://github.com/coinbase/x402.git
cd x402/examples/typescript

# 安装依赖
pnpm install && pnpm build

# 配置环境变量
cd servers/express
cp .env-local .env
# 编辑 .env：设置 FACILITATOR_URL, EVM_ADDRESS, SVM_ADDRESS

# 获取测试 USDC（Base Sepolia 测试网）
# 前往 https://faucet.circle.com 领取

# 启动服务端
pnpm dev

# 新终端：启动客户端
cd ../clients/fetch
cp .env-local .env
# 编辑 .env：添加 EVM_PRIVATE_KEY
pnpm start
```

## Agent 支付竞争格局

x402 不是唯一的玩家。Agent 支付赛道正在形成一个多方竞争的生态。

### 三条路线的对比

**路线一：Crypto Native（x402 + Circle + PayAI）**

x402 代表的是加密原生路线。核心思路：用稳定币 + 区块链做结算层，HTTP 做传输层。

主要参与者：
- **Coinbase**：x402 协议设计者，运营官方 Facilitator
- **Circle**：USDC 发行方，提供稳定币基础设施
- **Cloudflare**：Agent SDK 集成 x402，MCP 服务器支持 x402 支付
- **Google**：Agent Payments Protocol（AP2），通用的 Agent 支付框架，通过 x402 扩展支持稳定币结算

优势：无需账户、无需 KYC、即时结算、全球可达。适合 Agent-to-Agent 的机器间支付。

**路线二：传统支付升级（Stripe + Mastercard + Visa）**

传统支付巨头没有坐等被颠覆，而是快速推出了自己的 Agent 支付方案。

- **Stripe**：推出 Shared Payment Tokens（SPT）和 Agentic Commerce Suite，Etsy、Urban Outfitters 等已在使用其 Agent 支付能力。2026 年 2 月还集成了 Base 链上的 x402 协议，同时支持加密支付和传统信用卡
- **Mastercard**：2025 年推出 Agent Pay（Agentic Tokens），2026 年 3 月发布 Verifiable Intent 开放标准。Verifiable Intent 通过加密审计链证明 Agent 的交易获得了用户授权，支持争议解决和合规审计
- **Visa**：推出 Intelligent Commerce 平台，通过 tokenization 技术让 Agent 安全地代表用户完成支付，覆盖所有支持 Visa 的商家

优势：兼容现有商家体系（全球数百万商家）、消费者保护（退款/争议解决）、信任基础成熟。

**路线三：平台内闭环**

- **OpenAI**：ChatGPT 插件生态 + 付费 API，Agent 在 OpenAI 生态内直接调用和支付
- **Anthropic**：与 x402 合作，但也有自己的 API 计费体系

### 核心差异

| 维度 | x402 (Crypto) | Stripe/Mastercard (传统) |
|------|---------------|-------------------------|
| 结算速度 | 1-2 秒（链上确认） | 1-3 个工作日 |
| 最低支付额 | $0.001（可行） | $0.30+（手续费限制） |
| 账户要求 | 无（只需钱包） | 需要商户账号 |
| KYC 要求 | 无 | 需要 |
| 消费者保护 | 无（链上不可逆） | 有（退款/争议） |
| 商家覆盖 | 极少（新生态） | 全球数百万 |
| 适用场景 | Agent-to-Agent | Agent-to-Human |
| 监管合规 | 灰色地带 | 成熟框架 |

两条路线不是非此即彼。Stripe 同时支持 x402 和传统支付就是最好的证明 -- 未来大概率是混合模式：Agent 间的微支付走 x402，涉及消费者的大额交易走传统通道。

## $28K 日交易量：理想与现实

技术很美好，但数据很骨感。

### 链上真实数据

根据 Artemis（区块链分析平台）的报告（来源：CoinDesk，2026 年 3 月 11 日）：

- **日均交易量**：约 $28,000
- **日均交易笔数**：约 131,000 笔（基于 $28,000 / $0.20 均价推算）
- **平均每笔金额**：约 $0.20
- **虚假交易占比**：约 50%（包括自我交易和刷量）

也就是说，**真实的商业交易可能只有 $14,000/天**。

对比一下 x402 官网（截至 2026 年 3 月）宣传的累计数据：超过 1.5 亿笔交易、数千万美元结算额。但 Artemis 的分析显示，其中大量是测试和实验性交易，而非真实商业行为。

### 为什么落差这么大？

**1. 商家太少**

x402 的目标场景 -- 小型按次付费 API 服务 -- 还没有形成规模。目前大多数 API 提供商仍然使用传统的 API Key + 订阅模式，迁移到 x402 没有足够的动力。

**2. Agent 经济尚未成熟**

根据 McKinsey 2025 年 10 月的报告（《The automation curve in agentic commerce》），AI Agent 到 2030 年可能中介 $3-5 万亿的全球消费商业。但目前大多数 Agent 还停留在"调用 API 完成任务"阶段，真正需要自主支付的场景很有限。

**3. 冷启动问题**

没有商家 → Agent 没有需要付费的服务 → 开发者没有动力集成 x402 → 没有商家。经典的"鸡生蛋还是蛋生鸡"。

**4. 监管不确定性**

Agent 自主支付涉及复杂的法律问题。Agent 花了钱，谁负责？超出预算怎么办？出了纠纷找谁？这些问题目前没有清晰的法律框架。

### 但也不全是坏消息

**基础设施在快速完善**：Cloudflare Agent SDK、Stripe x402 集成、Google AP2 协议... 大厂在用真金白银下注。

**微支付场景真实存在**：一个 AI Agent 做一次深度调研，可能需要调用数据 API 几万次，每次 $0.001。用信用卡处理这种支付根本不可能 -- 手续费就超过支付金额了。

**网络效应的临界点还没到**：类似早期的 Stripe（2011 年只有少数开发者在用），一旦关键应用出现，增长可能是指数级的。

## 前端开发者为什么该关注？

如果你是前端开发者，x402 跟你的关系比你想象的要近。

### 场景一：给你的 API 加付费墙

你做了一个图片压缩 API、一个代码格式化服务、一个 AI 驱动的文案生成工具。传统做法需要搭建用户系统、对接 Stripe、设计定价页面。用 x402，几行中间件就搞定：

```typescript
// 把免费 API 变成付费 API，总共加了不到 20 行代码
app.use(
  paymentMiddleware(
    {
      "POST /api/compress-image": {
        accepts: [{
          scheme: "exact",
          price: "$0.01",
          network: "eip155:8453",
          payTo: process.env.MY_WALLET,
        }],
        description: "Image compression - $0.01 per image",
      },
    },
    resourceServer,
  ),
);
```

不需要用户注册，不需要订阅计划，不需要信用卡处理。用户（或 Agent）付 $0.01 USDC，拿到压缩后的图片。

### 场景二：Agent 可消费的 MCP 服务

Cloudflare 已经让 MCP（Model Context Protocol）服务器支持 x402 支付。这意味着你可以构建付费的 AI 工具，Agent 通过 MCP 发现和调用这些工具时自动付费。

### 场景三：浏览器内支付体验

x402 的浏览器集成基于 MetaMask/WalletConnect，不需要跳转到第三方支付页面。对前端开发者来说，集成体验比 Stripe Checkout 更轻量 -- 一个钱包签名就完成了。

### 场景四：内容变现

博客文章、数据报告、研究论文... 任何 HTTP 可达的内容都可以用 x402 设置付费墙。Nginx 或 Cloudflare Worker 层面就能实现，不需要改业务代码。

## V2 协议改进

2025 年 12 月发布的 x402 V2 版本解决了几个重要问题：

| 改进 | V1 | V2 |
|------|----|----|
| 请求头 | X-PAYMENT | PAYMENT-SIGNATURE |
| 会话支持 | 无（每次都付） | 钱包身份认证，可复用会话 |
| 链支持 | Base/Ethereum | 多链（CAIP 标准） |
| API 发现 | 手动 | 自动 |
| SDK 架构 | 单体 | 模块化（可扩展链和方案） |

其中**会话支持**是最大的改进。V1 每次 API 调用都需要链上交易，对高频场景（比如流式数据、快速连续调用）不实际。V2 引入了钱包身份认证，客户端认证一次后可以多次请求，大幅降低了高频场景的开销。

## 安全考量

Agent 自主支付引入了新的安全面。

### 钱包安全

Agent 的私钥是最关键的安全点。泄露意味着资金被盗。

```typescript
// 推荐：环境变量 + 权限控制
const privateKey = process.env.AGENT_PRIVATE_KEY;

// 更安全：硬件安全模块（HSM）或托管服务
// Coinbase MPC Wallet、AWS KMS 等
```

### 支出限制

Agent 可能因为 bug 或恶意输入而过度消费。需要在应用层设置限制：

```typescript
class SpendLimiter {
  constructor(maxPerRequest, maxPerHour, maxPerDay) {
    this.limits = { maxPerRequest, maxPerHour, maxPerDay };
    this.hourlySpend = 0;
    this.dailySpend = 0;
    this.hourStart = Date.now();
    this.dayStart = Date.now();
  }

  canSpend(amount) {
    this.resetIfNeeded();
    if (amount > this.limits.maxPerRequest) return false;
    if (this.hourlySpend + amount > this.limits.maxPerHour) return false;
    if (this.dailySpend + amount > this.limits.maxPerDay) return false;
    return true;
  }

  recordSpend(amount) {
    this.resetIfNeeded();
    this.hourlySpend += amount;
    this.dailySpend += amount;
  }

  // 按时间窗口重置计数器
  resetIfNeeded() {
    const now = Date.now();
    if (now - this.hourStart > 3600_000) {
      this.hourlySpend = 0;
      this.hourStart = now;
    }
    if (now - this.dayStart > 86400_000) {
      this.dailySpend = 0;
      this.dayStart = now;
    }
  }
}

// 设置限制：单次最多 $0.10，每小时最多 $5，每天最多 $50
const limiter = new SpendLimiter(0.10, 5, 50);
```

### 重放攻击防护

x402 使用 nonce + 过期时间戳防止重放攻击。V2 的 EIP-712 域分隔符（domain separator）还防止跨链和跨合约签名复用。

## 写在最后

x402 协议的技术设计值得认真对待。它解决的是一个真实问题：在 Agent 经济中，传统支付基础设施无法处理大量小额、高频、无身份的机器间交易。HTTP 402 状态码沉睡了近 28 年，终于等到了它的使用场景。

但我们也要保持清醒。$28K 的日交易量（其中一半是测试交易）说明，Agent 支付离大规模商业化还有很长的路要走。技术就位了，但商家、Agent 应用和监管框架都还在追赶。

这让我想起 2011 年的 Stripe -- 当时在线支付也是"技术没问题，但谁在用？"的状态。Stripe 花了数年才成为基础设施。x402 可能需要同样的耐心。

对前端开发者来说，现在是了解和实验的好时机。用测试网跑一遍 demo，理解支付流程，为你的 Side Project 想想微支付的可能性。不需要 all-in，但值得关注。

---

**相关阅读**：
- [AI Agent 前端工作流（Part 3）：成本优化与安全实践](https://chenguangliang.com/posts/ai-agent-frontend-workflow-part3/) - Agent 成本控制的另一个维度
- [AI Agent 驱动开发：从工具到工作流的范式转变](https://chenguangliang.com/posts/blog078_ai-agent-driven-development/) - Agent 自主执行任务的实践

**延伸阅读**：
- [x402 官方文档](https://www.x402.org/)
- [x402 官方仓库 + 示例代码](https://github.com/coinbase/x402)
- [Stripe Agentic Commerce Blog](https://stripe.com/blog/supporting-additional-payment-methods-for-agentic-commerce)
- [CoinDesk: x402 Reality Check](https://www.coindesk.com/markets/2026/03/11/coinbase-backed-ai-payments-protocol-wants-to-fix-micropayment-but-demand-is-just-not-there-yet)
