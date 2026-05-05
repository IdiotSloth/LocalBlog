import { useCallback, useState } from 'react';

interface BatchSelect<T extends { id: number }> {
  selectedIds: Set<number>;
  isBatchMode: boolean;
  setIsBatchMode: (v: boolean) => void;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  selectedItems: T[];
  selectedCount: number;
}

export function useBatchSelect<T extends { id: number }>(items: T[]): BatchSelect<T> {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsBatchMode(false);
  }, []);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  return {
    selectedIds,
    isBatchMode,
    setIsBatchMode,
    toggleSelect,
    selectAll,
    clearSelection,
    isAllSelected,
    selectedItems,
    selectedCount: selectedIds.size,
  };
}
