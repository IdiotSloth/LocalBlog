# STYLE.md — 设计系统规范

> Local Blog KB 视觉设计权威参考。所有变量、间距、圆角、阴影均为确定值。
> 实际 CSS 实现见 `src/renderer/assets/index.css`。

---

## 1. 设计基调

暗色暖调为主（默认 `:root`），亮色为覆盖（`.light`）。圆角 + 微妙阴影 + 平滑过渡构成"柔软、圆润"感知，像一本翻开的笔记本而非开发工具。

主题切换有 200ms 全页过渡。

---

## 2. 色彩系统

### 暗色模式（默认）

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg-primary` | `#0F1317` | 页面主背景（微暖黑） |
| `--bg-secondary` | `#181C22` | 卡片、侧栏、面板 |
| `--bg-tertiary` | `#1E2433` | hover/active/选中态 |
| `--bg-code` | `#1A1F2B` | 代码块背景 |
| `--border-default` | `#30363D` | 通用边框 |
| `--border-emphasis` | `#484F58` | 强调边框 |
| `--text-primary` | `#C9D1D9` | 正文 |
| `--text-secondary` | `#8B949E` | 辅助文字 |
| `--text-placeholder` | `#484F58` | 占位符 |
| `--accent-blue` | `#58A6FF` | 链接、主按钮、聚焦环 |
| `--accent-green` | `#3FB950` | 成功、已引用标记 |
| `--accent-amber` | `#D29922` | 警告、未使用标记 |
| `--accent-red` | `#F85149` | 危险操作、删除 |
| `--accent-purple` | `#C678DD` | 代码块装饰 |
| `--text-on-accent` | `#FFFFFF` | 强调色上的文字 |

### 亮色模式 (`.light`)

| Token | 值 |
|-------|-----|
| `--bg-primary` | `#FFFCF8` |
| `--bg-secondary` | `#F8F5F0` |
| `--bg-tertiary` | `#EDEAE5` |
| `--bg-code` | `#F6F8FA` |
| `--border-default` | `#D0D7DE` |
| `--border-emphasis` | `#8C959F` |
| `--text-primary` | `#24292F` |
| `--text-secondary` | `#57606A` |
| `--text-placeholder` | `#8C959F` |
| `--accent-blue` | `#0969DA` |
| `--accent-green` | `#1A7F37` |
| `--accent-amber` | `#9A6700` |
| `--accent-red` | `#CF222E` |
| `--text-on-accent` | `#FFFFFF` |

---

## 3. 排版

### 字体

| 用途 | 字体栈 |
|------|--------|
| 正文 | `Inter, Noto Sans SC, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif` |
| 代码 | `JetBrains Mono, Fira Code, Source Code Pro, Noto Sans Mono CJK SC, Consolas, monospace` |

### 字号层级

| 元素 | 字号 | 行高 | 字重 |
|------|------|------|------|
| h1 | 32px | 1.3 | 700 |
| h2 | 24px | 1.4 | 600 |
| h3 | 20px | 1.4 | 600 |
| h4 | 16px | 1.5 | 600 |
| 正文 | 16px | 1.75 | 400 |
| .text-sm | 13px | — | 400 |
| .text-xs | 12px | — | 400 |
| 代码 | 14px | 1.6 | 400 |

### 博客正文 (.prose)

- 最大宽度: `var(--content-max)` = 780px
- h2: 左侧 `4px solid var(--accent-blue)` 装饰条 + 16px 左内边距
- blockquote: `var(--accent-amber)` 左边框 + `var(--bg-secondary)` 背景
- 代码块: `var(--accent-purple)` 左边框
- 链接: `var(--accent-blue)`，无下划线，hover 显示下划线

---

## 4. 间距（8px 网格）

| Token | 值 | 典型用途 |
|-------|-----|---------|
| `--space-1` | 4px | 紧凑间距 |
| `--space-2` | 8px | 元素间隙 |
| `--space-3` | 16px | 内边距、组件间距 |
| `--space-4` | 24px | 卡片 padding |
| `--space-5` | 32px | 区块间距 |
| `--space-6` | 48px | 页面级间距 |

所有间距为 4px 整数倍。禁止非 4px 倍数的间距值。

---

## 5. 圆角

