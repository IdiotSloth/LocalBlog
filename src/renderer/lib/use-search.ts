/**
 * use-search — Renderer-side search hook.
 *
 * Architecture:
 *   MySQL mode → calls window.api.searchQuery (main process handles MATCH ... AGAINST)
 *   sql.js mode → creates Web Workers: search.worker (keyword TF-IDF) + embedding.worker (semantic ONNX)
 *
 * T2104b: Hybrid search — keyword + semantic with 0.6×vector + 0.4×keyword scoring.
 *   Embedding worker loads ~120MB ONNX model on first use. Falls back to pure keyword if unavailable.
 *
 * Usage:
 *   const { search, results, loading, ready, addDocument, removeDocument } = useSearch(userId);
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FtsSearchResult, IndexableDoc } from '../../shared/types';

type SearchMode = 'mysql' | 'sqljs' | 'init';

interface UseSearchReturn {
  search: (query: string) => Promise<void>;
  results: FtsSearchResult[];
  loading: boolean;
  ready: boolean;
  refreshIndex: () => Promise<void>;
  addDocument: (doc: IndexableDoc) => void;
  removeDocument: (docId: number, docType: 'blog' | 'knowledge') => void;
}

/** T2104b: Merge keyword + semantic results with hybrid scoring.
 *  Keyword TF-IDF scores are normalized to [0,1] before merging
 *  to align with cosine similarity range. */
