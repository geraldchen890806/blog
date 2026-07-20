fe2agent 系列 02 · 模型没有记忆——每一轮它都在把整个 messages 数组全量重发。

"对话"是客户端造出来的幻觉。React 有 diff/memo 帮你把重渲染压便宜，agent 没有，全量是真的全量。

配 tiny-agent v0.2（Context 类 + 历史压缩 + prompt caching）。

https://chenguangliang.com/posts/blog207_fe2agent-02-context/
