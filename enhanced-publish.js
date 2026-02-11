#!/usr/bin/env node

/**
 * 增强版博客发布脚本 - 带实时通知
 * 使用方法: node enhanced-publish.js <article-slug>
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TELEGRAM_CHAT_ID = "1638777420";

// 发送 Telegram 通知
async function sendNotification(message) {
    try {
        // 使用 OpenClaw 的 message 工具发送通知
        const cmd = `openclaw message send --target ${TELEGRAM_CHAT_ID} --message "${message}"`;
        execSync(cmd, { stdio: 'inherit' });
        console.log(`📢 通知已发送: ${message}`);
    } catch (error) {
        console.log(`📢 ${message}`); // 备用方案：仅控制台输出
    }
}

// 执行命令并显示进度
function executeCommand(command, description) {
    console.log(`🔄 ${description}...`);
    try {
        const result = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
        console.log(`✅ ${description}完成`);
        return { success: true, output: result };
    } catch (error) {
        console.log(`❌ ${description}失败:`, error.message);
        return { success: false, error: error.message };
    }
}

// 主发布流程
async function publishArticle(articleSlug) {
    const startTime = Date.now();
    
    try {
        // 0. 发布开始
        console.log(`🚀 开始发布文章: ${articleSlug}`);
        await sendNotification(`🚀 开始发布文章: ${articleSlug}\n正在设置文章状态为发布...`);
        
        // 1. 设置文章为发布状态
        const articleFile = `src/data/blog/${articleSlug}.md`;
        if (!fs.existsSync(articleFile)) {
            throw new Error(`文章文件 ${articleFile} 不存在`);
        }
        
        let content = fs.readFileSync(articleFile, 'utf8');
        content = content.replace(/draft:\s*true/, 'draft: false');
        fs.writeFileSync(articleFile, content);
        
        // 2. 本地构建
        await sendNotification(`📦 正在本地构建...\n⏳ 构建中，预计需要30-60秒...`);
        
        const buildResult = executeCommand('npm run build', '本地构建');
        if (!buildResult.success) {
            throw new Error('构建失败: ' + buildResult.error);
        }
        
        // 检查构建输出统计
        const buildLines = buildResult.output.split('\n');
        const pagesLine = buildLines.find(line => line.includes('page(s) built'));
        const pageCount = pagesLine ? pagesLine.match(/\d+/)[0] : '?';
        
        await sendNotification(`✅ 本地构建完成！生成了 ${pageCount} 个页面`);
        
        // 3. GitHub 上传
        await sendNotification(`📤 正在上传到 GitHub...\n包含构建产物和源代码...`);
        
        executeCommand('git add .', 'Git添加文件');
        executeCommand(`git commit -m "Publish article: ${articleSlug}"`, 'Git提交');
        
        const pushResult = executeCommand('git push origin main', 'GitHub推送');
        if (!pushResult.success) {
            throw new Error('GitHub推送失败: ' + pushResult.error);
        }
        
        await sendNotification(`✅ GitHub 上传完成！`);
        
        // 4. 服务器部署  
        await sendNotification(`🚚 通知服务器更新...\n📥 服务器正在获取最新文件...`);
        
        const deployResult = executeCommand(`sshpass -p 'datayes@123' ssh -p 34567 -o StrictHostKeyChecking=no root@45.63.22.102 "cd /var/www/chenguangliang.com-source && git pull origin main && cp -r dist/* /var/www/chenguangliang.com/"`, '服务器部署');
        
        if (!deployResult.success) {
            throw new Error('服务器部署失败: ' + deployResult.error);
        }
        
        await sendNotification(`✅ 服务器部署完成！`);
        
        // 5. 状态检查
        await sendNotification(`🔍 检查网站发布状态...\n⏳ 验证文章页面访问...`);
        
        // 等待服务器更新
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const checkResult = executeCommand(`curl -s -o /dev/null -w "%{http_code}" "https://chenguangliang.com/posts/${articleSlug}"`, '网站状态检查');
        
        const statusCode = checkResult.output.trim();
        const isSuccess = statusCode === '200';
        
        // 6. 发布完成
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        if (isSuccess) {
            const successMessage = `🎉 发布成功！

📝 文章：${articleSlug}
🔗 链接：https://chenguangliang.com/posts/${articleSlug}
📊 发布时间：${new Date().toLocaleString('zh-CN')}
⏱️ 总耗时：${duration}秒

📋 完成状态：
✅ 本地构建
✅ GitHub 上传  
✅ 服务器部署
✅ 网站访问验证`;
            
            await sendNotification(successMessage);
            console.log('🎉 文章发布成功！');
        } else {
            await sendNotification(`⚠️ 发布完成但网站访问异常\nHTTP状态码：${statusCode}\n请检查网站配置`);
        }
        
    } catch (error) {
        console.error('❌ 发布失败:', error.message);
        await sendNotification(`❌ 发布失败\n错误：${error.message}`);
        process.exit(1);
    }
}

// 获取命令行参数
const articleSlug = process.argv[2];
if (!articleSlug) {
    console.error('用法: node enhanced-publish.js <article-slug>');
    process.exit(1);
}

// 执行发布
publishArticle(articleSlug);