---
author: 陈广亮
pubDatetime: 2026-06-05T14:00:00+08:00
title: 工具指南61-在线YAML与JSON互转工具
slug: blog182_yaml-json-guide
featured: true
draft: true
reviewed: true
approved: false
tags:
  - 工具指南
  - 工具
  - YAML
  - JSON
  - DevOps
  - 配置管理
description: 介绍一款纯浏览器端运行的YAML与JSON在线互转工具，支持实时转换、语法高亮和错误提示，帮助开发者在Kubernetes配置、CI/CD流水线等场景中高效处理配置格式。
---

做后端或 DevOps 的同学应该有体会：一天里切换 YAML 和 JSON 格式的次数，可能比切换编辑器 tab 的次数还多。

Kubernetes 的资源定义用 YAML，但 `kubectl get -o json` 输出的是 JSON。GitHub Actions 的 workflow 是 YAML，但 API 返回的 payload 全是 JSON。Docker Compose 是 YAML，Terraform 的 `tfvars` 可以是 JSON。两种格式在现代技术栈里几乎是共生关系，而你经常需要在它们之间来回转换。

手动转换不现实。YAML 的缩进规则严格到令人发指——少一个空格就报错，多一个空格语义完全不同。JSON 反过来，引号和大括号的嵌套层级一深，肉眼根本看不出结构。

