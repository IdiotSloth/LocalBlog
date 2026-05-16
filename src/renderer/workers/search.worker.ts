/**
 * Search Worker — In-memory inverted index for sql.js mode.
 * Uses Intl.Segmenter for CJK-aware tokenization with zero dependencies.
 *
 * Messages:
 *   { type: 'build-index', docs: IndexableDoc[] }
 *   { type: 'search', query: string, limit?: number }
 *   { type: 'add-document', doc: IndexableDoc }
 *   { type: 'remove-document', docId: number, docType: 'blog' | 'knowledge' }
 *
 * Responses:
 *   { type: 'index-built', total: number }
 *   { type: 'search-results', results: FtsSearchResult[], query: string }
 *   { type: 'document-added', docId: number, docType: string }
 *   { type: 'document-removed', docId: number, docType: string }
 *   { type: 'index-restored', success: boolean, total: number }
 */

import type { FtsSearchResult, IndexableDoc } from '../../shared/types';

self.onerror = (e) => {
  console.error('[SearchWorker] Unhandled error:', e);
};

interface DocEntry {
  docId: number;
  docType: 'blog' | 'knowledge';
  title: string;
  /** Term frequency in this document */
  tf: number;
}

interface StoredDoc {
  id: number;
  docType: 'blog' | 'knowledge';
  title: string;
  content: string;
  /** Total word count for normalization */
  wordCount: number;
}

const LS_KEY = 'lbkb_fts_index';
const LS_DOCS_KEY = 'lbkb_fts_docs';

/** Term → list of document entries */
const index = new Map<string, DocEntry[]>();
/** docId@docType → StoredDoc */
const docs = new Map<string, StoredDoc>();
let totalDocs = 0;

// ---- Tokenizer ----

/** Strip HTML tags and entities before tokenization to avoid indexing markup. */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenize(text: string): string[] {
  const clean = stripHtml(text);
  try {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    return Array.from(segmenter.segment(clean))
      .filter((s) => s.isWordLike)
      .map((s) => s.segment.toLowerCase());
  } catch {
    // Fallback: whitespace splitting for non-CJK or older engines
    return clean.toLowerCase().split(/[\s,.;:!?()\[\]{}""''「」、，。；：！？（）【】《》""''‘’]+/).filter(Boolean);
  }
}

// ---- Index operations ----

function addToIndex(doc: StoredDoc): void {
  const terms = tokenize(`${doc.title} ${doc.content}`);
  const termCount = new Map<string, number>();

  // Count term frequency in this document
  for (const term of terms) {
    termCount.set(term, (termCount.get(term) || 0) + 1);
  }

  const key = `${doc.id}@${doc.docType}`;
  docs.set(key, doc);
  totalDocs++;

  for (const [term, count] of termCount) {
    const entry: DocEntry = {
      docId: doc.id,
      docType: doc.docType,
      title: doc.title,
      tf: count / doc.wordCount, // Normalized term frequency
    };
    const existing = index.get(term);
    if (existing) {
      existing.push(entry);
    } else {
      index.set(term, [entry]);
    }
  }
}

function removeFromIndex(docId: number, docType: 'blog' | 'knowledge'): void {
  const key = `${docId}@${docType}`;
  const doc = docs.get(key);
  if (!doc) return;

  const terms = tokenize(`${doc.title} ${doc.content}`);
  const uniqueTerms = [...new Set(terms)];

  docs.delete(key);
  totalDocs--;

  for (const term of uniqueTerms) {
    const entries = index.get(term);
    if (!entries) continue;
    const filtered = entries.filter((e) => !(e.docId === docId && e.docType === docType));
    if (filtered.length === 0) {
      index.delete(term);
    } else {
      index.set(term, filtered);
    }
  }
}

// ---- Search ----

