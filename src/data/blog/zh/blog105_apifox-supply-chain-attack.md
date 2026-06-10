---
author: 陈广亮
pubDatetime: 2026-03-28T19:00:00+08:00
title: Apifox 供应链投毒事件复盘：你的 SSH Key 可能已经泄露了
slug: blog105_apifox-supply-chain-attack
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - 开发效率
description: 2026 年 3 月，Apifox 桌面客户端遭遇供应链投毒攻击，官方 CDN 上的 JS 文件被替换为恶意版本，窃取用户 SSH Key、Git 凭证等敏感信息。从攻击原理、影响范围到自查方法，拆解这次事件的技术细节。
---

3 月 25 日，安全研究员 @ohyishi 在 X 上披露了一个严重的安全事件：Apifox 桌面客户端遭受供应链投毒攻击。慢雾安全团队随后发布了详细分析报告。

如果你在 **2026 年 3 月 4 日到 3 月 22 日**之间用过 Apifox 桌面客户端（Windows、macOS、Linux 均受影响），你的 SSH 私钥、Git 凭证、Shell 历史记录可能已经泄露。

这不是理论上的风险——V2EX 上已经有用户确认中招，发现 GitHub 在自己睡觉时出现了异常登录记录。

## 发生了什么

Apifox 是一款基于 Electron 的 API 协作平台，国内开发者用得很多。它的桌面客户端启动时会从官方 CDN 加载一个 JavaScript 文件：

```text
https://cdn.apifox.com/www/assets/js/apifox-app-event-tracking.min.js
```

这个文件原本是合法的数据分析脚本，大小约 34KB。但从 3 月 4 日起，这个文件被间歇性替换为投毒版本，体积膨胀到 77KB——多出来的部分就是恶意代码。

攻击者在合法代码的末尾追加了高度混淆的恶意 JavaScript。因为文件托管在 Apifox 自己的官方 CDN 上，所有安全检测都会把它当作可信资源放行。

## 攻击原理拆解

这次攻击的技术链条分为四个阶段：

### 第一阶段：Electron 沙箱缺失

Apifox 的 Electron 桌面端没有严格启用 sandbox 参数，并且向渲染进程暴露了 Node.js API。这意味着在渲染进程中运行的 JavaScript 不仅能操作 DOM，还能直接调用 Node.js 的文件系统、子进程等系统级 API。

正常情况下，Electron 应用应该开启沙箱隔离，渲染进程的 JS 只能通过 preload 脚本暴露的有限接口和主进程通信。Apifox 没做这层防护，使攻击成为可能。

### 第二阶段：CDN 资源篡改

攻击者篡改了 Apifox 官方 CDN 上的 JS 文件。这是最关键的一步——不是在 npm 包里投毒，不是在 GitHub 仓库里藏后门，而是直接改了 CDN 上的静态资源。

这说明攻击者要么入侵了 Apifox 的 CDN 管理系统，要么是内部人员操作（V2EX 社区对此有不少讨论），具体原因 Apifox 官方仍在调查中。

投毒版本不是每次都触发——它有概率性触发机制，这让问题更难被发现。有些用户在攻击活跃的 18 天内每天使用 Apifox 却没中招，有些用户只打开过一次就被攻击了。

### 第三阶段：恶意载荷执行

投毒脚本被加载后，会进一步从攻击者控制的域名 `apifox[.]it[.]com` 拉取第二阶段载荷。这个域名故意取了和 apifox.com 相似的名字，托管在 Cloudflare 上，存活了 18 天。

载荷执行后会做这些事：

1. **采集敏感数据**：
   - `~/.ssh/` 目录下的所有文件（包括私钥）
   - `~/.git-credentials`（Git 凭证明文）
   - `~/.zsh_history` 和 `~/.bash_history`（命令历史）
   - `~/.kube/*`（Kubernetes 配置）、`~/.npmrc`（npm token）、`~/.zshrc`（环境变量）
   - `~/.subversion/*`（SVN 凭证）
   - 当前运行的进程列表

