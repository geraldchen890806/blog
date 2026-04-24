---
author: 陈广亮
pubDatetime: 2026-04-24T10:00:00+08:00
title: AI 工具链供应链安全：Vercel 入侵事件的完整复盘
slug: blog144_vercel-context-ai-supply-chain-attack
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - AI
  - 开发效率
description: 复盘 2026 年 4 月 Vercel 遭入侵事件的完整攻击链：Roblox 外挂脚本 → Lumma Stealer → OAuth 过度授权 → SSO 横向移动 → 环境变量泄露，拆解每一环背后的安全盲点和开发者防御实践。
---

2026 年 4 月 19 日，Vercel 发布安全公告：攻击者入侵了第三方 AI 工具 Context.ai，利用窃取的 OAuth token 横向进入 Vercel 内部系统，枚举并窃取了部分客户存储在非加密环境变量中的 API key。攻击者随后在 BreachForums 以 200 万美元叫卖所窃数据。

这不是一次技术层面多么复杂的攻击。没有零日漏洞，没有高级持续性威胁的长期潜伏。整条攻击链的起点是一名工程师在搜索 Roblox 游戏外挂脚本——每一环都是业界早已意识到、但普遍没有修复的已知风险。

## 完整攻击链

### 第一步：Roblox 外挂 → Lumma Stealer

2026 年 2 月，Context.ai 一名员工在搜索 Roblox 游戏外挂脚本时，在其计算机上安装了含有 **Lumma Stealer** 的恶意文件（由安全公司 Hudson Rock 溯源确认）。

Lumma Stealer 是一款商业信息窃取恶意软件，在暗网以订阅制出售给攻击者。它的专长是从浏览器中静默提取：

- 已保存的密码
- 浏览器 cookie 和 session token
- **OAuth token**（包括 Google、GitHub 等服务的长期令牌）
- 存储在浏览器中的 API key

感染本身没有任何明显迹象。该员工的设备在正常使用，Context.ai 的服务也在正常运行——直到攻击者拿到窃取的凭证开始使用。

### 第二步：OAuth token 被劫持

Context.ai 运营一款 Chrome 扩展产品，用户可以授权它访问 Google Workspace（Drive、Gmail、文档等），让 AI 帮助整理会议记录和上下文摘要。

某位 Vercel 员工使用**公司 Vercel 企业账户**注册了 Context.ai 的扩展服务。授权时，该员工选择了 **"Allow All"**——允许所有权限。

Lumma Stealer 从受感染设备中提取了这个 OAuth token。攻击者拿到 token 后，直接以该 Vercel 员工的身份访问其 Google Workspace 账户，**无需知道密码，无需通过 MFA**。

这就是 OAuth token 劫持的本质：OAuth 的设计初衷是让用户在不暴露密码的前提下授权第三方，但 token 本身如果被盗，就绕过了所有基于密码的防护。

Vercel 官方公布了对应的恶意 OAuth App ID：

```
110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com
```

### 第三步：SSO 横向移动进入 Vercel 内部

拿到 Vercel 员工的 Google Workspace 访问权限后，攻击者通过 **SSO（单点登录）集成**横向进入 Vercel 的内部系统：

- 企业工单系统（Issue Tracker）
- 内部测试环境
- 管理员工具（Admin Tools）
- Vercel 内部 Dashboard

Google Workspace 是这类企业最常用的 SSO 身份提供商。当攻击者拿到一个工程师的 Google 账户，往往意味着同时拿到了该员工有权限访问的所有内部系统的入口。

### 第四步：枚举非加密环境变量

进入内部 Dashboard 后，攻击者执行了**枚举（enumeration）**操作——遍历并读取客户项目中存储的**非敏感环境变量**。

Vercel 的环境变量系统分两类：

- **Sensitive（敏感）**：静态加密存储，即使有 Dashboard 权限也无法读取明文
- **Non-sensitive（非敏感）**：以明文形式存储，可被有权限的角色读取

问题在于：很多开发者习惯上把所有环境变量都扔进非敏感类型，包括 AWS、GitHub、Stripe、Twilio、区块链数据提供商等服务的 API key。这些 key 理应是敏感的，但因为分类错误，它们实际上是明文可读的。

攻击者枚举了大量客户的非敏感变量，窃取了其中的 API 凭证。

## 为什么 Web3 开发者首先遭殃

CoinDesk 最先报道这次事件的影响，原因是加密货币生态中大量团队的前端部署在 Vercel 上：

- DEX 界面、DApp Dashboard
- 区块链数据聚合前端
- NFT 交易平台的 Web 端

这些项目通过环境变量存储连接区块链 RPC 节点、数据提供商和后端服务的 key。Solana 链上 DEX **Orca** 公开确认其 Vercel 部署受到审查，但表示链上协议和用户资金未受影响。

Web3 项目的特殊性在于：API key 泄露可能直接导致经济损失，而不只是数据泄露——如果 key 控制着托管钱包或签名服务，后果会更严重。这解释了为什么这个群体的反应最为迅速。

## 攻击链的每一环都是已知风险

复盘这次攻击，每一步利用的都是业界早已知晓的安全弱点：

**游戏外挂传播恶意软件**：已有多年历史，不是新手法。2024-2025 年 Lumma Stealer 在游戏社区的传播案例已有大量记录。

