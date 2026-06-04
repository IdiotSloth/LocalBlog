/**
 * Strip all Markdown formatting, returning plain text.
 */
export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/^---[\s\S]*?---/g, '')                    // YAML frontmatter
    .replace(/```[\s\S]*?```/g, '')                      // fenced code blocks
    .replace(/`([^`]+)`/g, '$1')                         // inline code
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')             // images → alt text
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')              // links → text
    .replace(/^#{1,6}\s+/gm, '')                          // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')                    // bold
    .replace(/\*([^*]+)\*/g, '$1')                        // italic
    .replace(/~~([^~]+)~~/g, '$1')                        // strikethrough
    .replace(/^[>\s]*>/gm, '')                            // blockquotes
    .replace(/^\s*[-*+]\s+/gm, '')                        // unordered lists
    .replace(/^\s*\d+\.\s+/gm, '')                        // ordered lists
    .replace(/^[-*_]{3,}\s*$/gm, '')                      // horizontal rules
    .replace(/\|/g, ' ')                                  // table pipes
    .replace(/\s+/g, ' ')                                 // normalize whitespace
    .trim();
}

/** Format a date string as "YYYY-MM-DD" */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}