2. **数据回传**：采集到的数据经 Gzip 压缩 + AES-256-GCM 加密（硬编码密钥）后，Base64 编码发送到 `apifox[.]it[.]com/event/0/log`

3. **持续活跃**：恶意代码内置随机定时器（30 分钟到 3 小时间隔），只要 Apifox 保持运行就会反复执行数据采集和 C2 通信。C2 平台理论上可下发任意后续载荷，包括后门植入和横向移动，但目前未被公开确认

### 第四阶段：反检测机制

攻击者在代码混淆上下了很大功夫：

- 使用 `javascript-obfuscator` 对恶意代码进行多层混淆
- 所有字符串用 RC4 加密，运行时动态解密
- 数值常量用多步计算表达式代替，躲避静态分析
- C2 下发载荷使用 RSA 加密，数据回传使用 AES-256-GCM 加密，分层防止流量分析
- 恶意代码追加在合法代码之后，利用 CDN 白名单绕过安全检测

## 影响范围

**受影响的用户**：
- 2026 年 3 月 4 日至 3 月 22 日期间使用过 Apifox **公网 SaaS 版桌面客户端**的所有用户
- Windows、macOS、Linux 三个平台均受影响
- Apifox Web 版和私有化部署版不受影响

**可能泄露的信息**：
- SSH 私钥（`~/.ssh/` 目录）
- Git 凭证（`~/.git-credentials`）
- Shell 历史命令（可能包含明文密码、token 等）
- Apifox 账户的 accessToken
- 系统进程信息

需要注意的是，macOS 的 TCC 机制保护的是桌面、文档、下载等用户目录，但 `~/.ssh/`、`~/.git-credentials`、`~/.zsh_history` 等隐藏文件**不在 TCC 保护范围内**，任何应用均可自由读取。所以 macOS 用户面临的风险和 Windows、Linux 用户基本一致，不要有侥幸心理。

## 如何自查

### 方法一：检查 LevelDB 存储

恶意脚本会在 Apifox 的本地存储中写入标记。检查是否存在 `rl_mc` 或 `rl_headers` 键：

**macOS**：
```bash
grep -arlE "rl_mc|rl_headers" "$HOME/Library/Application Support/apifox/Local Storage/leveldb"
```

**Windows（PowerShell）**：
```powershell
Select-String -Path "$env:APPDATA\apifox\Local Storage\leveldb\*" -Pattern "rl_mc","rl_headers" -List | Select-Object Path
```

**Linux**：
```bash
grep -arlE "rl_mc|rl_headers" ~/.config/apifox/Local\ Storage/leveldb
```

如果有输出，说明你**确认中招**。

### 方法二：检查异常外联

查看 Apifox 的网络持久化状态文件中是否有恶意域名：

**macOS**：
```bash
grep "apifox.it.com" "$HOME/Library/Application Support/apifox/Network Persistent State"
```

### 方法三：检查系统异常

- 审计 `~/.ssh/` 目录的最近访问时间
- 检查 `crontab -l`（Linux/macOS）是否有异常定时任务
- macOS 检查 `~/Library/LaunchAgents/` 是否有未知 plist 文件
- Linux 检查 `/etc/systemd/system/` 是否有异常 service

## 处置建议

如果确认中招或无法排除，按"已泄露"处理：

1. **SSH Key**：生成新的密钥对，在所有服务器和 Git 平台（GitHub、GitLab）替换公钥，吊销旧密钥
2. **Git 凭证**：重置所有 Git 平台的 Personal Access Token
3. **API Key**：轮换所有在 Shell 历史中出现过的 API Key 和密码。K8s 用户重置 kubeconfig，npm 用户重置 npm token
4. **Apifox 账户**：登出后重新登录，强制失效旧 Token，修改密码
5. **清除恶意数据**：在 Apifox 开发者工具控制台执行：
   ```javascript
   localStorage.removeItem('_rl_headers');
   localStorage.removeItem('_rl_mc');
   ```
