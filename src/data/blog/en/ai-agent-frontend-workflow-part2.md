---
author: Gerald Chen
pubDatetime: 2026-02-14T18:00:00+08:00
title: "AI Agent Frontend Workflow (Part 2): Intelligent Code Review and Automated Testing"
slug: ai-agent-frontend-workflow-part2
featured: true
draft: false
tags:
  - AI
  - Agent
  - 测试
  - 前端
description: "Use AI Agents for intelligent code review and automated test case generation. From Git Hook integration to E2E testing, this post shares a complete hands-on setup with real project metrics."
---

## Recap: From Component Generation to Quality Assurance

[In the previous post](/en/posts/ai-agent-frontend-workflow-part1) we covered using AI Agents to generate React components — going from product requirements to runnable code with a 3-5x efficiency gain. But code that runs and code that's high quality are two different things.

Production code needs rigorous review and testing. Traditionally, both are labor-intensive:

- **Code review**: senior engineers spend huge amounts of time reviewing junior engineers' code, yet struggle to be thorough and consistent
- **Writing tests**: test coverage hovers around 30%-50% year afterall — everyone knows they should write tests, but it's always "I'll catch up next time"

The question this post tackles: **can an AI Agent take over this quality assurance work?**

The answer: yes, and it works better than expected.

## Part 1: AI-Driven Code Review

### Three Chronic Problems with Traditional Code Review

Let's be honest:

1. **Limited stamina**: a senior engineer gets fatigued after reviewing 10 PRs, and review quality drops from there
2. **Inconsistent standards**: the same issue might get flagged on Monday but waved through on Friday
3. **Incomplete coverage**: it's hard for a human to simultaneously watch for performance, security, accessibility, best practices... there are just too many dimensions

The result: either review is expensive (30+ minutes per PR), or it becomes a rubber stamp (drop an LGTM and move on).

### Where an AI Agent Wins

AI doesn't get tired, doesn't get moody, and can check dozens of dimensions at once. More importantly: **it's online 24/7 at a predictable cost**.

The key is how to integrate it into the workflow. My approach: **Git Hook + AI API**.

### Hands-on: Integrating with a Git Hook

We use Husky to trigger an AI code review at the `pre-commit` stage. Full implementation below:

#### 1. Install dependencies

```bash
npm install -D husky lint-staged
npx husky install
```

#### 2. Create the review script

In `scripts/ai-code-review.js`:

```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// 获取暂存区的文件变更
function getStagedDiff() {
  try {
    return execSync('git diff --cached', { encoding: 'utf-8' });
  } catch (error) {
    console.error('无法获取 git diff:', error.message);
    return '';
  }
}

// AI 审查 Prompt（这是关键）
const REVIEW_PROMPT = `你是一个资深前端工程师，负责代码审查。请审查以下 git diff，关注：

**性能问题：**
- 不必要的重渲染（缺少 useMemo、useCallback）
- 大数组操作没有做虚拟化
- 图片/资源未优化
- 阻塞主线程的同步操作

**安全隐患：**
- XSS 风险（dangerouslySetInnerHTML 未做转义）
- CSRF 防护缺失
- 敏感信息泄露（API key、token 硬编码）
- eval() 或 Function() 构造器的使用

**最佳实践：**
- 组件职责是否单一
- props 类型检查（TypeScript / PropTypes）
- 错误边界处理
- 可访问性（aria 属性、语义化标签）
- 命名规范和代码风格

**边界情况：**
- 空数组、null、undefined 的处理
- 异步操作的错误处理
- 网络请求失败的降级方案

请按以下格式输出：

## 🚨 Critical Issues（阻断性问题）
- [文件名:行号] 问题描述 + 修复建议

## ⚠️ Warnings（需要关注）
- [文件名:行号] 问题描述 + 优化建议

## ✅ Good Practices（做得好的地方）
- 简要列出亮点

## 📊 Summary
- 总体评分（1-10）
- 是否建议合并

