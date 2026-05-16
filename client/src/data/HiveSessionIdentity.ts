import {
  getActiveHiveUsername,
  getDefaultHiveWalletProviderId,
  setActiveHiveSession,
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

export function ensureActiveHiveSessionForCurrentUser(): string | null {
  const activeUsername = normalizeHiveUsername(getActiveHiveUsername());
  if (activeUsername) return activeUsername;

  const storedUsername = getStoredHiveUsername();
  if (!storedUsername) return null;

  setActiveHiveSession(storedUsername, getDefaultHiveWalletProviderId());
  return storedUsername;
}
