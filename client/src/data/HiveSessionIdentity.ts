import {
  getAuthenticatedHiveUsername as getActiveAuthenticatedHiveUsername,
  getActiveHiveUsername,
  subscribeActiveHiveSession,
} from "./HiveAuth";
import { useHiveDataStore } from "./HiveDataLayer";

function normalizeHiveUsername(username: string | null | undefined): string | null {
  const normalized = username?.trim().toLowerCase().replace(/^@/, "") ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function getStoredHiveUsername(): string | null {
  return normalizeHiveUsername(useHiveDataStore.getState().user?.hiveUsername);
}

export function getCurrentHiveUsername(): string | null {
  return normalizeHiveUsername(getActiveHiveUsername()) ?? getStoredHiveUsername();
}

export function hasCurrentHiveUser(): boolean {
  return getCurrentHiveUsername() !== null;
}

export function getAuthenticatedHiveUsername(): string | null {
  const storedUsername = getStoredHiveUsername();
  const authenticatedUsername = normalizeHiveUsername(getActiveAuthenticatedHiveUsername());
  if (!authenticatedUsername) return null;
  if (storedUsername && storedUsername !== authenticatedUsername) return null;
  return authenticatedUsername;
}

export function hasAuthenticatedHiveUser(): boolean {
  return getAuthenticatedHiveUsername() !== null;
}

export function subscribeHiveSessionIdentity(listener: () => void): () => void {
  return subscribeActiveHiveSession(listener);
}

export function ensureActiveHiveSessionForCurrentUser(): string | null {
  const activeUsername = normalizeHiveUsername(getActiveHiveUsername());
  if (activeUsername) return activeUsername;

  return getStoredHiveUsername();
}