如果没有发现任何问题，输出 "✅ LGTM - 代码质量良好，建议合并"`;

async function reviewCode(diff) {
  if (!diff || diff.trim().length === 0) {
    console.log('✅ 没有代码变更需要审查');
    return { shouldBlock: false, report: '' };
  }

  console.log('🤖 AI 正在审查代码...\n');

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${REVIEW_PROMPT}\n\n## Git Diff:\n\`\`\`diff\n${diff}\n\`\`\``
      }]
    });

    const report = message.content[0].text;
    
    // 保存审查报告
    const reportPath = path.join(process.cwd(), '.ai-review-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(report);
    console.log(`\n📄 完整报告已保存到: ${reportPath}\n`);

    // 判断是否有阻断性问题
    const hasCriticalIssues = report.includes('## 🚨 Critical Issues') 
      && !report.match(/## 🚨 Critical Issues\s*\n\s*无/);

    return {
      shouldBlock: hasCriticalIssues,
      report
    };

  } catch (error) {
    console.error('❌ AI 审查失败:', error.message);
    // 降级策略：AI 失败不阻断提交
    console.log('⚠️  AI 服务不可用，跳过审查（降级模式）');
    return { shouldBlock: false, report: '' };
  }
}

async function main() {
  const diff = getStagedDiff();
  const { shouldBlock, report } = await reviewCode(diff);

  if (shouldBlock) {
    console.error('\n❌ 发现阻断性问题，请修复后再提交\n');
    process.exit(1);
  } else {
    console.log('\n✅ 代码审查通过\n');
    process.exit(0);
  }
}

main();
```

#### 3. Configure the Husky hook

In `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 运行 AI 代码审查
node scripts/ai-code-review.js

# 如果审查通过，继续执行 lint-staged
npx lint-staged
```

#### 4. Configure environment variables

```bash
# .env
ANTHROPIC_API_KEY=your_api_key_here
```

### A Real Case: What the AI Caught

Last week I committed a form component, and the AI review caught an issue I had completely missed:

```jsx
// 我的原始代码
function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索..."
      />
      <button type="submit">搜索</button>
    </form>
  );
}
```

**The AI's review report:**

```markdown
## ⚠️ Warnings

- [SearchInput.jsx:7] **可访问性问题**：input 缺少 label 或 aria-label，
  屏幕阅读器用户无法理解这个输入框的用途。
  
  建议修复：
  <label htmlFor="search-input" className="sr-only">搜索</label>
  <input 
    id="search-input"
    aria-label="搜索内容"
    ...
  />

- [SearchInput.jsx:12] **用户体验**：提交空字符串会触发无意义的搜索。
  建议在 handleSubmit 中添加校验：
  if (query.trim().length === 0) return;

## 📊 Summary
- 总体评分：7/10
- 功能正常，但可访问性和边界情况处理需要改进
- 建议修复后合并
```

This is a classic case of "it works, but it isn't professional." A human reviewer would very likely miss the accessibility issue — the AI checks for it every single time.

## Part 2: Automated Test Case Generation

### Why Does Test Coverage Never Improve?

Honestly: **writing tests is tedious**.

You finish a complex component, eager to see it in action — and then you have to spend just as long writing a pile of repetitive test cases. So it ends up like this:

- Core logic gets tests (because someone is watching)
- Edge cases? Later, when there's time
- UI components? A manual click-through is fine
- E2E tests? That's QA's problem

The result is 30% coverage, and then edge cases blow up all over production.

### The Approach for AI-Generated Tests

AI reads code faster than we do, and it knows every testing pattern. My approach:

1. **Unit tests**: generate Jest + React Testing Library tests from components/functions
2. **E2E tests**: generate Playwright scripts from user flows
3. **Focus on edge cases**: empty arrays, malformed data, network failures, etc.

### Hands-on: Unit Test Generation

Create `scripts/generate-tests.js`:

```javascript
#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const TEST_GENERATION_PROMPT = `你是一个测试工程师，擅长编写高质量的前端测试。

请为以下代码生成完整的测试用例，使用 Jest + React Testing Library。

**要求：**
1. 覆盖所有主要功能路径
2. 包含边界情况：空数组、null、undefined、错误数据
3. 测试用户交互：点击、输入、提交
4. 测试异步逻辑：API 调用成功和失败的情况
5. 测试可访问性：aria 属性、键盘导航
6. 使用语义化查询（getByRole > getByTestId）

**输出格式：**
- 完整可运行的测试文件
- 包含必要的 import
- 每个测试用例有清晰的描述
- 使用 describe 分组组织测试

