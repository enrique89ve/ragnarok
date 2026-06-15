import { debug } from "../../config/debugConfig";
import { showStatus } from "../ui/GameStatusBanner";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package, Zap } from "lucide-react";
import {
  MetaPageHeader,
  MetaPageHeaderLink,
} from "../../../components/navigation/MetaPageHeader";
import { routes } from "../../../lib/routes";
import { recordSessionEvent } from "../../../data/blockchain/transcriptBuilder";
import {
  getRarityColor,
  getRaritySortRank,
  getTypeIcon,
} from "../../utils/rarityUtils";
import { GameIcon } from "../../utils/ui/GameIcon";
import type { IconName } from "../../utils/ui/iconMap";
import { getCardArtPath } from "../../utils/art/artMapping";
import { getMasteryTier } from "../../../data/blockchain/cardXPRewards";
import { cardRegistry } from "../../data/cardRegistry";
import { getNFTBridge } from "../../nft";
import { useNFTCollection, useNFTUsername } from "../../nft/hooks";
import NFTProvenanceViewer from "./NFTProvenanceViewer";
import SendCardModal from "./SendCardModal";
import {
  COLLECTION_CARD_MARKER_SPACE_PX,
  CollectionCardTile,
  type CollectionTileCard,
} from "./CollectionCardTile";
import {
  STARTER_COLLECTION_GATE_COPY,
  shouldGateCollectionBehindStarter,
} from "./collectionStarterGate";
import {
  DUAT_COLLECTION_LABEL,
  classifyHiveCollectionSource,
  collectionSourceLabel,
  countCardsByCollectionSource,
  filterCollectionBySource,
  type CollectionFilterSource,
  type CollectionSource,
} from "./collectionAcquisition";
import { useCollectionMilestoneStore } from "../../stores/collectionMilestoneStore";
import { useDuatClaimStore } from "../../stores/duatClaimStore";
import { useStarterStore } from "../../stores/starterStore";
import "./collection.css";
import "../styles/holoEffect.css";
import { useEitrBalance } from "../../hooks/useEitrBalance";
import { hiveSync } from "../../../data/HiveSync";
import {
  getAuthenticatedHiveUsername,
  subscribeHiveSessionIdentity,
} from "../../../data/HiveSessionIdentity";
import { isSharedNetworkEnvironment } from "../../config/featureFlags";
import { sha256Hash } from "../../../../../shared/protocol-core/hash";
import { PACK_ENTROPY_DELAY_BLOCKS } from "../../../../../shared/protocol-core/types";
import { emitNotification } from "../../actions/gameActions";
import {
  isStarterEntitlementAsset,
  type HiveCardAsset,
} from "../../../data/schemas/HiveTypes";
import type { CardData } from "../../types";
import { RARITY, RARITY_ORDER, type Rarity } from "@shared/schemas/rarity";
import type { CardCategory } from "@shared/schemas/cardCategory";
import { STARTER_ENTITLEMENT } from "@shared/schemas/starterEntitlement";
import {
  getEitrDissolveValue,
  getEitrForgeCost,
} from "@shared/protocol-core/eitrEconomy";
import {
  QA_FULL_CATALOG_LABEL,
  getQaFullCatalogCardsForRuntime,
  isQaFullCatalogRuntime,
} from "../../protocol/qaFullCatalogEntitlement";

type FilterRarity = "all" | Rarity;
type FilterType = "all" | "hero" | "minion" | "spell" | "weapon";
type FilterSource = CollectionFilterSource;
type SortBy = "recent" | "name" | "rarity" | "mint";
type CollectionOwnedCard = CollectionTileCard & {
  category: CardCategory;
  ownershipSource?: HiveCardAsset["ownershipSource"];
  collectionSource: CollectionSource;
  acquisition?: HiveCardAsset["acquisition"];
};

function useAuthenticatedHiveUsername(): string | null {
  return useSyncExternalStore(
    subscribeHiveSessionIdentity,
    getAuthenticatedHiveUsername,
    getAuthenticatedHiveUsername,
  );
}

interface CollectionStats {
  uniqueCards: number;
  totalCards: number;
  completionPercentage: number;
  totalInGame: number;
  byRarity: { rarity: Rarity; uniqueCards: number; totalCards: number }[];
  byType: { type: string; uniqueCards: number; totalCards: number }[];
  bySource: {
    source: CollectionSource;
    label: string;
    uniqueCards: number;
    totalCards: number;
  }[];
}

interface ChainCardRecord {
  uid: string;
  cardId: number;
  owner: string;
  rarity: string;
  level: number;
  xp: number;
  edition?: string;
  foil?: string;
  mintTrxId?: string;
  mintBlockNum?: number;
  lastTransferBlock?: number;
  acquisition?: HiveCardAsset["acquisition"];
}

interface ChainCardsResponse {
  success: boolean;
  cards?: ChainCardRecord[];
  error?: string;
}

const CARD_BY_ID = new Map<number, CardData>(
  cardRegistry.map((card) => [Number(card.id), card]),
);

const DISPLAY_RARITIES = [...RARITY].sort(
  (a, b) => RARITY_ORDER[b] - RARITY_ORDER[a],
);

const RARITY_PILLS: {
  value: FilterRarity;
  label: string;
  shortLabel?: string;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "all",
    label: "All",
    color: "rgba(255,255,255,0.06)",
    activeColor: "rgba(217,168,68,0.55)",
  },
  ...DISPLAY_RARITIES.map((rarity) => ({
    value: rarity,
    label: `${rarity.charAt(0).toUpperCase()}${rarity.slice(1)}`,
    shortLabel:
      rarity === "mythic" ? "Myth" : rarity === "common" ? "Com" : undefined,
    color: `color-mix(in srgb, var(--rarity-${rarity}-color) 15%, transparent)`,
    activeColor: `color-mix(in srgb, var(--rarity-${rarity}-color) ${rarity === "mythic" ? 60 : 50}%, transparent)`,
  })),
];

const TYPE_PILLS: { value: FilterType; label: string; iconName: IconName }[] = [
  { value: "all", label: "All", iconName: "sparkles" },
  { value: "hero", label: "Heroes", iconName: "crown" },
  { value: "minion", label: "Minions", iconName: "swords" },
  { value: "spell", label: "Spells", iconName: "sparkles" },
  { value: "weapon", label: "Weapons", iconName: "dagger" },
];

