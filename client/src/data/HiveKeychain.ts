export type HiveKeychainResultObject = {
  id?: string;
  block_num?: number;
  trx_num?: number;
  signature?: string;
};

export type HiveKeychainResult = string | HiveKeychainResultObject;

export interface HiveKeychainResponse {
  success: boolean;
  result?: HiveKeychainResult | null;
  error?: unknown;
  message?: unknown;
}

export interface HiveKeychainApi {
  requestSignTx?: (
    username: string,
    transaction: Record<string, unknown>,
    keyType: "Active" | "Posting",
    callback: (response: HiveKeychainResponse) => void,
  ) => void;
  requestBroadcast?: (
    username: string,
    operations: Array<[string, Record<string, unknown>]>,
    keyType: "Active" | "Posting",
    callback: (response: HiveKeychainResponse) => void,
  ) => void;
  requestCustomJson: (
    username: string | null,
    id: string,
    keyType: "Active" | "Posting",
    json: string,
    displayName: string,
    callback: (response: HiveKeychainResponse) => void,
  ) => void;
  requestSignBuffer: (
    username: string | null,
    message: string,
    keyType: "Active" | "Posting" | "Memo",
    callback: (response: HiveKeychainResponse) => void,
    rpc?: string,
    title?: string,
  ) => void;
}

declare global {
  interface Window {
    hive_keychain?: HiveKeychainApi;
  }
}

export function getHiveKeychain(): HiveKeychainApi | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.hive_keychain ?? null;
}

export function isHiveKeychainAvailable(): boolean {
  return getHiveKeychain() !== null;
}

export function getHiveKeychainResultObject(
  response: HiveKeychainResponse,
): HiveKeychainResultObject | null {
  return typeof response.result === "object" && response.result !== null
    ? response.result
    : null;
}

export function getHiveKeychainResultId(response: HiveKeychainResponse): string | undefined {
  return getHiveKeychainResultObject(response)?.id;
}

export function getHiveKeychainBlockNum(response: HiveKeychainResponse): number | undefined {
  return getHiveKeychainResultObject(response)?.block_num;
}

export function getHiveKeychainSignature(response: HiveKeychainResponse): string | null {
  if (typeof response.result === "string" && response.result.length > 0) {
    return response.result;
  }

  const result = getHiveKeychainResultObject(response);
  return result?.signature ?? result?.id ?? null;
}

function stringifyHiveKeychainMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }

  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { readonly message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  // Keychain can surface Node assertion objects when the selected authority
  // is unavailable or locked. Never expose the implementation details (or
  // arbitrary structured data) in product-facing errors.
  if (isHiveKeychainAssertion(value)) {
    return "Hive Keychain could not complete the signature. Unlock the correct Posting key for this account and try again.";
  }

  if (value === null || value === undefined) {
    return null;
  }

  // Unknown objects are deliberately treated as absent. Serializing an
  // untrusted provider response can leak internal fields and produces the
  // unusable raw JSON shown by the matchmaking panel.
  return null;
}

function isHiveKeychainAssertion(value: unknown): boolean {
	if (!value || typeof value !== "object" || !("code" in value)) return false;
	return (value as { readonly code?: unknown }).code === "ERR_ASSERTION";
}

export function getHiveKeychainError(
  response: HiveKeychainResponse,
  fallback: string,
): string {
  return stringifyHiveKeychainMessage(response.error)
    ?? stringifyHiveKeychainMessage(response.message)
    ?? fallback;
}
