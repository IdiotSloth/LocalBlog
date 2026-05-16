(function() {
  "use strict";
  self.onerror = (e) => {
    console.error("[SearchWorker] Unhandled error:", e);
  };
  const LS_KEY = "lbkb_fts_index";
  const LS_DOCS_KEY = "lbkb_fts_docs";
  const index = /* @__PURE__ */ new Map();
  const docs = /* @__PURE__ */ new Map();
  let totalDocs = 0;
  function stripHtml(text) {
    return text.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/&#\d+;/g, " ").replace(/\s+/g, " ");
  }
  function tokenize(text) {
    const clean = stripHtml(text);
    try {
      const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
      return Array.from(segmenter.segment(clean)).filter((s) => s.isWordLike).map((s) => s.segment.toLowerCase());
    } catch {
      return clean.toLowerCase().split(/[\s,.;:!?()\[\]{}""''「」、，。；：！？（）【】《》""''‘’]+/).filter(Boolean);
    }
  }
  function addToIndex(doc) {
    const terms = tokenize(`${doc.title} ${doc.content}`);
    const termCount = /* @__PURE__ */ new Map();
    for (const term of terms) {
      termCount.set(term, (termCount.get(term) || 0) + 1);
    }
    const key = `${doc.id}@${doc.docType}`;
    docs.set(key, doc);
    totalDocs++;
    for (const [term, count] of termCount) {
      const entry = {
        docId: doc.id,
        docType: doc.docType,
        title: doc.title,
        tf: count / doc.wordCount
        // Normalized term frequency
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
  function search(query, limit = 20) {
    const terms = tokenize(query);
    if (terms.length === 0) return [];
    const scores = /* @__PURE__ */ new Map();
    for (const term of terms) {
      const entries = index.get(term);
      if (!entries) continue;
      const df = entries.length;
      const idf = totalDocs > 0 ? Math.log(1 + totalDocs / (1 + df)) : 1;
      for (const entry of entries) {
        const docKey = `${entry.docId}@${entry.docType}`;
        const existing = scores.get(docKey);
        const termScore = entry.tf * idf;
        const titleBoost = entry.title.toLowerCase().includes(term) ? 2 : 1;
        if (existing) {
          existing.score += termScore * titleBoost;
        } else {
          scores.set(docKey, {
            docId: entry.docId,
            docType: entry.docType,
            title: entry.title,
            score: termScore * titleBoost
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
        const firstMatchIdx = findFirstMatchIdx(lowerContent, terms);
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
    } catch {
    }
  }
  function restoreFromLocalStorage() {
    if (typeof localStorage === "undefined") return false;
    try {
      const rawIndex = localStorage.getItem(LS_KEY);
      const rawDocs = localStorage.getItem(LS_DOCS_KEY);
      if (!rawIndex || !rawDocs) return false;
      const indexData = JSON.parse(rawIndex);
      const docData = JSON.parse(rawDocs);
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
  self.onmessage = (e) => {
    const msg = e.data;
    switch (msg.type) {
      case "build-index": {
        const docsList = msg.docs;
        index.clear();
        docs.clear();
        totalDocs = 0;
        for (const doc of docsList) {
          const stored = {
            id: doc.id,
            docType: doc.docType,
            title: doc.title,
            content: doc.content,
            wordCount: tokenize(`${doc.title} ${doc.content}`).length || 1
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
          self.postMessage({ type: "search-results", results, query: msg.query, correlationId: msg.correlationId });
        } catch (e2) {
          console.error("[SearchWorker] Search error:", e2);
          self.postMessage({ type: "search-results", results: [], query: msg.query, correlationId: msg.correlationId });
        }
        break;
      }
      case "add-document": {
        const doc = msg.doc;
        const stored = {
          id: doc.id,
          docType: doc.docType,
          title: doc.title,
          content: doc.content,
          wordCount: tokenize(`${doc.title} ${doc.content}`).length || 1
        };
        addToIndex(stored);
        saveToLocalStorage();
        self.postMessage({ type: "document-added", docId: doc.id, docType: doc.docType });
        break;
      }
      case "remove-document": {
        removeFromIndex(msg.docId, msg.docType);
        saveToLocalStorage();
        self.postMessage({ type: "document-removed", docId: msg.docId, docType: msg.docType });
        break;
      }
      case "restore-index": {
        const restored = restoreFromLocalStorage();
        self.postMessage({ type: "index-restored", success: restored, total: totalDocs });
        break;
      }
    }
  };
})();