这篇文章介绍一个纯浏览器端的 [在线 YAML-JSON 互转工具](https://anyfreetools.com/tools/yaml-json)，不需要装 Node.js，不需要 Python 脚本，打开浏览器粘贴内容就能转。

## YAML 和 JSON 的本质区别

先理清两种格式的核心差异，这样在转换时才知道哪些地方会出问题。

### 数据模型

JSON 的数据模型很简单：对象、数组、字符串、数字、布尔值、null，总共六种。YAML 是 JSON 的超集（YAML 1.2 规范明确了这一点），它支持 JSON 的所有类型，同时额外支持：

- **锚点和别名**（`&anchor` / `*anchor`）：用于引用重复的数据块
- **多行字符串**（`|` 和 `>`）：保留换行或折叠换行
- **注释**（`#`）：JSON 不支持注释，这是很多人选择 YAML 做配置文件的首要原因
- **多文档**（`---` 分隔）：一个文件里放多个独立文档

### 语法风格

JSON 用的是显式分隔符——花括号 `{}`、方括号 `[]`、冒号 `:`、逗号 `,`。格式不依赖空白字符，理论上可以把整个 JSON 写成一行。

YAML 用缩进表示层级关系，类似 Python。没有花括号，没有逗号，视觉上更简洁，但也更容易出错。下面是同一份数据的两种表示：

```json
{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "nginx",
    "labels": {
      "app": "nginx"
    }
  },
  "spec": {
    "replicas": 3
  }
}
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  replicas: 3
```

YAML 版本少了 5 行，没有一个引号，可读性明显更好。这也是 Kubernetes 选择 YAML 作为主要配置格式的原因之一。

## 实际转换中的常见坑

格式互转听起来简单，但真正动手的时候，坑比想象的多。

### 坑1：YAML 的隐式类型推断

YAML 会自动推断值的类型。这个特性有时很方便，有时让人崩溃：

```yaml
version: 1.0    # 解析为浮点数 1.0，不是字符串 "1.0"
port: 8080      # 解析为整数 8080
enabled: yes    # 解析为布尔值 true
country: NO     # 解析为布尔值 false（Norway 的 ISO 代码被误判）
```

最后一个例子是真实的生产事故来源。挪威的国家代码 `NO` 在 YAML 里会被解析成 `false`，转成 JSON 后变成 `{"country": false}`。这是 YAML 1.1 的行为，虽然 YAML 1.2 规范已将布尔值限定为 `true/false`，但很多常用解析器（如 PyYAML）仍默认按 1.1 规范解析，所以实际中依然需要注意。类似的还有 `on`/`off`、`y`/`n` 都会被当作布尔值。

解决方法是加引号强制为字符串：

```yaml
country: "NO"
version: "1.0"
```

使用在线工具转换时，工具通常会按 YAML 规范解析，所以你能立刻看到转换后的 JSON 结果是否符合预期——这比在 CI 流水线里发现类型错误要好得多。

### 坑2：多行字符串的转换

YAML 支持两种多行字符串语法：

```yaml
# 保留换行（Literal Block）
script: |
  echo "step 1"
  echo "step 2"
  echo "step 3"

# 折叠换行（Folded Block）
description: >
  This is a very long
  description that will be
  folded into a single line.
```

转成 JSON 后：

```json
{
  "script": "echo \"step 1\"\necho \"step 2\"\necho \"step 3\"\n",
  "description": "This is a very long description that will be folded into a single line.\n"
}
```

`|` 保留所有换行符，`>` 把换行替换成空格。转成 JSON 后，这些换行符变成了 `\n` 转义字符。从 JSON 转回 YAML 时，工具需要判断是否应该还原为多行语法，这个过程不一定能完美还原。

### 坑3：注释丢失

JSON 不支持注释。YAML 转 JSON 后，所有注释都会丢失：

```yaml
# 数据库配置 - 生产环境
database:
  host: db.example.com  # 主节点
  port: 5432            # 默认 PostgreSQL 端口
  pool_size: 20         # 根据连接数调整
```

转成 JSON：

```json
{
  "database": {
    "host": "db.example.com",
    "port": 5432,
    "pool_size": 20
  }
}
```

三条注释全没了。如果你需要保留注释，建议保留一份 YAML 原件，JSON 版本只用于程序消费。

### 坑4：锚点和别名的展开

YAML 的锚点/别名是个强大的去重机制：

```yaml
defaults: &defaults
  timeout: 30
  retries: 3
  log_level: info

production:
  <<: *defaults
  log_level: warn

staging:
  <<: *defaults
  timeout: 60
```

转成 JSON 后，锚点会被完全展开：

```json
{
  "defaults": {
    "timeout": 30,
    "retries": 3,
    "log_level": "info"
  },
  "production": {
    "timeout": 30,
    "retries": 3,
    "log_level": "warn"
  },
  "staging": {
    "timeout": 60,
    "retries": 3,
    "log_level": "info"
  }
}
```

数据变完整了，但也变冗余了。从 JSON 转回 YAML 时，工具不可能自动恢复锚点引用，因为它无法知道哪些重复数据原本是共享的。

## 实际使用场景

### 场景1：调试 Kubernetes 配置

你用 `kubectl get deployment nginx -o json` 拿到了一份 JSON 格式的 Deployment 详情，现在想修改它并用 `kubectl apply -f` 重新部署。`apply` 命令更习惯接受 YAML 文件，而且 YAML 可读性更好，适合人工编辑。

操作流程：

1. 把 JSON 输出粘贴到 [YAML-JSON 互转工具](https://anyfreetools.com/tools/yaml-json)
2. 点击"JSON 转 YAML"
3. 复制 YAML 结果，保存为 `.yaml` 文件
4. 编辑需要修改的字段
5. `kubectl apply -f deployment.yaml`

比手动缩进快得多，也不容易出格式错误。

### 场景2：编写 GitHub Actions Workflow

GitHub Actions 的 workflow 文件是 YAML 格式，但很多 Action 的输入参数文档给的是 JSON 示例。比如你在配置矩阵构建（Matrix Strategy）：

```json
{
  "matrix": {
    "os": ["ubuntu-latest", "macos-latest", "windows-latest"],
    "node": [18, 20, 22]
  }
}
```

粘贴到工具里转成 YAML：

```yaml
matrix:
  os:
    - ubuntu-latest
    - macos-latest
    - windows-latest
  node:
    - 18
    - 20
    - 22
```

直接复制到 workflow 文件里就能用。

### 场景3：API 响应数据转配置文件

后端 API 返回的都是 JSON。如果你需要把 API 响应中的某部分固化为配置文件（比如 feature flags、权限配置），转成 YAML 格式更适合人工维护：

```json
{
  "features": {
    "dark_mode": {
      "enabled": true,
      "rollout_percentage": 50,
      "allowed_users": ["user_001", "user_002"]
    },
    "new_dashboard": {
      "enabled": false,
      "rollout_percentage": 0,
      "allowed_users": []
    }
  }
}
```

转成 YAML 后，产品经理也能看懂和编辑：

```yaml
features:
  dark_mode:
    enabled: true
    rollout_percentage: 50
    allowed_users:
      - user_001
      - user_002
  new_dashboard:
    enabled: false
    rollout_percentage: 0
    allowed_users: []
```

### 场景4：Docker Compose 调试

Docker Compose 文件是 YAML，但 `docker compose config` 命令可以输出规范化后的 YAML 或 JSON。当 Compose 文件用了大量的环境变量替换和 extends 时，先转成 JSON 看一下解析后的最终结果，确认变量替换是否正确，再决定下一步操作。

## 命令行替代方案对比

除了在线工具，命令行也有方案。但每种方案都有局限：

### Python 一行脚本

```bash
# YAML 转 JSON
python3 -c "import sys, yaml, json; json.dump(yaml.safe_load(sys.stdin), sys.stdout, indent=2)" < config.yaml

# JSON 转 YAML
python3 -c "import sys, yaml, json; yaml.dump(json.load(sys.stdin), sys.stdout, default_flow_style=False)" < config.json
```

前提是机器上装了 Python 和 PyYAML。CI 环境里通常满足，但临时调试一个配置文件的时候，跑到终端写这么长一串并不方便。

### yq 工具

```bash
# YAML 转 JSON
yq -o json config.yaml

# JSON 转 YAML
yq -P config.json
```

`yq` 是专门处理 YAML 的命令行工具，功能强大。但需要安装（`brew install yq` 或下载二进制），而且 `yq` 有两个主流版本（Mike Farah 版和 kislyuk 版），语法不兼容，容易搞混。

### jq + yq 组合

```bash
cat config.yaml | yq -o json | jq '.metadata.labels'
```

对于复杂的查询和转换场景，命令行工具确实更灵活。但日常的格式转换——把一段 YAML 快速转成 JSON，或者反过来——在线工具打开浏览器就能用，不需要安装任何依赖，对于非本地开发环境（比如在别人的电脑上临时调试）尤其方便。

## 转换时的最佳实践

根据日常使用经验（实测），总结几条转换时需要注意的事项：

1. **转换前先验证源格式**。YAML 缩进错误很隐蔽，建议先在工具里确认源文件解析无误，再做转换。工具通常会给出解析错误的具体行号。

2. **注意数值精度**。JSON 和 YAML 对浮点数的处理在边界情况下可能不一致。超大整数（超过 `Number.MAX_SAFE_INTEGER`，即 2^53 - 1）在 JavaScript 环境下会丢失精度，这不是格式问题，而是运行时限制。

3. **重要配置保留 YAML 原件**。YAML 转 JSON 是无损的（除了注释），但 JSON 转 YAML 再转回 JSON 不一定能精确还原原始格式。如果注释很重要，永远保留 YAML 版本作为 source of truth。

4. **多文档 YAML 需要分别转换**。一个 YAML 文件里可以用 `---` 分隔多个文档（Kubernetes 资源文件经常这样），JSON 没有多文档的概念。转换时需要把每个文档单独处理。

5. **安全考虑**。在线工具如果是纯浏览器端运行（数据不上传服务器），适合处理包含敏感信息的配置。如果不确定工具是否安全，生产环境的配置建议用本地命令行工具处理。[这款 YAML-JSON 互转工具](https://anyfreetools.com/tools/yaml-json) 所有计算都在浏览器端完成，不会上传数据。

## 总结

YAML 和 JSON 是现代开发中最常用的两种数据格式。它们各有适用场景：YAML 可读性好，适合人工编辑的配置文件；JSON 结构严格，适合程序间的数据交换。两者之间的转换是日常开发中的高频操作。

在线 YAML-JSON 互转工具的核心价值在于"即开即用"——不需要安装依赖，不需要记命令行语法，打开浏览器粘贴内容就能转。对于调试 Kubernetes 配置、编写 CI/CD 流水线、处理 API 响应数据等场景，可以省下不少时间。

如果你的团队同时使用 YAML 和 JSON，建议统一以 YAML 为 source of truth（因为注释不可逆丢失），JSON 版本由工具自动生成。

---

**相关阅读**：
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/) - JSON 格式化和验证
- [工具指南11-JSON转TypeScript类型生成器](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/) - 从 JSON 生成 TypeScript 类型定义
- [工具指南16-在线JSON对比工具](https://chenguangliang.com/posts/blog106_json-diff-guide/) - 对比两份 JSON 数据的差异
- [工具指南42-在线JSON Schema验证器](https://chenguangliang.com/posts/blog141_json-schema-validator-guide/) - 验证 JSON 数据是否符合 Schema
- [工具指南48-在线JSONPath查询工具](https://chenguangliang.com/posts/blog150_jsonpath-guide/) - 用 JSONPath 表达式查询 JSON 数据

**本系列其他文章**：
- [工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/)
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/)
- [工具指南3-在线正则表达式测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/)
- [工具指南4-二维码生成工具](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/)
- [工具指南5-Base64编解码工具](https://chenguangliang.com/posts/blog090_base64-tool-guide/)
- [更多工具指南...](https://chenguangliang.com/tags/%E5%B7%A5%E5%85%B7%E6%8C%87%E5%8D%97/)
