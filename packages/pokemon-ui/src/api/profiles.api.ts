import type {
  CreateProfileRequest,
  ProfileDto,
  ProfileWithTeamDto,
  SetTeamRequest,
} from '@pokemon/contracts';
import { apiClient } from './client';

export function listProfiles(): Promise<ProfileDto[]> {
  return apiClient.get('/profiles');
}

export function createProfile(body: CreateProfileRequest): Promise<ProfileDto> {
  return apiClient.post('/profiles', body);
}

export function getProfile(id: string): Promise<ProfileWithTeamDto> {
  return apiClient.get(`/profiles/${id}`);
}

export function setTeam(id: string, body: SetTeamRequest): Promise<ProfileWithTeamDto> {
  return apiClient.put(`/profiles/${id}/team`, body);
}
