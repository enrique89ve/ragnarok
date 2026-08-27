import {
  getHiveKeychain,
  getHiveKeychainError,
  getHiveKeychainSignature,
  isHiveKeychainAvailable,
} from "./HiveKeychain";
import { establishHiveWebSession } from "./hiveWebSession";
import type {
  SignMessageOptions,
  SignedMessageResult,
  WalletAuthResult,
  WalletProvider,
  WalletProviderId,
  WalletSession,
} from "./WalletAuth";

export type HiveLoginProof = {
  username: string;
  message: string;
  timestamp: number;
  signature: string;
};

export type HiveAuthResult = WalletAuthResult & {
  authProof?: HiveLoginProof;
};
export type HiveSignedMessageResult = SignedMessageResult;
export type HiveWalletProviderId = Extract<WalletProviderId, "hive_keychain">;
export type HiveSessionAuthentication = "keychain_signature" | "stored_identity";
export type HiveWalletSession = WalletSession<HiveWalletProviderId> & {
  namespace: "hive";
  accountId: string;
  username: string;
  authentication: HiveSessionAuthentication;
};

export interface HiveSignMessageOptions extends SignMessageOptions {
  keyType?: "Active" | "Posting" | "Memo";
}

export type HiveWalletProvider = Omit<
  WalletProvider<HiveWalletProviderId, HiveSignMessageOptions>,
  "login"
> & {
  login: (accountId: string) => Promise<HiveAuthResult>;
};

const KEYCHAIN_TIMEOUT_MS = 60_000;
const DEFAULT_HIVE_WALLET_PROVIDER_ID: HiveWalletProviderId = "hive_keychain";

let activeHiveSession: HiveWalletSession | null = null;
const activeHiveSessionListeners = new Set<() => void>();

function normalizeHiveUsername(username: string | null | undefined): string | null {
  const normalized = username?.trim().toLowerCase().replace(/^@/, "") ?? "";
  return normalized.length > 0 ? normalized : null;
}

function notifyActiveHiveSessionListeners(): void {
  for (const listener of activeHiveSessionListeners) listener();
}

function withTimeout<T>(promise: Promise<T>, fallback: () => T): Promise<T> {
  const timeout = new Promise<T>((resolve) =>
    setTimeout(() => resolve(fallback()), KEYCHAIN_TIMEOUT_MS),
  );

  return Promise.race([promise, timeout]);
}

const hiveKeychainProvider: HiveWalletProvider = {
  id: "hive_keychain",
  namespace: "hive",
  label: "Hive Keychain",
  isAvailable: isHiveKeychainAvailable,
  async login(username: string): Promise<HiveAuthResult> {
    if (!isHiveKeychainAvailable()) {
      return {
        success: false,
        error: "Hive Keychain extension not installed",
      };
    }

    const keychain = getHiveKeychain();
    if (!keychain) {
      return {
        success: false,
        error: "Hive Keychain extension not installed",
      };
    }

    const timestamp = Date.now();
    const message = `ragnarok-login:${username}:${timestamp}`;
    const keychainPromise = new Promise<HiveAuthResult>((resolve) => {
      keychain.requestSignBuffer(
        username,
        message,
        "Posting",
        (response) => {
          const signature = getHiveKeychainSignature(response);
          if (response.success && signature) {
            setActiveHiveSession(username, "hive_keychain", "keychain_signature");
            resolve({
              success: true,
              authProof: { username, message, timestamp, signature },
            });
            return;
          }

          resolve({
            success: false,
            error: getHiveKeychainError(
              response,
              response.success ? "Hive Keychain returned no signature" : "Hive Keychain login rejected",
            ),
          });
        },
        undefined,
        "Log in to Ragnarok Cards",
      );
    });

    return withTimeout(keychainPromise, () => ({
      success: false,
      error: "Keychain timeout (60s)",
    }));
  },
  async signMessage(
    username: string,
    message: string,
    options?: HiveSignMessageOptions,
  ): Promise<HiveSignedMessageResult> {
    if (!isHiveKeychainAvailable()) {
      return { success: false, error: "Hive Keychain not available" };
    }

    const keychain = getHiveKeychain();
    if (!keychain) {
      return { success: false, error: "Hive Keychain not available" };
    }

    const keyType = options?.keyType ?? "Posting";
    const title = options?.title ?? "Sign message";
    const keychainPromise = new Promise<HiveSignedMessageResult>((resolve) => {
      keychain.requestSignBuffer(
        username,
        message,
        keyType,
        (response) => {
          const signature = getHiveKeychainSignature(response);
          if (response.success && signature) {
            resolve({ success: true, signature });
            return;
          }

          resolve({
            success: false,
            error: getHiveKeychainError(
              response,
              response.success
                ? "Hive Keychain returned no signature"
                : "Hive Keychain signing rejected",
            ),
          });
        },
        undefined,
        title,
      );
    });

    return withTimeout(keychainPromise, () => ({
      success: false,
      error: "Keychain timeout (60s)",
    }));
  },
};

