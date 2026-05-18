import { Link } from 'react-router-dom';

// ── Reusable Components ──

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 rounded-[10px] p-4 text-[13px] leading-relaxed"
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--text-secondary)',
        borderLeftWidth: 3,
        color: 'var(--text-secondary)',
      }}
    >
      <span className="mr-2" style={{ color: 'var(--text-secondary)' }}>💡</span>
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

function FlowChart({ steps }: { steps: { icon: string; label: string; detail: string }[] }) {
  return (
    <div className="flex flex-wrap items-start gap-0 py-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start">
          <div
            className="flex flex-col items-center rounded-[10px] p-4 text-center transition-colors duration-[0.15s]"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', minWidth: 140, maxWidth: 180 }}
          >
            <span className="text-[28px]">{s.icon}</span>
            <span className="mt-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
            <span className="mt-1 text-[11px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>{s.detail}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex items-center px-2 pt-8 shrink-0">
              <span className="text-[16px]" style={{ color: 'var(--text-secondary)' }}>→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StepList({ steps }: { steps: { num: number; label: string; detail: string }[] }) {
  return (
    <div className="space-y-0.5 rounded-[10px] p-5" style={{ background: 'var(--bg-primary)' }}>
      {steps.map((s) => (
        <div key={s.num} className="flex gap-3 py-1.5">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: 'var(--color-primary)', color: 'var(--text-on-accent)' }}
          >
            {s.num}
          </span>
          <div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
            <span className="ml-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{s.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-[16px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <div className="mb-5 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] text-[22px]" style={{ background: 'var(--bg-tertiary)' }}>{icon}</span>
        <div>
          <h2 className="text-[18px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FeatureCard({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <div className="rounded-[10px] p-5 transition-colors duration-[0.15s]" style={{ background: 'var(--bg-primary)' }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[18px]">{icon}</span>
        <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      </div>
      <ul className="space-y-1.5" style={{ listStyle: 'none', paddingInlineStart: 0 }}>
        {items.map((item) => (
          <li key={item} className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>· {item}</li>
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
      {/* ═══ Hero — warm welcome ═══ */}
      <div className="relative mb-8 overflow-hidden rounded-[20px] p-10 md:p-12" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-6 -left-6 h-[140px] w-[140px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)' }} />
        <div className="absolute right-1/3 top-0 h-full w-px opacity-8" style={{ background: 'linear-gradient(to bottom, transparent, var(--accent-blue), transparent)' }} />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: 'var(--bg-primary)', color: 'var(--accent-green)' }}>
            🔒 本地优先 · 零云端依赖
          </div>
          <h1 className="mb-3 text-[36px] font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            欢迎来到你的写作空间
          </h1>
          <p className="max-w-xl text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            一款<strong style={{ color: 'var(--text-primary)' }}>离线优先</strong>的个人桌面应用。
            集 <strong style={{ color: 'var(--accent-blue)' }}>Markdown 写作</strong>、
            <strong style={{ color: 'var(--accent-green)' }}>知识库管理</strong>、
            <strong style={{ color: 'var(--text-secondary)' }}>网页收藏</strong>于一体，
            数据完全由你掌控，无需网络连接。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ['Electron 41', 'var(--accent-blue)'],
              ['React 19', 'var(--text-secondary)'],
              ['TypeScript', 'var(--color-primary)'],
              ['MySQL / SQLite', 'var(--accent-green)'],
              ['离线可用', 'var(--text-secondary)'],
              ['免费开源', 'var(--text-secondary)'],
            ].map(([t, c]) => (
              <span key={t} className="rounded-full px-3 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-tertiary)', color: c }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 核心工作流 ═══ */}
      <div className="mb-6 rounded-[16px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
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
            ▲ 系统架构：Electron 桌面壳 + Express Web 服务器 + 双数据库 + FTS5 检索引擎
          </p>
        </div>

        <div className="mb-5 text-center">
          <h2 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>三条工作流</h2>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>覆盖从输入到输出的完整链路</p>
        </div>

        {/* Flow 1 */}
        <div className="mb-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: 'var(--bg-primary)', color: 'var(--accent-blue)' }}>
            ✍️ 写作流
          </div>
          <FlowChart steps={[
            { icon: '💡', label: '灵感', detail: '桌面宠物快捷入口\n托盘菜单新建' },
            { icon: '📝', label: '写作', detail: 'Markdown 编辑\nCtrl+S 保存' },
            { icon: '🏷️', label: '整理', detail: '标签 + 系列\n文件夹分类' },
            { icon: '📤', label: '发布', detail: '导出 PDF/Word\n预览分享' },
          ]} />
        </div>

        {/* Flow 2 */}
        <div className="mb-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: 'var(--bg-primary)', color: 'var(--accent-green)' }}>
            📚 知识流
          </div>
          <FlowChart steps={[
            { icon: '📥', label: '收集', detail: '拖放导入文件\n网页收藏抓取' },
            { icon: '📂', label: '组织', detail: '文件夹分类\n标签关联' },
            { icon: '👁️', label: '预览', detail: 'PDF/Word/图片\nMarkdown 渲染' },
            { icon: '🔍', label: '检索', detail: '全文搜索\n博客引用链接' },
          ]} />
        </div>

        {/* Flow 3 */}
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            🖥️ 桌面流
          </div>
          <FlowChart steps={[
            { icon: '🖱️', label: '托盘', detail: '窗口关闭→隐藏\n右键弹出菜单' },
            { icon: '🐱', label: '宠物', detail: '点击弹出菜单\n拖拽自由移动' },
            { icon: '📋', label: '便签', detail: '剪贴板一键存\n回车即保存' },
            { icon: '⌨️', label: '快捷键', detail: 'Ctrl+Shift+N\nMD 浮窗直达' },
          ]} />
        </div>
      </div>

      {/* ═══ 1. 快速开始 ═══ */}
      <Section icon="🚀" title="快速开始" subtitle="三步上手，三分钟内开始写作">
        <div className="mb-5 overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--border-default)' }}>
          {[
            { num: 1, title: '注册账号', desc: '输入用户名、密码，选择一个本地目录作为工作区。你的所有数据都存储在此，完全本地控制。', icon: '👤' },
            { num: 2, title: '写第一篇文章', desc: '点击侧栏「博客」→「新建博客」，选择模板后开始写作。Markdown 或所见即所得模式自由切换。', icon: '✍️' },
            { num: 3, title: '探索更多', desc: '导入文件到知识库、收藏网页、设置桌面宠物——点击侧栏各入口开始探索吧。', icon: '🔍' },
          ].map((s, i) => (
            <div key={s.num} className="relative">
              <div className="flex items-start gap-4 p-5" style={{
                background: i === 0 ? 'var(--bg-primary)' : 'transparent',
                borderBottom: i < 2 ? '1px solid var(--border-default)' : 'none',
              }}>
                <div className="relative">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-[16px]" style={{ background: 'var(--color-primary)', color: 'var(--text-on-accent)' }}>{s.icon}</span>
                  {i < 2 && <div className="absolute bottom-0 left-1/2 h-8 w-0.5 -translate-x-1/2 translate-y-full" style={{ background: 'var(--border-default)' }} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold" style={{ color: 'var(--color-primary)' }}>STEP {s.num}</span>
                    <h4 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</h4>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <TipBox>工作区目录建议放在用户目录下（如 ~/Documents/LocalBlogKB），选择有足够空间且常驻的文件夹。</TipBox>
      </Section>

      {/* ═══ 2. 博客写作 ═══ */}
      <Section icon="✍️" title="博客写作" subtitle="从草稿到发布，完整的创作体验">
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard icon="📝" title="编辑器功能" items={[
            'Markdown / 所见即所得双模式切换',
            'Ctrl+S 保存 + 30 秒自动草稿',
            '专注模式 — 全屏无干扰写作',
            '模板系统 — 复用常用结构',
            '历史版本回滚',
            '阅读时间预估 + 自动目录',
          ]} />
          <FeatureCard icon="🏗️" title="组织与发布" items={[
            '标签系统 — 多标签分类',
            '系列链 — 自动上一篇/下一篇',
            '文件夹 — 多层嵌套管理',
            '批量操作 — 多选删除/打标签',
            '导出 PDF — 打印级排版',
            '导出 Word (.docx)',
          ]} />
        </div>
        <div className="mb-4">
          <img
            src="./assets/guide-blog-editor.svg"
            alt="博客写作工作流"
            className="w-full rounded-[8px]"
            style={{ border: '1px solid var(--border-default)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>▲ 博客写作流程：编辑 → 整理 → 发布 + 辅助功能</p>
        </div>
        <div className="rounded-[10px] p-5" style={{ background: 'var(--bg-primary)' }}>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>写作流程</p>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {['选择模板', '编辑内容', '添加标签', '设置系列', '预览', '导出'].map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-[6px] px-3 py-1.5 font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{s}</span>
                {i < 5 && <span style={{ color: 'var(--text-secondary)' }}>→</span>}
              </span>
            ))}
          </div>
        </div>
        <TipBox>写作前先选模板可以大幅提升效率。模板预设标题、格式和标签，新建时自动应用。</TipBox>
      </Section>

      {/* ═══ 3. 知识库 ═══ */}
      <Section icon="📚" title="知识库" subtitle="构建你的第二大脑——导入、预览、搜索、关联">
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard icon="📄" title="文件格式支持" items={[
            'PDF — 内嵌文本预览',
            'Word (.docx) — HTML 渲染',
            'Excel (.xlsx) — 表格展示',
            'Markdown (.md) — 富文本预览',
            '图片 (png/jpg/gif/webp/svg)',
            '视频/音频 (mp4/webm/mp3/wav)',
          ]} />
          <FeatureCard icon="🗂️" title="管理能力" items={[
            '拖放导入 — 直接拖文件到页面',
            '文件夹 — 多层组织',
            '全文搜索 — 文件名+内容',
            '标签关联 — 文件也可打标签',
            '博客引用 — 建立参考链接',
            '系统打开 — 本地应用打开',
          ]} />
        </div>
        <TipBox>大文件（&gt;20MB）建议用「系统打开」功能，用本地应用打开体验更好。预览超时会自动提示降级。</TipBox>
      </Section>

      {/* ═══ 4. 网页收藏 ═══ */}
      <Section icon="🌐" title="网页收藏" subtitle="URL → Markdown，一键将网页转为可编辑的博客">
        <div className="rounded-[10px] p-5 mb-5" style={{ background: 'var(--bg-primary)' }}>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {[
              { label: '复制 URL', icon: '🔗' },
              { label: '收藏网页', icon: '🌐' },
              { label: '提取正文', icon: '🤖' },
              { label: '预览结果', icon: '👁️' },
              { label: '导入博客', icon: '✅' },
            ].map((s, i) => (
              <span key={s.label} className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                  <span>{s.icon}</span> {s.label}
                </span>
                {i < 4 && <span style={{ color: 'var(--text-secondary)' }}>→</span>}
              </span>
            ))}
          </div>
        </div>
        <StepList steps={[
          { num: 1, label: '打开「收藏网页」', detail: '点击博客列表页顶部工具栏的收藏按钮，或从托盘/桌面宠物菜单打开' },
          { num: 2, label: '粘贴 URL', detail: '支持单个 URL 或批量输入（每行一个），自动去重' },
          { num: 3, label: '自动提取正文', detail: '基于 Mozilla Readability 算法，自动识别文章主体、跳过广告和导航' },
          { num: 4, label: '导入为 Markdown', detail: '抓取结果直接保存为博客草稿，保留原标题和段落结构，可立即编辑' },
        ]} />
        <TipBox>抓取的网页保留标题、段落、链接等排版。图片不会被下载到本地——如需离线查看，建议手动保存。</TipBox>
      </Section>

      {/* ═══ 5. 桌面功能 ═══ */}
      <Section icon="🖥️" title="桌面功能" subtitle="关闭窗口 ≠ 退出——托盘常驻 + 桌面宠物，随时待命">
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          {[
            { icon: '🖱️', title: '系统托盘', badge: '关闭即隐藏', badgeColor: 'var(--accent-green)', items: ['快速便签 · MD 浮窗 · 新建博客', '导入 MD/文件 · 收藏网页', '打开主窗口 · 宠物开关 · 退出'] },
            { icon: '🐱', title: '桌面宠物', badge: '可拖拽', badgeColor: 'var(--text-secondary)', items: ['悬浮桌面最顶层 · 任意拖拽', '静息态呼吸动画 · 拖拽时表情变化', '点击弹出快捷菜单', '位置自动记忆 · 支持多显示器'] },
            { icon: '📋', title: '便签 + 浮窗', badge: undefined, badgeColor: '', items: ['快捷便签 — Enter 保存 · 24h 自动清理', 'MD 浮窗 — Ctrl+Shift+N 独立窗口', '剪贴板一键转入便签', 'Markdown 渲染，编辑/预览切换'] },
            { icon: '📑', title: '博客标签条', badge: '快速切换', badgeColor: 'var(--accent-blue)', items: ['阅读中一键最小化为浮动标签条', '最多同时缩小 5 篇博客', '点击标签即恢复，无缝跳转', '位置记忆 + 标题截断显示'] },
            { icon: '⌨️', title: '全局快捷键', badge: undefined, badgeColor: '', items: ['Ctrl+Shift+N — MD 写作浮窗', 'Ctrl+F — 全局搜索', 'Ctrl+S — 保存当前博客', '? — 快捷键帮助面板', 'Esc — 关闭弹窗/浮窗'] },
          ].map((f) => (
            <div key={f.title} className="rounded-[10px] p-5" style={{ background: 'var(--bg-primary)' }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[20px]">{f.icon}</span>
                <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.title}</h4>
                {f.badge && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-tertiary)', color: f.badgeColor }}>
                    {f.badge}
                  </span>
                )}
              </div>
              <ul className="space-y-1 text-[13px]" style={{ color: 'var(--text-secondary)', listStyle: 'none', paddingInlineStart: 0 }}>
                {f.items.map((item) => <li key={item}>· {item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <TipBox>快捷键可在「设置 → 快捷键」中自定义。点击快捷键条目进入录制模式，按下新组合键即可替换。</TipBox>
      </Section>

      {/* ═══ 6. 搜索与回收 ═══ */}
      <Section icon="🔍" title="搜索与回收站" subtitle="快速检索所有内容 · 误删 30 天内可恢复">
        <div className="mb-5">
          <img
            src="./assets/guide-search-system.svg"
            alt="FTS5 全文搜索系统"
            className="w-full rounded-[8px]"
            style={{ border: '1px solid var(--border-default)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            ▲ FTS5 搜索：MySQL FULLTEXT + Worker 倒排索引双模式，Intl.Segmenter 中文分词 + TF-IDF 排序
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard icon="🔎" title="全局搜索" items={[
            '顶部搜索栏 — 任意页面可用',
            '同时搜索博客 + 知识库',
            'FTS5 全文引擎 + 中文分词',
            'Worker 线程倒排索引',
            'MySQL FULLTEXT 加速',
          ]} />
          <FeatureCard icon="♻️" title="回收站" items={[
            '删除 = 移入回收站',
            '30 天内可恢复',
            '超期自动清理',
            '清空同时删除磁盘文件',
          ]} />
        </div>
      </Section>

      {/* ═══ 7. 个性化 ═══ */}
      <Section icon="🎨" title="主题与个性化" subtitle="打造属于你的写作环境">
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard icon="🎭" title="主题系统" items={[
            '暗色模式 — 护眼深色界面',
            '亮色模式 — 纸张质感暖色调',
            '跟随系统 — 自动切换明暗',
            '全局 200ms 平滑过渡',
            'CSS 变量体系 — 统一色调',
          ]} />
          <FeatureCard icon="📖" title="阅读与成就" items={[
            '5 套博客阅读主题',
            '写作热力图 — GitHub 风格',
            '阅读进度记忆 — 自动恢复',
            '仪表盘数据统计',
          ]} />
        </div>
        <TipBox>阅读主题在博客预览页右上角切换，选择会自动记住。</TipBox>
      </Section>

      {/* ═══ 8. 日历与备忘录 ═══ */}
      <Section icon="📅" title="日历与待办" subtitle="时间管理 + 待办追踪，集成在仪表盘中">
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <FeatureCard icon="📆" title="日历视图" items={[
            '月视图日历 · 仪表盘内嵌',
            '点击日期添加日程',
            '有日程的日期显示圆点',
            '日/周/月视图自由切换',
          ]} />
          <FeatureCard icon="✅" title="待办管理" items={[
            '快速添加待办事项',
            '点击 ☐ 标记为已完成',
            '悬停删除按钮',
            '日程和待办集中在仪表盘',
          ]} />
        </div>
        <TipBox>日历和待办已集成在仪表盘页面。日程在日历区域管理，待办在底部列表追踪。</TipBox>
      </Section>

      {/* ═══ 9. 备份 ═══ */}
      <Section icon="💾" title="数据安全与备份" subtitle="多重保障，数据无忧">
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard icon="🔄" title="自动备份" items={[
            '每 24 小时自动备份数据库',
            '最多保留 7 个历史备份',
            '旧备份自动循环清理',
          ]} />
          <FeatureCard icon="📦" title="手动管理" items={[
            '设置页手动创建备份',
            '一键导出工作区 .zip',
            '从备份恢复',
            '可手动删除旧备份',
          ]} />
        </div>
      </Section>

      {/* ═══ 页脚 ═══ */}
      <div className="mt-8 rounded-[16px] border p-8 text-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-medium" style={{ background: 'var(--bg-primary)', color: 'var(--accent-green)' }}>
          🔒 本地优先 · Local First
        </div>
        <blockquote className="mx-auto mb-5 max-w-md text-[14px] leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
          "你的数据完全由你掌控。零云端依赖——所有博客、文件、便签均在你选择的本地目录中。
          无需注册在线服务，数据永不离开你的设备。"
        </blockquote>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Local Blog KB · Electron 41 · React 19 · TypeScript · MySQL / SQLite 双后端</p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>免费开源 · 离线可用 · 零数据收集</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/blog/new" className="inline-flex items-center gap-2 rounded-[8px] px-5 py-2 text-[14px] font-medium no-underline transition-opacity hover:opacity-85" style={{ background: 'var(--color-primary)', color: 'var(--text-on-accent)' }}>
            ✍️ 开始写作
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-[8px] px-5 py-2 text-[14px] font-medium no-underline transition-opacity hover:opacity-85" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            ⌂ 仪表盘
          </Link>
        </div>
      </div>
    </div>
  );
}
