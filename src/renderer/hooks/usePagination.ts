import { useCallback, useState } from 'react';

export function usePagination(pageSize = 20) {
  const [page, setPage] = useState(1);

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const goTo = useCallback((p: number) => setPage(Math.max(1, p)), []);
  const next = useCallback(() => setPage((p) => p + 1), []);
  const prev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const reset = useCallback(() => setPage(1), []);

  return { page, offset, limit, goTo, next, prev, reset };
}