const HIVE_WALLET_PROVIDERS: Record<HiveWalletProviderId, HiveWalletProvider> = {
  hive_keychain: hiveKeychainProvider,
};

export function getDefaultHiveWalletProviderId(): HiveWalletProviderId {
  return DEFAULT_HIVE_WALLET_PROVIDER_ID;
}

export function getHiveWalletProvider(
  providerId: HiveWalletProviderId = DEFAULT_HIVE_WALLET_PROVIDER_ID,
): HiveWalletProvider {
  return HIVE_WALLET_PROVIDERS[providerId];
}

export function isHiveWalletAvailable(
  providerId: HiveWalletProviderId = DEFAULT_HIVE_WALLET_PROVIDER_ID,
): boolean {
  return getHiveWalletProvider(providerId).isAvailable();
}

export async function loginWithHiveWallet(
  username: string,
  providerId: HiveWalletProviderId = DEFAULT_HIVE_WALLET_PROVIDER_ID,
): Promise<HiveAuthResult> {
  const normalizedUsername = normalizeHiveUsername(username);
  if (!normalizedUsername) return { success: false, error: "Hive username required" };

  const result = await getHiveWalletProvider(providerId).login(normalizedUsername);
  if (!result.success || !result.authProof) return result;

  if (!await establishHiveWebSession(result.authProof)) {
    clearActiveHiveSession();
    return {
      success: false,
      error: "Could not establish the secure web session. Try again.",
    };
  }
  return result;
}

export async function signHiveMessage(
  message: string,
  options?: HiveSignMessageOptions & {
    username?: string;
    providerId?: HiveWalletProviderId;
  },
): Promise<HiveSignedMessageResult> {
  const username = normalizeHiveUsername(options?.username ?? activeHiveSession?.username);
  if (!username) {
    return { success: false, error: "No username set" };
  }

  const providerId = options?.providerId ?? activeHiveSession?.providerId ?? DEFAULT_HIVE_WALLET_PROVIDER_ID;
  if (!providerId) {
    return { success: false, error: "No Hive wallet provider selected" };
  }

  const result = await getHiveWalletProvider(providerId).signMessage(
    username,
    message,
    options,
  );
  if (result.success && result.signature) {
    setActiveHiveSession(username, providerId, "keychain_signature");
  }
  return result;
}

export function setActiveHiveSession(
  username: string,
  providerId: HiveWalletProviderId = DEFAULT_HIVE_WALLET_PROVIDER_ID,
  authentication: HiveSessionAuthentication = "keychain_signature",
): HiveWalletSession {
  const normalizedUsername = normalizeHiveUsername(username);
  if (!normalizedUsername) {
    throw new Error("Hive session requires a non-empty username");
  }

  const now = Date.now();
  const connectedAt =
    activeHiveSession?.username === normalizedUsername &&
    activeHiveSession.providerId === providerId
      ? activeHiveSession.connectedAt
      : now;

  activeHiveSession = {
    namespace: "hive",
    accountId: normalizedUsername,
    username: normalizedUsername,
    providerId,
    connectedAt,
    lastAuthenticatedAt: now,
    authentication,
  };
  notifyActiveHiveSessionListeners();

  return activeHiveSession;
}

export function getActiveHiveSession(): HiveWalletSession | null {
  return activeHiveSession;
}

export function getActiveHiveUsername(): string | null {
  return activeHiveSession?.username ?? null;
}

export function getAuthenticatedHiveUsername(): string | null {
  if (activeHiveSession?.authentication !== "keychain_signature") return null;
  return normalizeHiveUsername(activeHiveSession.username);
}

export function hasAuthenticatedHiveSessionFor(username: string | null | undefined): boolean {
  const normalizedUsername = normalizeHiveUsername(username);
  const authenticatedUsername = getAuthenticatedHiveUsername();
  return normalizedUsername !== null && normalizedUsername === authenticatedUsername;
}

export function clearActiveHiveSession(): void {
  activeHiveSession = null;
  notifyActiveHiveSessionListeners();
}

export function subscribeActiveHiveSession(listener: () => void): () => void {
  activeHiveSessionListeners.add(listener);
  return () => {
    activeHiveSessionListeners.delete(listener);
  };
}

export async function buildHiveAuthBody(
  username: string,
  action: string,
  bodyFields: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const timestamp = Date.now();
  const message = `ragnarok-${action}:${username}:${timestamp}`;
  const result = await signHiveMessage(message, {
    username,
    title: `Ragnarok: ${action.replace(/-/g, " ")}`,
  });

  return {
    ...bodyFields,
    username,
    timestamp,
    signature: result.success ? result.signature : undefined,
  };
}
