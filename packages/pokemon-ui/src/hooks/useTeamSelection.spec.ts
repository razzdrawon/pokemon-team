import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_TEAM_SIZE } from '@pokemon/contracts';
import { useTeamSelection } from './useTeamSelection';

describe('useTeamSelection', () => {
  it('toggles a Pokémon on and off', () => {
    const { result } = renderHook(() => useTeamSelection());

    act(() => result.current.toggle(1));
    expect(result.current.selectedIds).toEqual([1]);

    act(() => result.current.toggle(1));
    expect(result.current.selectedIds).toEqual([]);
  });

  it('caps selection at MAX_TEAM_SIZE and ignores further toggles', () => {
    const { result } = renderHook(() => useTeamSelection());

    act(() => {
      for (let id = 1; id <= MAX_TEAM_SIZE; id++) result.current.toggle(id);
    });
    expect(result.current.selectedIds).toHaveLength(MAX_TEAM_SIZE);
    expect(result.current.isFull).toBe(true);

    act(() => result.current.toggle(999));
    expect(result.current.selectedIds).toHaveLength(MAX_TEAM_SIZE);
    expect(result.current.selectedIds).not.toContain(999);
  });

  it('never produces duplicates', () => {
    const { result } = renderHook(() => useTeamSelection());

    act(() => result.current.toggle(1));
    act(() => result.current.toggle(1));
    act(() => result.current.toggle(1));

    expect(result.current.selectedIds.filter((id) => id === 1)).toHaveLength(1);
  });

  it('toggling off when full frees a slot', () => {
    const { result } = renderHook(() => useTeamSelection());

    act(() => {
      for (let id = 1; id <= MAX_TEAM_SIZE; id++) result.current.toggle(id);
    });
    act(() => result.current.toggle(1)); // remove one
    expect(result.current.isFull).toBe(false);

    act(() => result.current.toggle(999));
    expect(result.current.selectedIds).toContain(999);
  });
});
