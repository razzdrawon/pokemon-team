import styled from '@emotion/styled';
import type { PokemonDto } from '@pokemon/contracts';
import { PokemonCard } from './PokemonCard';

interface PokemonGridProps {
  pokemon: PokemonDto[];
  selectedIds: number[];
  isFull: boolean;
  onToggle: (id: number) => void;
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
`;

export function PokemonGrid({ pokemon, selectedIds, isFull, onToggle }: PokemonGridProps) {
  return (
    <Grid>
      {pokemon.map((p) => (
        <PokemonCard
          key={p.id}
          pokemon={p}
          selected={selectedIds.includes(p.id)}
          disabled={isFull}
          onToggle={onToggle}
        />
      ))}
    </Grid>
  );
}
