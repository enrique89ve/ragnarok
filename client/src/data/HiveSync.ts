/**
 * HiveSync - Hive transaction broadcaster
 *
 * Handles broadcasting via Hive Keychain for core transaction types:
 * rp_team_submit, rp_match_result, rp_card_transfer, sealed pack ops, rp_level_up
 *
 * Authentication/session ownership now lives in HiveAuth.
 */

import {
  HiveMatchResult,
  RagnarokTransactionType,
  RAGNAROK_APP_ID,
} from "./schemas/HiveTypes";
import {
  setActiveHiveSession,
  signHiveMessage,
} from "./HiveAuth";
import {
  getHiveKeychain,
  getHiveKeychainBlockNum,
  getHiveKeychainError,
  getHiveKeychainResultId,
  isHiveKeychainAvailable,
  type HiveKeychainApi,
} from "./HiveKeychain";
import {
  ensureActiveHiveSessionForCurrentUser,
  getCurrentHiveUsername,
} from "./HiveSessionIdentity";
import { RAGNAROK_LEGACY_PREFIX } from "@shared/indexer-types";
import { checkProtocolActionCapability, checkRuntimeCapability } from "@shared/protocol-core/phaseGate";
import {
  sanitizePayload,
  validatePayloadSize,
  buildTransferMemo,
} from "../../../shared/protocol-core/broadcast-utils";
import {
  buildHbdPackPurchaseMemo,
  ACTIVE_AUTH_OPS,
  isCanonicalAction,
  type CanonicalAction,
  formatHbdTransferAmount,
} from "@shared/protocol-core";
import { buildMatchResultSignatureMessage } from "@shared/protocol-core/matchResultCommitment";
import {
  NFTLOX_PROTOCOL_VERSION,
  NFTLOX_COLLECTION_SYMBOL,
  RAGNAROK_TREASURY_ACCOUNT,
} from "./blockchain/hiveConfig";
import { getRagnarokNetworkConfig } from "../game/config/networkConfig";

export interface HiveBroadcastResult {
  success: boolean;
  trxId?: string;
  blockNum?: number;
  error?: string;
}

export interface HiveCampaignResultPayload {
  v: 1;
  cid: string;
  m: string;
  d: "normal" | "heroic" | "mythic";
  n: number;
  rid: string;
  lst: number;
  rh: string;
  tr: string;
  tc?: string;
  fh: string;
  t: number;
}

export interface HiveSignatureResult {
  success: boolean;
  signature?: string;
  error?: string;
}

const KEYCHAIN_TIMEOUT_MS = 60_000;

const LEGACY_BROADCAST_ACTIONS: Readonly<Record<string, CanonicalAction>> = {
  rp_genesis: "genesis",
  rp_seal: "seal",
  rp_mint: "mint_batch",
  rp_transfer: "card_transfer",
  rp_card_transfer: "card_transfer",
  rp_burn: "burn",
  rp_match_start: "match_anchor",
  rp_match_result: "match_result",
  rp_campaign_result: "campaign_result",
  rp_warband_request: "warband_request",
  rp_warband_accept: "warband_accept",
  rp_warband_remove: "warband_remove",
  rp_warband_block: "warband_block",
  rp_rune_exchange: "rune_exchange",
  rp_level_up: "level_up",
  rp_queue_join: "queue_join",
  rp_queue_leave: "queue_leave",
  rp_reward_claim: "reward_claim",
  rp_daily_quest_claim: "daily_quest_claim",
  rp_slash_evidence: "slash_evidence",
  rp_pack_purchase: "pack_purchase",
  rp_pack_mint: "pack_mint",
  rp_pack_distribute: "pack_distribute",
  rp_pack_transfer: "pack_transfer",
  rp_pack_burn: "pack_burn",
  rp_card_replicate: "card_replicate",
  rp_card_merge: "card_merge",
  rp_duat_airdrop_claim: "duat_airdrop_claim",
  rp_duat_airdrop_finalize: "duat_airdrop_finalize",
  rp_market_list: "market_list",
  rp_market_unlist: "market_unlist",
  rp_market_buy: "market_buy",
  rp_market_offer: "market_offer",
  rp_market_accept: "market_accept",
  rp_market_reject: "market_reject",
};

