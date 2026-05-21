self.onerror = (e) => {
  console.error("[SearchWorker] Unhandled error:", e);
};
const LS_KEY = "lbkb_fts_index_v3";
const LS_DOCS_KEY = "lbkb_fts_docs_v3";
const LS_LEGACY_KEYS = ["lbkb_fts_index", "lbkb_fts_docs"];
const index = /* @__PURE__ */ new Map();
const docs = /* @__PURE__ */ new Map();
let totalDocs = 0;
const MATCH_WEIGHTS = {
  word: 1,
  bigram: 0.5,
  unigram: 0.25
};
function stripHtml(text) {
  return text.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/&#\d+;/g, " ").replace(/\s+/g, " ");
}
const CJK_RE = /[一-鿿㐀-䶿豈-﫿]/g;
function extractCjkChars(text) {
  const matches = text.match(CJK_RE);
  return matches || [];
}
function tokenize(text) {
  const clean = stripHtml(text);
  const result = { words: [], bigrams: [], unigrams: [] };
  try {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    for (const s of segmenter.segment(clean)) {
      if (s.isWordLike) {
        result.words.push(s.segment.toLowerCase());
      }
    }
  } catch {
    result.words.push(
      ...clean.toLowerCase().split(/[\s,.;:!?()[\]{}""''「」、，。；：！？（）【】《》""''‘’]+/).filter(Boolean)
    );
  }
  const cjkChars = extractCjkChars(clean);
  for (const ch of cjkChars) {
    result.unigrams.push(ch);
  }
  for (let i = 0; i < cjkChars.length - 1; i++) {
    result.bigrams.push(cjkChars[i] + cjkChars[i + 1]);
  }
  return result;
}
function addToIndex(doc) {
  const layers = tokenize(`${doc.title} ${doc.content}`);
  const key = `${doc.id}@${doc.docType}`;
  docs.set(key, doc);
  totalDocs++;
  const tfMap = /* @__PURE__ */ new Map();
  for (const term of layers.words) {
    const prev = tfMap.get(term);
    if (prev) {
      prev.count++;
    } else {
      tfMap.set(term, { count: 1, matchType: "word" });
    }
  }
  for (const term of layers.bigrams) {
    const prev = tfMap.get(term);
    if (prev) {
      prev.count++;
    } else {
      tfMap.set(term, { count: 1, matchType: "bigram" });
    }
  }
  for (const term of layers.unigrams) {
    const prev = tfMap.get(term);
    if (prev) {
      prev.count++;
    } else {
      tfMap.set(term, { count: 1, matchType: "unigram" });
    }
  }
  const totalTerms = layers.words.length + layers.bigrams.length + layers.unigrams.length || 1;
  for (const [term, { count, matchType }] of tfMap) {
    const entry = {
      docId: doc.id,
      docType: doc.docType,
      title: doc.title,
      tf: count / totalTerms,
      matchType
    };
    const existing = index.get(term);
    if (existing) {
      existing.push(entry);
    } else {
      index.set(term, [entry]);
    }
  }
}
function removeFromIndex(docId, docType) {
  const key = `${docId}@${docType}`;
  const doc = docs.get(key);
  if (!doc) return;
  const layers = tokenize(`${doc.title} ${doc.content}`);
  const allTerms = [.../* @__PURE__ */ new Set([...layers.words, ...layers.bigrams, ...layers.unigrams])];
  docs.delete(key);
  totalDocs--;
  for (const term of allTerms) {
    const entries = index.get(term);
    if (!entries) continue;
    const filtered = entries.filter(
      (e) => !(e.docId === docId && e.docType === docType)
    );
    if (filtered.length === 0) {
      index.delete(term);
    } else {
      index.set(term, filtered);
    }
  }
}
function search(query, limit = 20) {
  const layers = tokenize(query);
  const queryTerms = [.../* @__PURE__ */ new Set([...layers.words, ...layers.bigrams, ...layers.unigrams])];
  if (queryTerms.length === 0) return [];
  const scores = /* @__PURE__ */ new Map();
  for (const term of queryTerms) {
    const entries = index.get(term);
    if (!entries) continue;
    const df = entries.length;
    const idf = totalDocs > 0 ? Math.log(1 + totalDocs / (1 + df)) : 1;
    for (const entry of entries) {
      const docKey = `${entry.docId}@${entry.docType}`;
      const existing = scores.get(docKey);
      const titleBoost = entry.title.toLowerCase().includes(term) ? 2 : 1;
      const matchWeight = MATCH_WEIGHTS[entry.matchType];
      const termScore = entry.tf * idf * matchWeight * titleBoost;
      if (existing) {
        existing.score += termScore;
      } else {
        scores.set(docKey, {
          docId: entry.docId,
          docType: entry.docType,
          title: entry.title,
          score: termScore
        });
      }
    }
  }
  const results = [...scores.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  return results.map((r) => {
    const docKey = `${r.docId}@${r.docType}`;
    const doc = docs.get(docKey);
    let snippet = "";
    if (doc) {
      const lowerContent = doc.content.toLowerCase();
      const firstMatchIdx = findFirstMatchIdx(lowerContent, queryTerms);
      if (firstMatchIdx >= 0) {
        const start = Math.max(0, firstMatchIdx - 40);
        const end = Math.min(doc.content.length, firstMatchIdx + 60);
        snippet = (start > 0 ? "..." : "") + doc.content.slice(start, end) + (end < doc.content.length ? "..." : "");
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
      score: Math.round(r.score * 1e3) / 1e3
    };
  });
}
function findFirstMatchIdx(lowerContent, terms) {
  let earliest = -1;
  for (const term of terms) {
    const idx = lowerContent.indexOf(term);
    if (idx >= 0 && (earliest < 0 || idx < earliest)) {
      earliest = idx;
    }
  }
  return earliest;
}
function cleanLegacyKeys() {
  if (typeof localStorage === "undefined") return;
  for (const key of LS_LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
}
function saveToLocalStorage() {
  if (typeof localStorage === "undefined") return;
  try {
    const indexData = [];
    for (const [term, entries] of index) {
      indexData.push([term, entries]);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(indexData));
    const docData = [];
    for (const doc of docs.values()) {
      docData.push(doc);
    }
    localStorage.setItem(LS_DOCS_KEY, JSON.stringify(docData));
    cleanLegacyKeys();
  } catch {
  }
}
function restoreFromLocalStorage() {
  if (typeof localStorage === "undefined") return false;
  try {
    let rawIndex = localStorage.getItem(LS_KEY);
    let rawDocs = localStorage.getItem(LS_DOCS_KEY);
    if (!rawIndex || !rawDocs) {
      const legacyIndex = localStorage.getItem("lbkb_fts_index");
      const legacyDocs = localStorage.getItem("lbkb_fts_docs");
      if (legacyIndex && legacyDocs) {
        rawIndex = legacyIndex;
        rawDocs = legacyDocs;
      } else {
        return false;
      }
    }
    const indexData = JSON.parse(rawIndex);
    const docData = JSON.parse(rawDocs);
    index.clear();
    docs.clear();
    totalDocs = 0;
    for (const [term, entries] of indexData) {
      const normalized = entries.map((e) => ({
        ...e,
        matchType: e.matchType || "word"
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
self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "build-index": {
      const docsList = msg.docs;
      index.clear();
      docs.clear();
      totalDocs = 0;
      for (const doc of docsList) {
        const layers = tokenize(`${doc.title} ${doc.content}`);
        const stored = {
          id: doc.id,
          docType: doc.docType,
          title: doc.title,
          content: doc.content,
          totalTokens: layers.words.length + layers.bigrams.length + layers.unigrams.length || 1
        };
        addToIndex(stored);
      }
      saveToLocalStorage();
      self.postMessage({ type: "index-built", total: totalDocs });
      break;
    }
    case "search": {
      try {
        const results = search(msg.query, msg.limit);
        self.postMessage({
          type: "search-results",
          results,
          query: msg.query,
          correlationId: msg.correlationId
        });
      } catch (e2) {
        console.error("[SearchWorker] Search error:", e2);
        self.postMessage({
          type: "search-results",
          results: [],
          query: msg.query,
          correlationId: msg.correlationId
        });
      }
      break;
    }
    case "add-document": {
      const doc = msg.doc;
      const layers = tokenize(`${doc.title} ${doc.content}`);
      const stored = {
        id: doc.id,
        docType: doc.docType,
        title: doc.title,
        content: doc.content,
        totalTokens: layers.words.length + layers.bigrams.length + layers.unigrams.length || 1
      };
      addToIndex(stored);
      saveToLocalStorage();
      self.postMessage({ type: "document-added", docId: doc.id, docType: doc.docType });
      break;
    }
    case "remove-document": {
      removeFromIndex(msg.docId, msg.docType);
      saveToLocalStorage();
      self.postMessage({
        type: "document-removed",
        docId: msg.docId,
        docType: msg.docType
      });
      break;
    }
    case "restore-index": {
      const restored = restoreFromLocalStorage();
      self.postMessage({ type: "index-restored", success: restored, total: totalDocs });
      break;
    }
  }
};
