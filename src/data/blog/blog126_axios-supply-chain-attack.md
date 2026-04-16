---
author: 陈广亮
pubDatetime: 2026-04-15T14:00:00+08:00
title: Axios 投毒事件全解析：朝鲜 APT 如何在 3 小时内感染百万开发者环境
slug: blog126_axios-supply-chain-attack
featured: true
draft: true
reviewed: false
approved: false
tags:
  - 安全
  - AI Agent
  - 前端
description: 2026 年 3 月，axios npm 包被朝鲜国家级 APT 劫持，3 小时内向百万开发者环境植入 RAT。本文拆解两件独立但关联事件：供应链投毒的完整攻击链，以及 CVE-2026-40175（CVSS 10.0）的技术原理与实际可利用性争议。
---

2026 年 3 月 31 日凌晨，一个每周下载量超过 1 亿次的 npm 包在 3 小时内传播了远程访问木马（RAT）。受害者是全球使用 `npm install` 的开发者和 CI/CD 流水线。这不是假设场景，这是已经发生的事。

这个包叫 `axios`。

---

## 两件事，一个时间窗口

在理解这次事件之前，需要先区分两件独立但被媒体混淆在一起的事：

**事件一：供应链投毒（2026-03-31）**
攻击者劫持维护者 npm 账号，发布含 RAT 的 `axios@1.14.1` 和 `axios@0.30.4`。

**事件二：CVE-2026-40175（2026-04-10 公开）**
研究员在投毒事件的高关注度下披露的独立代码漏洞，CVSS 评分 10.0，但实际可利用性有争议。

这两件事恰好在同一时间窗口内爆发，放大了整体影响，也让应对变得复杂。本文分开拆解。

---

## 事件一：供应链投毒

### 攻击者是谁

微软 Threat Intelligence 将此次攻击归因于 **Sapphire Sleet**，Google Threat Intelligence 称之为 **UNC1069**，两者均是朝鲜国家级 APT 组织的不同命名。Elastic Security Labs 在分析 macOS 载荷时发现其与已知朝鲜 WAVESHAPER 后门存在"显著重叠"。

这不是孤立事件。SANS 的研究显示，从 2026-03-19 到 03-27，同一组织（内部称 TeamPCP）已连续攻击了 4 个开源项目：Trivy、KICS、LiteLLM、Telnyx。axios 是第 5 个目标，也是影响最大的一个。

### 第一步：布局

攻击者不是直接修改 axios 源码。他们的方式更隐蔽：在 `package.json` 里注入一个从未在 axios 历史版本中出现过的依赖 `plain-crypto-js@4.2.1`，然后利用 npm 的 `postinstall` 钩子在安装时自动执行恶意代码。

时间线显示攻击者提前了 24 小时做了预布局：

```
2026-03-30 05:57 UTC  — plain-crypto-js@4.2.0 发布（干净诱饵版本）
2026-03-30 23:59 UTC  — plain-crypto-js@4.2.1 发布（含恶意 postinstall）
2026-03-31 00:21 UTC  — axios@1.14.1 发布（依赖上述恶意包）
2026-03-31 01:00 UTC  — axios@0.30.4 发布（legacy 分支，相隔 39 分钟）
2026-03-31 ~03:15 UTC — npm 下架两个恶意版本
```

先发布一个干净版本，是为了让 `plain-crypto-js` 这个账号有一些历史记录，规避 npm 对新账号的自动警报。这个细节表明攻击者对 npm 平台的安全机制有深入了解。

至于如何拿到 axios 维护者 jasonsaayman 的 npm 账号：合法发布使用 GitHub Actions OIDC 可信发布机制（密码学绑定到 GitHub Actions 工作流），而恶意版本是用经典 access token 手动发布的，且账号绑定邮箱在攻击前已被修改为 `ifstap@proton.me`。社会工程学或凭证泄露，目前没有公开的确认结论。

### 第二步：dropper

`plain-crypto-js@4.2.1` 的 `postinstall` 钩子执行 `node setup.js`。这个文件使用了双层混淆：