6. **升级客户端**：更新到 v2.8.19 或更高版本
7. **网络封锁**：在防火墙或 DNS 层面屏蔽 `apifox.it.com` 及其所有子域名

## 更深层的问题

这次事件暴露了几个值得所有开发者关注的问题：

### Electron 应用的安全隐患

大量开发者工具基于 Electron 构建（VS Code、Postman、Slack、Discord...）。Electron 本身不是问题，问题在于很多应用没有正确配置安全策略：

- 没有启用渲染进程沙箱（`sandbox: true`）
- 没有禁用 `nodeIntegration`
- 没有限制 `preload` 脚本的能力范围
- 加载了不受控的远程资源

一个配置不当的 Electron 应用，本质上就是一个拥有系统权限的浏览器——任何加载进来的 JS 都能读写文件、执行命令。

### CDN 信任链断裂

我们习惯性地信任"官方 CDN"上的资源。但这次攻击证明，CDN 本身也可能被攻破。仅靠域名判断资源是否可信是不够的，需要配合 SRI（Subresource Integrity）校验和内容签名。

### "概率性触发"增加检测难度

攻击者故意让恶意行为不是每次都触发，这大幅增加了被发现的时间。安全团队做常规检测时可能刚好没触发，用户偶尔遇到异常又可能归因于网络问题。

### 供应链攻击的定义争议

V2EX 和社区中有不少开发者质疑这是否真的是"供应链攻击"。严格来说，供应链攻击是指信任链中的上游环节被入侵（比如 npm 包被投毒、CI/CD 流水线被劫持）。这次是 Apifox 自己的 CDN 被篡改，更像是直接入侵或内部问题。Apifox 用"供应链攻击"的说法，有被社区质疑为"甩锅"之嫌。

不过对最终用户来说，不管是哪种攻击方式，影响是一样的：你信任的软件变成了攻击载体。

## 给开发者的建议

1. **最小权限原则**：开发工具不需要全磁盘访问权限，macOS 用户不要随意给应用授权
2. **密钥管理**：SSH 私钥加密码保护，使用密码管理器（1Password、Bitwarden）而不是明文文件
3. **定期轮换凭证**：即使没有安全事件，关键凭证也应定期更换
4. **关注安全通报**：订阅你使用的工具的安全通知渠道
5. **考虑替代方案**：如果你的 API 测试需求不复杂，curl + jq、Hoppscotch（开源）、Bruno（本地优先）都是不错的选择

你安装的每一个桌面应用，都是一个潜在的攻击面。Apifox 不会是最后一个。

一个有意思的细节：安全研究者发现，攻击入口的 Stage-1 代码用了 7 层混淆，但 C2 下发的 Stage-2 载荷里却保留了完整的中文注释（包括"盐值也必须提供"这种教学式说明）。攻击者在前端混淆上下足了功夫，后端却留了明文——这种 OPSEC 水平上的前后矛盾，要么是团队协作中的疏忽，要么有其他原因。

---

**IoC（入侵指标）**：
- 恶意域名：`apifox[.]it[.]com` 及其子域名
- 篡改文件：`cdn.apifox.com/www/assets/js/apifox-app-event-tracking.min.js`（77KB 版本）
- SHA256：`91d48ee33a92acef02d8c8153d1de7e7fe8ffa0f3b6e5cebfcb80b3eeebc94f1`

**参考来源**：
- [慢雾安全团队分析报告](https://slowmist.medium.com/security-alert-supply-chain-attack-on-apifox-desktop-client-via-compromised-official-cdn-script-bc3870992564)
- [Apifox 官方通告](https://mp.weixin.qq.com/s/GpACQdnhVNsMn51cm4hZig)
- [V2EX 社区讨论](https://www.v2ex.com/t/1201146)
