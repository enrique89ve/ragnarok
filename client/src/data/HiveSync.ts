/**
 * HiveSync - Hive Keychain integration
 *
 * Handles broadcasting via Hive Keychain for core transaction types:
 * rp_team_submit, rp_match_result, rp_card_transfer, rp_pack_open, rp_level_up
 *
 * Also provides login (requestSignBuffer) and signResultHash (dual-sig).
 */

import {
  HiveMatchResult,
  RagnarokTransactionType,
  RAGNAROK_CUSTOM_JSON_PREFIX,
  RAGNAROK_APP_ID,
} from './schemas/HiveTypes';
import {
  sanitizePayload, validatePayloadSize, buildTransferMemo,
} from '../../../shared/protocol-core/broadcast-utils';
import { NFTLOX_PROTOCOL_ID, NFTLOX_PROTOCOL_VERSION, NFTLOX_COLLECTION_SYMBOL } from './blockchain/hiveConfig';

export interface HiveBroadcastResult {
  success: boolean;
  trxId?: string;
  blockNum?: number;
  error?: string;
}

export interface HiveSignatureResult {
  success: boolean;
  signature?: string;
  error?: string;
}

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

declare global {
  interface Window {
    hive_keychain?: {
      requestCustomJson: (
        username: string,
        id: string,
        keyType: 'Active' | 'Posting',
        json: string,
        displayName: string,
        callback: (response: HiveKeychainResponse) => void
      ) => void;
      requestSignBuffer: (
        username: string,
        message: string,
        keyType: 'Active' | 'Posting' | 'Memo',
        callback: (response: HiveKeychainResponse) => void,
        rpc?: string,
        title?: string
      ) => void;
    };
  }
}

const KEYCHAIN_TIMEOUT_MS = 60_000;

export class HiveSync {
  private username: string | null = null;

  isKeychainAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.hive_keychain;
  }

  setUsername(username: string) {
    this.username = username;
  }

  getUsername(): string | null {
    return this.username;
  }

  async broadcastCustomJson(
    type: RagnarokTransactionType,
    payload: Record<string, unknown>,
    useActiveKey: boolean = false
  ): Promise<HiveBroadcastResult> {
    if (!this.username) {
      return { success: false, error: 'No username set' };
    }

    if (!this.isKeychainAvailable()) {
      return { success: false, error: 'Hive Keychain not available' };
    }

    const action = type.replace(RAGNAROK_CUSTOM_JSON_PREFIX, '');

    // Sanitize string fields before broadcast (defense-in-depth)
    const cleanPayload = sanitizePayload(payload);

    const fullPayload = {
      ...cleanPayload,
      app: RAGNAROK_APP_ID,
      action,
    };

    // Validate payload fits within Hive's 8KB custom_json limit
    const sizeCheck = validatePayloadSize(fullPayload);
    if (!sizeCheck.valid) {
      return {
        success: false,
        error: `Payload too large: ${sizeCheck.bytes} bytes (max ${sizeCheck.maxBytes}). Split into smaller batches.`,
      };
    }

    const jsonStr = JSON.stringify(fullPayload);

    const keychainPromise = new Promise<HiveBroadcastResult>((resolve) => {
      window.hive_keychain!.requestCustomJson(
        this.username!,
        RAGNAROK_APP_ID,
        useActiveKey ? 'Active' : 'Posting',
        jsonStr,
        `Ragnarok: ${action.replace(/_/g, ' ')}`,
        (response) => {
          resolve({
            success: response.success,
            trxId: response.result?.id,
            blockNum: response.result?.block_num,
            error: response.error || response.message,
          });
        }
      );
    });

    const timeout = new Promise<HiveBroadcastResult>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Keychain timeout (60s)' }), KEYCHAIN_TIMEOUT_MS)
    );

    return Promise.race([keychainPromise, timeout]);
  }

  async submitTeam(matchId: string, heroIds: string[], kingId: string, deckHash: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_team_submit', {
      match_id: matchId,
      hero_ids: heroIds,
      king_id: kingId,
      deck_hash: deckHash,
    });
  }

  async recordMatchResult(match: Omit<HiveMatchResult, 'trxId' | 'blockNum'>): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_match_result', match as unknown as Record<string, unknown>);
  }

  async transferCard(cardUid: string, toUser: string, memo?: string, cardId?: number, edition?: string): Promise<HiveBroadcastResult> {
    const structuredMemo = memo || buildTransferMemo({
      action: 'transfer',
      uid: cardUid,
      cardId,
      edition,
    });
    return this.broadcastCustomJson('rp_card_transfer', {
      card_uid: cardUid,
      to: toUser,
      memo: structuredMemo,
    }, true);
  }

  async transferCards(cardUids: string[], toUser: string, memo?: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_card_transfer', {
      cards: cardUids.map(uid => ({ card_uid: uid })),
      to: toUser,
      memo,
    }, true);
  }

  async openPack(packType: string, quantity: number = 1): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_pack_open', {
      pack_type: packType,
      quantity,
    });
  }

  // ── v1.1: Pack NFT operations ──

  async mintPack(packType: string, quantity: number, toUser: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_pack_mint', {
      pack_type: packType,
      quantity,
      to: toUser,
    }, true);
  }

  async distributePacks(packUids: string[], toUser: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_pack_distribute', {
      pack_uids: packUids,
      to: toUser,
    }, true);
  }

  async transferPack(packUid: string, toUser: string, memo?: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_pack_transfer', {
      pack_uid: packUid,
      to: toUser,
      memo,
    }, true);
  }

  async burnPack(packUid: string, salt: string, saltCommit?: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_pack_burn', {
      pack_uid: packUid,
      salt,
      salt_commit: saltCommit,
    }, true);
  }

  // ── v1.1: DNA Lineage operations ──

  async replicateCard(sourceUid: string, foil?: 'standard' | 'gold'): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_card_replicate', {
      source_uid: sourceUid,
      foil,
    }, true);
  }

  async mergeCards(sourceUids: [string, string]): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_card_merge', {
      source_uids: sourceUids,
    }, true);
  }

  // ── v1.2: DUAT Airdrop ──

  async claimDuatAirdrop(duatBalance: number, packsEarned: number): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('ragnarok-cards', {
      p: 'ragnarok-cards',
      action: 'duat_airdrop_claim',
      duat_balance: duatBalance,
      packs_earned: packsEarned,
    });
  }

  // ── v1.2: Marketplace operations (NFTLox-inspired) ──

  async marketList(nftUid: string, nftType: 'card' | 'pack', price: number, currency: 'HIVE' | 'HBD' = 'HIVE'): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('ragnarok-cards', {
      p: 'ragnarok-cards',
      action: 'market_list',
      nft_uid: nftUid,
      nft_type: nftType,
      price,
      currency,
    });
  }

  async marketUnlist(listingId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('ragnarok-cards', {
      p: 'ragnarok-cards',
      action: 'market_unlist',
      listing_id: listingId,
    });
  }

  async marketBuy(listingId: string, paymentTrxId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('ragnarok-cards', {
      p: 'ragnarok-cards',
      action: 'market_buy',
      listing_id: listingId,
      payment_trx_id: paymentTrxId,
    }, true);
  }

  async marketOffer(nftUid: string, price: number, currency: 'HIVE' | 'HBD' = 'HIVE'): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('ragnarok-cards', {
      p: 'ragnarok-cards',
      action: 'market_offer',
      nft_uid: nftUid,
      price,
      currency,
    });
  }

  async marketAcceptOffer(offerId: string, paymentTrxId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('ragnarok-cards', {
      p: 'ragnarok-cards',
      action: 'market_accept',
      offer_id: offerId,
      payment_trx_id: paymentTrxId,
    }, true);
  }

  async marketRejectOffer(offerId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('ragnarok-cards', {
      p: 'ragnarok-cards',
      action: 'market_reject',
      offer_id: offerId,
    });
  }

  // ══════════════════════════════════════════════
  // NFTLox Operations — NFT birth layer
  // ══════════════════════════════════════════════

  async broadcastNFTLoxJson(
    action: string,
    data: Record<string, unknown>,
    useActiveKey: boolean = false
  ): Promise<HiveBroadcastResult> {
    if (!this.username) return { success: false, error: 'No username set' };
    if (!this.isKeychainAvailable()) return { success: false, error: 'Hive Keychain not available' };

    const payload = {
      protocol: NFTLOX_PROTOCOL_ID,
      version: NFTLOX_PROTOCOL_VERSION,
      action,
      data: sanitizePayload(data),
    };

    const sizeCheck = validatePayloadSize(payload);
    if (!sizeCheck.valid) {
      return { success: false, error: `Payload too large: ${sizeCheck.bytes} bytes (max ${sizeCheck.maxBytes})` };
    }

    const jsonStr = JSON.stringify(payload);
    const keychainPromise = new Promise<HiveBroadcastResult>((resolve) => {
      window.hive_keychain!.requestCustomJson(
        this.username!,
        NFTLOX_PROTOCOL_ID,
        useActiveKey ? 'Active' : 'Posting',
        jsonStr,
        `NFTLox: ${action.replace(/_/g, ' ')}`,
        (response) => {
          resolve({
            success: response.success,
            trxId: response.result?.id,
            blockNum: response.result?.block_num,
            error: response.error || response.message,
          });
        }
      );
    });

    const timeout = new Promise<HiveBroadcastResult>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Keychain timeout (60s)' }), 60_000)
    );
    return Promise.race([keychainPromise, timeout]);
  }

  async nftloxCreateCollection(collectionName: string, totalPotential: number, schema: Record<string, unknown>): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('create_collection', {
      name: collectionName,
      symbol: NFTLOX_COLLECTION_SYMBOL,
      creator: this.username,
      totalPotential,
      metadata: {
        description: 'Norse Mythos Card Game — collectible cards across 5 mythological factions',
        image: 'https://dhenz14.github.io/norse-mythos-card-game/icons/icon-512.webp',
        externalUrl: 'https://dhenz14.github.io/norse-mythos-card-game',
      },
      rules: { transferable: true, burnable: true, replicable: false, royaltyPct: 0, royaltyRecipient: this.username },
      schema,
    });
  }

  async nftloxMintSeed(collectionId: string, seed: {
    artId: string; name: string; description: string; imageUrl: string;
    maxSupply: number; immutableData: Record<string, unknown>;
  }): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('mint', {
      collectionId,
      edition: 1,
      owner: this.username,
      metadata: { name: seed.name, description: seed.description, imageUrl: seed.imageUrl },
      maxSupply: seed.maxSupply,
      immutableData: seed.immutableData,
    });
  }

  async nftloxCreatePack(collectionId: string, pack: {
    name: string; description: string; imageUrl: string;
    dropTable: Array<{ seedId: string; weight: number }>;
    itemsPerPack: number; maxSupply: number;
  }): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('pack_create', {
      collectionId,
      name: pack.name,
      description: pack.description,
      imageUrl: pack.imageUrl,
      dropTable: pack.dropTable,
      itemsPerPack: pack.itemsPerPack,
      maxSupply: pack.maxSupply,
    });
  }

  async nftloxOpenPack(packId: string, quantity: number = 1): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('pack_open', { packId, quantity });
  }

  async nftloxBulkDistribute(
    items: Array<{ seedId: string; quantity: number; originBlock?: number }>,
    to?: string,
    imageOverrides?: Record<string, string>
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('bulk_distribute', {
      to: to || this.username,
      items,
      ...(imageOverrides ? { imageOverrides } : {}),
    });
  }

  async nftloxSetOwnerData(nftId: string, ownerData: Record<string, unknown>): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('set_owner_data', { nftId, ownerData });
  }

  async nftloxExtendSchema(collectionId: string, newFields: Record<string, { type: string; mutable?: boolean }>): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('extend_schema', { collectionId, newFields });
  }

  async nftloxLendCard(nftId: string, borrower: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('nft_lend', { nftId, to: borrower });
  }

  async nftloxReturnCard(nftId: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('nft_return', { nftId });
  }

  async nftloxListCard(nftId: string, price: string, currency: string = 'HIVE', expiresInBlocks?: number): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('list', { nftId, price, currency, ...(expiresInBlocks ? { expiresInBlocks } : {}) }, true);
  }

  async nftloxUnlistCard(nftId: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('unlist', { nftId });
  }

  async nftloxTransferCard(nftId: string, to: string, memo?: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('transfer', { nftId, to, ...(memo ? { memo } : {}) }, true);
  }

  async nftloxBurnCard(nftId: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('burn', { nftId }, true);
  }

  async nftloxReplicate(seedId: string, to?: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('replicate', { seedId, to: to || this.username });
  }

  async nftloxDataOperatorApprove(collectionId: string, operator: string, approved: boolean): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('data_operator_approve', { collectionId, operator, approved }, true);
  }

  async nftloxBuyCard(listingId: string, nftId: string, seller: string, amount: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson('buy', { listingId, nftId, seller, amount }, true); // buy requires active key
  }

  /**
   * Verify account ownership via Keychain requestSignBuffer.
   * Signs a timestamped message with the user's Posting key — no transaction posted.
   */
  async login(username: string): Promise<HiveBroadcastResult> {
    if (!this.isKeychainAvailable()) {
      return { success: false, error: 'Hive Keychain extension not installed' };
    }

    const message = `ragnarok-login:${username}:${Date.now()}`;

    const keychainPromise = new Promise<HiveBroadcastResult>((resolve) => {
      window.hive_keychain!.requestSignBuffer(
        username,
        message,
        'Posting',
        (response) => {
          if (response.success) {
            this.username = username;
            resolve({ success: true });
          } else {
            resolve({ success: false, error: response.error || response.message });
          }
        },
        undefined,
        'Log in to Ragnarok Cards'
      );
    });

    const timeout = new Promise<HiveBroadcastResult>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Keychain timeout (60s)' }), KEYCHAIN_TIMEOUT_MS)
    );

    return Promise.race([keychainPromise, timeout]);
  }

  async stampLevelUp(cardUid: string, cardId: number, newLevel: number): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_level_up', {
      nft_id: cardUid,
      card_id: cardId,
      new_level: newLevel,
    });
  }

  async claimReward(rewardId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson('rp_reward_claim', {
      reward_id: rewardId,
    });
  }

  async signMessage(
    message: string,
    options?: { username?: string; keyType?: 'Active' | 'Posting' | 'Memo'; title?: string }
  ): Promise<HiveSignatureResult> {
    const user = options?.username ?? this.username;
    if (!user) {
      return { success: false, error: 'No username set' };
    }
    if (!this.isKeychainAvailable()) {
      return { success: false, error: 'Hive Keychain not available' };
    }

    const keyType = options?.keyType ?? 'Posting';
    const title = options?.title ?? 'Sign message';

    const keychainPromise = new Promise<HiveSignatureResult>((resolve) => {
      window.hive_keychain!.requestSignBuffer(
        user,
        message,
        keyType,
        (response) => {
          if (response.success && response.result) {
            resolve({ success: true, signature: response.result.id });
          } else {
            resolve({ success: false, error: response.error || response.message });
          }
        },
        undefined,
        title
      );
    });

    const timeout = new Promise<HiveSignatureResult>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Keychain timeout (60s)' }), KEYCHAIN_TIMEOUT_MS)
    );

    return Promise.race([keychainPromise, timeout]);
  }

  async signResultHash(hash: string): Promise<string> {
    if (!this.username) {
      throw new Error('No username set');
    }
    if (!this.isKeychainAvailable()) {
      throw new Error('Hive Keychain not available');
    }

    const keychainPromise = new Promise<string>((resolve, reject) => {
      window.hive_keychain!.requestSignBuffer(
        this.username!,
        hash,
        'Posting',
        (response) => {
          if (response.success && response.result) {
            resolve(String(response.result));
          } else {
            reject(new Error(response.error || response.message || 'Signing failed'));
          }
        },
        undefined,
        'Sign match result'
      );
    });

    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Keychain signing timeout (60s)')), KEYCHAIN_TIMEOUT_MS)
    );

    return Promise.race([keychainPromise, timeout]);
  }
}

export const hiveSync = new HiveSync();

export async function buildHiveAuthBody(
	username: string,
	action: string,
	bodyFields: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
	const timestamp = Date.now();
	const message = `ragnarok-${action}:${username}:${timestamp}`;
	const result = await hiveSync.signMessage(message, {
		title: `Ragnarok: ${action.replace(/-/g, ' ')}`,
	});
	return {
		...bodyFields,
		username,
		timestamp,
		signature: result.success ? result.signature : undefined,
	};
}
