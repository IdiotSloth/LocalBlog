import { Link } from 'react-router-dom';

// ── Reusable Components ──

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 rounded-[8px] border p-4 text-[13px] leading-relaxed"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--accent-amber)',
        color: 'var(--text-secondary)',
        borderLeftWidth: 3,
        borderLeftStyle: 'solid',
      }}
    >
      <span className="mr-2" style={{ color: 'var(--accent-amber)' }}>💡</span>
      {children}
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-block rounded-[4px] px-1.5 py-0.5 font-mono text-[12px]"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </kbd>
  );
}

/** Horizontal flow diagram: cards connected by arrows */
function FlowChart({ steps }: { steps: { icon: string; label: string; detail: string }[] }) {
  return (
    <div className="flex flex-wrap items-start gap-0 py-4">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start">
          <div
            className="flex flex-col items-center rounded-[10px] p-4 text-center"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              minWidth: 140,
              maxWidth: 180,
            }}
          >
            <span className="text-[28px]">{s.icon}</span>
            <span
              className="mt-2 text-[14px] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {s.label}
            </span>
            <span
              className="mt-1 text-[11px] leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {s.detail}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex items-center px-2 pt-8 shrink-0">
              <span className="text-[18px]" style={{ color: 'var(--accent-amber)' }}>→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Vertical numbered step list */