const SOURCE_PILLS: { value: FilterSource; label: string; shortLabel?: string }[] = [
  { value: "all", label: "All Sources", shortLabel: "Source" },
  { value: "starter", label: "Starter", shortLabel: "Start" },
  { value: "duat_airdrop", label: DUAT_COLLECTION_LABEL },
  { value: "nft", label: "NFT" },
  { value: "qa_full_catalog", label: QA_FULL_CATALOG_LABEL, shortLabel: "QA" },
];

// Vault surface treatments — used multiple times across the page.
// Padding/margin se concatena en cada call site según contexto.
const VAULT_PANEL_CLASS = "n-glass-panel";
const VAULT_INPUT_CLASS =
  "rounded-lg border border-obsidian-700 bg-obsidian-950/75 text-ink-0 placeholder:text-ink-500 " +
  "transition-colors focus:border-gold-500/60 focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-gold-300";

const COLLECTION_CARD_TILE_MAX_WIDTH_PX = 150;
const COLLECTION_CARD_COMPACT_LANDSCAPE_MAX_WIDTH_PX = 112;
const COLLECTION_CARD_ASPECT_HEIGHT_RATIO = 4 / 3;

function getCollectionColumns(width: number, cardMaxWidth: number): number {
  const gap = getCollectionGridGap(width);
  const columns = Math.floor((width + gap) / (cardMaxWidth + gap));
  return Math.max(2, Math.min(8, columns));
}

function getCollectionGridGap(width: number): number {
  if (width < 420) return 8;
  if (width < 768) return 10;
  return 12;
}

function getCollectionRowGap(width: number): number {
  if (width < 420) return 14;
  if (width < 768) return 18;
  return 22;
}

function getCollectionSource(card: CollectionOwnedCard): CollectionSource {
  return card.collectionSource;
}

function getCollectionSourceLabel(card: CollectionOwnedCard): string {
  return collectionSourceLabel(
    getCollectionSource(card),
    QA_FULL_CATALOG_LABEL,
  );
}

function getCardHeroClass(
  card: CardData | undefined,
  fallback = "neutral",
): string {
  return card?.heroClass ?? card?.class ?? fallback;
}

function getCardAttack(card: CardData | undefined): number | undefined {
  return card && "attack" in card && typeof card.attack === "number"
    ? card.attack
    : undefined;
}

function getCardHealth(card: CardData | undefined): number | undefined {
  return card && "health" in card && typeof card.health === "number"
    ? card.health
    : undefined;
}

function getCardManaCost(card: CardData | undefined): number | undefined {
  return typeof card?.manaCost === "number" ? card.manaCost : undefined;
}

function resolveCardCategory(
  card: CardData | undefined,
  ownershipSource?: HiveCardAsset["ownershipSource"],
): CardCategory {
  if (ownershipSource === "starter") return "starter";
  if (ownershipSource === "nft") return "genesis";
  return card?.category ?? (card?.set === "starter" ? "starter" : "genesis");
}

function buildOwnedCard(input: {
  cardId: number;
  quantity: number;
  rarity?: string;
  type?: string;
  name?: string;
  mintNumber?: number | null;
  ownershipSource?: HiveCardAsset["ownershipSource"];
  collectionSource?: CollectionSource;
  acquisition?: HiveCardAsset["acquisition"];
}): CollectionOwnedCard {
  const card = CARD_BY_ID.get(input.cardId);
  const collectionSource =
    input.collectionSource ??
    (input.ownershipSource === "starter"
      ? "starter"
      : input.ownershipSource === "nft"
        ? "nft"
        : "nft");
  return {
    id: input.cardId,
    name: input.name || card?.name || `Card #${input.cardId}`,
    rarity: input.rarity || card?.rarity || "common",
    type: input.type || card?.type || "minion",
    heroClass: getCardHeroClass(card),
    quantity: input.quantity,
    mintNumber: input.mintNumber,
    description: card?.description,
    attack: getCardAttack(card),
    health: getCardHealth(card),
    manaCost: getCardManaCost(card),
    category: resolveCardCategory(card, input.ownershipSource),
    ownershipSource: input.ownershipSource,
    collectionSource,
    ...(input.acquisition ? { acquisition: input.acquisition } : {}),
  };
}

function starterCollectionCards(): CollectionOwnedCard[] {
  return STARTER_ENTITLEMENT.cardIds.map((cardId) => {
    const card = CARD_BY_ID.get(cardId);
    return buildOwnedCard({
      cardId,
      quantity:
        STARTER_ENTITLEMENT.copiesPerCardId[cardId] ??
        STARTER_ENTITLEMENT.copiesPerCard,
      rarity: card?.rarity,
      type: card?.type,
      name: card?.name,
      ownershipSource: "starter",
      collectionSource: "starter",
    });
  });
}

function catalogAccessCards(): CollectionOwnedCard[] {
  return cardRegistry
    .filter((card) => card.category === "genesis")
    .map((card) =>
      buildOwnedCard({
        cardId: Number(card.id),
        quantity: 1,
        rarity: card.rarity,
        type: card.type,
        name: card.name,
        collectionSource: "qa_full_catalog",
      }),
    );
}

function qaRuntimeCatalogCards(): CollectionOwnedCard[] {
  return getQaFullCatalogCardsForRuntime().map((entry) => {
    const card = CARD_BY_ID.get(entry.cardId);
    return buildOwnedCard({
      cardId: entry.cardId,
      quantity: entry.ownedCopies,
      rarity: card?.rarity,
      type: card?.type,
      name: card?.name,
      collectionSource: "qa_full_catalog",
    });
  });
}

function localCollectionCards(): CollectionOwnedCard[] {
  return [...starterCollectionCards(), ...catalogAccessCards()];
}

function withStarterCards(cards: CollectionOwnedCard[]): CollectionOwnedCard[] {
  return [...starterCollectionCards(), ...cards];
}

function groupChainCards(
  records: readonly ChainCardRecord[],
): CollectionOwnedCard[] {
  const grouped = new Map<number, CollectionOwnedCard>();
  for (const record of records) {
    const existing = grouped.get(record.cardId);
    if (existing) {
      grouped.set(record.cardId, {
        ...existing,
        quantity: existing.quantity + 1,
      });
      continue;
    }
    grouped.set(
      record.cardId,
      buildOwnedCard({
        cardId: record.cardId,
        quantity: 1,
        rarity: record.rarity,
        ownershipSource: "nft",
        collectionSource: classifyHiveCollectionSource({
          ownershipSource: "nft",
          acquisition: record.acquisition,
        }),
        acquisition: record.acquisition,
      }),
    );
  }
  return [...grouped.values()];
}

