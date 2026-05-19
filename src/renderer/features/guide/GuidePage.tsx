import {
  ArrowRight,
  BookOpen,
  Brain,
  Code2,
  Command,
  Cpu,
  FileSearch,
  FileText,
  GitFork,
  KeyRound,
  Keyboard,
  Library,
  Link2,
  Monitor,
  Pencil,
  Pin,
  Search,
  Slash,
  Split,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Tiny inline helpers (no separate component files) ──
const Kbd = ({ c }: { c: string }) => (
  <kbd
    className="inline-block rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium"
    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
  >
    {c}
  </kbd>
);

const Badge = ({ label, color = 'var(--accent-blue)' }: { label: string; color?: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-tertiary)', color }}>
    {label}
  </span>
);

const GuideImg = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    className="w-full rounded-[8px]"
    style={{ border: '1px solid var(--border-default)' }}
    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
  />
);

// ── Sections ──
function HeroSection() {
  return (
    <section
      className="relative overflow-hidden rounded-[8px] p-10 md:p-12 mb-12"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
    >
      <div className="absolute -right-10 -top-10 h-[160px] w-[160px] rounded-full opacity-12" style={{ background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)' }} />
      <div className="relative">
        <GuideImg src="./assets/guide/guide-hero.svg" alt="Local Blog KB" />
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge label="离线优先" color="var(--accent-green)" />
          <Badge label="MySQL / SQLite 双引擎" />
          <Badge label="全格式支持" color="var(--text-secondary)" />
        </div>
        <h1 className="mt-4 text-[32px] font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Local Blog KB
        </h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          离线优先的个人知识中枢。集 <strong style={{ color: 'var(--accent-blue)' }}>Markdown 写作</strong>、
          <strong style={{ color: 'var(--accent-green)' }}>知识库管理</strong>、双向链接与图谱于一体，
          数据完全本地掌控。
        </p>
        <div className="mt-5 flex gap-3">
          <Link to="/blog/new" className="inline-flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13px] font-medium no-underline transition-opacity hover:opacity-85" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            <Pencil size={15} /> 开始写作
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13px] font-medium no-underline transition-opacity hover:opacity-85" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            <BookOpen size={15} /> 今日
          </Link>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="mb-12 rounded-[8px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h2 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>核心工作流</h2>
      <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>三条链路覆盖从输入到输出的完整闭环</p>

      <GuideImg src="./assets/guide/guide-workflow.svg" alt="三条工作流对比" />

      <div className="grid gap-4 mt-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { icon: Pencil, label: '写作流', desc: '灵感捕获 → Markdown 编辑 → 标签/系列整理 → 导出分享', color: 'var(--accent-blue)' },
          { icon: Library, label: '知识流', desc: '拖放导入 → 文件夹/标签组织 → 多格式预览 → 全文检索', color: 'var(--accent-green)' },
          { icon: Monitor, label: '桌面流', desc: '托盘常驻 → 桌面宠物 → 全局快捷键 → 剪贴板快存', color: 'var(--text-secondary)' },
        ].map((f) => (
          <div key={f.label} className="rounded-[8px] p-4" style={{ background: 'var(--bg-primary)' }}>
            <f.icon size={20} style={{ color: f.color }} />
            <h4 className="mt-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</h4>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BlogSection() {
  return (
    <section className="mb-12 rounded-[8px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h2 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>博客写作</h2>
      <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>Markdown / 所见即所得双模式，Phase 20-21 编辑器进化</p>

      <GuideImg src="./assets/guide/guide-blog.svg" alt="博客编辑器功能示意" />

      <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {[
          { icon: Link2, label: '[[双向链接]]', desc: '输入 [[ 自动补全，三向链接 (blog/knowledge/note)' },
          { icon: Split, label: '分屏预览', desc: <span>编辑器内 <Kbd c="Ctrl+\" /> MD 即时预览</span> },
          { icon: Slash, label: '斜杠命令', desc: <span>输入 <Kbd c="/" /> 弹出 17 种块命令 + Callout</span> },
          { icon: Command, label: '元数据面板', desc: '封面图 / 图标 / 系列 / 格式 统一编辑' },
          { icon: FileText, label: '模板变量', desc: <span><Kbd c="{{date}}" /> <Kbd c="{{time}}" /> <Kbd c="{{title}}" /> 自动展开</span> },
          { icon: Pin, label: '置顶 + 颜色', desc: '博客置顶排序 + 6 色圆点标记' },
          { icon: Zap, label: 'Ctrl+O 快速切换', desc: '标题搜索，瞬间跳转到任意内容' },
          { icon: Code2, label: 'Callout 提示块', desc: 'info / success / warning / danger 四类语义块' },
        ].map((f) => (
          <div key={f.label} className="rounded-[8px] p-3" style={{ background: 'var(--bg-primary)' }}>
            <f.icon size={16} style={{ color: 'var(--accent-blue)' }} />
            <h4 className="mt-1.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</h4>
            <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function KbSection() {
  return (
    <section className="mb-12 rounded-[8px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h2 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>知识库</h2>
      <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>多格式文件管理 + 全文预览 + 内容编辑 + 图谱连接</p>

      <GuideImg src="./assets/guide/guide-kb.svg" alt="知识库功能示意" />

      <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {[
          { label: '多格式预览', items: 'DOCX / XLSX (可排序过滤) / PDF (文本搜索) / CSV / 图片 / 音视频' },
          { label: '内容编辑', items: 'TXT / MD 文本编辑，代码文件行号预览 (shiki 语法高亮)' },
          { label: '本地图谱', items: 'ContextPanel 图谱 Tab — 显示当前文件 1 度连接关系' },
          { label: '拖放导入', items: '直接拖文件到知识库页面，自动解析文本内容' },
          { label: '文件夹 + 标签', items: '多层文件夹组织 + 标签多维度交叉检索' },
          { label: '博客反向引用', items: '显示引用了此文件的所有博客，点击跳转' },
        ].map((f) => (
          <div key={f.label} className="rounded-[8px] p-3" style={{ background: 'var(--bg-primary)' }}>
            <h4 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</h4>
            <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.items}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchSection() {
  return (
    <section className="mb-12 rounded-[8px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h2 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>搜索系统</h2>
      <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>CJK 三层索引 + 语义搜索 + 引用搜索统一</p>

      <GuideImg src="./assets/guide/guide-search.svg" alt="搜索系统架构" />

      <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { icon: Search, label: 'CJK 三层索引', desc: 'Unigram (单字) + Bigram (二字) + Word (分词) — 搜索 "部" 可找到 "部署"' },
          { icon: Brain, label: '语义搜索', desc: 'multilingual-e5-small 模型 (384维)，混合打分 = 0.6×向量 + 0.4×关键词' },
          { icon: Command, label: 'Ctrl+K 命令面板', desc: <span>全局搜索 + 命令列表 + 最近浏览。支持 <Kbd c="tag:" /> <Kbd c="type:" /> 操作符</span> },
          { icon: FileSearch, label: '引用搜索统一', desc: '[[ 自动补全接入 FTS5 Worker，CJK 分词 + TF-IDF 排序' },
        ].map((f) => (
          <div key={f.label} className="rounded-[8px] p-3" style={{ background: 'var(--bg-primary)' }}>
            <f.icon size={16} style={{ color: 'var(--accent-blue)' }} />
            <h4 className="mt-1.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</h4>
            <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DesktopSection() {
  return (
    <section className="mb-12 rounded-[8px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h2 className="text-[20px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>桌面功能</h2>
      <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>关闭窗口不等于退出 — 托盘常驻 + 桌面宠物 + 全局快捷键</p>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { icon: Monitor, label: '系统托盘', desc: '关闭即隐藏到托盘。右键菜单：快速便签 · 新建博客 · 导入 · 剪藏 · 打开主窗口' },
          { icon: Keyboard, label: '全局快捷键', desc: <span><Kbd c="Ctrl+N" /> 新建博客 · <Kbd c="Ctrl+Shift+M" /> 剪贴板→便签 · <Kbd c="Ctrl+O" /> 快速跳转 · <Kbd c="Ctrl+K" /> 全局搜索 · <Kbd c="Ctrl+\\" /> 分屏</span> },
          { icon: GitFork, label: '知识图谱', desc: '全屏图谱 (侧栏「洞察」→「图谱」) + 局部图谱 (ContextPanel 图谱 Tab) — D3 力导向布局' },
          { icon: Wrench, label: '设置', desc: '开机自启动 · 开始菜单快捷方式 · 快捷键自定义 · 主题切换 · 备份管理 · MCP AI 接入' },
          { icon: KeyRound, label: '回收站', desc: '删除内容进入回收站，30 天倒计时，超期自动清理。支持恢复和手动清空。' },
          { icon: Cpu, label: 'MCP AI 接入', desc: <span>stdio + HTTP 双模式。Claude Code：<Kbd c="npm run mcp" /> · HTTP：POST :3456/api/mcp/message</span> },
        ].map((f) => (
          <div key={f.label} className="rounded-[8px] p-4" style={{ background: 'var(--bg-primary)' }}>
            <f.icon size={18} style={{ color: 'var(--text-secondary)' }} />
            <h4 className="mt-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</h4>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickstartSection() {
  return (
    <section className="mb-12 rounded-[8px] border p-6 md:p-8" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <h2 className="text-[20px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>快速开始</h2>
      <div className="space-y-0">
        {[
          { num: 1, title: '注册账号', desc: '输入用户名、密码，选择一个本地目录作为工作区。所有数据存储在此，完全本地控制。' },
          { num: 2, title: '写第一篇文章', desc: '侧栏「博客」→「新建博客」→ 选择模板开始。Markdown / 所见即所得自由切换，Ctrl+S 保存。' },
          { num: 3, title: '探索更多', desc: '导入文件到知识库，使用 [[双向链接]] 连接内容，Ctrl+K 搜索，Ctrl+O 快速跳转。' },
        ].map((s, i) => (
          <div key={s.num} className="flex gap-4 py-3" style={{ borderBottom: i < 2 ? '1px solid var(--border-default)' : 'none' }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
              {s.num}
            </span>
            <div>
              <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</h4>
              <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="rounded-[8px] border p-8 text-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
      <Badge label="本地优先 · Local First" color="var(--accent-green)" />
      <blockquote className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
        "你的数据完全由你掌控。零云端依赖 — 所有博客、文件、便签均在你选择的本地目录中。"
      </blockquote>
      <p className="mt-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        Local Blog KB · Electron 41 · React 19 · TypeScript · MySQL / SQLite 双后端
      </p>
      <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>免费开源 · 离线可用 · 零数据收集</p>
      <div className="mt-5 flex justify-center gap-3">
        <Link to="/blog/new" className="inline-flex items-center gap-2 rounded-[6px] px-5 py-2 text-[14px] font-medium no-underline transition-opacity hover:opacity-85" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
          <Pencil size={15} /> 开始写作
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 rounded-[6px] px-5 py-2 text-[14px] font-medium no-underline transition-opacity hover:opacity-85" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
          <BookOpen size={15} /> 今日
        </Link>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════
// Main Page
// ═══════════════════════════════════════

export function GuidePage() {
  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', paddingBottom: 48 }}>
      <HeroSection />
      <WorkflowSection />
      <BlogSection />
      <KbSection />
      <SearchSection />
      <DesktopSection />
      <QuickstartSection />
      <FooterSection />
    </div>
  );
}