function StepList({ steps }: { steps: { num: number; label: string; detail: string }[] }) {
  return (
    <div className="space-y-1 rounded-[8px] p-5" style={{ background: 'var(--bg-secondary)' }}>
      {steps.map((s) => (
        <div key={s.num} className="flex gap-3 py-1.5">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: 'var(--color-primary)', color: 'var(--text-on-accent)' }}
          >
            {s.num}
          </span>
          <div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {s.label}
            </span>
            <span className="ml-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {s.detail}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Section wrapper with icon + heading */
function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mb-6 rounded-[14px] border p-6 md:p-8"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--border-default)' }}
    >
      <div className="mb-5 flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] text-[22px]"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-[18px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Feature card for grid layouts */
function FeatureCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: string[];
}) {
  return (
    <div className="rounded-[10px] p-5" style={{ background: 'var(--bg-secondary)' }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[18px]">{icon}</span>
        <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
        {items.map((item) => (
          <li
            key={item}
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ══════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════

export function GuidePage() {
  return (
    <div className="mx-auto max-w-[780px] pb-20">
      {/* ═══ Hero ═══ */}
      <div
        className="relative mb-8 overflow-hidden rounded-[20px] p-10 md:p-12"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Decorative gradient blobs */}
        <div
          className="absolute -right-12 -top-12 h-[200px] w-[200px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-8 -left-8 h-[160px] w-[160px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)' }}
        />
        <div
          className="absolute right-1/4 top-0 h-full w-px opacity-10"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--accent-blue), transparent)' }}
        />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: 'rgba(63,185,80,0.1)', color: 'var(--accent-green)' }}>
            🔒 本地优先 · 零云端依赖
          </div>
          <h1
            className="mb-3 text-[36px] font-bold leading-tight tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            本地博客与知识库
          </h1>
          <p
            className="max-w-xl text-[16px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            一款<strong style={{ color: 'var(--text-primary)' }}>离线优先</strong>的个人桌面应用。
            集 <strong style={{ color: 'var(--accent-blue)' }}>Markdown 写作</strong>、
            <strong style={{ color: 'var(--accent-green)' }}>知识库管理</strong>、
            <strong style={{ color: 'var(--accent-amber)' }}>网页收藏</strong>于一体，
            数据完全由您掌控，无需网络连接。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ['Electron 41', 'var(--accent-blue)'],
              ['React 19', 'var(--accent-amber)'],
              ['TypeScript', 'var(--color-primary)'],
              ['MySQL / SQLite', 'var(--accent-green)'],
              ['离线可用', 'var(--text-secondary)'],
              ['免费开源', 'var(--text-secondary)'],
            ].map(([t, c]) => (
              <span
                key={t}
                className="rounded-full px-3 py-0.5 text-[11px] font-medium"
                style={{ background: 'var(--bg-tertiary)', color: c }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 核心工作流 ═══ */}
      <div
        className="mb-6 rounded-[16px] border p-6 md:p-8"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--border-default)' }}
      >

        {/* Architecture Diagram */}
        <div className="mb-6">
          <img
            src="./assets/guide-architecture.svg"
            alt="Local Blog KB 系统架构图"
            className="w-full rounded-[8px]"
            style={{ border: '1px solid var(--border-default)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            ▲ Local Blog KB 系统架构：Electron 桌面壳 + Express Web 服务器 + 双数据库后端 + FTS5 检索引擎
          </p>
        </div>

        <div className="mb-5 text-center">
          <h2
            className="text-[22px] font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            核心工作流
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            三条主线，覆盖从输入到输出的完整链路
          </p>
        </div>

        {/* Flow 1: 写作流 */}
        <div className="mb-6">
          <div
            className="mb-3 inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--accent-blue)' }}
          >
            ✍️ 写作流 — 从灵感到发布
          </div>
          <FlowChart
            steps={[
              { icon: '💡', label: '灵感', detail: '桌面宠物快捷入口\n托盘菜单新建' },
              { icon: '📝', label: '写作', detail: 'Markdown 编辑\nCtrl+S 保存' },
              { icon: '🏷️', label: '整理', detail: '标签 + 系列\n文件夹分类' },
              { icon: '📤', label: '发布', detail: '导出 PDF/Word\n预览分享' },
            ]}
          />
        </div>

        {/* Flow 2: 知识流 */}
        <div className="mb-6">
          <div
            className="mb-3 inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--accent-green)' }}
          >
            📚 知识流 — 从收集到检索
          </div>
          <FlowChart
            steps={[
              { icon: '📥', label: '收集', detail: '拖放导入文件\n网页收藏抓取' },
              { icon: '📂', label: '组织', detail: '文件夹分类\n标签关联' },
              { icon: '👁️', label: '预览', detail: 'PDF/Word/图片\nMarkdown 渲染' },
              { icon: '🔍', label: '检索', detail: '全文搜索\n博客引用链接' },
            ]}
          />
        </div>

        {/* Flow 3: 桌面流 */}
        <div>
          <div
            className="mb-3 inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--accent-amber)' }}
          >
            🖥️ 桌面流 — 常驻后台，随手可用
          </div>
          <FlowChart
            steps={[
              { icon: '🖱️', label: '托盘', detail: '窗口关闭→隐藏\n右键弹出菜单' },
              { icon: '🐱', label: '宠物', detail: '点击弹出菜单\n拖拽自由移动' },
              { icon: '📋', label: '便签', detail: '剪贴板一键存\n24h 自动清理' },
              { icon: '⌨️', label: '快捷键', detail: 'Ctrl+Shift+N\nMD 浮窗直达' },
            ]}
          />
        </div>
      </div>

      {/* ═══ 1. 快速开始 ═══ */}
      <Section
        icon="🚀"
        title="快速开始"
        subtitle="首次使用只需 3 步，3 分钟上手"
      >
        <div className="mb-5 overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--border-default)' }}>
          {/* Visual 3-step flow with connecting lines */}
          {[
            { num: 1, title: '注册账号', desc: '输入用户名、密码，选择一个本地目录作为工作区。工作区是您的数据仓库，所有博客、文件、附件都存储在此。', icon: '👤' },
            { num: 2, title: '写作第一篇文章', desc: '点击侧栏「博客」→「新建博客」，选择模板后开始写作。Markdown 或所见即所得模式自由切换，Ctrl+S 保存。', icon: '✍️' },
            { num: 3, title: '探索更多功能', desc: '导入文件到知识库、收藏网页、设置桌面宠物——点击侧栏各个入口开始探索，或按 ? 查看所有快捷键。', icon: '🔍' },
          ].map((s, i) => (
            <div key={s.num} className="relative">
              <div
                className="flex items-start gap-4 p-5"
                style={{
                  background: i === 0 ? 'var(--bg-secondary)' : 'transparent',
                  borderBottom: i < 2 ? '1px solid var(--border-default)' : 'none',
                }}
              >
                <div className="relative">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[16px]"
                    style={{ background: 'var(--color-primary)', color: 'var(--text-on-accent)' }}
                  >
                    {s.icon}
                  </span>
                  {i < 2 && (
                    <div
                      className="absolute bottom-0 left-1/2 h-8 w-0.5 -translate-x-1/2 translate-y-full"
                      style={{ background: 'var(--border-default)' }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold" style={{ color: 'var(--color-primary)' }}>
                      STEP {s.num}
                    </span>
                    <h4 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {s.title}
                    </h4>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <TipBox>
          工作区目录请选择一个有足够空间且常驻的文件夹。建议放在用户目录下（如 ~/Documents/LocalBlogKB），避免放在系统盘或移动硬盘。
        </TipBox>
      </Section>

      {/* ═══ 2. 博客写作 ═══ */}
      <Section
        icon="✍️"
        title="博客写作"
        subtitle="从草稿到发布，完整的创作体验"
      >
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard
            icon="📝"
            title="编辑器功能"
            items={[
              'Markdown / 所见即所得双模式切换',
              'Ctrl+S 保存 + 30 秒自动草稿 + 恢复提示',
              '专注模式 — 全屏无干扰沉浸写作',
              '模板系统 — 复用常用文章结构',
              '历史版本回滚 — 随时恢复到之前版本',
              '阅读时间预估 + 自动目录生成',
            ]}
          />
          <FeatureCard
            icon="🏗️"
            title="组织与发布"
            items={[
              '标签系统 — 多标签分类 + 关联计数面板',
              '系列链 — 设置系列 ID 自动生成上一篇/下一篇',
              '文件夹分类 — 多层嵌套树形结构管理',
              '批量操作 — 多选删除 / 批量打标签',
              '导出 PDF — 打印级质量排版',
              '导出 Word (.docx) — 兼容 MS Office',
            ]}
          />
        </div>

        {/* Blog Editor Workflow Diagram */}
        <div className="mb-4">
          <img
            src="./assets/guide-blog-editor.svg"
            alt="博客写作工作流"
            className="w-full rounded-[8px]"
            style={{ border: '1px solid var(--border-default)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            ▲ 博客写作流程：编辑 → 整理 → 发布 + 辅助功能
          </p>
        </div>

        {/* Writing mini-flow */}
        <div className="rounded-[10px] p-5" style={{ background: 'var(--bg-secondary)' }}>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            写作流程
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {['选择模板', '编辑内容', '添加标签', '设置系列', '预览', '导出'].map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-[6px] px-3 py-1.5 font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{s}</span>
                {i < 5 && <span style={{ color: 'var(--accent-amber)' }}>→</span>}
              </span>
            ))}
          </div>
        </div>
        <TipBox>
          写作前先选模板可以大幅提升效率。模板支持预设标题、格式和标签，新建博客时自动应用。
        </TipBox>
      </Section>

      {/* ═══ 3. 知识库 ═══ */}
      <Section
        icon="📚"
        title="知识库管理"
        subtitle="构建您的第二大脑——导入、预览、搜索、关联"
      >
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard
            icon="📄"
            title="文件格式支持"
            items={[
              'PDF — 内嵌文本预览，支持前 5 页',
              'Word (.docx) — mammoth HTML 渲染',
              'Excel (.xlsx) — 表格数据内嵌展示',
              'Markdown (.md) — rich rendering 预览',
              '图片 (png/jpg/gif/webp/svg/bmp) — 内嵌显示',
              '视频/音频 (mp4/webm/mp3/wav) — 播放器预览',
            ]}
          />
          <FeatureCard
            icon="🗂️"
            title="管理能力"
            items={[
              '拖放导入 — 直接拖文件到知识库页面',
              '文件夹分类 — 创建多层文件夹组织',
              '全文搜索 — 文件名 + 文本内容检索',
              '标签关联 — 知识库文件也可打标签',
              '博客引用 — 博客中引用知识库文件为参考',
              '系统打开 — 使用本地应用打开原始文件',
            ]}
          />
        </div>
        <TipBox>
          大文件（&gt;20MB）建议使用「系统程序打开」功能，用本地应用程序打开原始文件，比内嵌预览体验更好。预览超时（10s）会自动提示降级。
        </TipBox>
      </Section>

      {/* ═══ 4. 网页收藏 ═══ */}
      <Section
        icon="🌐"
        title="网页收藏"
        subtitle="URL → Markdown，一键将网页转为可编辑的博客"
      >
        <div className="rounded-[10px] p-5 mb-5" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {[
              { label: '复制 URL', icon: '🔗' },
              { label: '收藏网页', icon: '🌐' },
              { label: '自动提取正文', icon: '🤖' },
              { label: '预览结果', icon: '👁️' },
              { label: '导入为博客', icon: '✅' },
            ].map((s, i) => (
              <span key={s.label} className="flex items-center gap-2">
                <span
                  className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-medium"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <span>{s.icon}</span> {s.label}
                </span>
                {i < 4 && <span style={{ color: 'var(--accent-amber)' }}>→</span>}
              </span>
            ))}
          </div>
        </div>
        <StepList
          steps={[
            { num: 1, label: '打开「收藏网页」', detail: '点击博客列表页顶部工具栏的收藏按钮，或从托盘/桌面宠物菜单打开独立抓取窗口' },
            { num: 2, label: '粘贴网页 URL', detail: '支持单个 URL 或批量输入（每行一个），抓取窗体会自动去重' },
            { num: 3, label: '自动提取正文', detail: '基于 Mozilla Readability 算法，自动识别文章主体、跳过广告和导航栏' },
            { num: 4, label: '导入为 Markdown 博客', detail: '抓取结果直接保存为博客草稿，保留原标题和段落结构，可立即编辑' },
          ]}
        />
        <TipBox>
          抓取的网页会保留标题、段落、链接等排版结构。图片不会被下载到本地——如需离线查看图片，建议手动保存到附件后再插入。
        </TipBox>
      </Section>

      {/* ═══ 5. 桌面功能 ═══ */}
      <Section
        icon="🖥️"
        title="桌面功能"
        subtitle="关闭窗口 ≠ 退出——托盘常驻 + 桌面宠物 + 快捷入口，随时待命"
      >
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <div
            className="rounded-[10px] p-5"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[20px]">🖱️</span>
              <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                系统托盘
              </h4>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-green)' }}>
                关闭即隐藏
              </span>
            </div>
            <ul className="space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)', listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 快速便签 · MD 浮窗 · 新建博客</li>
              <li>· 导入 MD/文件 · 收藏网页 · 剪贴板→便签</li>
              <li>· 打开主窗口 · 桌面宠物开关 · 退出</li>
            </ul>
          </div>
          <div
            className="rounded-[10px] p-5"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[20px]">🐱</span>
              <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                桌面宠物
              </h4>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-amber)' }}>
                可拖拽
              </span>
            </div>
            <ul className="space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)', listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 悬浮在桌面最顶层 · 任意拖拽</li>
              <li>· 静息态呼吸动画 · 拖拽时表情变化</li>
              <li>· 点击弹出快捷菜单（同托盘）</li>
              <li>· 位置自动记忆 · 支持多显示器</li>
            </ul>
          </div>
          <div
            className="rounded-[10px] p-5"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[20px]">📋</span>
              <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                便签 + 浮窗
              </h4>
            </div>
            <ul className="space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)', listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 快捷便签 — Enter 保存 · 24h 自动清理</li>
              <li>· MD 浮窗 — Ctrl+Shift+N · 独立写作窗口</li>
              <li>· 剪贴板一键转入便签</li>
              <li>· Markdown 富文本渲染，编辑/预览切换</li>
            </ul>
          </div>
          <div
            className="rounded-[10px] p-5"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[20px]">📑</span>
              <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                博客标签条
              </h4>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}>
                快速切换
              </span>
            </div>
            <ul className="space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)', listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 阅读中一键最小化为浮动标签条</li>
              <li>· 最多同时缩小 5 篇博客</li>
              <li>· 点击标签即恢复，无缝跳转</li>
              <li>· 位置记忆 + 标题截断显示</li>
            </ul>
          </div>
          <div
            className="rounded-[10px] p-5"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[20px]">⌨️</span>
              <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                全局快捷键
              </h4>
            </div>
            <ul className="space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)', listStyle: 'none', paddingInlineStart: 0 }}>
              <li><Kbd>Ctrl+Shift+N</Kbd> · MD 写作浮窗</li>
              <li><Kbd>Ctrl+F</Kbd> · 全局搜索</li>
              <li><Kbd>Ctrl+S</Kbd> · 保存当前博客</li>
              <li><Kbd>?</Kbd> · 快捷键帮助面板</li>
              <li><Kbd>Esc</Kbd> · 关闭弹窗/浮窗</li>
            </ul>
          </div>
        </div>
        <TipBox>
          快捷键可在「设置 → 快捷键」中自定义。点击快捷键条目进入录制模式，按下新组合键即可替换。冲突会自动检测提示。
        </TipBox>
      </Section>

      {/* ═══ 6. 全局搜索 ═══ */}
      <Section
        icon="🔍"
        title="全局搜索与回收站"
        subtitle="快速检索所有内容 · 误删 30 天内可恢复"
      >
        {/* Search System Diagram */}
        <div className="mb-5">
          <img
            src="./assets/guide-search-system.svg"
            alt="FTS5 全文搜索系统"
            className="w-full rounded-[8px]"
            style={{ border: '1px solid var(--border-default)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            ▲ FTS5 搜索系统：MySQL FULLTEXT + Worker 倒排索引双模式，Intl.Segmenter 中文分词 + TF-IDF 相关度排序
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon="🔎"
            title="全局搜索"
            items={[
              '顶部搜索栏 — 任意页面可用',
              '同时搜索博客标题/内容 + 知识库文件名',
              'FTS5 全文检索引擎 + Intl.Segmenter 中文分词',
              'Worker 线程倒排索引，TF-IDF 相关度排序',
              'MySQL FULLTEXT INDEX 数据库级加速',
            ]}
          />
          <FeatureCard
            icon="♻️"
            title="回收站"
            items={[
              '删除 = 移入回收站（非永久删除）',
              '30 天内可恢复 — 支持批量恢复',
              '超过 30 天自动清理释放空间',
              '清空回收站同时删除磁盘文件',
              '删除账户时可选择保留或删除文件',
            ]}
          />
        </div>
      </Section>

      {/* ═══ 7. 个性化 ═══ */}
      <Section
        icon="🎨"
        title="主题与个性化"
        subtitle="打造属于你的写作环境"
      >
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard
            icon="🎭"
            title="主题系统"
            items={[
              '暗色模式 — 护眼深色界面',
              '亮色模式 — 纸张质感暖色调',
              '跟随系统 — 自动切换明暗',
              '全局 200ms 平滑过渡动画',
              'CSS 变量体系 — 全应用统一色调',
            ]}
          />
          <FeatureCard
            icon="📖"
            title="阅读与成就"
            items={[
              '5 套博客阅读主题 (默认/报纸/极简/护眼/夜间)',
              '6 枚核心成就徽章 (写作/连续/字数)',
              '写作热力图 — GitHub 风格贡献日历',
              '阅读进度记忆 — 自动恢复上次位置',
              '仪表盘数据统计 (博客/知识库/标签/存储)',
            ]}
          />
        </div>
        <TipBox>
          阅读主题在每个博客的预览页右上角切换，选择会自动记住。仪表盘「成就」标签页可查看所有已解锁和未解锁成就。
        </TipBox>
      </Section>

      {/* ═══ 8. 日历与备忘录 ═══ */}
      <Section
        icon="📅"
        title="日历与备忘录"
        subtitle="时间管理 + 随手记事，一屏掌控"
      >
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard
            icon="📆"
            title="日历视图"
            items={[
              '月视图日历 — 替换传统热力图',
              '点击日期添加日程（标题+描述+时间）',
              '有日程的日期显示圆点标记',
              '日/周/月视图自由切换',
              '数据持久化存储，重启不丢失',
            ]}
          />
          <FeatureCard
            icon="📝"
            title="备忘录"
            items={[
              'Markdown 富文本编辑，所见即所得',
              '笔记/日程/待办三种类型自由切换',
              '置顶 + 归档 + 搜索 + 标签',
              '复用便签 IPC 通道，零新依赖',
              '列表视图 + 详情展开，高效浏览',
            ]}
          />
        </div>
        <TipBox>
          日历和备忘录共用 notes 数据表。日程类型会自动在日历视图显示，笔记类型在备忘录列表展示。
        </TipBox>
      </Section>

      {/* ═══ 9. 备份 ═══ */}
      <Section
        icon="💾"
        title="数据安全与备份"
        subtitle="多重保障，数据无忧"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon="🔄"
            title="自动备份"
            items={[
              '每 24 小时自动备份数据库',
              '最多保留 7 个历史备份',
              '旧备份自动循环清理',
            ]}
          />
          <FeatureCard
            icon="📦"
            title="手动管理"
            items={[
              '设置页手动创建备份',
              '一键导出工作区 .zip（博客+知识库+数据库）',
              '从备份恢复 — 恢复后需重启应用',
              '可手动删除旧的备份文件',
            ]}
          />
        </div>
      </Section>

      {/* ═══ 页脚 ═══ */}
      <div
        className="mt-8 rounded-[16px] border p-8 text-center"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Local-first badge */}
        <div
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-medium"
          style={{ background: 'rgba(63,185,80,0.1)', color: 'var(--accent-green)' }}
        >
          🔒 本地优先 · Local First
        </div>

        <blockquote
          className="mx-auto mb-6 max-w-md text-[14px] leading-relaxed italic"
          style={{ color: 'var(--text-secondary)' }}
        >
          "你的数据完全由你掌控。零云端依赖——所有博客、文件、便签均在你选择的本地目录中。
          无需注册在线服务，数据永不离开你的设备。"
        </blockquote>

        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Local Blog KB · Electron 41 · React 19 · TypeScript · MySQL / SQLite 双后端
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          免费开源 · 离线可用 · 零数据收集
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/blog/new"
            className="inline-flex items-center gap-2 rounded-[8px] px-5 py-2 text-[14px] font-medium no-underline transition-opacity hover:opacity-85"
            style={{ background: 'var(--color-primary)', color: 'var(--text-on-accent)' }}
          >
            ✍️ 开始写作
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-[8px] px-5 py-2 text-[14px] font-medium no-underline transition-opacity hover:opacity-85"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            ⌂ 仪表盘
          </Link>
        </div>
      </div>
    </div>
  );
}