function groupHiveCards(
  records: readonly HiveCardAsset[],
): CollectionOwnedCard[] {
  const grouped = new Map<number, CollectionOwnedCard>();
  for (const record of records) {
    if (!isVisibleCollectionAsset(record)) continue;
    const existing = grouped.get(record.cardId);
    if (existing) {
      grouped.set(record.cardId, {
        ...existing,
        quantity: existing.quantity + 1,
      });
      continue;
    }
    grouped.set(
      record.cardId,
      buildOwnedCard({
        cardId: record.cardId,
        quantity: 1,
        rarity: record.rarity,
        type: record.type,
        name: record.name,
        ownershipSource: record.ownershipSource,
        collectionSource: classifyHiveCollectionSource(record),
        acquisition: record.acquisition,
      }),
    );
  }
  return [...grouped.values()];
}

function withQaFullCatalogCards(
  cards: CollectionOwnedCard[],
): CollectionOwnedCard[] {
  if (!isQaFullCatalogRuntime()) return cards;
  const existingPersistentIds = new Set(cards.map((card) => card.id));
  const qaCards = qaRuntimeCatalogCards().filter(
    (card) => !existingPersistentIds.has(card.id),
  );
  return [...cards, ...qaCards];
}

function isVisibleCollectionAsset(record: HiveCardAsset): boolean {
  return !isStarterEntitlementAsset(record);
}

function buildCollectionStats(
  cards: readonly CollectionOwnedCard[],
): CollectionStats {
  const totalInGame =
    STARTER_ENTITLEMENT.cardIds.length +
    cardRegistry.filter((card) => card.category === "genesis").length;
  const totalCards = cards.reduce((total, card) => total + card.quantity, 0);
  const byRarity = DISPLAY_RARITIES.map((rarity) => {
    const matching = cards.filter((card) => card.rarity === rarity);
    return {
      rarity,
      uniqueCards: matching.length,
      totalCards: matching.reduce((total, card) => total + card.quantity, 0),
    };
  });
  const byType = ["hero", "minion", "spell", "weapon"].map((type) => {
    const matching = cards.filter((card) => card.type === type);
    return {
      type,
      uniqueCards: matching.length,
      totalCards: matching.reduce((total, card) => total + card.quantity, 0),
    };
  });
  const bySource = (
    [
      { source: "starter", label: "Starter" },
      { source: "duat_airdrop", label: DUAT_COLLECTION_LABEL },
      { source: "nft", label: "NFT" },
      { source: "qa_full_catalog", label: QA_FULL_CATALOG_LABEL },
    ] as const
  ).map(({ source, label }) => {
    const counts = countCardsByCollectionSource(cards, source);
    return {
      source,
      label,
      uniqueCards: counts.uniqueCards,
      totalCards: counts.totalCards,
    };
  });

  return {
    uniqueCards: cards.length,
    totalCards,
    completionPercentage:
      totalInGame > 0
        ? Number(((cards.length / totalInGame) * 100).toFixed(1))
        : 0,
    totalInGame,
    byRarity,
    byType,
    bySource,
  };
}

function getClassGradient(heroClass: string): string {
  switch (heroClass) {
    case "warrior":
      return "linear-gradient(135deg, #92400e 0%, #78350f 100%)";
    case "mage":
      return "linear-gradient(135deg, #1e3a5f 0%, #172554 100%)";
    case "priest":
      return "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)";
    case "paladin":
      return "linear-gradient(135deg, #a16207 0%, #854d0e 100%)";
    case "hunter":
      return "linear-gradient(135deg, #166534 0%, #14532d 100%)";
    case "druid":
      return "linear-gradient(135deg, #713f12 0%, #422006 100%)";
    case "warlock":
      return "linear-gradient(135deg, #581c87 0%, #3b0764 100%)";
    case "shaman":
      return "linear-gradient(135deg, #1e3a5f 0%, #0c4a6e 100%)";
    case "rogue":
      return "linear-gradient(135deg, #1c1917 0%, #292524 100%)";
    case "death_knight":
    case "deathknight":
      return "linear-gradient(135deg, #164e63 0%, #0e7490 100%)";
    case "berserker":
      return "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)";
    default:
      return "linear-gradient(135deg, #374151 0%, #1f2937 100%)";
  }
}

function getFrameClass(rarity: string): string {
  if (rarity === "mythic")
    return "collection-modal-frame collection-modal-frame-mythic collection-modal-frame-animated";
  return `collection-modal-frame collection-modal-frame-${rarity}`;
}

