# AI 助手

Local Blog KB 内置 AI 对话和编辑器辅助功能。需要先在设置中配置 LLM。

[→ 配置 AI](/settings)

## 配置 AI

1. 设置 → AI 对话 → 开启 [→ 去设置](/settings)
2. 选择服务商 (OpenAI / Anthropic / DeepSeek / Ollama)
3. 填写 API Key（仅存本地，永不上传）
4. 可选自定义模型和 API 地址

支持的厂商:

- **OpenAI**: gpt-4o, gpt-4-turbo 等 — 通用最强
- **Anthropic**: claude-sonnet-4-6 等 — 长文理解
- **DeepSeek**: deepseek-chat — 性价比
- **Ollama**: 本地运行，完全离线，零成本

## AI 对话 (RAG)

点击顶部 🤖 图标打开对话面板。AI 会检索你的知识库内容，基于相关文档回答。

[→ 试试: 点顶部 🤖 图标，问"总结我最近的内容"]

试试这些问题:
- "总结我最近写的博客"
- "Docker 相关的知识文件有哪些"
- "帮我回顾一下某博客的要点"

## 编辑器 AI

在博客编辑器中使用 AI 辅助写作:

- **工具栏**: 点击 ✦ AI 按钮 → 选择续写/摘要/润色/翻译 [→ 试试](/blog/new)
- **右键菜单**: 选中文本 → 右键 → AI 操作
- **快捷键**: `Ctrl+J` 打开 AI 菜单

AI 会自动获取选中的文本或全文内容进行处理。

## 自动标签

保存博客后，AI 自动建议 3-5 个标签（需在设置中开启 AI）。建议以 toast 弹窗展示。

[→ 写一篇博客试试](/blog/new)
