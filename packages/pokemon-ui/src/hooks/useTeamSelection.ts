import { useCallback, useState } from 'react';
import { MAX_TEAM_SIZE } from '@pokemon/contracts';

// UX affordance only. The real cap is the backend + DB CHECK; this hook enforces nothing on its own.
export function useTeamSelection(initialIds: number[] = []) {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialIds);

  const isFull = selectedIds.length >= MAX_TEAM_SIZE;

  const isSelected = useCallback((id: number) => selectedIds.includes(id), [selectedIds]);

  const toggle = useCallback((id: number) => {
    setSelectedIds((ids) => {
      if (ids.includes(id)) return ids.filter((i) => i !== id);
      if (ids.length >= MAX_TEAM_SIZE) return ids;
      return [...ids, id];
    });
  }, []);

  return { selectedIds, isSelected, isFull, toggle, reset: setSelectedIds };
}