| Token | 值 | 应用 |
|-------|-----|------|
| `--radius-sm` | 6px | 标签、小控件 |
| `--radius-btn` | 8px | 按钮、输入框、下拉 |
| `--radius-card` | 12px | 卡片、面板、模态框 |
| `--radius-full` | 9999px | 圆形元素 |

禁止 `border-radius: 0` 或 < 4px 的圆角。

---

## 6. 阴影

| Token | 值 | 场景 |
|-------|-----|------|
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.25)` | 卡片默认 |
| `--shadow-dropdown` | `0 4px 16px rgba(0,0,0,0.30)` | 下拉菜单 |
| `--shadow-hover` | `0 6px 20px rgba(0,0,0,0.35)` | 卡片 hover |

暗色/亮色使用相同的 rgba 值。

---

## 7. 动效

| Token | 值 | 用途 |
|-------|-----|------|
| `--duration-fast` | 150ms | 按钮 hover、聚焦 |
| `--duration-normal` | 200ms | 卡片抬升、主题切换、组件入场 |
| `--duration-slow` | 800ms | 大型过渡 |
| `--easing-default` | `ease` | 通用 |
| `--easing-out` | `ease-out` | 入场 |

- 卡片 hover: `translateY(-2px)` + box-shadow 抬升 + border-color 变蓝
- 主题切换: `html { transition: background-color 200ms, color 200ms }`
- 入场动画: `@keyframes fadeUp`（从下方 8px 淡入, 200ms）
- 禁止: 0ms 突变（拖拽等实时操作除外）

---

## 8. 组件

### 按钮

- **主按钮** `.btn-primary`: `bg: accent-blue, color: #fff, radius: 8px, padding: 6px 16px, font: 14px/500`。hover → opacity 0.85
- **危险按钮** `.btn-danger`: 同上，`bg: accent-red`

### 输入框 `.input-dark`

`bg: bg-primary, border: 1px solid border-default, radius: 8px, padding: 8px 12px, font: 15px`。
focus: `border-color: accent-blue` + `box-shadow: 0 0 0 2px rgba(88,166,255,0.15)`。

### 卡片 `.card`

`bg: bg-secondary, border: 1px solid border-default, radius: 12px, padding: 24px`。
hover: `border-color: accent-blue, translateY(-2px), box-shadow 抬升`。

### 标签 `.tag`

`inline-flex, bg: bg-tertiary, color: text-secondary, font: 13px, padding: 4px 12px, radius: 4px`。
hover: `bg: accent-blue, color: #fff`。

### 代码

- 代码块容器 `.code-block`: `border-left: 4px solid accent-blue`
- 代码块顶栏 `.code-bar`: 语言标签，`bg: bg-secondary, height: 32px, font: 12px mono`
- 行内 `<code>`: `bg: bg-code, color: accent-red, radius: 3px, padding: 2px 6px`

### 表格

`th`: `bg: bg-tertiary, padding: 8px 12px, text-align: left, font-weight: 600`
`td`: `padding: 8px 12px, border-top: 1px solid border-default`

---

## 9. 布局参数

| 参数 | 值 |
|------|-----|
| 内容最大宽度 | 780px |
| 导航栏高度 | 56px |
| 桌面宠物窗口 | 128×128px |
| 便签迷你窗 | 380×60px |
| 独立编辑器窗 | 900×650px |
| 网页抓取窗 | 500×420px |

---

## 10. 工具类速查

| Class | 效果 |
|-------|------|
| `.text-primary` | 主文字色 |
| `.text-secondary` | 辅助文字色 |
| `.text-muted` | 占位符级 |
| `.text-accent` | 蓝色强调 |
| `.text-danger` | 红色警告 |
| `.text-sm / .text-xs` | 13px / 12px |
| `.text-mono` | 等宽字体 |
| `.surface-card` | 卡片背景+边框+圆角 |
| `.surface-input` | 输入框背景+边框+文字色 |
| `.row-hover:hover` | hover 行高亮 |
| `.animate-in` | fadeUp 入场 |
| `.cursor-blink` | 终端光标闪烁 |

---

## 11. 禁止

- ❌ 硬编码色值
- ❌ `border-radius: 0` 或 < 4px
- ❌ 0ms 过渡（拖拽除外）
- ❌ 覆盖 `font-family`
- ❌ 非 4px 倍数间距
- ❌ 组件级 `color: #fff`（用 `--text-on-accent`）
