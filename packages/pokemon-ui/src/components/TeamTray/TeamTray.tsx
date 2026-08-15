import styled from '@emotion/styled';
import { MAX_TEAM_SIZE } from '@pokemon/contracts';
import type { PokemonDto } from '@pokemon/contracts';

interface TeamTrayProps {
  selectedIds: number[];
  pokemonById: Map<number, PokemonDto>;
  onRemove: (id: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError?: string;
}

const Tray = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const Slot = styled.div<{ filled: boolean }>`
  width: 80px;
  height: 90px;
  border: 2px ${(p) => (p.filled ? 'solid' : 'dashed')} #d1d5db;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
`;

export function TeamTray({
  selectedIds,
  pokemonById,
  onRemove,
  onSubmit,
  submitting,
  submitError,
}: TeamTrayProps) {
  const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, i) => selectedIds[i]);

  return (
    <div>
      <Tray>
        {slots.map((id, i) => {
          const pokemon = id !== undefined ? pokemonById.get(id) : undefined;
          return (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- fixed slot positions, never reordered
            <Slot key={i} filled={!!pokemon}>
              {pokemon ? (
                <>
                  <img src={pokemon.spriteUrl} alt={pokemon.name} width={48} height={48} />
                  <button type="button" onClick={() => onRemove(pokemon.id)}>
                    remove
                  </button>
                </>
              ) : (
                <span>empty</span>
              )}
            </Slot>
          );
        })}
      </Tray>
      <button type="button" onClick={onSubmit} disabled={submitting}>
        {submitting ? 'Saving…' : 'Submit team'}
      </button>
      {submitError && <span role="alert">{submitError}</span>}
    </div>
  );
}