- **第一层**：字符串逆序 + Base64 解码
- **第二层**：XOR 加密，密钥为 `OrDeR_7077`，使用 `7 × i² % 10` 的位置依赖索引

解码后，脚本检测当前操作系统（`process.platform`），向 C2 服务器 `sfrclak.com:8000` 发送 HTTP POST，下载对应平台的 Stage 2 载荷。

执行完毕后，脚本自我删除（`fs.unlink()` 删除自身），并将恶意的 `package.json` 替换为伪装成 `4.2.0` 的干净 stub。这导致 `npm list` 和 `npm audit` 显示的版本号与实际不符，有效混淆了事后取证。

### 第三步：平台特定 RAT

| 平台 | 实现 | 落地路径 |
|------|------|---------|
| macOS | C++（Mach-O 二进制） | `/Library/Caches/com.apple.act.mond` |
| Windows | PowerShell | `%TEMP%\6202033.ps1`，由 VBScript loader 执行 |
| Linux | Python | `/tmp/ld.py` |

三个平台的 RAT 使用同一套通信协议：HTTP POST，Body 为 Base64 编码的 JSON，60 秒心跳，支持 `kill`、`peinject`（进程注入）、`runscript`、`rundir` 指令。

有一个细节值得注意：User-Agent 伪装成 `"mozilla/4.0 (compatible; msie 8.0; windows nt 5.1; trident/4.0)"`——IE8 + Windows XP。在 2026 年的网络流量里，这个 UA 会立刻触发任何稍微正常的 EDR 告警。这要么是攻击者的疏忽，要么是他们判断目标（开发者工作站和 CI 服务器）大多没有流量层检测。

RAT 建立连接后，第一件事是发送 `FirstInfo` 消息，内容包括：主机名、用户名、OS 版本、时区、硬件型号、CPU 类型、完整进程列表（macOS 最多 1000 个进程），以及**所有环境变量**。

最后这一项是核心目标。开发者工作站和 CI/CD 环境里的环境变量通常包含：

- npm tokens（可用于发布恶意包）
- AWS/GCP/Azure 凭证（`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`）
- Kubernetes 配置
- 数据库密码
- 各种 API keys

朝鲜 APT 的攻击目标通常是加密货币和技术公司。一个含有 AWS 凭证的开发者工作站，价值远不止这台机器本身。

### 实际影响范围

- **axios 周下载量**：超过 1 亿次
- **npm 上依赖 axios 的包**：超过 174,000 个
- **恶意版本存活时间**：约 3 小时
- **受影响渠道**：使用 `^1.13.6` 或 `^0.29.0` 等浮动版本约束，且在攻击窗口内执行了 `npm install` 的开发者机器和 CI/CD 流水线
- **不受影响**：浏览器/CDN 用户（postinstall 钩子不在浏览器中执行）

Unit 42 确认受影响行业分布在美国、欧洲、中东、南亚、澳大利亚，覆盖金融、高科技、医疗、零售、保险等领域。

### 如果你的机器受到感染

**直接重建，不要修复。**

在 2026-03-31 00:21–03:15 UTC 期间，如果你的机器或 CI 流水线执行了 `npm install`，且安装了 `axios@1.14.1` 或 `axios@0.30.4`，应当：

1. 将该机器视为完全沦陷，立即下线
2. 重新格式化并从已知干净的镜像重建
3. 轮换所有曾在该机器上存在过的凭证：npm tokens、SSH keys、AWS/GCP/Azure 密钥、所有 API keys
4. 网络层封锁 C2：`sfrclak.com` 和 `142.11.206.73:8000`

**不要只是卸载包**。Stage 2 RAT 已经落地持久化，卸载 axios 不会移除它。

快速检查命令：

```bash
# 检查是否曾安装恶意版本
npm list axios | grep -E "1\.14\.1|0\.30\.4"

# macOS：检查 RAT 落地文件
ls -la /Library/Caches/com.apple.act.mond 2>/dev/null

# Windows：检查落地文件
dir "%PROGRAMDATA%\wt.exe" 2>nul
dir "%TEMP%\6202033.ps1" 2>nul

# Linux：检查落地文件
ls -la /tmp/ld.py 2>/dev/null

# 检查可疑网络连接
# macOS/Linux
lsof -i | grep sfrclak
# 检查 DNS 解析历史（macOS）
log show --last 7d | grep sfrclak
```

