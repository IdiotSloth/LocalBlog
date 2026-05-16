import { useCallback, useMemo, useState } from 'react';

export function usePagination(pageSize = 20, total?: number) {
  const [page, setPage] = useState(1);

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const totalPages = useMemo(() => {
    if (total === undefined) return 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const goTo = useCallback((p: number) => setPage(Math.max(1, Math.min(p, totalPages || Infinity))), [totalPages]);
  const next = useCallback(() => setPage((p) => Math.min(p + 1, totalPages || Infinity)), [totalPages]);
  const prev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const reset = useCallback(() => setPage(1), []);

  return { page, offset, limit, totalPages, goTo, next, prev, reset };
}