export default function CollectionPage() {
  const hiveCards = useNFTCollection();
  const hiveUsername = useNFTUsername();
  const bridge = getNFTBridge();
  const bridgeHiveMode = bridge.isHiveMode();
  const authenticatedHiveUsername = useAuthenticatedHiveUsername();
  const sharedNetwork = isSharedNetworkEnvironment();
  const currentAccount =
    hiveUsername ?? bridge.getUsername() ?? hiveSync.getUsername();
  const normalizedCurrentAccount = currentAccount?.toLowerCase() ?? null;
  const starterClaimed = useStarterStore((state) =>
    bridgeHiveMode
      ? Boolean(currentAccount && state.hasClaimed(currentAccount))
      : state.hasClaimed(currentAccount),
  );
  const starterGateActive = shouldGateCollectionBehindStarter(starterClaimed);
  const { balance: eitr } = useEitrBalance(currentAccount, "S01");
  const [craftConfirm, setCraftConfirm] = useState<
    "craft" | "disenchant" | null
  >(null);

  // Two-phase forge per ADR 0001 §3. Commit broadcasts immediately; reveal
  // fires after PACK_ENTROPY_DELAY_BLOCKS (~20 blocks ≈ 60s on Hive). Server
  // auto-finalizes if reveal misses the deadline, so worst case the user
  // closes the tab and the chain still resolves.
  async function runForge(
    rarity: string,
    _craftCostVal: number,
  ): Promise<void> {
    if (sharedNetwork && !authenticatedHiveUsername) {
      showStatus("Sign Hive again before forging cards.", "error");
      return;
    }

    const userSalt = `forge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const saltCommit = await sha256Hash(userSalt);

    const commitRes = await hiveSync.broadcastCustomJson("forge_commit", {
      rarity,
      salt_commit: saltCommit,
    });
    if (!commitRes.success || !commitRes.trxId) {
      showStatus(commitRes.error ?? "Forge commit failed", "error");
      return;
    }

    emitNotification({
      message: `Forging a random ${rarity}… revealing in ~${PACK_ENTROPY_DELAY_BLOCKS * 3}s`,
      level: "info",
    });

    // Wait for entropy block irreversibility (block_time ≈ 3s * delay + buffer).
    const waitMs = (PACK_ENTROPY_DELAY_BLOCKS + 5) * 3 * 1000;
    const commitTrxId = commitRes.trxId;
    setTimeout(() => {
      void hiveSync
        .broadcastCustomJson("forge_reveal", {
          commit_trx_id: commitTrxId,
          user_salt: userSalt,
        })
        .then((revealRes) => {
          if (!revealRes.success) {
            showStatus(
              revealRes.error ??
                "Forge reveal failed — auto-finalize will retry",
              "warning",
            );
          }
        })
        .catch(() => showStatus("Forge reveal broadcast failed", "warning"));
    }, waitMs);
  }
  const [provenanceNft, setProvenanceNft] = useState<
    (typeof hiveCards)[0] | null
  >(null);
  const [sendNft, setSendNft] = useState<(typeof hiveCards)[0] | null>(null);

  const [cards, setCards] = useState<CollectionOwnedCard[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<FilterRarity>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterSource, setFilterSource] = useState<FilterSource>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("rarity");
  const [selectedCard, setSelectedCard] = useState<CollectionOwnedCard | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const duatEntry = useDuatClaimStore((state) => state.currentUserEntry);
  const duatPendingClaimTrxId = useDuatClaimStore(
    (state) => state.pendingClaimTrxId,
  );
  const showDuatCollectionNotice = Boolean(duatEntry && !duatEntry.claimed);
  const duatEligible = duatEntry?.eligible ?? false;
  const duatCollectionConfirming = Boolean(
    duatPendingClaimTrxId && duatEntry?.claimReady,
  );

  useEffect(() => {
    if (!sharedNetwork || currentAccount) return;
    setSelectedCard(null);
    setCraftConfirm(null);
    setProvenanceNft(null);
    setSendNft(null);
  }, [currentAccount, sharedNetwork]);

  useEffect(() => {
    const controller = new AbortController();

    const applyCollection = (nextCards: CollectionOwnedCard[]) => {
      setCards(nextCards);
      setStats(buildCollectionStats(nextCards));
      setTotalPages(1);
      setPage(1);
      setError(null);
    };

    const loadCollection = async () => {
      setLoading(true);
      setIsLoadingMore(false);
      if (starterGateActive || (sharedNetwork && !currentAccount)) {
        applyCollection([]);
        return;
      }
      const bridge = getNFTBridge();
      const hiveMode = bridge.isHiveMode();
      const visibleHiveCards = hiveCards.filter(
        (card) =>
          isVisibleCollectionAsset(card) &&
          (!sharedNetwork ||
            card.ownerId.toLowerCase() === normalizedCurrentAccount),
      );

      if (hiveMode && currentAccount) {
        try {
          const res = await fetch(`/api/chain/player/${currentAccount}/cards`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data: ChainCardsResponse = await res.json();
            if (data.success) {
              applyCollection(
                withQaFullCatalogCards(
                  withStarterCards(groupChainCards(data.cards ?? [])),
                ),
              );
              return;
            }
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          debug.warn(
            "Chain collection unavailable, falling back to local replay:",
            err,
          );
        }
      }

      if (visibleHiveCards.length > 0 || hiveMode) {
        applyCollection(
          withQaFullCatalogCards(
            withStarterCards(groupHiveCards(visibleHiveCards)),
          ),
        );
      } else {
        applyCollection(localCollectionCards());
      }
    };

    void loadCollection().finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [
    currentAccount,
    hiveCards,
    normalizedCurrentAccount,
    refreshNonce,
    sharedNetwork,
    starterGateActive,
  ]);

  useEffect(() => {
    setPage(1);
  }, [filterRarity, filterType, filterSource, searchQuery]);

  // Collection milestone check — runs when cards change
  const checkMilestones = useCollectionMilestoneStore((s) => s.checkMilestones);
  useEffect(() => {
    if (cards.length === 0) return;
    const mythicCount = cards.filter((c) => c.rarity === "mythic").length;
    const epicCount = cards.filter((c) => c.rarity === "epic").length;
    const newlyEarned = checkMilestones(cards.length, mythicCount, epicCount);
    for (const m of newlyEarned) {
      showStatus(`${m.icon} ${m.name} — ${m.description}`, "success", 5000);
    }
  }, [cards, checkMilestones]);

  const hiveCardMap = useMemo(
    () =>
      new Map(
        hiveCards
          .filter(
            (card) =>
              card.ownershipSource === "nft" &&
              (!sharedNetwork ||
                card.ownerId.toLowerCase() === normalizedCurrentAccount),
          )
          .map((card) => [card.cardId, card]),
      ),
    [hiveCards, normalizedCurrentAccount, sharedNetwork],
  );

  const filteredAndSorted = useMemo(() => {
    let result = filterCollectionBySource(cards, filterSource).filter(
      (card) => {
        if (filterRarity !== "all" && card.rarity !== filterRarity)
          return false;
        if (filterType !== "all" && card.type !== filterType) return false;
        if (
          searchQuery &&
          !card.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      },
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rarity":
          return getRaritySortRank(a.rarity) - getRaritySortRank(b.rarity);
        case "mint":
          return (a.mintNumber ?? 99999) - (b.mintNumber ?? 99999);
        case "recent":
        default:
          return 0;
      }
    });

    return result;
  }, [cards, filterRarity, filterType, filterSource, searchQuery, sortBy]);

  useEffect(() => {
    if (filterSource !== "duat_airdrop") return;
    const duatCounts = countCardsByCollectionSource(cards, "duat_airdrop");
    recordSessionEvent("collection_duat_filter_viewed", {
      account: currentAccount ?? null,
      filteredUniqueCards: filteredAndSorted.length,
      filteredTotalCards: filteredAndSorted.reduce(
        (total, card) => total + card.quantity,
        0,
      ),
      duatUniqueCards: duatCounts.uniqueCards,
      duatTotalCards: duatCounts.totalCards,
      qaFullCatalogVisible: cards.some(
        (card) => card.collectionSource === "qa_full_catalog",
      ),
    });
  }, [cards, currentAccount, filterSource, filteredAndSorted]);

  const parentRef = useRef<HTMLDivElement>(null);
  const gridShellRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(() =>
    typeof window === "undefined"
      ? 1152
      : Math.max(280, Math.min(window.innerWidth - 32, 1152)),
  );
  const [viewportSize, setViewportSize] = useState(() =>
    typeof window === "undefined"
      ? { width: 1152, height: 900 }
      : { width: window.innerWidth, height: window.innerHeight },
  );

  useEffect(() => {
    if (typeof window === "undefined" || !gridShellRef.current)
      return undefined;

    const updateGridWidth = () => {
      const nextWidth = Math.floor(
        gridShellRef.current?.getBoundingClientRect().width ?? 0,
      );
      if (nextWidth > 0) setGridWidth(nextWidth);
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateGridWidth();

    const resizeObserver = new ResizeObserver(updateGridWidth);
    resizeObserver.observe(gridShellRef.current);
    window.addEventListener("resize", updateGridWidth);
    window.addEventListener("orientationchange", updateGridWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateGridWidth);
      window.removeEventListener("orientationchange", updateGridWidth);
    };
  }, []);

  const compactLandscapeCards =
    viewportSize.height <= 560 && viewportSize.width > viewportSize.height;
  const collectionCardTileMaxWidth = compactLandscapeCards
    ? COLLECTION_CARD_COMPACT_LANDSCAPE_MAX_WIDTH_PX
    : COLLECTION_CARD_TILE_MAX_WIDTH_PX;
  const COLUMNS = getCollectionColumns(gridWidth, collectionCardTileMaxWidth);
  const collectionGridGap = getCollectionGridGap(gridWidth);
  const compactCards = gridWidth < 420;
  const cardPaddingClass = compactCards ? "p-1.5" : "p-2.5";
  const cardMintClass = compactCards ? "text-[8px]" : "text-[9px]";
  const estimatedCollectionWidth = gridWidth;
  const estimatedCardWidth = Math.max(
    0,
    (estimatedCollectionWidth - (COLUMNS - 1) * collectionGridGap) / COLUMNS,
  );
  const estimatedCardRenderWidth = Math.min(
    collectionCardTileMaxWidth,
    estimatedCardWidth,
  );
  const estimatedRowHeight =
    Math.ceil(estimatedCardRenderWidth * COLLECTION_CARD_ASPECT_HEIGHT_RATIO) +
    COLLECTION_CARD_MARKER_SPACE_PX +
    getCollectionRowGap(gridWidth);
  const rows = useMemo(() => {
    const result: CollectionOwnedCard[][] = [];
    for (let i = 0; i < filteredAndSorted.length; i += COLUMNS) {
      result.push(filteredAndSorted.slice(i, i + COLUMNS));
    }
    return result;
  }, [COLUMNS, filteredAndSorted]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 3,
  });
  const collectionStatChips = useMemo(() => {
    if (!stats) return [];
    const rarityCount = (rarity: Rarity) =>
      stats.byRarity.find((entry) => entry.rarity === rarity)?.uniqueCards ?? 0;
    const sourceCount = (source: CollectionSource) =>
      stats.bySource.find((entry) => entry.source === source)?.uniqueCards ?? 0;
    return [
      { label: "Copies", value: stats.totalCards },
      { label: "Mythic", value: rarityCount("mythic") },
      { label: "NFT", value: sourceCount("nft") },
      { label: "DUAT", value: sourceCount("duat_airdrop") },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="collection-page-shell n-page-shell w-full overflow-hidden bg-(image:--bg-vault-nav) text-ink-0">
        <MetaPageHeader
          title="Collection"
          kicker="Vault · Cards"
          username={hiveUsername}
          accountSecondary="Collection"
        />
        <div className="collection-loading-body flex min-h-0 flex-1 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 rounded-full border-4 border-gold-500 border-t-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="collection-page-shell n-page-shell w-full overflow-hidden bg-(image:--bg-vault-nav)">
      <MetaPageHeader
        title="Collection"
        kicker="Vault · Cards"
        username={hiveUsername}
        accountSecondary={
          starterGateActive
            ? "0 cards"
            : `${cards.length.toLocaleString()} cards`
        }
        actions={
          <>
            <div
              role="status"
              aria-label={`${eitr.toLocaleString()} Eitr balance`}
              className="meta-page-header-optional inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-bifrost-500/35 bg-obsidian-850 px-3 text-ink-200"
            >
              <Zap
                className="h-3.5 w-3.5 text-bifrost-300"
                strokeWidth={2.4}
                aria-hidden="true"
              />
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-bifrost-200">
                {eitr.toLocaleString()}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
                Eitr
              </span>
            </div>
            <MetaPageHeaderLink
              to={routes.packs}
              icon={Package}
              iconPosition="start"
              tone="gold"
            >
              Packs
            </MetaPageHeaderLink>
          </>
        }
      />

      <main
        className="collection-content-shell n-grid-container max-w-[1400px]"
        aria-label="Collection vault"
      >
        {!starterGateActive && showDuatCollectionNotice && duatEntry && (
          <div
            className={`${VAULT_PANEL_CLASS} collection-notice-panel p-3 flex flex-wrap items-center gap-3 sm:p-4 sm:gap-4`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-md border border-bifrost-300/45 bg-bifrost-500/15 text-bifrost-100">
              <Package
                className="h-5 w-5"
                strokeWidth={2.4}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-bifrost-300">
                DUAT Packs ·{" "}
                {duatCollectionConfirming
                  ? "Confirming"
                  : duatEligible
                    ? duatEntry.claimReady
                      ? "Ready"
                      : "Collection pending"
                    : "Ineligible"}
              </div>
              <p className="mt-1 text-sm text-ink-200">
                {duatEligible
                  ? `${duatEntry.packsEarned} sealed pack${duatEntry.packsEarned === 1 ? "" : "s"} assigned. Cards appear in Collection only after you claim and open the packs.`
                  : (duatEntry.claimBlockedReason ??
                    "This account has no DUAT airdrop packs assigned.")}
              </p>
            </div>
            <Link
              to={routes.packs}
              className="btn-runic btn-runic--gold btn-runic--sm no-underline"
            >
              View Packs
            </Link>
          </div>
        )}

        {!starterGateActive && (
          <section
            className="collection-vault-hud"
            aria-label="Collection browser controls"
          >
            {stats && (
              <div className="n-glass-panel collection-progress-panel p-3 sm:p-4">
                <div className="collection-progress-heading">
                  <div>
                    <div className="collection-hud-kicker">Vault Status</div>
                    <h2 className="collection-hud-title">Progression</h2>
                  </div>
                  <div
                    className="collection-progress-percent"
                    aria-label={`${stats.completionPercentage}% collection completion`}
                  >
                    {stats.completionPercentage}%
                  </div>
                </div>
                <div className="collection-progress-value">
                  <span>{stats.uniqueCards.toLocaleString()}</span>
                  <small>/ {stats.totalInGame.toLocaleString()} cards</small>
                </div>
                <div className="collection-progress-track" aria-hidden="true">
                  <div
                    style={{
                      width: `${Math.min(stats.completionPercentage, 100)}%`,
                    }}
                    className="collection-progress-fill"
                  />
                </div>
                <div className="collection-stat-strip">
                  {collectionStatChips.map((chip) => (
                    <div key={chip.label} className="collection-stat-chip">
                      <strong>{chip.value.toLocaleString()}</strong>
                      <span>{chip.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className={`${VAULT_PANEL_CLASS} collection-landscape-filters collection-filter-panel p-3 sm:p-4`}
            >
              <div className="collection-filter-head">
                <div>
                  <div className="collection-hud-kicker">Filter / Sort</div>
                  <h2 className="collection-hud-title">Card browser</h2>
                </div>
                <div className="collection-filter-count" aria-live="polite">
                  {filteredAndSorted.length.toLocaleString()} shown
                </div>
              </div>

              <div className="collection-landscape-search-row flex gap-2 mb-2 sm:gap-3 sm:mb-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <GameIcon name="search" size={14} />
                  </span>
                  <input
                    type="text"
                    aria-label="Search collection cards"
                    placeholder="Search cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${VAULT_INPUT_CLASS} w-full pl-9 pr-4 py-2 text-sm`}
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  title="Sort cards by"
                  aria-label="Sort cards by"
                  className={`${VAULT_INPUT_CLASS} px-3 py-2 text-sm`}
                >
                  <option value="rarity">Sort: Rarity</option>
                  <option value="name">Sort: Name A-Z</option>
                  <option value="mint">Sort: Mint # (Low)</option>
                  <option value="recent">Sort: Recent</option>
                </select>
              </div>

              <div className="collection-filter-strip">
                <div className="collection-filter-group" aria-label="Filter by source">
                  {SOURCE_PILLS.map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      title={pill.label}
                      aria-pressed={filterSource === pill.value}
                      onClick={() => setFilterSource(pill.value)}
                      className={`filter-pill ${filterSource === pill.value ? "filter-pill-active" : "filter-pill-inactive"}`}
                      style={
                        filterSource === pill.value
                          ? {
                              background: "rgba(74,111,224,0.42)",
                              borderColor: "rgba(143,181,255,0.55)",
                            }
                          : {}
                      }
                    >
                      {pill.shortLabel ?? pill.label}
                    </button>
                  ))}
                </div>

                <div className="collection-filter-group" aria-label="Filter by rarity">
                  {RARITY_PILLS.map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      title={pill.label}
                      aria-pressed={filterRarity === pill.value}
                      onClick={() => setFilterRarity(pill.value)}
                      className={`filter-pill ${filterRarity === pill.value ? "filter-pill-active" : "filter-pill-inactive"}`}
                      style={
                        filterRarity === pill.value
                          ? {
                              background: pill.activeColor,
                              borderColor: pill.activeColor,
                            }
                          : {}
                      }
                    >
                      {pill.shortLabel ?? pill.label}
                    </button>
                  ))}
                </div>

                <div
                  className="collection-filter-group collection-filter-group--type"
                  aria-label="Filter by type"
                >
                  {TYPE_PILLS.map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      title={pill.label}
                      aria-label={`Filter by type: ${pill.label}`}
                      aria-pressed={filterType === pill.value}
                      onClick={() => setFilterType(pill.value)}
                      className={`filter-pill ${filterType === pill.value ? "filter-pill-active" : "filter-pill-inactive"}`}
                      style={
                        filterType === pill.value
                          ? {
                              background: "rgba(217,168,68,0.55)",
                              borderColor: "rgba(217,168,68,0.55)",
                            }
                          : {}
                      }
                    >
                      {pill.iconName && (
                        <span className="filter-pill-icon">
                          <GameIcon name={pill.iconName} size={14} />
                        </span>
                      )}
                      <span className="filter-pill-label">{pill.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12 mb-8"
          >
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRefreshNonce((n) => n + 1)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
            >
              Retry
            </motion.button>
          </motion.div>
        )}

        {/* Empty Collection */}
        {starterGateActive ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 sm:py-16"
          >
            <p className="text-gray-400 text-xl mb-4">
              {STARTER_COLLECTION_GATE_COPY.title}
            </p>
            <p className="text-gray-500 mb-8">
              {STARTER_COLLECTION_GATE_COPY.body}
            </p>
            <Link to={routes.packs}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-linear-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl"
              >
                {STARTER_COLLECTION_GATE_COPY.cta}
              </motion.button>
            </Link>
          </motion.div>
        ) : cards.length === 0 && !error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 sm:py-16"
          >
            <p className="text-gray-400 text-xl mb-4">
              No persistent cards loaded
            </p>
            <p className="text-gray-500 mb-8">
              Starter cards are universal, and NFT cards appear after pack
              opens.
            </p>
            <Link to={routes.packs}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-linear-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl"
              >
                Open Packs to Get Cards
              </motion.button>
            </Link>
          </motion.div>
        ) : filteredAndSorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 sm:py-16"
          >
            <p className="text-gray-400 text-xl mb-4">
              No cards match your filters
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setFilterSource("all");
                setFilterRarity("all");
                setFilterType("all");
                setSearchQuery("");
              }}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div ref={parentRef} className="collection-landscape-viewport">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      ref={gridShellRef}
                      className="collection-landscape-card-grid collection-card-grid"
                      style={
                        {
                          "--collection-card-tile-max-width": `${collectionCardTileMaxWidth}px`,
                          gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, ${collectionCardTileMaxWidth}px))`,
                          gap: `${collectionGridGap}px`,
                        } as React.CSSProperties
                      }
                    >
                      {rows[virtualRow.index].map((card, colIndex) => {
                        const hiveAsset = hiveCardMap.get(card.id);
                        const masteryTier =
                          hiveAsset?.ownershipSource === "nft"
                            ? getMasteryTier(hiveAsset.xp, card.rarity)
                            : 0;
                        return (
                          <CollectionCardTile
                            key={`${card.id}-${colIndex}`}
                            card={card}
                            masteryTier={masteryTier}
                            classes={{
                              padding: cardPaddingClass,
                              mint: cardMintClass,
                            }}
                            onClick={() => setSelectedCard(card)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center items-center gap-4 mt-8"
              >
                <motion.button
                  whileHover={{ scale: page === 1 ? 1 : 1.05 }}
                  whileTap={{ scale: page === 1 ? 1 : 0.95 }}
                  onClick={() => page > 1 && setPage(page - 1)}
                  disabled={page === 1 || isLoadingMore}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    page === 1
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  ← Previous
                </motion.button>

                <div className="flex items-center gap-2 text-gray-300">
                  {isLoadingMore ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      Page <span className="text-purple-400">{page}</span> of{" "}
                      <span className="text-purple-400">{totalPages}</span>
                    </span>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: page === totalPages ? 1 : 1.05 }}
                  whileTap={{ scale: page === totalPages ? 1 : 0.95 }}
                  onClick={() => page < totalPages && setPage(page + 1)}
                  disabled={page === totalPages || isLoadingMore}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    page === totalPages
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  Next →
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedCard(null);
              setCraftConfirm(null);
            }}
            className="collection-card-detail-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`collection-card-detail-modal modal-landscape-safe ${getFrameClass(selectedCard.rarity)}`}
            >
              <button
                type="button"
                className="collection-card-detail-modal__close"
                onClick={() => {
                  setSelectedCard(null);
                  setCraftConfirm(null);
                }}
                aria-label="Close card detail"
              >
                ×
              </button>

              <div className="collection-card-detail-modal__layout">
                <section
                  className="collection-card-detail-modal__showcase"
                  aria-label={`${selectedCard.name} card preview`}
                >
                  {(() => {
                    const modalArt = getCardArtPath(selectedCard.id);
                    return (
                              <div className="collection-card-detail-modal__card-preview">
                                <div className="collection-card-detail-modal__art">
                                  {modalArt ? (
                            <img
                              src={modalArt}
                              alt={selectedCard.name}
                              draggable={false}
                            />
                          ) : (
                            <div
                              className="collection-card-detail-modal__art-fallback"
                              style={{
                                background: getClassGradient(
                                  selectedCard.heroClass,
                                ),
                              }}
                            >
                              <span>
                                <GameIcon
                                  name={getTypeIcon(selectedCard.type)}
                                  size={64}
                                />
                              </span>
                            </div>
                          )}
                          <div className="collection-card-detail-modal__art-vignette" />
                          {selectedCard.manaCost != null && (
                            <div className="collection-card-detail-modal__mana">
                              {selectedCard.manaCost}
                                    </div>
                                  )}
                                </div>
                              </div>
                    );
                  })()}
                </section>

                <section
                  className="collection-card-detail-modal__details"
                  aria-label={`${selectedCard.name} details`}
                >
                  <div className="collection-card-detail-modal__title-block">
                    <h2>{selectedCard.name}</h2>
                            <p>
                              {selectedCard.rarity} {selectedCard.type} ·{" "}
                              {selectedCard.heroClass}
                            </p>
                  </div>

                  {selectedCard.description && (
                    <p className="collection-card-detail-modal__description">
                      {selectedCard.description}
                    </p>
                  )}

                          <div className="collection-card-detail-modal__summary">
                            {selectedCard.manaCost != null && (
                              <div className="collection-card-detail-modal__summary-item">
                                <span>Cost</span>
                                <strong>{selectedCard.manaCost}</strong>
                              </div>
                            )}
                            {selectedCard.type === "minion" &&
                              selectedCard.attack !== undefined &&
                              selectedCard.health !== undefined && (
                                <>
                                  <div className="collection-card-detail-modal__summary-item">
                                    <span>ATK</span>
                                    <strong>{selectedCard.attack}</strong>
                                  </div>
                                  <div className="collection-card-detail-modal__summary-item">
                                    <span>HP</span>
                                    <strong>{selectedCard.health}</strong>
                                  </div>
                                </>
                              )}
                            <div className="collection-card-detail-modal__summary-item">
                              <span>Source</span>
                              <strong>{getCollectionSourceLabel(selectedCard)}</strong>
                    </div>
                    <div className="collection-card-detail-modal__summary-item">
                      <span>
                        {getCollectionSource(selectedCard) === "qa_full_catalog"
                          ? "Playable"
                          : "Owned"}
                      </span>
                      <strong>
                        {selectedCard.quantity}
                        {selectedCard.quantity > 1 ? " copies" : ""}
                      </strong>
                    </div>
                    {selectedCard.mintNumber != null && (
                      <div className="collection-card-detail-modal__summary-item">
                        <span>Mint</span>
                        <strong>#{selectedCard.mintNumber}</strong>
                      </div>
                    )}
                    {selectedCard.maxSupply != null && (
                      <div className="collection-card-detail-modal__summary-item">
                        <span>Supply</span>
                        <strong>
                          {selectedCard.maxSupply.toLocaleString()}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Supply Meter */}
                  {selectedCard.maxSupply && (
                    <div className="collection-card-detail-modal__supply">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Supply Claimed</span>
                        <span>
                          {selectedCard.mintNumber
                            ? `~${selectedCard.mintNumber} pulled`
                            : "Unknown"}
                          {" / "}
                          {selectedCard.maxSupply.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-sm bg-obsidian-750 overflow-hidden">
                        <div
                          className={`supply-meter-fill supply-meter-fill-${selectedCard.rarity}`}
                          style={{
                            width: selectedCard.mintNumber
                              ? `${Math.min((selectedCard.mintNumber / selectedCard.maxSupply) * 100, 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mastery Tier */}
                  {(() => {
                    const a = hiveCardMap.get(selectedCard.id);
                    const mt =
                      a?.ownershipSource === "nft"
                        ? getMasteryTier(a.xp, selectedCard.rarity)
                        : 0;
                    if (mt < 2) return null;
                    return (
                      <div className="text-center mb-3">
                        <span
                          className={`mastery-badge-modal mastery-tier-${mt}`}
                        >
                          {Array.from({ length: mt }).map((_, i) => (
                            <GameIcon
                              key={i}
                              name="sparkles"
                              size={12}
                              className="mastery-star"
                            />
                          ))}{" "}
                          {mt === 3 ? "Divine" : "Ascended"}
                        </span>
                        <div className="text-[10px] text-gray-500 mt-1">
                          NFT Mastery
                        </div>
                      </div>
                    );
                  })()}

                  <div className="collection-card-detail-modal__actions">
                    {/* Eitr Forge Actions — forge disabled in v1 (non-canonical until replay-derived) */}
                    {(() => {
                      const nft = hiveCardMap.get(selectedCard.id);
                      if (!nft) return null;

                      const eitrVal = getEitrDissolveValue(selectedCard.rarity);
                      const craftCostVal = getEitrForgeCost(
                        selectedCard.rarity,
                      );

                      if (craftConfirm) {
                        return (
                          <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-gray-400 mb-2 text-center">
                              {craftConfirm === "disenchant"
                                ? `Dissolve ${selectedCard.name} into ${eitrVal} Eitr?`
                                : `Forge a random ${selectedCard.rarity} card for ${craftCostVal} Eitr?`}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (craftConfirm === "disenchant") {
                                    // Broadcast-only per ADR 0001. Balance arrives via
                                    // chain-derived eitr_ledger entry — no local credit.
                                    hiveSync
                                      .broadcastCustomJson(
                                        "rp_burn",
                                        { nft_id: nft.uid },
                                        true,
                                      )
                                      .then((res) => {
                                        if (!res.success) {
                                          showStatus(
                                            res.error ??
                                              "Burn broadcast failed",
                                            "error",
                                          );
                                          return;
                                        }
                                        emitNotification({
                                          message: `Burning ${selectedCard.name} for ${eitrVal} Eitr — confirming on chain…`,
                                          level: "info",
                                        });
                                      })
                                      .catch(() =>
                                        showStatus(
                                          "Burn broadcast failed",
                                          "error",
                                        ),
                                      );
                                  } else {
                                    // Two-phase forge per ADR 0001 §3.
                                    void runForge(
                                      selectedCard.rarity,
                                      craftCostVal,
                                    );
                                  }
                                  setCraftConfirm(null);
                                }}
                                className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setCraftConfirm(null)}
                                className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="flex gap-2 mb-3">
                          {selectedCard.quantity > 0 && eitrVal > 0 && (
                            <button
                              onClick={() => setCraftConfirm("disenchant")}
                              className="flex-1 px-3 py-2 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-lg text-xs font-medium border border-red-700/40 transition-colors"
                            >
                              Dissolve ({eitrVal} Eitr)
                            </button>
                          )}
                          {/* Forge disabled in v1 — Eitr non-canonical until replay-derived */}
                        </div>
                      );
                    })()}

                    {/* NFT Actions */}
                    {(() => {
                      const nftAsset = hiveCardMap.get(selectedCard.id);
                      if (!nftAsset) return null;
                      return (
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => setProvenanceNft(nftAsset)}
                            className="flex-1 px-3 py-2 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-lg text-xs font-medium border border-gray-600/40 transition-colors"
                          >
                            View on Chain
                          </button>
                          {getNFTBridge().isHiveMode() && (
                            <button
                              onClick={() => setSendNft(nftAsset)}
                              className="flex-1 px-3 py-2 bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-700/40 transition-colors"
                            >
                              Send to Friend
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* v1.1: DNA Heritage + Replicate/Merge */}
                    {(() => {
                      const nft = hiveCardMap.get(selectedCard.id);
                      if (!nft) return null;
                      const hiveCard = nft as unknown as Record<
                        string,
                        unknown
                      >;
                      const originDna = hiveCard.originDna as
                        | string
                        | undefined;
                      const instanceDna = hiveCard.instanceDna as
                        | string
                        | undefined;
                      const generation = (hiveCard.generation as number) ?? 0;
                      const replicaCount =
                        (hiveCard.replicaCount as number) ?? 0;
                      const parentDna = hiveCard.parentInstanceDna as
                        | string
                        | undefined;
                      const hasDna = !!(originDna || instanceDna);
                      const canMerge = (selectedCard.quantity ?? 0) >= 2;

                      return (
                        <>
                          {hasDna && (
                            <div className="mb-3 p-3 bg-indigo-900/20 rounded-lg border border-indigo-600/30">
                              <div className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                                Genetic Heritage
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-500">
                                    Generation:
                                  </span>
                                  <span className="text-indigo-200 ml-1">
                                    {generation}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Replicas:
                                  </span>
                                  <span className="text-indigo-200 ml-1">
                                    {replicaCount}/3
                                  </span>
                                </div>
                                {originDna && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">
                                      Origin DNA:
                                    </span>
                                    <span className="text-indigo-300 ml-1 font-mono">
                                      {originDna.slice(0, 16)}...
                                    </span>
                                  </div>
                                )}
                                {parentDna && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">
                                      Parent:
                                    </span>
                                    <span className="text-purple-300 ml-1 font-mono">
                                      {parentDna.slice(0, 16)}...
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 mb-3">
                            <button
                              type="button"
                              onClick={async () => {
                                const result =
                                  await getNFTBridge().replicateCard(nft.uid);
                                if (result.success)
                                  showStatus(
                                    `Replicated ${selectedCard.name}!`,
                                    "success",
                                  );
                                else
                                  showStatus(
                                    result.error || "Replicate failed",
                                    "error",
                                  );
                              }}
                              disabled={replicaCount >= 3 || generation >= 3}
                              className="flex-1 px-3 py-2 bg-indigo-900/50 hover:bg-indigo-800/60 disabled:opacity-30 text-indigo-300 rounded-lg text-xs font-medium border border-indigo-700/40 transition-colors"
                            >
                              Replicate
                            </button>
                            {canMerge && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const sameCards = getNFTBridge()
                                    .getCardCollection()
                                    .filter(
                                      (c) => c.cardId === selectedCard.id,
                                    );
                                  if (sameCards.length < 2) {
                                    showStatus(
                                      "Need 2 copies to merge",
                                      "error",
                                    );
                                    return;
                                  }
                                  const result =
                                    await getNFTBridge().mergeCards([
                                      sameCards[0].uid,
                                      sameCards[1].uid,
                                    ]);
                                  if (result.success)
                                    showStatus(
                                      `Merged into Ascended ${selectedCard.name}!`,
                                      "success",
                                    );
                                  else
                                    showStatus(
                                      result.error || "Merge failed",
                                      "error",
                                    );
                                }}
                                className="flex-1 px-3 py-2 bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 rounded-lg text-xs font-medium border border-purple-700/40 transition-colors"
                              >
                                Merge (2 → 1)
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })()}

                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NFTProvenanceViewer
        nft={provenanceNft}
        onClose={() => setProvenanceNft(null)}
        onSend={(nft) => {
          setProvenanceNft(null);
          setSendNft(nft);
        }}
      />

      <SendCardModal
        nft={sendNft}
        onClose={() => setSendNft(null)}
        onSuccess={() => {
          setSelectedCard(null);
          setSendNft(null);
        }}
      />
    </div>
  );
}
