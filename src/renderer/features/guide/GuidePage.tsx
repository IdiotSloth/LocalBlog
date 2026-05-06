import { Link } from 'react-router-dom';

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

interface SectionProps {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ icon, title, subtitle, children }: SectionProps) {
  return (
    <section
      className="rounded-[12px] border p-6 md:p-8"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--border-default)' }}
    >
      <div className="mb-5 flex items-start gap-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[20px]"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          {icon}
        </span>
        <div>
          <h2
            className="text-[18px] font-semibold leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h2>
          <p
            className="mt-0.5 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Step({ num, label, detail }: { num: number; label: string; detail: string }) {
  return (
    <div className="flex gap-3 py-1.5">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ background: 'var(--color-primary)' }}
      >
        {num}
      </span>
      <div>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span className="ml-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {detail}
        </span>
      </div>
    </div>
  );
}

export function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl pb-16">
      {/* ── Hero ── */}
      <div
        className="relative mb-10 overflow-hidden rounded-[16px] p-8 md:p-10"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          className="absolute right-0 top-0 h-full w-1/3"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, var(--bg-tertiary) 100%)',
            opacity: 0.6,
          }}
        />
        <div className="relative">
          <p
            className="mb-2 text-[13px] font-medium tracking-wide uppercase"
            style={{ color: 'var(--color-primary)' }}
          >
            使用指南
          </p>
          <h1
            className="mb-3 text-[28px] font-bold leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            本地博客与知识库
          </h1>
          <p
            className="max-w-lg text-[15px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            一款离线优先的个人桌面应用，集
            <strong style={{ color: 'var(--text-primary)' }}>Markdown 写作</strong>、
            <strong style={{ color: 'var(--text-primary)' }}>知识库管理</strong>、
            <strong style={{ color: 'var(--text-primary)' }}>网页收藏</strong>于一体。
            数据完全由您掌控，无需网络连接。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['Electron 41', 'React 19', 'TypeScript', 'MySQL / SQLite', '离线可用', '免费开源'].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full px-3 py-0.5 text-[11px] font-medium"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t}
                </span>
              ),
            )}
          </div>
        </div>
      </div>

      {/* ── 1. 快速开始 ── */}
      <Section
        icon="🚀"
        title="快速开始"
        subtitle="首次使用的 3 个步骤，3 分钟上手"
      >
        <div className="space-y-1 rounded-[8px] p-5" style={{ background: 'var(--bg-secondary)' }}>
          <Step num={1} label="注册账号" detail="输入用户名、密码，选择一个本地目录作为工作区" />
          <Step num={2} label="写作第一篇文章" detail="点击「新建博客」，用 Markdown 或所见即所得模式写作，Ctrl+S 保存" />
          <Step num={3} label="探索更多功能" detail="导入文件到知识库、收藏网页、设置桌面宠物——从左侧栏开始探索" />
        </div>
        <TipBox>
          工作区目录是数据存储位置，请选择一个有足够空间且常驻的文件夹。所有博客、知识库文件、附件都保存在此。
        </TipBox>
      </Section>

      {/* ── 2. 博客写作 ── */}
      <Section
        icon="✍️"
        title="博客写作"
        subtitle="Markdown 与所见即所得双模式，从草稿到发布的完整流程"
      >
        <div
          className="grid gap-5 md:grid-cols-2"
          style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}
        >
          <div>
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              编辑器功能
            </h4>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· Markdown / 所见即所得双模式自由切换</li>
              <li>· <Kbd>Ctrl+S</Kbd> 保存，自动草稿每 30 秒备份</li>
              <li>· 专注模式（全屏无干扰写作）</li>
              <li>· 模板系统：快速复用常用文章结构</li>
              <li>· 历史版本回滚：随时回到之前的版本</li>
              <li>· 阅读时间预估 + 目录自动生成</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              组织与发布
            </h4>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 标签系统：为文章打标签，点击标签名查看关联内容</li>
              <li>· 系列链：设置系列 ID，自动生成上一篇/下一篇导航</li>
              <li>· 文件夹分类：拖放移动文章到文件夹</li>
              <li>· 批量操作：多选 → 批量删除 / 批量打标签</li>
              <li>· 导出 PDF（打印质量）</li>
              <li>· 导出 Word (.docx)，兼容 Microsoft Office</li>
            </ul>
          </div>
        </div>
        <TipBox>
          写作前选好模板可以大幅提升效率。模板支持自定义标题、格式和默认标签，新建博客时自动应用。
        </TipBox>
      </Section>

      {/* ── 3. 知识库 ── */}
      <Section
        icon="📚"
        title="知识库管理"
        subtitle="导入、预览、搜索——打造您的第二大脑"
      >
        <div
          className="grid gap-5 md:grid-cols-2"
          style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}
        >
          <div>
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              文件支持
            </h4>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· PDF — 内嵌预览，支持翻页</li>
              <li>· Word (.docx) — mammoth 渲染预览</li>
              <li>· Excel (.xlsx) — 表格数据预览</li>
              <li>· 纯文本 (.txt, .md) — 直接预览</li>
              <li>· 图片 (.png, .jpg, .gif, .webp, .svg)</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              管理功能
            </h4>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 拖放导入：直接拖文件到窗口</li>
              <li>· 文件夹分类：创建多层文件夹组织文件</li>
              <li>· 全文搜索：文件名 + 内容文本检索</li>
              <li>· 标签关联：知识库文件也可以打标签</li>
              <li>· 博客引用：博客正文中引用知识库文件</li>
            </ul>
          </div>
        </div>
        <TipBox>
          大文件建议使用「系统程序打开」功能（双击文件），使用本地应用程序打开原始文件，比内嵌预览体验更好。
        </TipBox>
      </Section>

      {/* ── 4. 网页收藏 ── */}
      <Section
        icon="🌐"
        title="网页收藏"
        subtitle="一键抓取网页正文，转为 Markdown 保存为博客"
      >
        <div className="rounded-[8px] p-5" style={{ background: 'var(--bg-secondary)' }}>
          <Step num={1} label="点击「收藏网页」" detail="在博客列表页顶部操作栏找到按钮" />
          <Step num={2} label="输入 URL" detail="粘贴网页链接，支持批量输入（每行一个）" />
          <Step num={3} label="自动提取正文" detail="readability 算法自动识别文章主体，去掉广告和导航" />
          <Step num={4} label="一键保存为博客" detail="抓取结果直接导入为 Markdown 博客，保留排版结构" />
        </div>
        <TipBox>
          抓取的网页会保留标题、段落、链接等结构。图片不会被下载到本地——如果需要离线查看，建议手动保存图片到附件。
        </TipBox>
      </Section>

      {/* ── 5. 桌面体验 ── */}
      <Section
        icon="🖥️"
        title="桌面体验"
        subtitle="托盘常驻、桌面宠物、快捷便签——不打开主窗口也能高效工作"
      >
        <div
          className="grid gap-5 md:grid-cols-3"
          style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}
        >
          <div
            className="rounded-[8px] p-4"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              🖱️ 托盘菜单
            </h4>
            <p className="mb-2">关闭窗口 → 应用缩小到系统托盘。右键托盘图标：</p>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 快速便签 — 一行记录</li>
              <li>· MD 写作浮窗 — 独立窗口</li>
              <li>· 新建博客 — 独立编辑器</li>
              <li>· 导入 MD / 文件</li>
              <li>· 收藏网页</li>
              <li>· 打开主窗口</li>
            </ul>
          </div>
          <div
            className="rounded-[8px] p-4"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              🐱 桌面宠物
            </h4>
            <p className="mb-2">可拖拽的小精灵，悬浮在桌面最顶层：</p>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 拖拽移动位置</li>
              <li>· 静息态上下微浮呼吸动画</li>
              <li>· 拖拽时表情变化</li>
              <li>· 点击弹出快捷菜单</li>
              <li>· 右键菜单 = 托盘菜单</li>
            </ul>
          </div>
          <div
            className="rounded-[8px] p-4"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              ⌨️ 快捷键
            </h4>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li><Kbd>Ctrl+Shift+N</Kbd> · MD 写作浮窗</li>
              <li><Kbd>Ctrl+S</Kbd> · 保存当前博客</li>
              <li><Kbd>Esc</Kbd> · 关闭浮窗/便签</li>
              <li><Kbd>?</Kbd> · 快捷键帮助面板</li>
              <li><Kbd>Enter</Kbd> · 便签中保存</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ── 6. 搜索与回收站 ── */}
      <Section
        icon="🔍"
        title="搜索与回收站"
        subtitle="快速找到内容，误删也能找回"
      >
        <div
          className="grid gap-5 md:grid-cols-2"
          style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}
        >
          <div>
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              全局搜索
            </h4>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 顶部搜索栏 — 任意页面可用 <Kbd>Ctrl+K</Kbd></li>
              <li>· 同时搜索博客标题/内容和知识库文件名</li>
              <li>· SQL LIKE 中文全文检索</li>
              <li>· 搜索结果区分博客/知识库两类</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              回收站
            </h4>
            <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
              <li>· 删除 → 移入回收站（非永久删除）</li>
              <li>· 30 天内可恢复</li>
              <li>· 支持批量恢复 / 批量删除</li>
              <li>· 超过 30 天自动清理</li>
              <li>· 清空回收站同步删除磁盘文件</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ── 7. 主题与个性化 ── */}
      <Section
        icon="🎨"
        title="主题与个性化"
        subtitle="让应用符合您的审美偏好"
      >
        <div
          className="rounded-[8px] p-5"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}
        >
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { name: '暗色模式', color: '#1a1a2e' },
              { name: '亮色模式', color: '#faf9f6' },
              { name: '跟随系统', color: 'var(--color-primary)' },
            ].map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px]"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full border"
                  style={{ background: t.color, borderColor: 'var(--border-default)' }}
                />
                {t.name}
              </span>
            ))}
          </div>
          <ul className="space-y-1" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
            <li>· 三种主题模式：暗色 / 亮色 / 跟随系统自动切换</li>
            <li>· 博客预览页支持 5 套阅读主题：默认 / 报纸 / 极简 / 护眼 / 夜间</li>
            <li>· 写作热力图：仪表盘上展示 GitHub 风格贡献日历</li>
            <li>· 成就系统：16 个成就徽章，覆盖写作、知识库、收藏、探索四类</li>
            <li>· 200ms 平滑过渡动画，切换主题不刺眼</li>
          </ul>
        </div>
      </Section>

      {/* ── 页脚 ── */}
      <div
        className="mt-10 rounded-[12px] border p-6 text-center text-[13px]"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
          color: 'var(--text-muted)',
        }}
      >
        <p className="mb-1">
          Local Blog KB v{import.meta.env.VITE_APP_VERSION || '0.3.0'}
        </p>
        <p>
          Electron 41 · React 19 · TypeScript · 离线可用 · 数据完全由您掌控
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-[6px] px-4 py-1.5 text-[13px] font-medium no-underline transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            前往仪表盘
          </Link>
          <Link
            to="/blog"
            className="rounded-[6px] px-4 py-1.5 text-[13px] font-medium no-underline transition-opacity hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            开始写作
          </Link>
        </div>
      </div>
    </div>
  );
}