function mergeResults(
  keyword: FtsSearchResult[],
  semantic: { id: number; type: 'blog' | 'knowledge'; score: number }[],
  limit: number,
): FtsSearchResult[] {
  const map = new Map<string, FtsSearchResult>();
  const KW_WEIGHT = 0.4;
  const SEM_WEIGHT = 0.6;

  // Normalize keyword scores to [0,1]
  const kwMax = keyword.length > 0 ? Math.max(...keyword.map((r) => r.score), 1) : 1;

  // Keyword results (weight 0.4, normalized)
  for (const r of keyword) {
    const key = `${r.id}@${r.type}`;
    map.set(key, { ...r, score: (r.score / kwMax) * KW_WEIGHT });
  }

  // Semantic results (weight 0.6, already [0,1] from cosine similarity)
  for (const r of semantic) {
    const key = `${r.id}@${r.type}`;
    const existing = map.get(key);
    if (existing) {
      existing.score += r.score * SEM_WEIGHT;
    } else {
      map.set(key, {
        id: r.id,
        type: r.type,
        title: r.title || '',
        snippet: '',
        score: r.score * SEM_WEIGHT,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function useSearch(userId: number | null): UseSearchReturn {
  const [results, setResults] = useState<FtsSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const embedWorkerRef = useRef<Worker | null>(null);
  const embedReadyRef = useRef(false);
  const modeRef = useRef<SearchMode>('init');
  const pendingSearchesRef = useRef<Map<number, (results: FtsSearchResult[]) => void>>(new Map());
  const correlationIdRef = useRef(0);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize: determine mode and create Workers if needed
  useEffect(() => {
    if (!userId) return;

    const uid = userId;

    async function init() {
      // Try MySQL mode first
      try {
        const resp = await window.api.searchQuery({ query: 'test', userId: uid });
        if (resp.success && resp.data !== null) {
          modeRef.current = 'mysql';
          setReady(true);
          return;
        }
      } catch {
        // Fall through to sql.js mode
      }

      // sql.js mode: create search worker
      modeRef.current = 'sqljs';
      const worker = new Worker(
        new URL('../workers/search.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;
      (window as any).__searchWorker = worker; // D88: expose for searchDirect()

      worker.onerror = (e) => {
        console.error('[SearchWorker] Error:', e);
        setReady(false);
      };
      worker.onmessageerror = (e) => {
        console.error('[SearchWorker] Message error:', e);
      };
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        switch (msg.type) {
          case 'search-results': {
            setLoading(false);
            const cid = msg.correlationId;
            if (cid !== undefined && pendingSearchesRef.current.has(cid)) {
              pendingSearchesRef.current.get(cid)!(msg.results as FtsSearchResult[]);
              pendingSearchesRef.current.delete(cid);
            } else {
              // If no pending promise (embed worker hasn't resolved yet), show keyword results immediately
              setResults(msg.results as FtsSearchResult[]);
            }
            break;
          }
          case 'index-built':
          case 'index-restored': {
            if (msg.type === 'index-restored' && !msg.success) {
              fetchAndBuildIndex(worker, uid);
            }
            setReady(true);
            // T2104b: Build embedding index after keyword index is ready
            if (embedWorkerRef.current) {
              fetchAndBuildEmbedIndex(embedWorkerRef.current, uid);
            }
            break;
          }
          case 'document-added':
          case 'document-removed':
            break;
          default:
            break;
        }
      };

      worker.postMessage({ type: 'restore-index' });

      // T2104b: Create embedding worker (lazy — model loads on first build-index)
      try {
        const embedWorker = new Worker(
          new URL('../workers/embedding.worker.ts', import.meta.url),
          { type: 'module' },
        );
        embedWorkerRef.current = embedWorker;
        embedWorker.onerror = (e) => {
          console.warn('[EmbeddingWorker] Error (semantic search unavailable):', e);
          embedReadyRef.current = false;
        };
        embedWorker.onmessageerror = () => {
          embedReadyRef.current = false;
        };
        embedWorker.onmessage = (ev: MessageEvent) => {
          const m = ev.data;
          if (m.type === 'model-ready' || m.type === 'index-built') {
            embedReadyRef.current = true;
          }
          if (m.type === 'error') {
            embedReadyRef.current = false;
            console.warn('[EmbeddingWorker]', m.message);
          }
          // Handle search results from embed worker
          if (m.type === 'search-results') {
            const cid = m.correlationId;
            if (cid !== undefined && pendingSearchesRef.current.has(cid)) {
              // Don't resolve here — the merge happens in the main search handler
            }
          }
        };
      } catch {
        console.warn('[useSearch] Embedding worker unavailable, using keyword-only search');
      }
    }

    init();

    const unsubBlogRefresh = window.api.onBlogRefresh(() => {
      if (modeRef.current === 'mysql') return;
      if (workerRef.current) {
        fetchAndBuildIndex(workerRef.current, uid);
      }
    });

    const unsubKbRefresh = window.api.onKbRefresh(() => {
      if (modeRef.current === 'mysql') return;
      if (workerRef.current) {
        fetchAndBuildIndex(workerRef.current, uid);
      }
    });

    return () => {
      unsubBlogRefresh();
      unsubKbRefresh();
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (embedWorkerRef.current) {
        embedWorkerRef.current.terminate();
        embedWorkerRef.current = null;
      }
    };
  }, [userId]);

  const search = useCallback(
    async (query: string) => {
      if (!userId) return;
      if (query.trim().length < 1) {
        setResults([]);
        return;
      }

      setLoading(true);

      if (modeRef.current === 'mysql') {
        try {
          const resp = await window.api.searchQuery({ query: query.trim(), userId });
          if (resp.success && resp.data) {
            setResults(resp.data);
          } else {
            setResults([]);
          }
        } catch {
          setResults([]);
        }
        setLoading(false);
      } else if (modeRef.current === 'sqljs' && workerRef.current) {
        const q = query.trim();

        // Run keyword search
        const keywordPromise = new Promise<FtsSearchResult[]>((resolve) => {
          const cid = ++correlationIdRef.current;
          pendingSearchesRef.current.set(cid, resolve);
          workerRef.current!.postMessage({ type: 'search', query: q, limit: 20, correlationId: cid });
          safetyTimeoutRef.current = setTimeout(() => {
            if (pendingSearchesRef.current.has(cid)) {
              pendingSearchesRef.current.delete(cid);
              resolve([]);
            }
            safetyTimeoutRef.current = null;
          }, 5000);
        });

        // T2104b: Run semantic search in parallel if embed worker is ready
        let semanticResults: { id: number; type: 'blog' | 'knowledge'; score: number }[] = [];
        if (embedWorkerRef.current && embedReadyRef.current) {
          try {
            semanticResults = await new Promise((resolve) => {
              const cid = ++correlationIdRef.current;
              const timer = setTimeout(() => resolve([]), 3000); // 3s timeout for semantic search
              const handler = (ev: MessageEvent) => {
                if (ev.data.type === 'search-results' && ev.data.correlationId === cid) {
                  clearTimeout(timer);
                  embedWorkerRef.current?.removeEventListener('message', handler);
                  resolve(ev.data.results || []);
                }
              };
              embedWorkerRef.current!.addEventListener('message', handler);
              embedWorkerRef.current!.postMessage({ type: 'search', query: q, limit: 10, correlationId: cid });
            });
          } catch {
            // Semantic search failed, continue with keyword only
          }
        }

        // Wait for keyword results (semantic is optional, fire-and-forget if not ready)
        const keywordResults = await keywordPromise;

        // Merge results
        const merged = mergeResults(keywordResults, semanticResults, 20);
        setResults(merged);
        setLoading(false);
      } else {
        setLoading(false);
      }
    },
    [userId],
  );

  const refreshIndex = useCallback(async () => {
    if (!userId || modeRef.current !== 'sqljs' || !workerRef.current) return;
    setReady(false);
    await fetchAndBuildIndex(workerRef.current, userId);
    setReady(true);
  }, [userId]);

  const addDocument = useCallback((doc: IndexableDoc) => {
    if (modeRef.current === 'sqljs' && workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'add-document', doc });
      } catch (e) {
        console.error('[useSearch] Failed to add document:', e);
      }
    }
  }, []);

  const removeDocument = useCallback((docId: number, docType: 'blog' | 'knowledge') => {
    if (modeRef.current === 'sqljs' && workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'remove-document', docId, docType });
      } catch (e) {
        console.error('[useSearch] Failed to remove document:', e);
      }
    }
  }, []);

  return { search, results, loading, ready, refreshIndex, addDocument, removeDocument };
}

