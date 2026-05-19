/**
 * Search Worker — In-memory inverted index for sql.js mode.
 * Uses Intl.Segmenter for CJK-aware tokenization with zero dependencies.
 *
 * Phase 21 T2104a (D83=A): Unigram + Bigram + Word three-layer CJK index.
 *   - Word: Intl.Segmenter word-level (weight 1.0)
 *   - Bigram: adjacent CJK char pairs (weight 0.5)
 *   - Unigram: single CJK chars (weight 0.25)
 *   - Legacy LS keys (lbkb_fts_index/docs) cleaned on first v3 save.
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

type MatchType = 'word' | 'bigram' | 'unigram';

interface DocEntry {
  docId: number;
  docType: 'blog' | 'knowledge';
  title: string;
  /** Normalized term frequency in this document */
  tf: number;
  /** Index layer that produced this entry */
  matchType: MatchType;
}

interface TokenLayers {
  words: string[];
  bigrams: string[];
  unigrams: string[];
}

interface StoredDoc {
  id: number;
  docType: 'blog' | 'knowledge';
  title: string;
  content: string;
  totalTokens: number;
}

const LS_KEY = 'lbkb_fts_index_v3';
const LS_DOCS_KEY = 'lbkb_fts_docs_v3';
const LS_LEGACY_KEYS = ['lbkb_fts_index', 'lbkb_fts_docs'];

/** Term → list of document entries */
const index = new Map<string, DocEntry[]>();
/** docId@docType → StoredDoc */
const docs = new Map<string, StoredDoc>();
let totalDocs = 0;

/** Per-match-type scoring weights (D83) */
const MATCH_WEIGHTS: Record<MatchType, number> = {
  word: 1.0,
  bigram: 0.5,
  unigram: 0.25,
};

// ---- Tokenizer ----

/** Strip HTML tags and entities before tokenization to avoid indexing markup. */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ');
}

// T2104a: CJK character ranges — main block (U+4E00–9FFF) + Ext-A (U+3400–4DBF) + compat (U+F900–FAFF)
const CJK_RE = /[一-鿿㐀-䶿豈-﫿]/g;

/** Extract consecutive CJK character sequences, then decompose into unigrams and bigrams. */
function extractCjkChars(text: string): string[] {
  const matches = text.match(CJK_RE);
  return matches || [];
}

/**
 * Three-layer tokenizer (D83):
 *   Layer 1 — Word: Intl.Segmenter with granularity 'word'
 *   Layer 2 — Bigram: adjacent CJK character pairs
 *   Layer 3 — Unigram: every CJK character individually
 */
function tokenize(text: string): TokenLayers {
  const clean = stripHtml(text);
  const result: TokenLayers = { words: [], bigrams: [], unigrams: [] };

  // Layer 1: Word-level via Intl.Segmenter
  try {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    for (const s of segmenter.segment(clean)) {
      if (s.isWordLike) {
        result.words.push(s.segment.toLowerCase());
      }
    }
  } catch {
    // Fallback: whitespace/punctuation splitting for older engines
    result.words.push(
      ...clean
        .toLowerCase()
        .split(/[\s,.;:!?()[\]{}""''「」、，。；：！？（）【】《》""''‘’]+/)
        .filter(Boolean),
    );
  }

  // Layers 2 & 3: Bigram + Unigram from CJK characters
  const cjkChars = extractCjkChars(clean);
  for (const ch of cjkChars) {
    result.unigrams.push(ch);
  }
  for (let i = 0; i < cjkChars.length - 1; i++) {
    result.bigrams.push(cjkChars[i]! + cjkChars[i + 1]!);
  }

  return result;
}

// ---- Index operations ----

