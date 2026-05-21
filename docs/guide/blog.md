# 博客

博客是 Local Blog KB 的核心写作模块。支持 Markdown 和 HTML 两种格式。博客列表为卡片 Feed（memos 风格）：不等高卡片、空白分隔、纯无限滚动（无分页器）。

[→ 浏览博客](/blog)  [→ 新建博客](/blog/new)

## 博客卡片

每篇博客在列表中显示为一张卡片：

- **标题**: 视觉锚点 (text-lg font-semibold)
- **元信息**: 日期 + 阅读时间 + 格式标签（退后，小字号 muted）
- **摘要**: 行内截断 3 行预览 (line-clamp-3)
- **标签 + 引用数**: 底部 footer，hover 显示操作按钮
- **无限滚动**: 滚动到底自动加载下一页（无分页器）

## 博客编辑器

点击「写博客」进入编辑器。编辑器提供：

- **无框编辑模式**: border:none / bg:transparent / padding:0（300ms fadeIn 过渡）
- **Markdown 渲染**: 实时预览，支持 markdown-it 完整语法
- **Wikilink**: 输入 `[[` 触发建议，链接到其他博客或知识库文件
- **Transclusion**: 使用 `![[标题]]` 嵌入其他内容
- **Callout 块**: 使用 `/` 斜杠命令插入 info/success/warning/danger 提示块
- **AI 辅助**: 选中文本右键 → AI 续写/摘要/润色/翻译，或按 `Ctrl+J`
- **右侧预览 Tab**: ContextPanel 编辑态自动注入「预览」Tab，500ms 防抖 + 完整管道（md → wikilink → transclusion → DOMPurify）

[→ 试试: 新建一篇博客，输入 [[ 体验 wikilink](/blog/new)

## Wikilink [[双向链接]]

输入 `[[` 后，系统会自动搜索你的知识库，推荐匹配的博客、知识文件和便签。选择后创建双向引用链接。

- **直接链接**: 已解析的 wikilink 渲染为蓝色可点击链接 → 跳转到目标
- **搜索链接**: 未解析的渲染为搜索链接 → 搜索匹配内容
- **反向链接**: ContextPanel「链接」Tab 显示谁引用了当前博客

[→ 试试: 打开一篇博客，看右侧 ContextPanel 的链接](/blog)

## Transclusion ![[内容嵌入]]

使用 `![[标题]]` 将另一篇内容嵌入当前博客：

- `![[博客B]]` → 嵌入博客 B 的全文
- `![[知识文件]]` → 嵌入知识文件描述
- `![[便签标题]]` → 嵌入便签全文

嵌入块样式: 左边框 accent-blue + 灰色背景 + 右上角来源链接。全部经 DOMPurify 净化。

[→ 试试: 在博客中写 ![[你的另一篇博客标题]]](/blog/new)

## 代码块

代码块自动 highlight.js 语法高亮 + 语言标签 (左上角) + 复制按钮 (hover 右上角)。

## 系列

将相关博客组织为系列，形成有序阅读列表。系列卡片显示前 4 篇标题预览。系列详情使用 BlogCard + ①②③ 序号 + 底部导航条 + 阅读进度跟踪。

[→ 查看系列](/series)

