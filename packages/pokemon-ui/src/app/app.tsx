import { useEffect, useMemo, useState } from 'react';
import type { ProfileWithTeamDto } from '@pokemon/contracts';
import { ApiError } from '../api/client';
import { createProfile, setTeam as submitTeam } from '../api/profiles.api';
import { usePokemon } from '../hooks/usePokemon';
import { useProfiles } from '../hooks/useProfiles';
import { useProfileTeam } from '../hooks/useProfileTeam';
import { useTeamSelection } from '../hooks/useTeamSelection';
import { ProfilePicker } from '../components/ProfilePicker';
import { PokemonGrid } from '../components/PokemonGrid';
import { TeamTray } from '../components/TeamTray';

export function App() {
  const { data: pokemon, loading: pokemonLoading, error: pokemonError } = usePokemon();
  const {
    data: profiles,
    loading: profilesLoading,
    error: profilesError,
    refetch: refetchProfiles,
  } = useProfiles();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const { data: fetchedTeam } = useProfileTeam(selectedProfileId);

  // Local copy so a successful submit can update it directly from the PUT response,
  // without waiting on useAsync's refetch (which isn't awaitable — see useAsync.ts).
  const [team, setTeamState] = useState<ProfileWithTeamDto | null>(null);
  // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect -- syncing an external fetch result into local state, same as useAsync.ts
  useEffect(() => setTeamState(fetchedTeam), [fetchedTeam]);

  const selection = useTeamSelection();
  useEffect(() => {
    selection.reset(team ? team.team.map((m) => m.pokemon.id) : []);
  }, [team]);

  const [createError, setCreateError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const pokemonById = useMemo(() => new Map((pokemon ?? []).map((p) => [p.id, p])), [pokemon]);

  async function handleCreate(name: string) {
    setCreateError(undefined);
    try {
      const profile = await createProfile({ name });
      setSelectedProfileId(profile.id);
      refetchProfiles();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create profile');
    }
  }

  async function handleSubmit() {
    if (!selectedProfileId) return;
    setSubmitError(undefined);
    setSubmitting(true);
    try {
      const updated = await submitTeam(selectedProfileId, { pokemonIds: selection.selectedIds });
      setTeamState(updated);
      refetchProfiles();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to save team');
    } finally {
      setSubmitting(false);
    }
  }

  if (pokemonLoading || profilesLoading) return <p>Loading…</p>;
  if (pokemonError) return <p role="alert">Failed to load Pokémon.</p>;
  if (profilesError) return <p role="alert">Failed to load profiles.</p>;

  return (
    <div>
      <h1>Pokémon Team Builder</h1>
      <ProfilePicker
        profiles={profiles ?? []}
        selectedProfileId={selectedProfileId}
        onSelect={setSelectedProfileId}
        onCreate={handleCreate}
        createError={createError}
      />
      {selectedProfileId && (
        <>
          <TeamTray
            selectedIds={selection.selectedIds}
            pokemonById={pokemonById}
            onRemove={selection.toggle}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
          <PokemonGrid
            pokemon={pokemon ?? []}
            selectedIds={selection.selectedIds}
            isFull={selection.isFull}
            onToggle={selection.toggle}
          />
        </>
      )}
    </div>
  );
}

export default App;