function addToIndex(doc: StoredDoc): void {
  const layers = tokenize(`${doc.title} ${doc.content}`);
  const key = `${doc.id}@${doc.docType}`;
  docs.set(key, doc);
  totalDocs++;

  // Aggregate term frequencies per (term, matchType)
  const tfMap = new Map<string, { count: number; matchType: MatchType }>();

  for (const term of layers.words) {
    const prev = tfMap.get(term);
    if (prev) {
      // Count the term; matchType stays 'word' (highest priority, already set)
      prev.count++;
    } else {
      tfMap.set(term, { count: 1, matchType: 'word' });
    }
  }
  for (const term of layers.bigrams) {
    const prev = tfMap.get(term);
    if (prev) {
      prev.count++;
    } else {
      tfMap.set(term, { count: 1, matchType: 'bigram' });
    }
  }
  for (const term of layers.unigrams) {
    const prev = tfMap.get(term);
    if (prev) {
      prev.count++;
    } else {
      tfMap.set(term, { count: 1, matchType: 'unigram' });
    }
  }

  const totalTerms =
    layers.words.length + layers.bigrams.length + layers.unigrams.length || 1;

  for (const [term, { count, matchType }] of tfMap) {
    const entry: DocEntry = {
      docId: doc.id,
      docType: doc.docType,
      title: doc.title,
      tf: count / totalTerms,
      matchType,
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

  const layers = tokenize(`${doc.title} ${doc.content}`);
  const allTerms = [...new Set([...layers.words, ...layers.bigrams, ...layers.unigrams])];

  docs.delete(key);
  totalDocs--;

  for (const term of allTerms) {
    const entries = index.get(term);
    if (!entries) continue;
    const filtered = entries.filter(
      (e) => !(e.docId === docId && e.docType === docType),
    );
    if (filtered.length === 0) {
      index.delete(term);
    } else {
      index.set(term, filtered);
    }
  }
}

// ---- Search ----

function search(query: string, limit = 20): FtsSearchResult[] {
  const layers = tokenize(query);
  const queryTerms = [...new Set([...layers.words, ...layers.bigrams, ...layers.unigrams])];
  if (queryTerms.length === 0) return [];

  // Score accumulator: docKey → score
  const scores = new Map<
    string,
    { docId: number; docType: 'blog' | 'knowledge'; title: string; score: number }
  >();

  for (const term of queryTerms) {
    const entries = index.get(term);
    if (!entries) continue;

    // IDF = log(N / df) where N = totalDocs, df = document frequency
    const df = entries.length;
    const idf = totalDocs > 0 ? Math.log(1 + totalDocs / (1 + df)) : 1;

    for (const entry of entries) {
      const docKey = `${entry.docId}@${entry.docType}`;
      const existing = scores.get(docKey);

      // Title match boost
      const titleBoost = entry.title.toLowerCase().includes(term) ? 2.0 : 1.0;

      // Match-type weight (D83): word=1.0, bigram=0.5, unigram=0.25
      const matchWeight = MATCH_WEIGHTS[entry.matchType];
      const termScore = entry.tf * idf * matchWeight * titleBoost;

      if (existing) {
        existing.score += termScore;
      } else {
        scores.set(docKey, {
          docId: entry.docId,
          docType: entry.docType,
          title: entry.title,
          score: termScore,
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
      const firstMatchIdx = findFirstMatchIdx(lowerContent, queryTerms);
      if (firstMatchIdx >= 0) {
        const start = Math.max(0, firstMatchIdx - 40);
        const end = Math.min(doc.content.length, firstMatchIdx + 60);
        snippet =
          (start > 0 ? '...' : '') +
          doc.content.slice(start, end) +
          (end < doc.content.length ? '...' : '');
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

function cleanLegacyKeys(): void {
  if (typeof localStorage === 'undefined') return;
  for (const key of LS_LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

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

    cleanLegacyKeys();
  } catch {
    // localStorage might be full; silently ignore
  }
}

function restoreFromLocalStorage(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    // Try v3 keys first
    let rawIndex = localStorage.getItem(LS_KEY);
    let rawDocs = localStorage.getItem(LS_DOCS_KEY);

    // Fall back to legacy keys (v1/v2) for migration
    if (!rawIndex || !rawDocs) {
      const legacyIndex = localStorage.getItem('lbkb_fts_index');
      const legacyDocs = localStorage.getItem('lbkb_fts_docs');
      if (legacyIndex && legacyDocs) {
        rawIndex = legacyIndex;
        rawDocs = legacyDocs;
      } else {
        return false;
      }
    }

    const indexData: Array<[string, DocEntry[]]> = JSON.parse(rawIndex);
    const docData: StoredDoc[] = JSON.parse(rawDocs);

    index.clear();
    docs.clear();
    totalDocs = 0;

    for (const [term, entries] of indexData) {
      // Normalize legacy entries that lack matchType
      const normalized = entries.map((e) => ({
        ...e,
        matchType: e.matchType || ('word' as MatchType),
      }));
      index.set(term, normalized);
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
        const layers = tokenize(`${doc.title} ${doc.content}`);
        const stored: StoredDoc = {
          id: doc.id,
          docType: doc.docType,
          title: doc.title,
          content: doc.content,
          totalTokens:
            layers.words.length + layers.bigrams.length + layers.unigrams.length || 1,
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
        self.postMessage({
          type: 'search-results',
          results,
          query: msg.query,
          correlationId: msg.correlationId,
        });
      } catch (e) {
        console.error('[SearchWorker] Search error:', e);
        self.postMessage({
          type: 'search-results',
          results: [],
          query: msg.query,
          correlationId: msg.correlationId,
        });
      }
      break;
    }

    case 'add-document': {
      const doc = msg.doc as IndexableDoc;
      const layers = tokenize(`${doc.title} ${doc.content}`);
      const stored: StoredDoc = {
        id: doc.id,
        docType: doc.docType,
        title: doc.title,
        content: doc.content,
        totalTokens:
          layers.words.length + layers.bigrams.length + layers.unigrams.length || 1,
      };
      addToIndex(stored);
      saveToLocalStorage();
      self.postMessage({ type: 'document-added', docId: doc.id, docType: doc.docType });
      break;
    }

    case 'remove-document': {
      removeFromIndex(msg.docId, msg.docType);
      saveToLocalStorage();
      self.postMessage({
        type: 'document-removed',
        docId: msg.docId,
        docType: msg.docType,
      });
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
