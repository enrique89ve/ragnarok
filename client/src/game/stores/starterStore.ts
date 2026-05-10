import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export interface StarterReputationEntry {
	cardId: number;
	reputation: number;
	gamesPlayed: number;
	wins: number;
	lastMatchId: string | null;
	updatedAt: number;
}

interface RecordStarterReputationParams {
	accountId: string;
	matchId: string;
	cardIds: readonly number[];
	won: boolean;
	timestamp?: number;
}

type StarterReputationByCardId = Record<number, StarterReputationEntry>;
type StarterReputationByAccount = Record<string, StarterReputationByCardId>;
type StarterClaimByAccount = Record<string, true>;

interface StarterState {
	claimed: boolean;
	claimedByAccount: StarterClaimByAccount;
	legacyClaimAccountId: string | null;
	starterReputationByAccount: StarterReputationByAccount;
	markClaimed: (accountId?: string | null) => void;
	hasClaimed: (accountId?: string | null) => boolean;
	syncLegacyClaimToAccount: (accountId?: string | null) => void;
	recordStarterReputation: (params: RecordStarterReputationParams) => void;
	getStarterReputation: (accountId: string, cardId: number) => StarterReputationEntry | null;
}

const STARTER_REPUTATION_PER_GAME = 1;
const STARTER_REPUTATION_WIN_BONUS = 1;
const STARTER_STORE_STORAGE_KEY = 'ragnarok-starter-claimed';
const LOCAL_STARTER_CLAIM_ID = 'local';

const memoryStorage = new Map<string, string>();

const starterFallbackStorage: StateStorage = {
	getItem: (name) => memoryStorage.get(name) ?? null,
	setItem: (name, value) => {
		memoryStorage.set(name, value);
	},
	removeItem: (name) => {
		memoryStorage.delete(name);
	},
};

function getStarterStorage(): StateStorage {
	return typeof localStorage === 'undefined' ? starterFallbackStorage : localStorage;
}

function starterClaimAccountId(accountId: string | null | undefined): string {
	const normalized = accountId?.trim().toLowerCase();
	return normalized && normalized.length > 0 ? normalized : LOCAL_STARTER_CLAIM_ID;
}

function hasOnlyLocalClaim(claimedByAccount: StarterClaimByAccount): boolean {
	const claimAccountIds = Object.keys(claimedByAccount);
	return claimAccountIds.length === 0 || claimAccountIds.every(accountId => accountId === LOCAL_STARTER_CLAIM_ID);
}

function uniqueCardIds(cardIds: readonly number[]): number[] {
	return [...new Set(cardIds.filter(Number.isInteger))];
}

function applyStarterReputationEntry(
	current: StarterReputationEntry | undefined,
	cardId: number,
	matchId: string,
	won: boolean,
	timestamp: number,
): StarterReputationEntry {
	if (current?.lastMatchId === matchId) return current;

	const reputationGain = STARTER_REPUTATION_PER_GAME + (won ? STARTER_REPUTATION_WIN_BONUS : 0);
	return {
		cardId,
		reputation: (current?.reputation ?? 0) + reputationGain,
		gamesPlayed: (current?.gamesPlayed ?? 0) + 1,
		wins: (current?.wins ?? 0) + (won ? 1 : 0),
		lastMatchId: matchId,
		updatedAt: timestamp,
	};
}

export const useStarterStore = create<StarterState>()(
	persist(
		(set, get) => ({
			claimed: false,
			claimedByAccount: {},
			legacyClaimAccountId: null,
			starterReputationByAccount: {},
			markClaimed: (accountId) => {
				const claimAccountId = starterClaimAccountId(accountId);
				set((state) => ({
					claimed: true,
					claimedByAccount: {
						...state.claimedByAccount,
						[claimAccountId]: true,
					},
				}));
			},
			hasClaimed: (accountId) => {
				const claimAccountId = starterClaimAccountId(accountId);
				const state = get();
				if (claimAccountId === LOCAL_STARTER_CLAIM_ID) {
					return state.claimed || Boolean(state.claimedByAccount[LOCAL_STARTER_CLAIM_ID]);
				}

				if (state.claimedByAccount[claimAccountId]) return true;

				return state.claimed && !state.legacyClaimAccountId && hasOnlyLocalClaim(state.claimedByAccount);
			},
			syncLegacyClaimToAccount: (accountId) => {
				const claimAccountId = starterClaimAccountId(accountId);
				if (claimAccountId === LOCAL_STARTER_CLAIM_ID) return;

				set((state) => {
					if (
						!state.claimed ||
						state.legacyClaimAccountId ||
						state.claimedByAccount[claimAccountId] ||
						!hasOnlyLocalClaim(state.claimedByAccount)
					) {
						return state;
					}

					return {
						legacyClaimAccountId: claimAccountId,
						claimedByAccount: {
							...state.claimedByAccount,
							[claimAccountId]: true,
						},
					};
				});
			},
			recordStarterReputation: ({ accountId, matchId, cardIds, won, timestamp = Date.now() }) => {
				const uniqueIds = uniqueCardIds(cardIds);
				if (uniqueIds.length === 0) return;

				set((state) => {
					const accountReputation = state.starterReputationByAccount[accountId] ?? {};
					const nextAccountReputation = { ...accountReputation };

					for (const cardId of uniqueIds) {
						nextAccountReputation[cardId] = applyStarterReputationEntry(
							accountReputation[cardId],
							cardId,
							matchId,
							won,
							timestamp,
						);
					}

					return {
						starterReputationByAccount: {
							...state.starterReputationByAccount,
							[accountId]: nextAccountReputation,
						},
					};
				});
			},
			getStarterReputation: (accountId, cardId) =>
				get().starterReputationByAccount[accountId]?.[cardId] ?? null,
		}),
		{
			// Legacy key retained so existing players keep their starter claim state.
			name: STARTER_STORE_STORAGE_KEY,
			storage: createJSONStorage(getStarterStorage),
		}
	)
);
