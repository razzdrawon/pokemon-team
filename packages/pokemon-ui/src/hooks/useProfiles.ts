import { listProfiles } from '../api/profiles.api';
import { useAsync } from './useAsync';

export function useProfiles() {
  return useAsync(listProfiles, []);
}
