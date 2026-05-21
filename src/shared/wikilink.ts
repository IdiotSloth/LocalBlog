/** [[wikilink]] + ![[transclusion]] rendering — shared by BlogPreviewPage, NoteListPage, and blog:update handler.
 *  Pipeline order (R174): md.render → wikilink regex → DOMPurify → dangerouslySetInnerHTML
 */

// Matches [[target]] or [[target|alias]], excluding match if inside <code> or <pre>
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// T2205: Matches ![[target]] or ![[target|alias]] for content transclusion
const TRANSCLUDE_RE = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Tags whose inner content should NOT have wikilinks processed (R174 known limitation fix)
const CODE_TAGS = /(<pre[\s>][\s\S]*?<\/pre>|<code[\s>][\s\S]*?<\/code>)/gi;

/** Map of [[title]] → { type, id } for direct link resolution */
export type WikiLinkResolver = Map<string, { type: string; id: number }>;

/**
 * Replace [[target]], [[target|alias]], and ![[target]] in HTML.
 * Code blocks (<pre>/<code>) are preserved untouched.
 *
 * - `[[title]]` → wikilink (direct or search link)
 * - `![[title]]` → transclusion placeholder blockquote
 *
 * If `resolver` is provided, resolved titles become direct links.
 * Transclusions render as blockquote.transclusion with data attributes for async loading.
 */
export function renderWikilinks(html: string, resolver?: WikiLinkResolver): string {
  // Extract code blocks to protect them from wikilink replacement
  const codeBlocks: string[] = [];
  const protected_ = html.replace(CODE_TAGS, (match) => {
    codeBlocks.push(match);
    return `\x00WL${codeBlocks.length - 1}\x00`;
  });

  // T2205: Replace transclusions (![[...]]) first, before regular wikilinks
  const withTransclusions = protected_.replace(TRANSCLUDE_RE, (_match, target: string, alias: string | undefined) => {
    const title = (target as string).trim();
    const display = (alias as string | undefined)?.trim() || title;
    if (!title) return _match;

    const resolved = resolver?.get(title);
    if (resolved) {
      return `<blockquote class="transclusion" data-ref-type="${resolved.type}" data-ref-id="${resolved.id}" data-ref-title="${escapeAttr(title)}"><p class="transclusion-loading" style="color:var(--text-muted);font-size:13px;">加载中: ${escapeHtml(display)}...</p></blockquote>`;
    }

    return `<blockquote class="transclusion" data-ref-title="${escapeAttr(title)}" data-ref-type="unknown"><p class="transclusion-loading" style="color:var(--text-muted);font-size:13px;">加载中: ${escapeHtml(display)}...</p></blockquote>`;
  });

  // Replace regular wikilinks
  const processed = withTransclusions.replace(WIKILINK_RE, (_match, target: string, alias: string | undefined) => {
    const title = (target as string).trim();
    const display = (alias as string | undefined)?.trim() || title;
    if (!title) return _match;

    // Check resolver for direct link
    const resolved = resolver?.get(title);
    if (resolved) {
      const route = resolved.type === 'blog' ? `#/blog/${resolved.id}`
        : resolved.type === 'knowledge' ? '#/knowledge'
        : resolved.type === 'note' ? '#/notes'
        : `#/blog?q=${encodeURIComponent(title)}`;
      return `<a class="wiki-link" data-ref-type="${resolved.type}" data-ref-id="${resolved.id}" href="${route}">${escapeHtml(display)}</a>`;
    }

    // Fallback: search link
    const encoded = encodeURIComponent(title);
    return `<a class="wiki-link" data-wiki-title="${escapeAttr(title)}" href="#/blog?q=${encoded}">${escapeHtml(display)}</a>`;
  });

  // Restore code blocks
  return processed.replace(/\x00WL(\d+)\x00/g, (_match, idx: string) => {
    return codeBlocks[Number(idx)] ?? '';
  });
}

/** T2205: Collect all transclusion targets from HTML for batch loading */
export function collectTransclusions(html: string): Array<{ title: string; type: string; id: number }> {
  const items: Array<{ title: string; type: string; id: number }> = [];
  const re = /<blockquote\s[^>]*class="transclusion"[^>]*data-ref-title="([^"]*)"[^>]*data-ref-type="([^"]*)"[^>]*data-ref-id="(\d+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    items.push({ title: m[1]!, type: m[2]!, id: Number(m[3]!) });
  }
  return items;
}

/** Scan HTML for .wiki-link elements and extract ref data. Used by blog:update handler (R173). */
export function extractWikilinkRefs(
  html: string,
  sourceType: string,
  sourceId: number,
): Array<{ sourceType: string; sourceId: number; targetType: string; targetId: number }> {
  const refs: Array<{ sourceType: string; sourceId: number; targetType: string; targetId: number }> = [];
  const linkRe = /<a\s[^>]*class="wiki-link"[^>]*data-ref-type="([^"]*)"[^>]*data-ref-id="(\d+)"[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    refs.push({ sourceType, sourceId, targetType: m[1]!, targetId: Number(m[2]!) });
  }
  return refs;
}

/** R206: Extract [[title]] plain text from raw content (Markdown or HTML).
 *  Used by syncWikilinkRefs to scan for wikilinks before resolving to DB IDs. */
export function extractWikilinkTitles(content: string): string[] {
  const titles: string[] = [];
  // Remove code blocks/fences before scanning to avoid false matches
  const cleaned = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  let m;
  while ((m = WIKILINK_RE.exec(cleaned)) !== null) {
    const title = (m[1] as string).trim();
    if (title) titles.push(title);
  }
  // Reset lastIndex since regex has /g flag
  WIKILINK_RE.lastIndex = 0;
  return titles;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
