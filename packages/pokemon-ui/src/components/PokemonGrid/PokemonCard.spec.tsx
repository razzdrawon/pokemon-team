import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockPokemon } from '../../test/fixtures';
import { PokemonCard } from './PokemonCard';

describe('PokemonCard', () => {
  it('calls onToggle with the pokemon id when clicked', () => {
    const onToggle = vi.fn();
    render(
      <PokemonCard pokemon={mockPokemon[0]} selected={false} disabled={false} onToggle={onToggle} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(mockPokemon[0].id);
  });

  it('disables an unselected card when the team is full', () => {
    render(
      <PokemonCard pokemon={mockPokemon[0]} selected={false} disabled onToggle={vi.fn()} />
    );
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps a selected card clickable even when the team is full, so it can be removed', () => {
    render(<PokemonCard pokemon={mockPokemon[0]} selected disabled onToggle={vi.fn()} />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