type BroadcastActionResult =
  | { success: true; action: CanonicalAction }
  | { success: false; error: string };

function resolveBroadcastAction(
  type: RagnarokTransactionType | string,
  payload: Record<string, unknown>,
): BroadcastActionResult {
  if (type.startsWith(RAGNAROK_LEGACY_PREFIX)) {
    const action = LEGACY_BROADCAST_ACTIONS[type];
    if (!action) {
      return { success: false, error: `Unsupported Ragnarok custom_json id: ${type}` };
    }
    return { success: true, action };
  }

  if (isCanonicalAction(type)) {
    return { success: true, action: type };
  }

  if (type === RAGNAROK_APP_ID) {
    const payloadAction = payload.action;
    if (!isCanonicalAction(payloadAction)) {
      return {
        success: false,
        error: typeof payloadAction === "string"
          ? `Unsupported Ragnarok action: ${payloadAction}`
          : "Ragnarok custom_json payload is missing a canonical action",
      };
    }
    return { success: true, action: payloadAction };
  }

  return { success: false, error: `Unsupported Ragnarok custom_json id: ${type}` };
}

interface HiveKeychainContext {
  username: string;
  keychain: HiveKeychainApi;
}

type HiveKeychainContextResult =
  | { success: true; context: HiveKeychainContext }
  | { success: false; result: HiveBroadcastResult };

export interface HiveOperationBroadcastRequest {
  action: string;
  operations: Array<[string, Record<string, unknown>]>;
  keyType: "Active" | "Posting";
}

export class HiveSync {
  isKeychainAvailable(): boolean {
    return isHiveKeychainAvailable();
  }

  setUsername(username: string) {
    setActiveHiveSession(username);
  }

  getUsername(): string | null {
    return getCurrentHiveUsername();
  }

  private getKeychainContext(): HiveKeychainContextResult {
    const username = ensureActiveHiveSessionForCurrentUser();
    if (!username) {
      return { success: false, result: { success: false, error: "No username set" } };
    }

    if (!this.isKeychainAvailable()) {
      return { success: false, result: { success: false, error: "Hive Keychain not available" } };
    }

    const keychain = getHiveKeychain();
    if (!keychain) {
      return { success: false, result: { success: false, error: "Hive Keychain not available" } };
    }

    return { success: true, context: { username, keychain } };
  }

  async broadcastCustomJson(
    type: RagnarokTransactionType | string,
    payload: Record<string, unknown>,
    useActiveKey: boolean = false,
  ): Promise<HiveBroadcastResult> {
    const runtime = getRagnarokNetworkConfig();
    const cleanPayload = sanitizePayload(payload);
    const actionResult = resolveBroadcastAction(type, cleanPayload);
    if (!actionResult.success) {
      return { success: false, error: actionResult.error };
    }
    const broadcastCapability = checkRuntimeCapability(runtime, 'hiveBroadcast');
    if (broadcastCapability.status === 'rejected') {
      return { success: false, error: `${broadcastCapability.code}: ${broadcastCapability.capability} (${broadcastCapability.phaseId})` };
    }
    const capability = checkProtocolActionCapability(runtime, actionResult.action);
    if (capability.status === 'rejected') {
      return { success: false, error: `${capability.code}: ${capability.capability} (${capability.phaseId})` };
    }
    const contextResult = this.getKeychainContext();
    if (!contextResult.success) return contextResult.result;
    const { keychain, username } = contextResult.context;
    const { action } = actionResult;

    if (ACTIVE_AUTH_OPS.has(action) && !useActiveKey) {
      return { success: false, error: `${action} requires Active authority` };
    }

    // Sanitize string fields before broadcast (defense-in-depth)
    const fullPayload = {
      ...cleanPayload,
      app: RAGNAROK_APP_ID,
      p: RAGNAROK_APP_ID,
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
      keychain.requestCustomJson(
        username,
        RAGNAROK_APP_ID,
        useActiveKey ? "Active" : "Posting",
        jsonStr,
        `Ragnarok: ${action.replace(/_/g, " ")}`,
        (response) => {
          resolve({
            success: response.success,
            trxId: getHiveKeychainResultId(response),
            blockNum: getHiveKeychainBlockNum(response),
            error: response.success
              ? undefined
              : getHiveKeychainError(response, "Hive Keychain custom_json rejected"),
          });
        },
      );
    });

