/**
 * Embedding Worker (T2104b) — Semantic search via ONNX model inference.
 *
 * Uses @xenova/transformers with multilingual-e5-small (~120MB, 384-dim vectors).
 * Model downloads on first use, cached by Transformers.js in browser cache.
 *
 * Embeddings are stored in IndexedDB for persistence across sessions.
 *
 * Messages:
 *   { type: 'build-index', docs: IndexableDoc[] }
 *   { type: 'search', query: string, limit?: number }
 *   { type: 'terminate' }
 *
 * Responses:
 *   { type: 'model-loading' }
 *   { type: 'model-ready' }
 *   { type: 'index-progress', done: number, total: number }
 *   { type: 'index-built', total: number }
 *   { type: 'search-results', results: VectorSearchResult[], query: string, correlationId?: number }
 *   { type: 'error', message: string }
 */

import type { IndexableDoc } from '../../shared/types';

self.onerror = (e) => {
  console.error('[EmbeddingWorker] Unhandled error:', e);
};

interface VectorSearchResult {
  id: number;
  type: 'blog' | 'knowledge';
  title: string;
  score: number;
}

const MODEL_NAME = 'Xenova/multilingual-e5-small';
const DB_NAME = 'lbkb_embeddings';
const STORE_NAME = 'vectors';
const VECTOR_DIM = 384;
const BATCH_SIZE = 16;

let extractor: any = null;
const embeddings = new Map<string, Float32Array>(); // key = "id@type"

// ---- IndexedDB for persistence ----

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromDB(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise<any[]>((resolve, reject) => {
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

async function saveBatchToDB(rows: { key: string; vector: number[] }[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const row of rows) {
      store.put(row);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* IndexedDB may be unavailable */ }
}

async function clearDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
  } catch { /* ignore */ }
}

// ---- Model loading ----

async function loadModel(): Promise<boolean> {
  if (extractor) return true;
  try {
    self.postMessage({ type: 'model-loading' });
    const { pipeline } = await import('@xenova/transformers');
    extractor = await pipeline('feature-extraction', MODEL_NAME);
    self.postMessage({ type: 'model-ready' });
    return true;
  } catch (e) {
    self.postMessage({ type: 'error', message: `模型加载失败: ${(e as Error).message}` });
    return false;
  }
}

// ---- Embedding ----

async function embed(texts: string[]): Promise<Float32Array[]> {
  if (!extractor) return [];
  const results: Float32Array[] = [];
  // Process in micro-batches to avoid blocking
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    for (const text of batch) {
      try {
        // E5 models benefit from "query: " / "passage: " prefixes
        const output = await extractor(`passage: ${text.slice(0, 512)}`, {
          pooling: 'mean',
          normalize: true,
        });
        // Convert tensor to Float32Array, validate dimensions
        const vec = new Float32Array(output.data);
        if (vec.length !== VECTOR_DIM) {
          console.warn(`[EmbeddingWorker] Unexpected vector dim ${vec.length}, expected ${VECTOR_DIM}`);
          results.push(new Float32Array(VECTOR_DIM)); // zero vector on dimension mismatch
        } else {
          results.push(vec);
        }
      } catch {
        results.push(new Float32Array(VECTOR_DIM)); // zero vector on failure
      }
    }
  }
  return results;
}

async function embedQuery(query: string): Promise<Float32Array> {
  if (!extractor) return new Float32Array(VECTOR_DIM);
  try {
    const output = await extractor(`query: ${query.slice(0, 512)}`, {
      pooling: 'mean',
      normalize: true,
    });
    return new Float32Array(output.data);
  } catch {
    return new Float32Array(VECTOR_DIM);
  }
}

// ---- Cosine similarity ----

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
  }
  return dot; // Vectors are already normalized, so dot product = cosine similarity
}

// ---- Build index ----

async function buildIndex(docs: IndexableDoc[]): Promise<void> {
  embeddings.clear();
  await clearDB();

  const texts: string[] = [];
  const keys: string[] = [];
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

    // Batch save to IndexedDB (one transaction per batch, not per entry)
    const batchRows: { key: string; vector: number[] }[] = [];
    for (let j = 0; j < vecs.length; j++) {
      const key = batchKeys[j]!;
      const vec = vecs[j]!;
      embeddings.set(key, vec);
      batchRows.push({ key, vector: Array.from(vec) });
      doneCount++;
    }
    await saveBatchToDB(batchRows);

    self.postMessage({ type: 'index-progress', done: doneCount, total });
  }

  self.postMessage({ type: 'index-built', total: doneCount });
}

// ---- Search ----

async function searchSemantic(query: string, limit = 10): Promise<VectorSearchResult[]> {
  if (embeddings.size === 0) return [];

  const queryVec = await embedQuery(query);

  const scores: { key: string; score: number }[] = [];
  for (const [key, vec] of embeddings) {
    const score = cosineSimilarity(queryVec, vec);
    scores.push({ key, score });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const results: VectorSearchResult[] = [];
  for (const s of scores.slice(0, limit)) {
    const parts = s.key.split('@');
    const id = Number(parts[0]);
    const type = parts[1] as 'blog' | 'knowledge';
    if (!id || !type) continue;
    results.push({
      id,
      type,
      title: '', // Will be filled by use-search hook
      score: Math.round(s.score * 1000) / 1000,
    });
  }
  return results;
}

// ---- Message handler ----

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  switch (msg.type) {
    case 'build-index': {
      const loaded = await loadModel();
      if (!loaded) {
        self.postMessage({ type: 'error', message: '模型不可用，使用关键词搜索' });
        return;
      }
      // Restore persisted embeddings first
      const restored = await loadFromDB();
      if (restored > 0 && restored >= (msg.docs as IndexableDoc[]).length) {
        // Use restored cache — skip re-embedding
        self.postMessage({ type: 'index-built', total: restored });
      } else {
        await buildIndex(msg.docs as IndexableDoc[]);
      }
      break;
    }

    case 'search': {
      if (!extractor && !(await loadModel())) {
        self.postMessage({
          type: 'search-results',
          results: [],
          query: msg.query,
          correlationId: msg.correlationId,
        });
        return;
      }
      try {
        const results = await searchSemantic(msg.query, msg.limit ?? 10);
        self.postMessage({
          type: 'search-results',
          results,
          query: msg.query,
          correlationId: msg.correlationId,
        });
      } catch (e) {
        console.error('[EmbeddingWorker] Search error:', e);
        self.postMessage({
          type: 'search-results',
          results: [],
          query: msg.query,
          correlationId: msg.correlationId,
        });
      }
      break;
    }

    case 'terminate': {
      extractor = null;
      embeddings.clear();
      self.close();
      break;
    }

    default:
      break;
  }
};
