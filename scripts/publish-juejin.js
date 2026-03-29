#!/usr/bin/env node
/**
 * 掘金自动发布脚本
 * 通过 OpenClaw 管理的浏览器执行掘金 API 调用（利用已登录的 Cookie）
 * 
 * 用法（由 agent 在浏览器 evaluate 中调用）：
 * - 创建草稿 → 更新内容 → 发布
 * 
 * 掘金 API 端点：
 * - 创建草稿：POST /content_api/v1/article_draft/create
 * - 更新草稿：POST /content_api/v1/article_draft/update
 * - 发布文章：POST /content_api/v1/article/publish
 * - 分类列表：GET /tag_api/v1/query_category_briefs
 * - 搜索标签：POST /tag_api/v1/query_tag_list
 * 
 * 分类 ID 对照：
 * - 前端：6809637767543259144
 * - 后端：6809637769959178254
 * - 人工智能：6809637773935378440
 * - 开发工具：6809637771511070734
 * - 代码人生：6809637776263217160
 */

// This script documents the API flow.
// Actual execution happens via browser evaluate in the openclaw profile.
// See TOOLS.md for the agent workflow.

console.log("This script is a reference. Use browser evaluate to call juejin API.");
