import styled from '@emotion/styled';
import type { PokemonDto } from '@pokemon/contracts';

interface PokemonCardProps {
  pokemon: PokemonDto;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: number) => void;
}

const Card = styled.button<{ selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 2px solid ${(p) => (p.selected ? '#3b82f6' : '#e5e7eb')};
  border-radius: 8px;
  background: ${(p) => (p.selected ? '#eff6ff' : 'white')};
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export function PokemonCard({ pokemon, selected, disabled, onToggle }: PokemonCardProps) {
  return (
    <Card
      type="button"
      selected={selected}
      disabled={disabled && !selected} // stay clickable if already selected, so it can be removed
      onClick={() => onToggle(pokemon.id)}
    >
      <img src={pokemon.spriteUrl} alt="" width={64} height={64} /> {/* redundant with the visible name below */}
      <span>{pokemon.name}</span>
    </Card>
  );
}
