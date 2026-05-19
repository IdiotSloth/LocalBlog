/**
 * Template variable expander (T2109).
 * Pure function — expands {{date}}, {{time}}, {{yesterday}}, {{tomorrow}}, {{title}} in text.
 *
 * Design: This is the "date stamp in the study" — not a programming language.
 * No {{#if}}, {{#each}}, or JavaScript injection.
 */

interface TemplateContext {
  title?: string;
  date?: Date;
}

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(d: Date, pattern: string): string {
  return pattern
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MM/g, MONTHS[d.getMonth()])
    .replace(/DD/g, pad(d.getDate()))
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()))
    .replace(/SS/g, pad(d.getSeconds()));
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${MONTHS[d.getMonth()]}-${pad(d.getDate())}`;
}

function offsetDate(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Expand template variables in text.
 *
 * Variables:
 *   {{date}}            → 2026-05-20
 *   {{date:YYYY年MM月DD日}} → 2026年05月20日
 *   {{time}}            → 14:30
 *   {{yesterday}}       → 2026-05-19
 *   {{tomorrow}}        → 2026-05-21
 *   {{title}}           → current document title (from context)
 */
export function expandTemplateVars(template: string, ctx: TemplateContext = {}): string {
  const now = ctx.date ?? new Date();

  return template
    .replace(/\{\{date(?::(.*?))?\}\}/g, (_match, pattern?: string) => {
      return pattern ? formatDate(now, pattern) : isoDate(now);
    })
    .replace(/\{\{time\}\}/g, formatDate(now, 'HH:mm'))
    .replace(/\{\{yesterday\}\}/g, isoDate(offsetDate(now, -1)))
    .replace(/\{\{tomorrow\}\}/g, isoDate(offsetDate(now, 1)))
    .replace(/\{\{title\}\}/g, ctx.title ?? '');
}
