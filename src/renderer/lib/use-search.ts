/**
 * use-search — Renderer-side search hook.
 *
 * Architecture:
 *   MySQL mode → calls window.api.searchQuery (main process handles MATCH ... AGAINST)
 *   sql.js mode → creates a Web Worker, builds inverted index, queries via Worker
 *
 * Usage:
 *   const { search, results, loading, ready, addDocument, removeDocument } = useSearch(userId);
 *   useEffect(() => { search('docker 部署'); }, [search]);
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

export function useSearch(userId: number | null): UseSearchReturn {
  const [results, setResults] = useState<FtsSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const modeRef = useRef<SearchMode>('init');
  const pendingSearchesRef = useRef<Map<number, (results: FtsSearchResult[]) => void>>(new Map());
  const correlationIdRef = useRef(0);

  // Initialize: determine mode and create Worker if needed
  useEffect(() => {
    if (!userId) return;

    let terminated = false;

    async function init() {
      // Try MySQL mode first: make a test query
      try {
        const resp = await window.api.searchQuery({ query: 'test', userId });
        if (resp.success && resp.data !== undefined) {
          // MySQL mode — results come from main process
          modeRef.current = 'mysql';
          setReady(true);
          return;
        }
      } catch {
        // Fall through to sql.js mode
      }

      // sql.js mode: create Worker
      modeRef.current = 'sqljs';
      const worker = new Worker(
        new URL('../workers/search.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;

      worker.onerror = (e) => {
        console.error('[SearchWorker] Error:', e);
        setReady(false);
      };
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        switch (msg.type) {
          case 'search-results': {
            setResults(msg.results as FtsSearchResult[]);
            setLoading(false);
            const cid = msg.correlationId;
            if (cid !== undefined && pendingSearchesRef.current.has(cid)) {
              pendingSearchesRef.current.get(cid)!(msg.results as FtsSearchResult[]);
              pendingSearchesRef.current.delete(cid);
            }
            break;
          }
          case 'index-built':
          case 'index-restored': {
            if (msg.type === 'index-restored' && !msg.success) {
              // localStorage cache miss — build from scratch
              fetchAndBuildIndex(worker, userId);
            } else {
              setReady(true);
            }
            break;
          }
          case 'document-added':
          case 'document-removed':
            // Index updated; no UI change needed
            break;
          default:
            break;
        }
      };

      // Try restoring index from localStorage first
      worker.postMessage({ type: 'restore-index' });
    }

    init();

    // Listen for refresh events to re-index after CRUD
    const unsubBlogRefresh = window.api.onBlogRefresh(() => {
      if (modeRef.current === 'mysql') {
        // MySQL: already handled by main process, just update status
        return;
      }
      // sql.js: rebuild index
      if (workerRef.current && userId) {
        fetchAndBuildIndex(workerRef.current, userId);
      }
    });

    const unsubKbRefresh = window.api.onKbRefresh(() => {
      if (modeRef.current === 'mysql') {
        return;
      }
      if (workerRef.current && userId) {
        fetchAndBuildIndex(workerRef.current, userId);
      }
    });

    return () => {
      terminated = true;
      unsubBlogRefresh();
      unsubKbRefresh();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [userId]);

  const search = useCallback(
    async (query: string) => {
      if (!userId) return;
      if (query.trim().length < 2) {
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
        // Use a promise to wait for worker response
        const workerResults = await new Promise<FtsSearchResult[]>((resolve) => {
          const cid = ++correlationIdRef.current;
          pendingSearchesRef.current.set(cid, resolve);
          workerRef.current!.postMessage({ type: 'search', query: query.trim(), limit: 20, correlationId: cid });
          // Timeout safety: resolve empty after 5s
          setTimeout(() => {
            if (pendingSearchesRef.current.has(cid)) {
              pendingSearchesRef.current.delete(cid);
              resolve([]);
            }
          }, 5000);
        });
        setResults(workerResults);
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

/** Fetch all indexable documents from main process and build worker index */
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