现在请为以下代码生成测试：`;

async function generateTestForFile(filePath) {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, path.extname(filePath));

  console.log(`🤖 正在为 ${fileName} 生成测试...\n`);

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `${TEST_GENERATION_PROMPT}\n\n\`\`\`jsx\n${sourceCode}\n\`\`\``
      }]
    });

    const testCode = message.content[0].text
      .replace(/^```[a-z]*\n/, '')
      .replace(/\n```$/, '');

    // 确定输出路径
    const testFilePath = filePath.replace(/\.(jsx?|tsx?)$/, '.test.$1');
    
    fs.writeFileSync(testFilePath, testCode);
    console.log(`✅ 测试已生成: ${testFilePath}\n`);

    return testFilePath;

  } catch (error) {
    console.error(`❌ 生成失败: ${error.message}`);
    throw error;
  }
}

// 示例：为指定文件生成测试
const targetFile = process.argv[2];
if (!targetFile) {
  console.error('用法: node generate-tests.js <文件路径>');
  process.exit(1);
}

generateTestForFile(targetFile);
```

### A Real Example: AI-Generated Tests

I have a `UserProfile.jsx` component:

```jsx
import { useState, useEffect } from 'react';

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error('加载失败');
        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  if (loading) return <div role="status">加载中...</div>;
  if (error) return <div role="alert">{error}</div>;
  if (!user) return null;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

Run `node scripts/generate-tests.js src/components/UserProfile.jsx`, and the AI generates:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';

// Mock fetch
global.fetch = jest.fn();

