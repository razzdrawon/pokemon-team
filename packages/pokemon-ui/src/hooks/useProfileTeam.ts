import { getProfile } from '../api/profiles.api';
import { useAsync } from './useAsync';

// null id means "no profile picked yet" — skip the fetch rather than call getProfile(null).
export function useProfileTeam(profileId: string | null) {
  return useAsync(
    () => (profileId ? getProfile(profileId) : Promise.resolve(null)),
    [profileId]
  );
}
