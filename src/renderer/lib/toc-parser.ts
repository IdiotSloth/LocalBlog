export interface TocItem {
  id: string;
  text: string;
  level: number; // 1-3
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extract heading structure from Markdown or HTML content */
export function parseToc(content: string, format: 'md' | 'html'): TocItem[] {
  const items: TocItem[] = [];

  if (format === 'md') {
    const headingRe = /^(#{1,3})\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(content)) !== null) {
      const level = m[1].length;
      const text = m[2].replace(/[`*_~\[\]]/g, '').trim();
      items.push({ id: slugify(text), text, level });
    }
  } else {
    // HTML: extract headings for TOC generation in browser
    const headingRe = /<h([1-3])[^>]*>(.+?)<\/h\1>/gi;
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(content)) !== null) {
      const level = Number(m[1]);
      const text = m[2].replace(/<[^>]+>/g, '').trim();
      items.push({ id: slugify(text), text, level });
    }
  }

  return items;
}

/** Estimate reading time in minutes */
export function estimateReadingTime(content: string): number {
  const textOnly = content.replace(/<[^>]+>/g, '').replace(/[#*`\-_~\[\]()>|]/g, '');
  const chineseChars = (textOnly.match(/[一-鿿]/g) || []).length;
  const totalChars = textOnly.replace(/\s/g, '').length;
  const chineseRatio = totalChars > 0 ? chineseChars / totalChars : 0;

  if (chineseRatio > 0.3) {
    return Math.ceil(totalChars / 500) || 1;
  }
  return Math.ceil(textOnly.split(/\s+/).length / 200) || 1;
}

/** Count total characters in content */
export function countChars(content: string): number {
  return content.replace(/<[^>]+>/g, '').replace(/\s/g, '').length;
}
