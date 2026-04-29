import { getHiveKeychain, isHiveKeychainAvailable } from "./HiveKeychain";
import type {
  SignMessageOptions,
  SignedMessageResult,
  WalletAuthResult,
  WalletProvider,
  WalletProviderId,
  WalletSession,
} from "./WalletAuth";

export type HiveAuthResult = WalletAuthResult;
export type HiveSignedMessageResult = SignedMessageResult;
export type HiveWalletProviderId = Extract<WalletProviderId, "hive_keychain">;
export type HiveWalletSession = WalletSession<HiveWalletProviderId> & {
  namespace: "hive";
  accountId: string;
  username: string;
};

export interface HiveSignMessageOptions extends SignMessageOptions {
  keyType?: "Active" | "Posting" | "Memo";
}

export type HiveWalletProvider = WalletProvider<
  HiveWalletProviderId,
  HiveSignMessageOptions
>;

const KEYCHAIN_TIMEOUT_MS = 60_000;
const DEFAULT_HIVE_WALLET_PROVIDER_ID: HiveWalletProviderId = "hive_keychain";

let activeHiveSession: HiveWalletSession | null = null;

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

    const message = `ragnarok-login:${username}:${Date.now()}`;
    const keychainPromise = new Promise<HiveAuthResult>((resolve) => {
      keychain.requestSignBuffer(
        username,
        message,
        "Posting",
        (response) => {
          if (response.success) {
            setActiveHiveSession(username, "hive_keychain");
            resolve({ success: true });
            return;
          }

          resolve({
            success: false,
            error: response.error || response.message,
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
          if (response.success && response.result) {
            resolve({ success: true, signature: response.result.id });
            return;
          }

          resolve({
            success: false,
            error: response.error || response.message,
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
  return getHiveWalletProvider(providerId).login(username);
}

export async function signHiveMessage(
  message: string,
  options?: HiveSignMessageOptions & {
    username?: string;
    providerId?: HiveWalletProviderId;
  },
): Promise<HiveSignedMessageResult> {
  const username = options?.username ?? activeHiveSession?.username;
  if (!username) {
    return { success: false, error: "No username set" };
  }

  const providerId = options?.providerId ?? activeHiveSession?.providerId;
  if (!providerId) {
    return { success: false, error: "No Hive wallet provider selected" };
  }

  return getHiveWalletProvider(providerId).signMessage(
    username,
    message,
    options,
  );
}

export function setActiveHiveSession(
  username: string,
  providerId: HiveWalletProviderId = DEFAULT_HIVE_WALLET_PROVIDER_ID,
): HiveWalletSession {
  const now = Date.now();
  const connectedAt =
    activeHiveSession?.username === username &&
    activeHiveSession.providerId === providerId
      ? activeHiveSession.connectedAt
      : now;

  activeHiveSession = {
    namespace: "hive",
    accountId: username,
    username,
    providerId,
    connectedAt,
    lastAuthenticatedAt: now,
  };

  return activeHiveSession;
}

export function getActiveHiveSession(): HiveWalletSession | null {
  return activeHiveSession;
}

export function getActiveHiveUsername(): string | null {
  return activeHiveSession?.username ?? null;
}

export function clearActiveHiveSession(): void {
  activeHiveSession = null;
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