/** Fetch all indexable documents from main process and build keyword index */
async function fetchAndBuildIndex(worker: Worker, userId: number): Promise<void> {
  try {
    const resp = await window.api.searchGetDocuments({ userId });
    if (resp.success && resp.data) {
      worker.postMessage({ type: 'build-index', docs: resp.data });
    }
  } catch (err) {
    console.warn('[useSearch] Failed to fetch indexable documents:', err);
  }
}

/** T2104b: Fetch all docs and post to embed worker for semantic indexing */
async function fetchAndBuildEmbedIndex(embedWorker: Worker, userId: number): Promise<void> {
  try {
    const resp = await window.api.searchGetDocuments({ userId });
    if (resp.success && resp.data && resp.data.length > 0) {
      embedWorker.postMessage({ type: 'build-index', docs: resp.data });
    }
  } catch {
    // Semantic index build is best-effort; keyword search still works
  }
}

// ==================== D88: Direct search client for ReferencePicker / WikilinkSuggestion ====================

/**
 * Search blogs + knowledge + notes using FTS5 Worker (sql.js) or MySQL FULLTEXT.
 * Replaces the old ref:search SQL LIKE pathway. Used by [[wikilink]] completion
 * and ReferencePicker — giving them CJK tokenization, TF-IDF scoring, and
 * content search (not just title match).
 */
export async function searchDirect(query: string, userId: number): Promise<FtsSearchResult[]> {
  const q = query.trim();
  if (!q || !userId) return [];

  // MySQL mode: use main process FULLTEXT
  try {
    const resp = await window.api.searchQuery({ query: q, userId });
    if (resp.success && resp.data !== null) {
      return resp.data;
    }
  } catch { /* fall through to worker */ }

  // sql.js mode: use shared worker (set by useSearch hook)
  const worker = (window as any).__searchWorker as Worker | undefined;
  if (!worker) return [];

  return new Promise((resolve) => {
    const cid = Date.now() + Math.random();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'search-results' && e.data.correlationId === cid) {
        worker.removeEventListener('message', handler);
        resolve((e.data.results as FtsSearchResult[]) || []);
      }
    };
    const timer = setTimeout(() => {
      worker.removeEventListener('message', handler);
      resolve([]);
    }, 3000);
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'search', query: q, limit: 15, correlationId: cid });
  });
}