function search(query: string, limit = 20): FtsSearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  // Score accumulator: docKey → score
  const scores = new Map<string, { docId: number; docType: 'blog' | 'knowledge'; title: string; score: number }>();

  for (const term of terms) {
    const entries = index.get(term);
    if (!entries) continue;

    // IDF = log(N / df)  where N = totalDocs, df = document frequency of term
    const df = entries.length;
    const idf = totalDocs > 0 ? Math.log(1 + totalDocs / (1 + df)) : 1;

    for (const entry of entries) {
      const docKey = `${entry.docId}@${entry.docType}`;
      const existing = scores.get(docKey);
      const termScore = entry.tf * idf;

      // Boost title matches
      const titleBoost = entry.title.toLowerCase().includes(term) ? 2.0 : 1.0;

      if (existing) {
        existing.score += termScore * titleBoost;
      } else {
        scores.set(docKey, {
          docId: entry.docId,
          docType: entry.docType,
          title: entry.title,
          score: termScore * titleBoost,
        });
      }
    }
  }

  // Sort by score descending, take top N
  const results = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Build snippets
  return results.map((r) => {
    const docKey = `${r.docId}@${r.docType}`;
    const doc = docs.get(docKey);
    let snippet = '';
    if (doc) {
      const lowerContent = doc.content.toLowerCase();
      const firstMatchIdx = findFirstMatchIdx(lowerContent, terms);
      if (firstMatchIdx >= 0) {
        const start = Math.max(0, firstMatchIdx - 40);
        const end = Math.min(doc.content.length, firstMatchIdx + 60);
        snippet = (start > 0 ? '...' : '') + doc.content.slice(start, end) + (end < doc.content.length ? '...' : '');
      } else {
        snippet = doc.title;
      }
    } else {
      snippet = r.title;
    }

    return {
      id: r.docId,
      type: r.docType,
      title: r.title,
      snippet,
      score: Math.round(r.score * 1000) / 1000,
    };
  });
}

function findFirstMatchIdx(lowerContent: string, terms: string[]): number {
  let earliest = -1;
  for (const term of terms) {
    const idx = lowerContent.indexOf(term);
    if (idx >= 0 && (earliest < 0 || idx < earliest)) {
      earliest = idx;
    }
  }
  return earliest;
}

// ---- Persistence ----

function saveToLocalStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const indexData: Array<[string, DocEntry[]]> = [];
    for (const [term, entries] of index) {
      indexData.push([term, entries]);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(indexData));

    const docData: StoredDoc[] = [];
    for (const doc of docs.values()) {
      docData.push(doc);
    }
    localStorage.setItem(LS_DOCS_KEY, JSON.stringify(docData));
  } catch {
    // localStorage might be full; silently ignore
  }
}

function restoreFromLocalStorage(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const rawIndex = localStorage.getItem(LS_KEY);
    const rawDocs = localStorage.getItem(LS_DOCS_KEY);
    if (!rawIndex || !rawDocs) return false;

    const indexData: Array<[string, DocEntry[]]> = JSON.parse(rawIndex);
    const docData: StoredDoc[] = JSON.parse(rawDocs);

    index.clear();
    docs.clear();
    totalDocs = 0;

    for (const [term, entries] of indexData) {
      index.set(term, entries);
    }
    for (const doc of docData) {
      docs.set(`${doc.id}@${doc.docType}`, doc);
      totalDocs++;
    }

    return true;
  } catch {
    return false;
  }
}

// ---- Message handler ----

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  switch (msg.type) {
    case 'build-index': {
      const docsList = msg.docs as IndexableDoc[];
      index.clear();
      docs.clear();
      totalDocs = 0;

      for (const doc of docsList) {
        const stored: StoredDoc = {
          id: doc.id,
          docType: doc.docType,
          title: doc.title,
          content: doc.content,
          wordCount: tokenize(`${doc.title} ${doc.content}`).length || 1,
        };
        addToIndex(stored);
      }

      saveToLocalStorage();
      self.postMessage({ type: 'index-built', total: totalDocs });
      break;
    }

    case 'search': {
      try {
        const results = search(msg.query, msg.limit);
        self.postMessage({ type: 'search-results', results, query: msg.query, correlationId: msg.correlationId });
      } catch (e) {
        console.error('[SearchWorker] Search error:', e);
        self.postMessage({ type: 'search-results', results: [], query: msg.query, correlationId: msg.correlationId });
      }
      break;
    }

    case 'add-document': {
      const doc = msg.doc as IndexableDoc;
      const stored: StoredDoc = {
        id: doc.id,
        docType: doc.docType,
        title: doc.title,
        content: doc.content,
        wordCount: tokenize(`${doc.title} ${doc.content}`).length || 1,
      };
      addToIndex(stored);
      saveToLocalStorage();
      self.postMessage({ type: 'document-added', docId: doc.id, docType: doc.docType });
      break;
    }

    case 'remove-document': {
      removeFromIndex(msg.docId, msg.docType);
      saveToLocalStorage();
      self.postMessage({ type: 'document-removed', docId: msg.docId, docType: msg.docType });
      break;
    }

    case 'restore-index': {
      const restored = restoreFromLocalStorage();
      self.postMessage({ type: 'index-restored', success: restored, total: totalDocs });
      break;
    }

    default:
      break;
  }
};
