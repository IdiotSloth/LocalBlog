# 知识库

知识库是你的素材收纳中心。每个文件一张卡片，点击即用系统默认程序打开——不内嵌预览。

[→ 打开知识库](/knowledge)

## KBCard 素材卡片

每张卡片包含：

- **文件图标**: 📎 Paperclip 图标
- **文件名**: 14px font-medium，truncate 截断
- **元信息**: 文件大小 (自动单位 KB/MB/GB)、类型、创建日期、修改日期
- **标签行**: tag pill + × 移除按钮 + + 添加按钮
- **右键菜单**: 重命名/删除/在文件管理器中显示

## 文件导入

- **拖入导入**: 将文件从桌面拖到知识库页面，自动导入（检测同名文件冲突，三选：替换/保留两者/跳过）
- **按钮导入**: 点击页面顶部「导入文件」按钮选择文件（支持 docx/doc/xlsx/xls/pptx/ppt/pdf/txt/md/png/jpg/jpeg/gif/webp/svg）
- **大文件警告**: >50MB 文件拖入时 toast 提示

## 点击即开

点击任意文件卡片 → 使用系统默认程序 (shell.openPath) 打开文件：

- .docx → Word
- .xlsx → Excel
- .pdf → PDF 阅读器
- .png/.jpg → 图片查看器
- 等等

**不是 webview 预览，不是内嵌编辑器。** 错误时 toast 显示具体失败原因。

## 文件夹侧栏

左侧可展开文件夹树，点击文件夹进行筛选。面包屑导航显示当前路径，支持层级跳转。

## 搜索 + 排序 + 筛选

- **搜索框**: 实时搜索文件名
- **类型筛选**: 下拉选择 Word/Excel/PDF/文本/图片
- **排序**: 按日期/名称/大小/类型
- **标签筛选**: 点击卡片标签自动切换到该标签筛选视图

## 批量操作

点击「批量」按钮进入批量模式：勾选/全选/删除所选。

## 文件类型图标

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
