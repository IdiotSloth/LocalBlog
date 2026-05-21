self.onerror = (e) => {
  console.error("[EmbeddingWorker] Unhandled error:", e);
};
const MODEL_NAME = "Xenova/multilingual-e5-small";
const DB_NAME = "lbkb_embeddings";
const STORE_NAME = "vectors";
const VECTOR_DIM = 384;
const BATCH_SIZE = 16;
let extractor = null;
const embeddings = /* @__PURE__ */ new Map();
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function loadFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    for (const row of all) {
      embeddings.set(row.key, new Float32Array(row.vector));
    }
    return all.length;
  } catch {
    return 0;
  }
}
async function saveBatchToDB(rows) {
  if (rows.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const row of rows) {
      store.put(row);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
  }
}
async function clearDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch {
  }
}
async function loadModel() {
  if (extractor) return true;
  try {
    self.postMessage({ type: "model-loading" });
    const { pipeline } = await import("./transformers-imssT9TN.js");
    extractor = await pipeline("feature-extraction", MODEL_NAME);
    self.postMessage({ type: "model-ready" });
    return true;
  } catch (e) {
    self.postMessage({ type: "error", message: `模型加载失败: ${e.message}` });
    return false;
  }
}
async function embed(texts) {
  if (!extractor) return [];
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    for (const text of batch) {
      try {
        const output = await extractor(`passage: ${text.slice(0, 512)}`, {
          pooling: "mean",
          normalize: true
        });
        const vec = new Float32Array(output.data);
        if (vec.length !== VECTOR_DIM) {
          console.warn(`[EmbeddingWorker] Unexpected vector dim ${vec.length}, expected ${VECTOR_DIM}`);
          results.push(new Float32Array(VECTOR_DIM));
        } else {
          results.push(vec);
        }
      } catch {
        results.push(new Float32Array(VECTOR_DIM));
      }
    }
  }
  return results;
}
async function embedQuery(query) {
  if (!extractor) return new Float32Array(VECTOR_DIM);
  try {
    const output = await extractor(`query: ${query.slice(0, 512)}`, {
      pooling: "mean",
      normalize: true
    });
    return new Float32Array(output.data);
  } catch {
    return new Float32Array(VECTOR_DIM);
  }
}
function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}
async function buildIndex(docs) {
  embeddings.clear();
  await clearDB();
  const texts = [];
  const keys = [];
  for (const doc of docs) {
    const key = `${doc.id}@${doc.docType}`;
    texts.push(`${doc.title} ${doc.content.slice(0, 400)}`);
    keys.push(key);
  }
  const total = texts.length;
  let doneCount = 0;
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batchTexts = texts.slice(i, i + BATCH_SIZE);
    const batchKeys = keys.slice(i, i + BATCH_SIZE);
    const vecs = await embed(batchTexts);
    const batchRows = [];
    for (let j = 0; j < vecs.length; j++) {
      const key = batchKeys[j];
      const vec = vecs[j];
      embeddings.set(key, vec);
      batchRows.push({ key, vector: Array.from(vec) });
      doneCount++;
    }
    await saveBatchToDB(batchRows);
    self.postMessage({ type: "index-progress", done: doneCount, total });
  }
  self.postMessage({ type: "index-built", total: doneCount });
}
async function searchSemantic(query, limit = 10) {
  if (embeddings.size === 0) return [];
  const queryVec = await embedQuery(query);
  const scores = [];
  for (const [key, vec] of embeddings) {
    const score = cosineSimilarity(queryVec, vec);
    scores.push({ key, score });
  }
  scores.sort((a, b) => b.score - a.score);
  const results = [];
  for (const s of scores.slice(0, limit)) {
    const parts = s.key.split("@");
    const id = Number(parts[0]);
    const type = parts[1];
    if (!id || !type) continue;
    results.push({
      id,
      type,
      title: "",
      // Will be filled by use-search hook
      score: Math.round(s.score * 1e3) / 1e3
    });
  }
  return results;
}
self.onmessage = async (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "build-index": {
      const loaded = await loadModel();
      if (!loaded) {
        self.postMessage({ type: "error", message: "模型不可用，使用关键词搜索" });
        return;
      }
      const restored = await loadFromDB();
      if (restored > 0 && restored >= msg.docs.length) {
        self.postMessage({ type: "index-built", total: restored });
      } else {
        await buildIndex(msg.docs);
      }
      break;
    }
    case "search": {
      if (!extractor && !await loadModel()) {
        self.postMessage({
          type: "search-results",
          results: [],
          query: msg.query,
          correlationId: msg.correlationId
        });
        return;
      }
      try {
        const results = await searchSemantic(msg.query, msg.limit ?? 10);
        self.postMessage({
          type: "search-results",
          results,
          query: msg.query,
          correlationId: msg.correlationId
        });
      } catch (e2) {
        console.error("[EmbeddingWorker] Search error:", e2);
        self.postMessage({
          type: "search-results",
          results: [],
          query: msg.query,
          correlationId: msg.correlationId
        });
      }
      break;
    }
    // T2203: Find docs similar to a given source doc
    case "similarity-search": {
      const { docId, docType, limit, threshold } = msg;
      const key = `${docId}@${docType}`;
      const sourceVec = embeddings.get(key);
      if (!sourceVec) {
        self.postMessage({ type: "similarity-results", results: [], sourceId: docId, sourceType: docType });
        break;
      }
      const scores = [];
      const minThreshold = threshold ?? 0.75;
      for (const [otherKey, vec] of embeddings) {
        if (otherKey === key) continue;
        const score = cosineSimilarity(sourceVec, vec);
        if (score >= minThreshold) {
          const parts = otherKey.split("@");
          const id = Number(parts[0]);
          const type = parts[1];
          if (id && type) {
            scores.push({ id, type, score });
          }
        }
      }
      scores.sort((a, b) => b.score - a.score);
      self.postMessage({
        type: "similarity-results",
        results: scores.slice(0, limit ?? 5),
        sourceId: docId,
        sourceType: docType
      });
      break;
    }
    case "terminate": {
      extractor = null;
      embeddings.clear();
      self.close();
      break;
    }
  }
};
