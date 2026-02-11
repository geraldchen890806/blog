# 增强发布工作流程文档

## 新的发布流程设计

当用户通过 Telegram 批准文章发布时，系统将按以下步骤执行并发送实时通知：

### 发布函数 (publishArticleWithNotifications)

```javascript
async function publishArticleWithNotifications(articleSlug) {
    const startTime = Date.now();
    
    try {
        // 1. 发布开始通知
        await sendTelegramMessage(`🚀 开始发布文章: ${articleSlug}
正在设置文章状态为发布...`);
        
        // 设置文章为发布状态
        await setArticlePublished(articleSlug);
        
        // 2. 构建开始通知
        await sendTelegramMessage(`📦 正在本地构建...
⏳ 构建中，预计需要30-60秒...`);
        
        // 执行构建
        const buildResult = await runBuild();
        
        // 3. 构建完成通知
        await sendTelegramMessage(`✅ 本地构建完成！生成了 ${buildResult.pageCount} 个页面`);
        
        // 4. GitHub 上传通知
        await sendTelegramMessage(`📤 正在上传到 GitHub...
包含构建产物和源代码...`);
        
        // 上传到 GitHub
        await pushToGitHub();
        
        // 5. GitHub 完成通知
        await sendTelegramMessage(`✅ GitHub 上传完成！`);
        
        // 6. 服务器部署通知
        await sendTelegramMessage(`🚚 通知服务器更新...
📥 服务器正在获取最新文件...
📋 服务器正在部署...`);
        
        // 服务器部署
        await deployToServer();
        
        // 7. 部署完成通知
        await sendTelegramMessage(`✅ 服务器部署完成！`);
        
        // 8. 状态检查通知
        await sendTelegramMessage(`🔍 检查网站发布状态...
⏳ 验证文章页面访问...`);
        
        // 网站状态检查
        const isAccessible = await checkWebsiteStatus(articleSlug);
        
        // 9. 最终结果通知
        const duration = Math.round((Date.now() - startTime) / 1000);
        
        if (isAccessible) {
            await sendTelegramMessage(`🎉 发布成功！

📝 文章：${articleSlug}
🔗 链接：https://chenguangliang.com/posts/${articleSlug}
📊 发布时间：${new Date().toLocaleString('zh-CN')}
⏱️ 总耗时：${duration}秒

📋 完成状态：
✅ 本地构建
✅ GitHub 上传  
✅ 服务器部署
✅ 网站访问验证`);
        } else {
            await sendTelegramMessage(`⚠️ 发布完成但网站访问异常
请检查网站配置或稍后重试`);
        }
        
    } catch (error) {
        await sendTelegramMessage(`❌ 发布失败
错误：${error.message}`);
        throw error;
    }
}
```

### 辅助函数

```javascript
// 发送 Telegram 消息
async function sendTelegramMessage(message) {
    try {
        await message({
            action: "send",
            target: "1638777420",
            message: message
        });
    } catch (error) {
        console.log(`📢 ${message}`); // 备用：控制台输出
    }
}

// 设置文章为发布状态
async function setArticlePublished(articleSlug) {
    const articleFile = `~/workspace/blog/src/data/blog/${articleSlug}.md`;
    await edit({
        file_path: articleFile,
        oldText: "draft: true",
        newText: "draft: false"
    });
}

// 检查网站状态
async function checkWebsiteStatus(articleSlug) {
    const url = `https://chenguangliang.com/posts/${articleSlug}`;
    const result = await web_fetch({ url: url });
    return result.status === 200;
}
```

## 使用示例

当用户发送 "可以发布" 后：

```javascript
// 用户批准发布
if (userMessage.includes("可以发布")) {
    const articleSlug = "blog-deploy-optimization";  // 从上下文获取
    await publishArticleWithNotifications(articleSlug);
}
```

## 预期通知序列

```
🚀 开始发布文章: blog-deploy-optimization
正在设置文章状态为发布...

📦 正在本地构建...
⏳ 构建中，预计需要30-60秒...

✅ 本地构建完成！生成了 107 个页面

📤 正在上传到 GitHub...
包含构建产物和源代码...

✅ GitHub 上传完成！

🚚 通知服务器更新...
📥 服务器正在获取最新文件...
📋 服务器正在部署...

✅ 服务器部署完成！

🔍 检查网站发布状态...
⏳ 验证文章页面访问...

🎉 发布成功！

📝 文章：blog-deploy-optimization
🔗 链接：https://chenguangliang.com/posts/blog-deploy-optimization
📊 发布时间：2026-02-11 21:05:30
⏱️ 总耗时：1分20秒

📋 完成状态：
✅ 本地构建
✅ GitHub 上传  
✅ 服务器部署
✅ 网站访问验证
```

这样用户就能实时了解发布进度，体验更加透明和友好！