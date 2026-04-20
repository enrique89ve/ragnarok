export interface RarityOdds {
  common: number;
  rare: number;
  epic: number;
  mythic: number;
}

export interface PackType {
  id: number;
  name: string;
  description: string;
  price: number;
  cardCount: number;
  rarityOdds: RarityOdds;
  imageUrl?: string;
}

export interface PackTypeResponse {
  packs: PackType[];
}

export interface RarityStats {
  nft_rarity: string;
  max_supply: string | number;
  remaining_supply: string | number;
  card_count: string | number;
  reward_reserve: string | number;
  pack_supply: string | number;
  pack_remaining: string | number;
}

export interface TypeStats {
  card_type: string;
  card_count: string | number;
  max_supply: string | number;
  remaining_supply: string | number;
  reward_reserve: string | number;
  pack_supply: string | number;
  pack_remaining: string | number;
}

export interface SupplyStatsResponse {
  overall: {
    total_cards: string | number;
    total_max_supply: string | number;
    total_remaining_supply: string | number;
    total_reward_reserve: string | number;
    total_pack_supply: string | number;
    total_pack_remaining: string | number;
  };
  byRarity: RarityStats[];
  byType: TypeStats[];
}

export interface OpenedCard {
  cardId: number;
  cardName: string;
  nftRarity: string;
  cardType: string;
  heroClass: string;
  imageUrl?: string;
}

export interface PackOpenResponse {
  success: boolean;
  cards: OpenedCard[];
  packType: string;
}

export interface PaginationData {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

export interface InventoryCard {
  id?: number;
  card_id: number;
  card_name: string;
  nft_rarity: string;
  card_type: string;
  hero_class: string;
  quantity: number;
  mint_number?: number | null;
  max_supply?: number;
  remaining_supply?: number;
  imageUrl?: string;
}

export interface InventoryResponse {
  inventory: InventoryCard[];
  pagination: PaginationData;
}

export interface RevealedCard {
  id: number;
  name: string;
  rarity: string;
  type: string;
  heroClass: string;
  imageUrl?: string;
}

export interface OwnedCard {
  id: number;
  name: string;
  rarity: string;
  type: string;
  heroClass: string;
  quantity: number;
  mintNumber?: number | null;
  maxSupply?: number;
  description?: string;
  attack?: number;
  health?: number;
  manaCost?: number;
  imageUrl?: string;
}

export interface ProcessedRarityStats {
  rarity: string;
  packSupply: number;
  packRemaining: number;
  percentClaimed: number;
  uniqueCards: number;
}

export interface SupplyStats {
  totalMaxSupply: number;
  totalPackSupply: number;
  totalPackRemaining: number;
  totalRewardReserve: number;
  totalCardsOpened: number;
  totalPacksOpened: number;
  mythicDropRate: number;
  byRarity: ProcessedRarityStats[];
}
