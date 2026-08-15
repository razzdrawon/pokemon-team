import type { ApiErrorBody, ApiErrorCode } from '@pokemon/contracts';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: string[]
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Network request failed'); // no ApiErrorCode fits offline/DNS/etc.
  }

  if (!res.ok) {
    const body: Partial<ApiErrorBody> = await res.json().catch(() => ({}));
    throw new ApiError(
      body.code ?? 'INTERNAL_ERROR',
      body.message ?? `Request failed: ${res.status}`,
      body.details
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};