    const timeout = new Promise<HiveBroadcastResult>((resolve) =>
      setTimeout(
        () => resolve({ success: false, error: "Keychain timeout (60s)" }),
        KEYCHAIN_TIMEOUT_MS,
      ),
    );

    return Promise.race([keychainPromise, timeout]);
  }

  async broadcastOperations({
    action,
    keyType,
    operations,
  }: HiveOperationBroadcastRequest): Promise<HiveBroadcastResult> {
    const runtime = getRagnarokNetworkConfig();
    const broadcastCapability = checkRuntimeCapability(runtime, 'hiveBroadcast');
    if (broadcastCapability.status === 'rejected') {
      return { success: false, error: `${broadcastCapability.code}: ${broadcastCapability.capability} (${broadcastCapability.phaseId})` };
    }
    if (isCanonicalAction(action)) {
      const capability = checkProtocolActionCapability(runtime, action);
      if (capability.status === 'rejected') {
        return { success: false, error: `${capability.code}: ${capability.capability} (${capability.phaseId})` };
      }
    }
    const contextResult = this.getKeychainContext();
    if (!contextResult.success) return contextResult.result;
    const { keychain, username } = contextResult.context;

    const requestBroadcast = keychain.requestBroadcast?.bind(keychain);
    if (!requestBroadcast) {
      return { success: false, error: `Hive Keychain broadcast API not available for ${action}` };
    }

    const keychainPromise = new Promise<HiveBroadcastResult>((resolve) => {
      requestBroadcast(
        username,
        operations,
        keyType,
        (response) => {
          resolve({
            success: response.success,
            trxId: getHiveKeychainResultId(response),
            blockNum: getHiveKeychainBlockNum(response),
            error: response.success
              ? undefined
              : getHiveKeychainError(response, "Hive Keychain broadcast rejected"),
          });
        },
      );
    });

    const timeout = new Promise<HiveBroadcastResult>((resolve) =>
      setTimeout(
        () => resolve({ success: false, error: "Keychain timeout (60s)" }),
        KEYCHAIN_TIMEOUT_MS,
      ),
    );

    return Promise.race([keychainPromise, timeout]);
  }

  async submitTeam(
    matchId: string,
    heroIds: string[],
    kingId: string,
    deckHash: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson("rp_team_submit", {
      match_id: matchId,
      hero_ids: heroIds,
      king_id: kingId,
      deck_hash: deckHash,
    });
  }

  async recordMatchResult(
    match: Omit<HiveMatchResult, "trxId" | "blockNum">,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(
      "rp_match_result",
      match as unknown as Record<string, unknown>,
    );
  }

  async transferCard(
    cardUid: string,
    toUser: string,
    memo?: string,
    cardId?: number,
    edition?: string,
  ): Promise<HiveBroadcastResult> {
    const structuredMemo =
      memo ||
      buildTransferMemo({
        action: "transfer",
        uid: cardUid,
        cardId,
        edition,
      });
    return this.broadcastCustomJson(
      "rp_card_transfer",
      {
        card_uid: cardUid,
        to: toUser,
        memo: structuredMemo,
      },
      true,
    );
  }

  async transferCards(
    cardUids: string[],
    toUser: string,
    memo?: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(
      "rp_card_transfer",
      {
        cards: cardUids.map((uid) => ({ card_uid: uid })),
        to: toUser,
        memo,
      },
      true,
    );
  }

  async openPack(
    _packType: string,
    _quantity: number = 1,
  ): Promise<HiveBroadcastResult> {
    return {
      success: false,
      error: "Legacy rp_pack_open is disabled after genesis seal. Use rune_exchange to create sealed packs, then pack_burn from the vault.",
    };
  }

  async runeExchange(
    packType: string,
    quantity: number = 1,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson("rp_rune_exchange", {
      pack_type: packType,
      quantity,
    });
  }

  async purchasePackHbd(
    packType: string,
    quantity: number,
    totalPriceThousandths: number,
  ): Promise<HiveBroadcastResult> {
    const runtime = getRagnarokNetworkConfig();
    const broadcastCapability = checkRuntimeCapability(runtime, 'hiveBroadcast');
    if (broadcastCapability.status === 'rejected') {
      return { success: false, error: `${broadcastCapability.code}: ${broadcastCapability.capability} (${broadcastCapability.phaseId})` };
    }
    const packCapability = checkRuntimeCapability(runtime, 'packs');
    if (packCapability.status === 'rejected') {
      return { success: false, error: `${packCapability.code}: ${packCapability.capability} (${packCapability.phaseId})` };
    }
    const username = this.getUsername();
    if (!username) return { success: false, error: "No username set" };

    const payload = {
      app: RAGNAROK_APP_ID,
      p: RAGNAROK_APP_ID,
      action: "pack_purchase",
      pack_type: packType,
      quantity,
      currency: "HBD",
    };
    const sizeCheck = validatePayloadSize(payload);
    if (!sizeCheck.valid) {
      return {
        success: false,
        error: `Payload too large: ${sizeCheck.bytes} bytes (max ${sizeCheck.maxBytes}).`,
      };
    }

    const amount = formatHbdTransferAmount(totalPriceThousandths);
    const memo = buildHbdPackPurchaseMemo({
      account: username,
      packType,
      quantity,
      totalPriceThousandths,
    });
    const operations: Array<[string, Record<string, unknown>]> = [
      ["transfer", {
        from: username,
        to: RAGNAROK_TREASURY_ACCOUNT,
        amount,
        memo,
      }],
      ["custom_json", {
        required_auths: [username],
        required_posting_auths: [],
        id: RAGNAROK_APP_ID,
        json: JSON.stringify(payload),
      }],
    ];

    return this.broadcastOperations({
      action: "pack_purchase",
      keyType: "Active",
      operations,
    });
  }

  // ── v1.1: Pack NFT operations ──

  async mintPack(
    _packType: string,
    _quantity: number,
    _toUser: string,
  ): Promise<HiveBroadcastResult> {
    return {
      success: false,
      error: "Admin pack minting must use the server-backed AdminPanel flow.",
    };
  }

  async distributePacks(
    _packUids: string[],
    _toUser: string,
  ): Promise<HiveBroadcastResult> {
    return {
      success: false,
      error: "Admin pack distribution is disabled until atomic transfer bundling is implemented.",
    };
  }

  async transferPack(
    _packUid: string,
    _toUser: string,
    _memo?: string,
  ): Promise<HiveBroadcastResult> {
    return {
      success: false,
      error: "Admin pack transfer must use an explicitly validated admin flow.",
    };
  }

  async burnPack(
    packUid: string,
    salt: string,
    saltCommit?: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(
      "rp_pack_burn",
      {
        pack_uid: packUid,
        salt,
        salt_commit: saltCommit,
      },
      true,
    );
  }

  // ── v1.1: DNA Lineage operations ──

  async replicateCard(
    sourceUid: string,
    foil?: "standard" | "gold",
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(
      "rp_card_replicate",
      {
        source_uid: sourceUid,
        foil,
      },
      true,
    );
  }

  async mergeCards(sourceUids: [string, string]): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(
      "rp_card_merge",
      {
        source_uids: sourceUids,
      },
      true,
    );
  }

  // ── v1.2: DUAT Airdrop ──

  async claimDuatAirdrop(): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(RAGNAROK_APP_ID, {
      action: "duat_airdrop_claim",
    });
  }

  // ── v1.2: Marketplace operations (NFTLox-inspired) ──

  async marketList(
    nftUid: string,
    nftType: "card" | "pack",
    price: number,
    currency: "HIVE" | "HBD" = "HIVE",
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(RAGNAROK_APP_ID, {
      action: "market_list",
      nft_uid: nftUid,
      nft_type: nftType,
      price,
      currency,
    });
  }

  async marketUnlist(listingId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(RAGNAROK_APP_ID, {
      action: "market_unlist",
      listing_id: listingId,
    });
  }

  async marketBuy(
    listingId: string,
    paymentTrxId: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(
      RAGNAROK_APP_ID,
      {
        action: "market_buy",
        listing_id: listingId,
        payment_trx_id: paymentTrxId,
      },
      true,
    );
  }

  async marketOffer(
    nftUid: string,
    price: number,
    currency: "HIVE" | "HBD" = "HIVE",
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(RAGNAROK_APP_ID, {
      action: "market_offer",
      nft_uid: nftUid,
      price,
      currency,
    });
  }

  async marketAcceptOffer(
    offerId: string,
    paymentTrxId: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(
      RAGNAROK_APP_ID,
      {
        action: "market_accept",
        offer_id: offerId,
        payment_trx_id: paymentTrxId,
      },
      true,
    );
  }

  async marketRejectOffer(offerId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson(RAGNAROK_APP_ID, {
      action: "market_reject",
      offer_id: offerId,
    });
  }

  // ══════════════════════════════════════════════
  // NFTLox Operations — NFT birth layer
  // ══════════════════════════════════════════════

  async broadcastNFTLoxJson(
    action: string,
    data: Record<string, unknown>,
    useActiveKey: boolean = false,
  ): Promise<HiveBroadcastResult> {
    const runtime = getRagnarokNetworkConfig();
    const capability = checkRuntimeCapability(runtime, 'nftLoxWrites');
    if (capability.status === 'rejected') {
      return { success: false, error: `${capability.code}: ${capability.capability} (${capability.phaseId})` };
    }
    const username = this.getUsername();
    if (!username) return { success: false, error: "No username set" };
    if (!this.isKeychainAvailable())
      return { success: false, error: "Hive Keychain not available" };
    if (!runtime.nftLoxProtocolId.trim()) {
      return { success: false, error: "NFTLox protocol is not configured for this runtime" };
    }

    const payload = {
      protocol: runtime.nftLoxProtocolId,
      version: NFTLOX_PROTOCOL_VERSION,
      action,
      data: sanitizePayload(data),
    };

    const sizeCheck = validatePayloadSize(payload);
    if (!sizeCheck.valid) {
      return {
        success: false,
        error: `Payload too large: ${sizeCheck.bytes} bytes (max ${sizeCheck.maxBytes})`,
      };
    }

    const jsonStr = JSON.stringify(payload);
    const keychain = getHiveKeychain();
    if (!keychain) {
      return { success: false, error: "Hive Keychain not available" };
    }
    const keychainPromise = new Promise<HiveBroadcastResult>((resolve) => {
      keychain.requestCustomJson(
        username,
        runtime.nftLoxProtocolId,
        useActiveKey ? "Active" : "Posting",
        jsonStr,
        `NFTLox: ${action.replace(/_/g, " ")}`,
        (response) => {
          resolve({
            success: response.success,
            trxId: getHiveKeychainResultId(response),
            blockNum: getHiveKeychainBlockNum(response),
            error: response.success
              ? undefined
              : getHiveKeychainError(response, "Hive Keychain custom_json rejected"),
          });
        },
      );
    });

    const timeout = new Promise<HiveBroadcastResult>((resolve) =>
      setTimeout(
        () => resolve({ success: false, error: "Keychain timeout (60s)" }),
        60_000,
      ),
    );
    return Promise.race([keychainPromise, timeout]);
  }

  async nftloxCreateCollection(
    collectionName: string,
    totalPotential: number,
    schema: Record<string, unknown>,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("create_collection", {
      name: collectionName,
      symbol: NFTLOX_COLLECTION_SYMBOL,
      creator: this.getUsername(),
      totalPotential,
      metadata: {
        description:
          "Norse Mythos Card Game — collectible cards across 5 mythological factions",
        image:
          "https://dhenz14.github.io/norse-mythos-card-game/icons/icon-512.webp",
        externalUrl: "https://dhenz14.github.io/norse-mythos-card-game",
      },
      rules: {
        transferable: true,
        burnable: true,
        replicable: false,
        royaltyPct: 0,
        royaltyRecipient: this.getUsername(),
      },
      schema,
    });
  }

  async nftloxMintSeed(
    collectionId: string,
    seed: {
      artId: string;
      name: string;
      description: string;
      imageUrl: string;
      maxSupply: number;
      immutableData: Record<string, unknown>;
    },
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("mint", {
      collectionId,
      edition: 1,
      owner: this.getUsername(),
      metadata: {
        name: seed.name,
        description: seed.description,
        imageUrl: seed.imageUrl,
      },
      maxSupply: seed.maxSupply,
      immutableData: seed.immutableData,
    });
  }

  async nftloxCreatePack(
    collectionId: string,
    pack: {
      name: string;
      description: string;
      imageUrl: string;
      dropTable: Array<{ seedId: string; weight: number }>;
      itemsPerPack: number;
      maxSupply: number;
    },
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("pack_create", {
      collectionId,
      name: pack.name,
      description: pack.description,
      imageUrl: pack.imageUrl,
      dropTable: pack.dropTable,
      itemsPerPack: pack.itemsPerPack,
      maxSupply: pack.maxSupply,
    });
  }

  async nftloxOpenPack(
    packId: string,
    quantity: number = 1,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("pack_open", { packId, quantity });
  }

  async nftloxBulkDistribute(
    items: Array<{ seedId: string; quantity: number; originBlock?: number }>,
    to?: string,
    imageOverrides?: Record<string, string>,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("bulk_distribute", {
      to: to || this.getUsername(),
      items,
      ...(imageOverrides ? { imageOverrides } : {}),
    });
  }

  async nftloxSetOwnerData(
    nftId: string,
    ownerData: Record<string, unknown>,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("set_owner_data", { nftId, ownerData });
  }

  async nftloxExtendSchema(
    collectionId: string,
    newFields: Record<string, { type: string; mutable?: boolean }>,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("extend_schema", {
      collectionId,
      newFields,
    });
  }

  async nftloxLendCard(
    nftId: string,
    borrower: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("nft_lend", { nftId, to: borrower }, true);
  }

  async nftloxReturnCard(nftId: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("nft_return", { nftId }, true);
  }

  async nftloxListCard(
    nftId: string,
    price: string,
    currency: string = "HIVE",
    expiresInBlocks?: number,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson(
      "list",
      {
        nftId,
        price,
        currency,
        ...(expiresInBlocks ? { expiresInBlocks } : {}),
      },
      true,
    );
  }

  async nftloxUnlistCard(nftId: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("unlist", { nftId });
  }

  async nftloxTransferCard(
    nftId: string,
    to: string,
    memo?: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson(
      "transfer",
      { nftId, to, ...(memo ? { memo } : {}) },
      true,
    );
  }

  async nftloxBurnCard(nftId: string): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("burn", { nftId }, true);
  }

  async nftloxReplicate(
    seedId: string,
    to?: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson("replicate", {
      seedId,
      to: to || this.getUsername(),
    });
  }

  async nftloxDataOperatorApprove(
    collectionId: string,
    operator: string,
    approved: boolean,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson(
      "data_operator_approve",
      { collectionId, operator, approved },
      true,
    );
  }

  async nftloxBuyCard(
    listingId: string,
    nftId: string,
    seller: string,
    amount: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastNFTLoxJson(
      "buy",
      { listingId, nftId, seller, amount },
      true,
    ); // buy requires active key
  }

  async stampLevelUp(
    cardUid: string,
    cardId: number,
    newLevel: number,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson("rp_level_up", {
      nft_id: cardUid,
      card_id: cardId,
      new_level: newLevel,
    });
  }

  async claimReward(rewardId: string): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson("rp_reward_claim", {
      reward_id: rewardId,
    });
  }

  async claimDailyQuest(
    slot: number,
    questType: string,
  ): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson("rp_daily_quest_claim", {
      slot,
      quest_type: questType,
    });
  }

  async submitCampaignResult(payload: HiveCampaignResultPayload): Promise<HiveBroadcastResult> {
    return this.broadcastCustomJson("rp_campaign_result", { ...payload });
  }

  async signMessage(
    message: string,
    options?: {
      username?: string;
      keyType?: "Active" | "Posting" | "Memo";
      title?: string;
    },
  ): Promise<HiveSignatureResult> {
    return signHiveMessage(message, options);
  }

  async signResultHash(hash: string): Promise<string> {
    if (!this.getUsername()) {
      throw new Error("No username set");
    }
    if (!this.isKeychainAvailable()) {
      throw new Error("Hive Keychain not available");
    }

    const result = await signHiveMessage(buildMatchResultSignatureMessage(hash), {
      keyType: "Posting",
      title: "Sign match result",
    });
    if (!result.success || !result.signature) {
      throw new Error(result.error || "Signing failed");
    }

    return result.signature;
  }
}

export const hiveSync = new HiveSync();