---

## 事件二：CVE-2026-40175（CVSS 10.0）

这是一个独立的代码层漏洞，在供应链事件的高关注度下被发现和披露。CVSS 基础评分 10.0，但实际可利用性比分数看起来复杂得多。

### 漏洞原理

Axios 在 `lib/adapters/http.js` 中合并 HTTP 请求头时，未对头部值进行 CRLF（`\r\n`）字符验证。这本身是一个 HTTP 头注入（CWE-113）漏洞。

但要把这个漏洞利用到"窃取 AWS 凭证"的程度，需要三个条件同时成立：

**条件一：依赖树中有原型链污染漏洞**

攻击者需要找到一个你的应用间接依赖的库（如 `qs`、`minimist`、`ini`、`body-parser`），该库存在原型链污染漏洞，使得 `Object.prototype` 可以被注入任意属性。

**条件二：Axios 继承污染属性作为请求头**

Axios 在合并请求配置时，会遍历对象属性，无意中继承了 `Object.prototype` 上被注入的恶意头部属性（如 `X-aws-ec2-metadata-token-ttl-seconds: 21600\r\n`）。由于没有验证 CRLF，这个值被原样传递给底层 HTTP 库。

**条件三：CRLF 分裂请求，走私到 IMDS**

含 CRLF 的头部值将一个 HTTP 请求分裂为两个（HTTP 请求走私，CWE-444），其中一个被偷偷重定向到 AWS EC2 实例元数据服务（`169.254.169.254`）。通过注入 `X-aws-ec2-metadata-token-ttl-seconds` 头，绕过了 IMDSv2 的令牌保护机制，最终获得 EC2 实例绑定的 IAM 临时凭证。

完整攻击链：

```
上游依赖原型链污染
  → Object.prototype 被注入含 \r\n 的恶意头部值
    → Axios 无验证地继承为请求头
      → HTTP 请求被 CRLF 分裂（请求走私）
        → 走私请求 SSRF 访问 169.254.169.254
          → 绕过 IMDSv2 令牌机制
            → 获取 EC2 IAM 凭证 → 云环境沦陷
```

### 实际可利用性的争议

CVSS 10.0 的评分出来后，Aikido Security 在 2026-04-14 发表了一篇反驳分析，核心论点是：

**Node.js 运行时在底层挡住了这个攻击链。**

Node.js 在发送 HTTP 请求前，内置了头部值校验逻辑。如果头部值包含 `\r\n` 字符，Node.js 会在送到网络层之前抛出 `TypeError [ERR_INVALID_CHAR]: Invalid character in header content`，直接阻断。

更有说服力的是：漏洞报告人 Raul Vega Del Valle 本人也确认，"在真实应用中……不应该发生……Node、Bun 或 Deno 都会阻止 CRLF"。

那么 CVSS 10.0 怎么来的？评分基于漏洞在库层面的理论影响，没有充分考虑 Node.js 运行时的补偿控制。这种情况在安全研究中并不罕见——CVSS 描述的是漏洞的潜在最大影响，而不是在特定运行环境下的实际可利用性。

**仍然有风险的场景**：使用自定义 Axios 适配器（绕过 Node.js HTTP 客户端，直接写裸 socket）的应用在理论上仍有风险。不过这是非常罕见的配置。

**结论**：升级到 `axios@1.15.0`（1.x 分支）或 `axios@0.31.0`（0.x 分支），修复这个漏洞。但不必因为 CVSS 10.0 就触发最高级别的应急响应，在标准 Node.js 环境下实际利用极为困难。

```bash
# 升级命令
npm install axios@latest
# 或者指定版本
npm install axios@1.15.0
```

---

## 这次事件暴露了什么结构性问题

### 1. 单点维护者风险

axios 是 npm 上下载量 Top 10 的包，但长期只有 jasonsaayman 一个活跃维护者。一个 npm 账号被社会工程学或凭证泄露，就足以传播 RAT 到百万个环境。

