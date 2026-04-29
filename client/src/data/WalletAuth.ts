export type WalletNamespace = "hive";

export type WalletProviderId = "hive_keychain";

export interface WalletAuthResult {
  success: boolean;
  error?: string;
}

export interface SignedMessageResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface SignMessageOptions {
  title?: string;
}

export interface WalletSession<TProviderId extends WalletProviderId = WalletProviderId> {
  namespace: WalletNamespace;
  accountId: string;
  providerId: TProviderId;
  connectedAt: number;
  lastAuthenticatedAt: number;
}

export interface WalletProvider<
  TProviderId extends WalletProviderId = WalletProviderId,
  TSignOptions extends SignMessageOptions = SignMessageOptions,
> {
  id: TProviderId;
  namespace: WalletNamespace;
  label: string;
  isAvailable: () => boolean;
  login: (accountId: string) => Promise<WalletAuthResult>;
  signMessage: (
    accountId: string,
    message: string,
    options?: TSignOptions,
  ) => Promise<SignedMessageResult>;
}