**OAuth "Allow All"**：安全培训里反复提到"最小权限原则"，但实际中用户为了方便几乎总是全部授权。AI 工具的兴起加剧了这个问题——每个工具都需要 Workspace/Calendar/Drive 权限，用户习惯性点击允许。

**公司账户使用第三方 AI 工具**：企业安全策略通常要求审批第三方 SaaS 工具，但 AI 工具增长太快，很多公司的审批流程根本跟不上。

**Google Workspace 作为 SSO 单点**：一个账户被攻破，所有内部系统同时暴露——这是 SSO 的固有风险，但大多数企业都没有为此部署额外的侧向移动检测。

**非加密环境变量存放敏感 key**：Vercel 的 Sensitive 功能早就存在，但没有强制要求，也没有引导用户正确分类。

The Register 的判断一针见血："This represents an agentic AI product linking to third-party services and causing trouble, just the kind of risk infosec experts have warned about."

## 开发者该做什么

### 立即行动

**1. 轮换所有非敏感环境变量中的 key**

不要等待 Vercel 通知你是否受影响。如果你的项目在 Vercel 上有非加密环境变量存放了任何第三方服务的 API key，立即轮换：

```bash
# 检查当前环境变量列表
vercel env ls

# 删除旧的非加密变量
vercel env rm MY_API_KEY production
```

然后重新添加时选择加密类型：

```bash
vercel env add MY_API_KEY production
# 交互提示 "What type of environment variable?" 时选择 "Sensitive"
```

或直接在 Vercel Dashboard → Project Settings → Environment Variables 中，将已有变量的类型切换为 Sensitive（加锁图标）。

**2. 在 Google Workspace 中撤销可疑 OAuth 授权**

访问 [https://myaccount.google.com/permissions](https://myaccount.google.com/permissions)，查找并撤销以下 App ID 的授权：

```
110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com
```

同时审查所有有 Workspace 写权限的第三方应用，撤销不再使用的授权。

**3. 开启 Vercel MFA**

优先使用 Passkey 或 Authenticator App，不要用短信验证（SMS 可被 SIM 换卡攻击绕过）。

### 长期实践

**把环境变量按敏感度分类**

建立一个简单的规则：凡是有写权限的 key（能修改数据、发送消息、花费资金的），一律标记为 Sensitive。凡是只读的公开 key（如 Google Analytics ID、公开 CDN 域名），才放非敏感变量。

```
# Sensitive（必须加密存储）
DATABASE_URL
AWS_SECRET_ACCESS_KEY
STRIPE_SECRET_KEY
PRIVATE_KEY
JWT_SECRET

# Non-sensitive（公开或无危害）
NEXT_PUBLIC_GA_ID
NEXT_PUBLIC_API_BASE_URL
NODE_ENV
```

**对第三方 AI 工具的 OAuth 授权实行最小权限**

每次授权前，检查三点：
1. 这个工具真的需要这个权限吗？（写邮件的工具需要 Calendar 访问权吗？）
2. 我用的是个人账户还是公司账户？（公司账户授权的风险传递到整个组织）
3. 多久审查一次已授权应用？（建议每季度清理一次）

**把个人设备和工作设备分开**

这次事件的入口是员工在（可能是个人）设备上搜索游戏外挂。如果公司强制要求工作访问只在托管设备（managed device）上进行，Lumma Stealer 即使感染了个人设备，也无法窃取公司的 OAuth token。

**部署 SSO 侧向移动检测**

纯 SSO 架构的脆弱性在于"一点突破，全面进入"。对于高权限内部系统，考虑在 SSO 之外额外要求 **Context-aware access**（基于设备状态、地理位置、时间的访问策略）。Google Workspace 企业版支持这个功能，零信任架构（Zero Trust）的核心理念之一也是这个。

## 事件的更大意义

Vercel CEO Guillermo Rauch 在事后发帖说：

> "We believe the attacking group to be highly sophisticated and, I strongly suspect, significantly accelerated by AI."

这句话值得细想。攻击者利用的不是新技术，而是新规模——AI 工具让攻击者可以更快地枚举目标、更高效地处理窃取的大量凭证、更精准地识别哪些 key 有价值。

更深层的问题是：AI 工具爆炸式增长带来了新的攻击面。过去，一名开发者可能会把 Google、GitHub、Slack 授权给 3-5 个第三方工具。现在，随着 AI 工具的涌现，这个数字很容易变成 20-30 个。每一个授权都是一个潜在的入口点。Context.ai 只是其中一个；只是这次被发现了。

供应链攻击的本质是：你的安全边界不是你的代码，而是你信任的所有工具和服务的最弱一环。

---

**参考资料**

- [Vercel April 2026 Security Incident（官方公告）](https://vercel.com/kb/bulletin/vercel-april-2026-security-incident)
- [Context.ai Security Update](https://context.ai/security-update)
- [TechCrunch: App host Vercel says it was hacked](https://techcrunch.com/2026/04/20/app-host-vercel-confirms-security-incident-says-customer-data-was-stolen-via-breach-at-context-ai/)
- [CyberScoop: Vercel's security breach started with malware disguised as Roblox cheats](https://cyberscoop.com/vercel-security-breach-third-party-attack-context-ai-lumma-stealer/)
- [Halborn: Explained: The Vercel Hack (April 2026)](https://www.halborn.com/blog/post/explained-the-vercel-hack-april-2026)
