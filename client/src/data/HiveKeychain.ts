export interface HiveKeychainResponse {
  success: boolean;
  result?: {
    id: string;
    block_num: number;
    trx_num: number;
  };
  error?: string;
  message?: string;
}

export interface HiveKeychainApi {
  requestCustomJson: (
    username: string,
    id: string,
    keyType: "Active" | "Posting",
    json: string,
    displayName: string,
    callback: (response: HiveKeychainResponse) => void,
  ) => void;
  requestSignBuffer: (
    username: string,
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