describe('UserProfile', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('加载状态', () => {
    test('初始渲染时显示加载提示', () => {
      fetch.mockImplementation(() => new Promise(() => {})); // 永不 resolve
      render(<UserProfile userId="123" />);
      
      expect(screen.getByRole('status')).toHaveTextContent('加载中...');
    });
  });

  describe('成功场景', () => {
    test('成功获取用户数据后显示用户信息', async () => {
      const mockUser = {
        id: '123',
        name: '张三',
        email: 'zhang@example.com'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      });

      render(<UserProfile userId="123" />);

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument();
      });

      expect(screen.getByText('zhang@example.com')).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledWith('/api/users/123');
    });
  });

  describe('错误处理', () => {
    test('API 返回错误时显示错误信息', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      render(<UserProfile userId="123" />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('加载失败');
      });
    });

    test('网络请求失败时显示错误信息', async () => {
      fetch.mockRejectedValueOnce(new Error('网络错误'));

      render(<UserProfile userId="456" />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('网络错误');
      });
    });
  });

  describe('边界情况', () => {
    test('用户数据为 null 时不渲染任何内容', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      const { container } = render(<UserProfile userId="789" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('userId 变化时重新获取数据', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1', name: 'User 1', email: 'user1@example.com' })
      });

      const { rerender } = render(<UserProfile userId="1" />);
      
      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '2', name: 'User 2', email: 'user2@example.com' })
      });

      rerender(<UserProfile userId="2" />);

      await waitFor(() => {
        expect(screen.getByText('User 2')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('可访问性', () => {
    test('加载状态使用正确的 ARIA role', () => {
      fetch.mockImplementation(() => new Promise(() => {}));
      render(<UserProfile userId="123" />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('错误信息使用正确的 ARIA role', async () => {
      fetch.mockRejectedValueOnce(new Error('测试错误'));
      render(<UserProfile userId="123" />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
```

**Notice what the AI did:**

1. ✅ Covered all four scenarios: loading, success, error, and edge cases
2. ✅ Tested the refetch logic when `userId` changes (I might have missed this writing it myself)
3. ✅ Checked accessibility (role="status" and role="alert")
4. ✅ Every test case has a clear description
5. ✅ Used semantic queries (getByRole > getByText)

Writing this test suite myself would take at least 30 minutes. The AI generated it in 10 seconds, at a token cost of ￥0.15.

### E2E Test Generation

For end-to-end testing, I use the same approach to generate Playwright scripts:

```javascript
// scripts/generate-e2e.js
const E2E_PROMPT = `生成 Playwright E2E 测试，覆盖以下用户流程：

1. 完整的用户旅程（从进入页面到完成目标）
2. 表单验证（正常输入 + 错误输入）
3. 异步操作（等待加载、错误重试）
4. 边界情况（网络错误、超时）
5. 可访问性（键盘导航、屏幕阅读器兼容）

使用 Playwright 的最佳实践：
- 使用 getByRole、getByLabel 等语义化定位器
- 等待元素而非固定延时
- 截图和视频用于调试

请为以下场景生成测试：`;

// 使用示例
const scenario = `
用户登录流程：
1. 访问登录页
2. 输入用户名和密码
3. 点击登录按钮
4. 验证跳转到首页
5. 验证用户信息显示正确
`;

// AI 生成的 E2E 测试（示例）
```

Example of the generated test:

```javascript
import { test, expect } from '@playwright/test';

test.describe('用户登录流程', () => {
  test('成功登录并跳转到首页', async ({ page }) => {
    await page.goto('/login');

    // 填写表单
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');

    // 提交
    await page.getByRole('button', { name: '登录' }).click();

    // 等待跳转
    await expect(page).toHaveURL('/dashboard');

    // 验证用户信息
    await expect(page.getByText('欢迎, testuser')).toBeVisible();
  });

  test('用户名为空时显示错误', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByText('请输入用户名')).toBeVisible();
    await expect(page).toHaveURL('/login'); // 未跳转
  });

  test('密码错误时显示提示', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByRole('alert')).toHaveText('用户名或密码错误');
  });

  test('网络错误时显示友好提示', async ({ page }) => {
    // 模拟网络错误
    await page.route('/api/auth/login', route => route.abort());

    await page.goto('/login');
    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByText('网络错误，请稍后重试')).toBeVisible();
  });
});
```

## Part 3: Results Comparison — Let the Data Speak

I ran AI code review + test generation for one month on a mid-sized project (15k lines of code, 30+ components). Here's the data:

### Test Coverage Improvement

| Metric | Before | After | Improvement |
|------|--------|--------|------|
| Unit test coverage | 32% | 78% | +144% |
| E2E test scenarios | 5 | 23 | +360% |
| Edge-case bugs found | - | 17 | - |

### Cost Analysis

**Human cost:**
- Code review: average 20 minutes per PR × senior engineer rate of ￥300/h = ￥100/PR
- Writing tests: average 40 minutes per component × ￥300/h = ￥200/component

**AI cost:**
- Code review: average 3k input tokens + 1.5k output tokens = ￥0.08/PR (Claude Sonnet 4.5)
- Test generation: average 2k input tokens + 4k output tokens = ￥0.12/component

**One month of data (50 PRs, 30 components):**
- Human cost: ￥5000 (review) + ￥6000 (tests) = ￥11000
- AI cost: ￥4 (review) + ￥3.6 (tests) = ￥7.6
- **Cost reduction: 99.93%**

Time savings:
- Code review: down from 20 minutes to 2 minutes of reading the report = 90% saved
- Test writing: down from 40 minutes to 5 minutes of tweaking AI-generated tests = 87.5% saved

### Quality Improvement

Distribution of issue types the AI found:

- Accessibility issues: 47% (human reviewers almost never check these)
- Edge case handling: 28%
- Performance optimization suggestions: 15%
- Security issues: 10%

The most valuable find: a component would freeze when handling large arrays (10k+ items). The AI suggested virtual scrolling, and the fix improved performance by 95%.

## Part 4: Caveats

### 1. AI Is Not a Silver Bullet

- **False positive rate**: roughly 5%-10%, so human judgment is still required
- **Context limitations**: it can't understand business logic — it only checks the technical layer
- **Fallback strategy**: an AI service outage must never block the development workflow

### 2. The Prompt Matters

My prompt went through 5 iterations before it stabilized. Key points:

- ✅ Specify the output format explicitly (Markdown, JSON)
- ✅ Provide concrete checklist items (don't just say "check code quality")
- ✅ Give examples (few-shot learning)
- ✅ Set boundaries (when to LGTM, when to block)

### 3. Human-AI Collaboration

Best practices:

- AI does the first full-coverage pass
- Humans review the Critical Issues the AI flags
- For complex logic, you still need a senior engineer doing a deep review

## Part 5: Next Up — Cost Optimization and Team Collaboration

AI code review and test generation have proven their value, but two problems remain:

1. **Cost optimization**: each call is cheap, but frequent calls still add up. Can we use cheaper models?
2. **Team collaboration**: how do you roll this tooling out to the whole team? How do you standardize?

In the next post we'll dig into:

- **Prompt caching tricks that cut costs by 80%**
- **Multi-model strategies** (fast models for simple checks, strong models for complex logic)
- **Team-level AI Agent workflows** (from a personal tool to team infrastructure)

Stay tuned.

---

**Resources:**

Complete code samples and prompt templates are in the code blocks throughout each section above.
