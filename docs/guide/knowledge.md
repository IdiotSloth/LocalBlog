# 知识库

知识库是你的文件收纳中心（Pogget 风格）。卡片即文件，点击即开，零预览页。

[→ 打开知识库](/knowledge)

## 文件导入

- **拖入导入**: 将文件从桌面拖到知识库页面，自动导入（检测同名文件冲突，三选：替换/保留两者/跳过）[→ 试试](/knowledge)
- **按钮导入**: 点击页面顶部「导入文件」按钮选择文件
- **浏览器剪藏**: 使用 Chrome 扩展将网页内容保存到知识库
- **大文件警告**: >50MB 文件拖入时 toast 提示

支持的格式: Markdown (.md), 纯文本 (.txt), PDF, DOCX, XLSX, PPTX, CSV, 代码文件, 图片

## 卡片画布

知识库默认卡片视图（顶部按钮切换卡片/列表）：

- **卡片视图**: 卡片网格，Lucide 图标 + 3px 左侧色条 + 标题 + 大小 + 日期
- **列表视图**: 传统表格，支持排序和批量操作

[→ 试试: 打开知识库](/knowledge)

## 点击即开

点击任意文件卡片 → **中央栏原地打开**（不跳路由，无预览页）：

- **文本文件** (.md, .txt, .csv): Tiptap 无框编辑器 (md) 或 textarea (txt)
- **PDF**: 内嵌 webview 预览
- **其他**: iframe 预览
- **返回按钮** → 回到卡片网格
- 右侧 ContextPanel 显示：文件信息/预览/被博客引用列表/embedding 相似文件推荐

[→ 打开知识库试试](/knowledge)

## 文件类型图标 (Lucide)

| 类型 | 颜色 | 图标 |
|------|------|------|
| .md | 蓝色 | FileCode |
| .txt | 灰色 | FileText |
| .csv | 绿色 | FileSpreadsheet |
| .docx | 蓝色 | FileText |
| .xlsx | 绿色 | FileSpreadsheet |
| .pptx | 蓝色 | Presentation |
| .pdf | 红色 | File |
| 图片 | 蓝色 | FileImage |
| SVG | 蓝色 | FileImage |
| 其他 | 灰色 | File |

## 拖入白板

KB 卡片可拖动到白板 → 创建知识库链接节点。卡片 `draggable` + 白板 `onDrop` 自动创建。