这不是 jasonsaayman 的错。这是开源生态的结构性问题：最关键的基础设施往往依赖志愿者维护，而这些维护者不可能有专业安全团队的防护级别。

### 2. `postinstall` 钩子是高风险攻击面

npm 的 `postinstall` 钩子在 `npm install` 时自动执行任意代码，无需用户确认。这个机制让供应链攻击的落地成本极低——攻击者只需要控制一个依赖包的发布权限。

```bash
# 生产环境和 CI/CD 应该统一加这个参数
npm ci --ignore-scripts
```

`--ignore-scripts` 会跳过所有生命周期钩子，代价是部分需要编译原生模块的包会安装失败，但对于绝大多数纯 JS 依赖，这是一个低成本的防护。

### 3. 浮动版本约束放大了影响

`"axios": "^1.13.6"` 意味着 `npm install` 会自动安装语义版本兼容范围内的最新版，包括 `1.14.1`。在攻击窗口只有 3 小时的情况下，如果你的 `package-lock.json` 已经锁定了旧版本，`npm ci` 不会受影响；但如果你用的是 `npm install`，或者在这 3 小时内做了 `npm update`，就中招了。

### 4. 凭证不应该在环境变量里明文存放

这次攻击的核心目标之一就是窃取环境变量。开发者工作站和 CI/CD 系统里充满了 `export AWS_SECRET_ACCESS_KEY=...`。这是行业的普遍实践，也是供应链攻击最喜欢的收割场景。

更安全的替代方案：AWS IAM Roles（EC2/Lambda 无需凭证）、GitHub OIDC（Actions 直接扮演 IAM Role，无需静态密钥）、HashiCorp Vault 或 AWS Secrets Manager 管理敏感凭证。

---

## 检查清单

**立即行动**：

- [ ] 检查 `package.json` 和 `package-lock.json`，确认使用的是 `axios@1.14.0` 或 `axios@1.15.0+`，不是 `1.14.1`
- [ ] 如果在 2026-03-31 00:21–03:15 UTC 期间有机器执行过 `npm install`，检查上述 IoC
- [ ] 升级到 `axios@1.15.0` 修复 CVE-2026-40175

**流程改进**：

- [ ] CI/CD 流水线改用 `npm ci --ignore-scripts`
- [ ] 敏感凭证迁移到 Secrets Manager，不要明文放在环境变量
- [ ] 关键依赖考虑锁定到精确版本（`"axios": "1.15.0"` 而不是 `"^1.15.0"`）
- [ ] 评估是否需要引入 `npm audit --audit-level=critical` 到 CI 流程

**IoC 速查**：

| 类型 | 值 |
|------|-----|
| 恶意 axios 版本 | `1.14.1`、`0.30.4` |
| 恶意依赖包 | `plain-crypto-js@4.2.1` |
| C2 域名 | `sfrclak.com` |
| C2 IP | `142.11.206.73:8000` |
| macOS 落地文件 | `/Library/Caches/com.apple.act.mond` |
| Windows 落地文件 | `%PROGRAMDATA%\wt.exe`、`%TEMP%\6202033.ps1` |
| Linux 落地文件 | `/tmp/ld.py` |
| 网络检测特征 | User-Agent 含 `msie 8.0; windows nt 5.1` |

---

axios 投毒事件的可怕之处不在于技术有多复杂，而在于它展示了现代开发工具链有多脆弱：一个被劫持的维护者账号，一个 `postinstall` 钩子，3 小时，百万个环境。攻击者需要的运气，远比我们想象的少。

**延伸阅读**：
- [Elastic Security Labs：axios 投毒完整技术分析](https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all)
- [StepSecurity：供应链攻击详细报告](https://www.stepsecurity.io/blog/axios-compromised-on-npm-malicious-versions-drop-remote-access-trojan)
- [Aikido Security：CVE-2026-40175 实际可利用性分析](https://www.aikido.dev/blog/axios-cve-2026-40175-a-critical-bug-thats-not-exploitable)
- [Microsoft Security Blog：Sapphire Sleet 归因与缓解指南](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/)
